import { ConflictException } from '@nestjs/common';
import { CodCourierSyncService } from './cod-courier-sync.service';
import { CourierApiError, courierAdapter } from './cod-courier-adapters';
import { encryptSecret } from './cod-courier-secrets';

jest.mock('./cod-courier-adapters', () => ({
  ...jest.requireActual('./cod-courier-adapters'),
  courierAdapter: jest.fn(),
}));

const order = (id: number, extra: any = {}) => ({
  id, tenant_id: 1, status: 'ongoing', tracking_number: `W${id}`, courier_id: 5, courier_state: null, courier_attention: null, courier_synced_at: null, created_by: 7, ...extra,
});

function setup(orders: any[], premium = true) {
  process.env.COD_COURIER_SECRET = 'x'.repeat(32);
  const adapter = { verifyKey: jest.fn(), getTracking: jest.fn() };
  (courierAdapter as jest.Mock).mockReturnValue(adapter);
  const orderRepo = { find: jest.fn().mockResolvedValue(orders), update: jest.fn().mockResolvedValue({}), findOne: jest.fn() };
  const accountRepo = { update: jest.fn().mockResolvedValue({}), find: jest.fn(), findOne: jest.fn() };
  const courierRepo = { findOne: jest.fn().mockResolvedValue({ id: 5, name: 'Koombiyo', adapter: 'koombiyo' }) };
  const eventRepo = { find: jest.fn().mockResolvedValue([]), insert: jest.fn().mockResolvedValue({}) };
  const account = { isPremium: jest.fn().mockResolvedValue(premium) };
  const cod = { updateOrderStatus: jest.fn().mockResolvedValue({}) };
  const svc = new CodCourierSyncService(courierRepo as any, accountRepo as any, orderRepo as any, eventRepo as any, account as any, cod as any);
  svc.pauseMs = 0;
  const row: any = { id: 3, tenant_id: 1, courier_id: 5, connected_by: 9, api_key_enc: encryptSecret('the-key') };
  return { svc, adapter, orderRepo, accountRepo, cod, row };
}

const update = (state: string, status = 'Status') => ({ status, state, events: [] });

describe('scheduled courier sync', () => {
  it('asks about the longest-waiting parcels first, with the decrypted key', async () => {
    const { svc, adapter, row } = setup([order(1, { courier_synced_at: new Date('2026-11-05') }), order(2), order(3, { courier_synced_at: new Date('2026-11-01') })]);
    adapter.getTracking.mockResolvedValue(update('in_transit'));
    await svc.syncAccount(row);
    expect(adapter.getTracking.mock.calls.map((c: any[]) => c[0])).toEqual(['W2', 'W3', 'W1']);
    expect(adapter.getTracking.mock.calls[0][1]).toBe('the-key');
  });

  it('caps one run so a big business does not hold everyone up', async () => {
    const { svc, adapter, row } = setup(Array.from({ length: 150 }, (_, i) => order(i + 1)));
    adapter.getTracking.mockResolvedValue(update('in_transit'));
    await svc.syncAccount(row);
    expect(adapter.getTracking).toHaveBeenCalledTimes(100);
  });

  it('skips a business that is no longer on a paid plan', async () => {
    const { svc, adapter, row } = setup([order(1)], false);
    await svc.syncAccount(row);
    expect(adapter.getTracking).not.toHaveBeenCalled();
  });

  it('stops at once on a rejected key and records why', async () => {
    const { svc, adapter, accountRepo, row } = setup([order(1), order(2)]);
    adapter.getTracking.mockRejectedValue(new CourierApiError('The courier rejected this API key', true));
    await svc.syncAccount(row);
    expect(adapter.getTracking).toHaveBeenCalledTimes(1);
    expect(accountRepo.update).toHaveBeenCalledWith({ id: 3 }, { last_error: 'The courier rejected this API key' });
  });

  it('gives up after three failures in a row during an outage', async () => {
    const { svc, adapter, row } = setup([order(1), order(2), order(3), order(4), order(5)]);
    adapter.getTracking.mockRejectedValue(new CourierApiError('Could not reach the courier'));
    await svc.syncAccount(row);
    expect(adapter.getTracking).toHaveBeenCalledTimes(3);
  });

  it('moves the order, logged as the courier sync under the person who connected it', async () => {
    const { svc, adapter, cod, orderRepo, row } = setup([order(1)]);
    adapter.getTracking.mockResolvedValue(update('delivered', 'Delivered'));
    await svc.syncAccount(row);
    expect(cod.updateOrderStatus).toHaveBeenCalledWith({ sub: 9, tenant_id: 1 }, 1, 'delivered', expect.stringContaining('courier sync'));
    expect(orderRepo.update).toHaveBeenCalledWith({ id: 1, tenant_id: 1 }, expect.objectContaining({ courier_state: 'delivered', courier_attention: null, courier_status: 'Delivered' }));
  });

  it('flags a stock shortfall instead of failing the run or retrying', async () => {
    const { svc, adapter, cod, orderRepo, row } = setup([order(1), order(2)]);
    adapter.getTracking.mockResolvedValue(update('delivered'));
    cod.updateOrderStatus.mockRejectedValueOnce(new ConflictException('INSUFFICIENT_STOCK'));
    await svc.syncAccount(row);
    expect(orderRepo.update).toHaveBeenCalledWith({ id: 1, tenant_id: 1 }, expect.objectContaining({ courier_attention: 'INSUFFICIENT_STOCK', courier_state: 'delivered' }));
    expect(cod.updateOrderStatus).toHaveBeenCalledTimes(2);
  });

  it('does not repeat a state it already acted on, so a staff correction sticks', async () => {
    const { svc, adapter, cod, row } = setup([order(1, { courier_state: 'delivered', status: 'ongoing' })]);
    adapter.getTracking.mockResolvedValue(update('delivered'));
    await svc.syncAccount(row);
    expect(cod.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('flags a parcel the courier does not know, and clears that once it does', async () => {
    const { svc, adapter, orderRepo, row } = setup([order(1)]);
    adapter.getTracking.mockResolvedValue(null);
    await svc.syncAccount(row);
    expect(orderRepo.update).toHaveBeenCalledWith({ id: 1, tenant_id: 1 }, expect.objectContaining({ courier_attention: 'NOT_FOUND' }));

    const next = setup([order(1, { courier_attention: 'NOT_FOUND', courier_state: 'in_transit' })]);
    next.adapter.getTracking.mockResolvedValue(update('in_transit'));
    await next.svc.syncAccount(next.row);
    expect(next.orderRepo.update).toHaveBeenCalledWith({ id: 1, tenant_id: 1 }, expect.objectContaining({ courier_attention: null }));
  });
});
