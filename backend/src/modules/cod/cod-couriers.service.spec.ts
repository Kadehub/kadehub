import { CodCouriersService, buildTrackingLink, isValidTrackingUrl } from './cod-couriers.service';

/** In-memory stand-in for the repository, understanding the IsNull / In operators and OR'd where lists. */
function memRepo() {
  const rows: any[] = [];
  let nextId = 1;
  const test = (value: any, cond: any) => {
    if (cond?._type === 'isNull') return value === null || value === undefined;
    if (cond?._type === 'in') return cond._value.includes(value);
    return value === cond;
  };
  const one = (row: any, where: any) => Object.entries(where).every(([k, v]) => test(row[k], v));
  const matches = (row: any, where: any) => (Array.isArray(where) ? where.some(w => one(row, w)) : one(row, where));
  return {
    rows,
    create: (data: any) => ({ ...data }),
    find: async ({ where }: any) => rows.filter(r => matches(r, where)),
    findOne: async ({ where }: any) => rows.find(r => matches(r, where)) ?? null,
    save: async (row: any) => {
      if (!row.id) { row.id = nextId++; rows.push(row); }
      return row;
    },
  };
}

function setup() {
  const repo = memRepo();
  const svc = new CodCouriersService(repo as any);
  const seed = (data: any) => repo.save({ tenant_id: null, tracking_url: null, is_active: true, sort_order: 0, ...data });
  return { svc, repo, seed };
}

describe('tracking links', () => {
  it('puts the encoded tracking number into the link', () => {
    expect(buildTrackingLink('https://c.example/track?id={tracking}', ' AB 12&x ')).toBe('https://c.example/track?id=AB%2012%26x');
  });

  it('opens a page that takes no number as it is', () => {
    expect(buildTrackingLink('https://c.example/track', 'AB12')).toBe('https://c.example/track');
  });

  it('gives no link without a tracking number or a template', () => {
    expect(buildTrackingLink('https://c.example/{tracking}', '  ')).toBeNull();
    expect(buildTrackingLink(null, 'AB12')).toBeNull();
  });

  it.each([
    'javascript:alert(1)', 'data:text/html,x', 'ftp://c.example/x', 'not a url',
    'https://user:pass@c.example/x', 'https://{tracking}.example/x',
  ])('rejects %s', url => {
    expect(isValidTrackingUrl(url)).toBe(false);
    expect(buildTrackingLink(url, 'AB12')).toBeNull();
  });

  it('accepts http(s) pages', () => {
    expect(isValidTrackingUrl('https://c.example/track?id={tracking}')).toBe(true);
    expect(isValidTrackingUrl('http://c.example/track/{tracking}')).toBe(true);
  });
});

describe('what a business can choose from', () => {
  it('lists the shared couriers first, then only its own', async () => {
    const { svc, seed } = setup();
    await seed({ name: 'Shared B', sort_order: 20 });
    await seed({ name: 'Shared A', sort_order: 10 });
    await seed({ name: 'Hidden', is_active: false });
    await seed({ name: 'Mine', tenant_id: 1 });
    await seed({ name: 'Theirs', tenant_id: 2 });
    const list = await svc.listForTenant(1);
    expect(list.map(c => c.name)).toEqual(['Shared A', 'Shared B', 'Mine']);
    expect(list.map(c => c.is_custom)).toEqual([false, false, true]);
  });
});

describe('adding your own courier', () => {
  it('tidies the name and keeps it private', async () => {
    const { svc } = setup();
    const added = await svc.addCustom(1, { name: '  Lanka   Fast ', tracking_url: 'https://lf.example/{tracking}' });
    expect(added).toMatchObject({ name: 'Lanka Fast', is_custom: true });
    expect((await svc.listForTenant(2))).toEqual([]);
  });

  it('returns the listed courier rather than duplicating it', async () => {
    const { svc, seed, repo } = setup();
    const shared = await seed({ name: 'Domex' });
    const added = await svc.addCustom(1, { name: 'domex' });
    expect(added.id).toBe(shared.id);
    expect(repo.rows).toHaveLength(1);
  });

  it('is safe to repeat when an order form is retried', async () => {
    const { svc, repo } = setup();
    const first = await svc.addCustom(1, { name: 'Lanka Fast' });
    const second = await svc.addCustom(1, { name: 'lanka fast' });
    expect(second.id).toBe(first.id);
    expect(repo.rows).toHaveLength(1);
  });

  it('lets two businesses use the same name separately', async () => {
    const { svc } = setup();
    const a = await svc.addCustom(1, { name: 'Lanka Fast' });
    const b = await svc.addCustom(2, { name: 'Lanka Fast' });
    expect(a.id).not.toBe(b.id);
  });

  it('brings back one that was removed', async () => {
    const { svc, repo } = setup();
    const first = await svc.addCustom(1, { name: 'Lanka Fast' });
    await svc.archiveCustom(1, first.id);
    const again = await svc.addCustom(1, { name: 'Lanka Fast' });
    expect(again.id).toBe(first.id);
    expect(repo.rows[0].is_active).toBe(true);
  });

  it('rejects a blank name and an unsafe link', async () => {
    const { svc } = setup();
    await expect(svc.addCustom(1, { name: '   ' })).rejects.toMatchObject({ response: { code: 'COURIER_NAME' } });
    await expect(svc.addCustom(1, { name: 'X', tracking_url: 'javascript:alert(1)' })).rejects.toMatchObject({ response: { code: 'COURIER_URL_INVALID' } });
  });
});

