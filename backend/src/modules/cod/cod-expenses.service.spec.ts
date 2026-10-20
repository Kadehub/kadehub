import { CodExpensesService } from './cod-expenses.service';

/** Tiny in-memory stand-in for a TypeORM repository (only what the service uses). */
function memRepo<T extends { id?: number }>(opts: { uniqueClientRef?: boolean } = {}) {
  const rows: any[] = [];
  let nextId = 1;
  const matches = (row: any, where: any) => Object.entries(where ?? {}).every(([k, v]) => (v as any)?._type ? true : row[k] === v);
  return {
    rows,
    create: (data: any) => ({ ...data }),
    find: async ({ where }: any) => rows.filter(r => matches(r, where)),
    findOne: async ({ where }: any) => rows.find(r => matches(r, where)) ?? null,
    save: async (row: any) => {
      if (opts.uniqueClientRef && row.client_ref && rows.some(r => r !== row && r.tenant_id === row.tenant_id && r.client_ref === row.client_ref)) {
        throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      }
      if (!row.id) { row.id = nextId++; rows.push(row); }
      return row;
    },
    delete: async (where: any) => {
      const i = rows.findIndex(r => matches(r, where));
      if (i >= 0) rows.splice(i, 1);
      return { affected: i >= 0 ? 1 : 0 };
    },
  };
}

const actor = { sub: 7, tenant_id: 1 };
const today = new Date().toISOString().slice(0, 10);

function setup() {
  const expenses = memRepo();
  const personal = memRepo({ uniqueClientRef: true });
  const settings = memRepo();
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const svc = new CodExpensesService(expenses as any, personal as any, settings as any, audit as any);
  return { svc, expenses, personal, audit };
}

describe('business expenses', () => {
  it('defaults the title to the category and returns the new id', async () => {
    const { svc } = setup();
    const res: any = await svc.createExpense(actor, { category: 'Rent', amount: 25000, expense_date: today });
    expect(res.id).toBe(1);
    expect(res.expense.title).toBe('Rent');
  });

  it('flags a lookalike as duplicate, then saves when allowed', async () => {
    const { svc, expenses } = setup();
    await svc.createExpense(actor, { title: 'Shop rent', category: 'Rent', amount: 25000, expense_date: today });
    const again: any = await svc.createExpense(actor, { title: ' shop RENT ', category: 'Rent', amount: 25000, expense_date: today });
    expect(again.duplicate).toBe(true);
    expect(expenses.rows).toHaveLength(1);
    const forced: any = await svc.createExpense(actor, { title: 'Shop rent', category: 'Rent', amount: 25000, expense_date: today, allow_duplicate: true });
    expect(forced.id).toBe(2);
  });

  it('does not flag the row being edited', async () => {
    const { svc } = setup();
    const a: any = await svc.createExpense(actor, { title: 'Ads', category: 'Advertising', amount: 5000, expense_date: today });
    const upd: any = await svc.updateExpense(actor, a.id, { title: 'Ads', category: 'Advertising', amount: 5000, expense_date: today });
    expect(upd.duplicate).toBeUndefined();
  });

  it('rejects future dates and bad amounts', async () => {
    const { svc } = setup();
    await expect(svc.createExpense(actor, { category: 'Rent', amount: 1, expense_date: '2999-01-01' })).rejects.toThrow('EXPENSE_DATE_FUTURE');
    await expect(svc.createExpense(actor, { category: 'Rent', amount: 0, expense_date: today })).rejects.toThrow('EXPENSE_AMOUNT');
    await expect(svc.createExpense(actor, { category: 'Rent', amount: 10, expense_date: '2026-02-31' })).rejects.toThrow('EXPENSE_DATE');
  });
});

describe('personal expenses', () => {
  const ref = '3f8a1c2e-5b6d-4e7f-8a9b-0c1d2e3f4a5b';

  it('a retry with the same client_ref returns the same id and saves once', async () => {
    const { svc, personal } = setup();
    const first: any = await svc.createPersonal(actor, { category: 'PickMe', amount: 500, expense_date: today, client_ref: ref });
    const retry: any = await svc.createPersonal(actor, { category: 'PickMe', amount: 500, expense_date: today, client_ref: ref });
    expect(retry.id).toBe(first.id);
    expect(retry.retried).toBe(true);
    expect(personal.rows).toHaveLength(1);
  });

  it('treats a unique-index race as success', async () => {
    const { svc, personal } = setup();
    // Simulate the other request winning between the check and the insert
    const realFindOne = personal.findOne;
    let calls = 0;
    personal.findOne = async (q: any) => {
      calls += 1;
      if (calls === 1) { personal.rows.push({ id: 99, tenant_id: 1, client_ref: ref, category: 'Fuel', amount: 3000, expense_date: today }); return null; }
      return realFindOne(q);
    };
    const res: any = await svc.createPersonal(actor, { category: 'Fuel', amount: 3000, expense_date: today, client_ref: ref, allow_duplicate: true });
    expect(res.id).toBe(99);
  });

  it('warns on a lookalike but allows an identical ride after confirming', async () => {
    const { svc, personal } = setup();
    await svc.createPersonal(actor, { category: 'PickMe', amount: 500, expense_date: today, client_ref: ref });
    const warn: any = await svc.createPersonal(actor, { category: 'PickMe', amount: 500, expense_date: today, client_ref: ref.replace('5b', '5c') });
    expect(warn.duplicate).toBe(true);
    const ok: any = await svc.createPersonal(actor, { category: 'PickMe', amount: 500, expense_date: today, client_ref: ref.replace('5b', '5c'), allow_duplicate: true });
    expect(ok.id).toBeGreaterThan(0);
    expect(personal.rows).toHaveLength(2);
  });

  it('logs only category and amount for personal entries', async () => {
    const { svc, audit } = setup();
    await svc.createPersonal(actor, { category: 'Alcohol', amount: 1500, expense_date: today, note: 'Friday with friends' });
    expect(audit.log).toHaveBeenCalledWith(actor, 'created', 'cod_personal_expense', expect.any(Number), 'Alcohol Rs 1,500.00');
  });
});
