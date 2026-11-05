import { PlanUpgradeNoticeService, isPlanUpgrade } from './plan-upgrade-notice.service';

describe('what counts as an upgrade', () => {
  it('is a higher monthly price', () => {
    expect(isPlanUpgrade({ price_monthly: 10000 }, { price_monthly: 5000 })).toBe(true);
    expect(isPlanUpgrade({ price_monthly: '5000.00' }, { price_monthly: '0.00' })).toBe(true);
    expect(isPlanUpgrade({ price_monthly: 5000 }, null)).toBe(true);
  });

  it('is not a renewal, a downgrade, a free plan or a top-up', () => {
    expect(isPlanUpgrade({ price_monthly: 5000 }, { price_monthly: 5000 })).toBe(false);
    expect(isPlanUpgrade({ price_monthly: 5000 }, { price_monthly: 10000 })).toBe(false);
    expect(isPlanUpgrade({ price_monthly: 0 }, null)).toBe(false);
    expect(isPlanUpgrade({ slug: 'cod-topup-100', price_monthly: 5000 }, { price_monthly: 0 })).toBe(false);
  });
});

function setup() {
  const rows: any[] = [];
  const isNull = (v: any) => v?._type === 'isNull';
  const match = (row: any, where: any) => Object.entries(where).every(([k, v]) => (isNull(v) ? row[k] === null : row[k] === v));
  let next = 1;
  const repo = {
    rows,
    findOne: async ({ where }: any) => rows.filter(r => match(r, where)).sort((a, b) => a.id - b.id)[0] ?? null,
    update: async (where: any, set: any) => {
      const hit = rows.filter(r => match(r, where));
      hit.forEach(r => Object.assign(r, set));
      return { affected: hit.length };
    },
    delete: async (where: any) => {
      for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i], where)) rows.splice(i, 1);
      return {};
    },
    insert: async (row: any) => { rows.push({ id: next++, ...row }); return {}; },
  };
  return { svc: new PlanUpgradeNoticeService(repo as any), rows };
}

const growth = { name: 'COD Growth', price_monthly: 5000 };
const free = { price_monthly: 0 };
const until = new Date('2026-12-05');

describe('upgrade notices', () => {
  it('congratulates once', async () => {
    const { svc } = setup();
    await svc.planChanged(1, 'cod', growth, free, until);
    expect(await svc.claim(1)).toEqual({ plan_name: 'COD Growth', product_name: 'KadeHub COD', expires_at: until });
    expect(await svc.claim(1)).toBeNull();
  });

  it('only for the business that was upgraded', async () => {
    const { svc } = setup();
    await svc.planChanged(1, 'cod', growth, free, until);
    expect(await svc.claim(2)).toBeNull();
    expect(await svc.claim(1)).not.toBeNull();
  });

  it('stays silent on a downgrade, and withdraws an upgrade not yet seen', async () => {
    const { svc } = setup();
    await svc.planChanged(1, 'cod', growth, free, until);
    await svc.planChanged(1, 'cod', { name: 'COD Free', price_monthly: 0 }, growth, until);
    expect(await svc.claim(1)).toBeNull();
  });

  it('shows only the latest of two upgrades in a row', async () => {
    const { svc } = setup();
    await svc.planChanged(1, 'cod', growth, free, until);
    await svc.planChanged(1, 'cod', { name: 'COD Scale', price_monthly: 10000 }, growth, until);
    expect((await svc.claim(1))?.plan_name).toBe('COD Scale');
    expect(await svc.claim(1)).toBeNull();
  });

  it('keeps upgrades to different products separate', async () => {
    const { svc } = setup();
    await svc.planChanged(1, 'cod', growth, free, until);
    await svc.planChanged(1, 'pos', { name: 'POS Pro', price_monthly: 3000 }, null, until);
    expect((await svc.claim(1))?.product_name).toBe('KadeHub COD');
    expect((await svc.claim(1))?.product_name).toBe('KadeHub POS');
    expect(await svc.claim(1)).toBeNull();
  });

  it('a later upgrade congratulates again', async () => {
    const { svc } = setup();
    await svc.planChanged(1, 'cod', growth, free, until);
    await svc.claim(1);
    await svc.planChanged(1, 'cod', { name: 'COD Scale', price_monthly: 10000 }, growth, until);
    expect((await svc.claim(1))?.plan_name).toBe('COD Scale');
  });

  it('loses the race cleanly when another device claimed it first', async () => {
    const { svc, rows } = setup();
    await svc.planChanged(1, 'cod', growth, free, until);
    const [a, b] = await Promise.all([svc.claim(1), svc.claim(1)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(rows[0].seen_at).toBeInstanceOf(Date);
  });
});