describe('managing your own couriers', () => {
  it('cannot touch the shared list or another business', async () => {
    const { svc, seed } = setup();
    const shared = await seed({ name: 'Domex' });
    const theirs = await seed({ name: 'Theirs', tenant_id: 2 });
    for (const id of [shared.id, theirs.id]) {
      await expect(svc.updateCustom(1, id, { name: 'Hacked' })).rejects.toMatchObject({ status: 404 });
      await expect(svc.archiveCustom(1, id)).rejects.toMatchObject({ status: 404 });
    }
    expect(shared.name).toBe('Domex');
    expect(theirs.is_active).toBe(true);
  });

  it('refuses a rename onto a name already available', async () => {
    const { svc, seed } = setup();
    await seed({ name: 'Domex' });
    const mine = await svc.addCustom(1, { name: 'Mine' });
    await expect(svc.updateCustom(1, mine.id, { name: 'DOMEX' })).rejects.toMatchObject({ status: 409 });
  });

  it('clears a tracking link with null and leaves it alone when left out', async () => {
    const { svc } = setup();
    const mine = await svc.addCustom(1, { name: 'Mine', tracking_url: 'https://m.example/{tracking}' });
    expect((await svc.updateCustom(1, mine.id, { name: 'Mine 2' })).tracking_url).toBe('https://m.example/{tracking}');
    expect((await svc.updateCustom(1, mine.id, { tracking_url: null })).tracking_url).toBeNull();
  });
});

describe('putting a courier on an order', () => {
  it('allows shared couriers, its own, and clearing', async () => {
    const { svc, seed } = setup();
    const shared = await seed({ name: 'Domex' });
    const mine = await seed({ name: 'Mine', tenant_id: 1 });
    await expect(svc.assertUsable(1, shared.id)).resolves.toBeUndefined();
    await expect(svc.assertUsable(1, mine.id)).resolves.toBeUndefined();
    await expect(svc.assertUsable(1, null)).resolves.toBeUndefined();
    await expect(svc.assertUsable(1, undefined)).resolves.toBeUndefined();
  });

  it('rejects another business\'s courier, removed ones and unknown ids', async () => {
    const { svc, seed } = setup();
    const theirs = await seed({ name: 'Theirs', tenant_id: 2 });
    const hidden = await seed({ name: 'Hidden', is_active: false });
    for (const id of [theirs.id, hidden.id, 999]) {
      await expect(svc.assertUsable(1, id)).rejects.toMatchObject({ response: { code: 'COURIER_NOT_FOUND' } });
    }
  });

  it('lets an order keep a courier that has since been removed', async () => {
    const { svc, seed } = setup();
    const hidden = await seed({ name: 'Hidden', is_active: false });
    await expect(svc.assertUsable(1, hidden.id, hidden.id)).resolves.toBeUndefined();
  });
});

describe('shared list', () => {
  it('adds to the end and refuses duplicates', async () => {
    const { svc, seed } = setup();
    await seed({ name: 'Domex', sort_order: 30 });
    expect((await svc.createShared({ name: 'New' })).sort_order).toBe(40);
    await expect(svc.createShared({ name: 'DOMEX' })).rejects.toMatchObject({ status: 409 });
  });

  it('hides a courier without losing it for past orders', async () => {
    const { svc, seed } = setup();
    const c = await seed({ name: 'Domex' });
    await svc.updateShared(c.id, { is_active: false });
    expect(await svc.listForTenant(1)).toEqual([]);
    expect((await svc.byIds([c.id, null])).get(c.id)?.name).toBe('Domex');
  });

  it('does not edit a business\'s own courier', async () => {
    const { svc, seed } = setup();
    const mine = await seed({ name: 'Mine', tenant_id: 1 });
    await expect(svc.updateShared(mine.id, { name: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});
