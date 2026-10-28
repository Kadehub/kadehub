import { CodAccountService } from './cod-account.service';
import { colomboMonthKey } from './cod-analytics';
import { COD_PLANS, COD_TOPUP } from './cod-plans';

/** Repo stand-in: plain-equality `where`; `count` returns a fixed number (orders this month). */
function memRepo(rows: any[] = [], count = 0) {
  const matches = (row: any, where: any) => Object.entries(where ?? {}).every(([k, v]) => row[k] === v);
  return {
    rows,
    find: async ({ where }: any = {}) => rows.filter(r => matches(r, where)),
    findOne: async ({ where }: any) => rows.find(r => matches(r, where)) ?? null,
    count: async () => count,
  };
}

const DAY = 86_400_000;
const packages = [
  ...COD_PLANS.map((p, i) => ({ id: i + 1, slug: p.slug, product: 'cod', is_active: !p.legacy, price_monthly: p.monthly_price_lkr })),
  { id: 99, slug: COD_TOPUP.slug, product: 'cod', is_active: true, price_monthly: COD_TOPUP.price_lkr },
];
const pkgId = (slug: string) => packages.find(p => p.slug === slug)!.id;

function setup(sub: Record<string, unknown> | null, opts: { orders?: number; topups?: number } = {}) {
  const subs = sub ? [{ tenant_id: 1, product: 'cod', status: 'active', payment_status: 'paid', started_at: new Date(), ...sub }] : [];
  const topups = Array.from({ length: opts.topups ?? 0 }, () => ({ tenant_id: 1, month: colomboMonthKey(), orders: COD_TOPUP.orders }));
  const svc = new CodAccountService(
    memRepo(subs) as any, memRepo(packages) as any, memRepo([{ id: 7 }]) as any, memRepo() as any,
    memRepo() as any, memRepo([], opts.orders ?? 0) as any, memRepo(topups) as any,
  );
  return svc;
}

describe('COD plan state', () => {
  it('keeps Free running with no expiry, even on an old trial row', async () => {
    const state = await setup({ package_id: pkgId('cod-free'), payment_status: 'trial', expires_at: new Date(Date.now() - DAY) }).getPlanState(1);
    expect(state).toMatchObject({ status: 'active', active: true, premium: false, current_period_end: null });
    expect(state!.plan.max_orders_per_month).toBe(50);
  });

  it('drops an expired paid plan to Free instead of locking', async () => {
    const state = await setup({ package_id: pkgId('cod-growth'), expires_at: new Date(Date.now() - DAY) }).getPlanState(1);
    expect(state).toMatchObject({ active: true, premium: false });
    expect(state!.plan.key).toBe('free');
  });

  it('honours a legacy plan until it expires', async () => {
    const state = await setup({ package_id: pkgId('cod-business'), expires_at: new Date(Date.now() + DAY) }).getPlanState(1);
    expect(state!.plan.key).toBe('business');
    expect(state!.premium).toBe(true);
  });

  it('only lists plans that are for sale', async () => {
    const keys = (await setup(null).plans()).map(p => p.key);
    expect(keys).toEqual(['free', 'growth', 'scale']);
  });
});

describe('COD order limits', () => {
  const scale = { package_id: pkgId('cod-scale'), expires_at: new Date(Date.now() + DAY) };

  it('lets 5 grace orders through on Free, then blocks', async () => {
    const free = { package_id: pkgId('cod-free') };
    await expect(setup(free, { orders: 50 }).assertCanAddOrder(1)).resolves.toBeUndefined(); // 51st = first grace order
    await expect(setup(free, { orders: 54 }).assertCanAddOrder(1)).resolves.toBeUndefined(); // 55th = last grace order
    await expect(setup(free, { orders: 55 }).assertCanAddOrder(1)).rejects.toThrow('PLAN_LIMIT_ORDERS');
  });

  it('adds this month\'s top-ups to the plan limit, grace on top', async () => {
    await expect(setup(scale, { orders: 304, topups: 1 }).assertCanAddOrder(1)).resolves.toBeUndefined();
    await expect(setup(scale, { orders: 305, topups: 1 }).assertCanAddOrder(1)).rejects.toThrow('PLAN_LIMIT_ORDERS');
  });

  it('offers the top-up on a paid Scale plan only', async () => {
    const me: any = await setup(scale, { orders: 190 }).me({ sub: 7, tenant_id: 1 });
    expect(me.topup).toEqual({ package_id: 99, orders: 100, price_lkr: 5000 });
    expect(me.usage).toEqual({ orders_this_month: 190, orders_limit: 200, topup_orders: 0, orders_grace: 5 });

    const growth: any = await setup({ package_id: pkgId('cod-growth'), expires_at: new Date(Date.now() + DAY) }).me({ sub: 7, tenant_id: 1 });
    expect(growth.topup).toBeNull();
  });
});
