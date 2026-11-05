import { BadRequestException, BadGatewayException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { CodCourier } from '../../database/entities/cod-courier.entity';
import { CodCourierAccount } from '../../database/entities/cod-courier-account.entity';
import { CodOrder } from '../../database/entities/cod-order.entity';
import { CodShipmentEvent } from '../../database/entities/cod-shipment-event.entity';
import { CodAccountService } from './cod-account.service';
import { CodService } from './cod.service';
import { CourierApiError, ShipmentUpdate, courierAdapter } from './cod-courier-adapters';
import { CourierSecretMissing, decryptSecret, encryptSecret } from './cod-courier-secrets';
import { courierDecision } from './cod-courier-sync';

type Actor = { sub: number; tenant_id: number; role?: string };

const coded = (code: string) => ({ statusCode: 400, code, message: code });
const OPEN_STATUSES = ['pending', 'confirmed', 'ongoing'] as const;
const MAX_ORDERS_PER_RUN = 100;
const MAX_FAILURES_PER_RUN = 3;
const PAUSE_BETWEEN_CALLS_MS = 250;
const MANUAL_SYNC_COOLDOWN_MS = 60_000;

const isDuplicate = (err: any) =>
  err?.code === 'ER_DUP_ENTRY' || err?.code === '23505' || err?.driverError?.code === 'ER_DUP_ENTRY' || err?.driverError?.code === '23505';

/** Keeps orders in step with the couriers a business has connected, by polling (no courier offers us webhooks yet). */
@Injectable()
export class CodCourierSyncService {
  private readonly logger = new Logger(CodCourierSyncService.name);
  private running = false;
  /** Between calls to a courier, to stay polite to its API. */
  pauseMs = PAUSE_BETWEEN_CALLS_MS;

  constructor(
    @InjectRepository(CodCourier) private courierRepo: Repository<CodCourier>,
    @InjectRepository(CodCourierAccount) private accountRepo: Repository<CodCourierAccount>,
    @InjectRepository(CodOrder) private orderRepo: Repository<CodOrder>,
    @InjectRepository(CodShipmentEvent) private eventRepo: Repository<CodShipmentEvent>,
    private account: CodAccountService,
    private cod: CodService,
  ) {}

  // ── connecting a courier ──

  /** The couriers KadeHub can connect to, and whether this business has. The key itself is never returned. */
  async connections(tenantId: number) {
    const couriers = await this.courierRepo.find({ where: { tenant_id: IsNull(), is_active: true, adapter: Not(IsNull()) }, order: { sort_order: 'ASC' } });
    const accounts = couriers.length
      ? await this.accountRepo.find({ where: { tenant_id: tenantId, courier_id: In(couriers.map(c => c.id)) } })
      : [];
    const byCourier = new Map(accounts.map(a => [a.courier_id, a]));
    return couriers.map(c => {
      const a = byCourier.get(c.id);
      return { courier_id: c.id, name: c.name, connected: !!a?.api_key_enc, last_ok_at: a?.last_ok_at ?? null, last_error: a?.last_error ?? null };
    });
  }

  private async requirePremium(tenantId: number) {
    if (!(await this.account.isPremium(tenantId))) throw new BadRequestException(coded('PREMIUM_REQUIRED'));
  }

  /** Stores the key only after the courier has accepted it. */
  async connect(actor: Actor, courierId: number, apiKey: string) {
    await this.requirePremium(actor.tenant_id);
    const courier = await this.courierRepo.findOne({ where: { id: courierId, tenant_id: IsNull(), is_active: true } });
    const adapter = courierAdapter(courier?.adapter);
    if (!courier || !adapter) throw new NotFoundException('Courier not found');
    const key = apiKey.trim();
    if (!key) throw new BadRequestException(coded('COURIER_KEY_REQUIRED'));

    let encrypted: string;
    try {
      encrypted = encryptSecret(key);
    } catch (err) {
      if (err instanceof CourierSecretMissing) throw new ServiceUnavailableException({ statusCode: 503, code: 'COURIER_SECRET_MISSING', message: 'COURIER_SECRET_MISSING' });
      throw err;
    }
    try {
      await adapter.verifyKey(key);
    } catch (err) {
      if (!(err instanceof CourierApiError)) throw err;
      if (err.rejectedKey) throw new BadRequestException(coded('COURIER_KEY_REJECTED'));
      throw new BadGatewayException({ statusCode: 502, code: 'COURIER_UNREACHABLE', message: 'COURIER_UNREACHABLE' });
    }
    const row = await this.accountRepo.findOne({ where: { tenant_id: actor.tenant_id, courier_id: courierId } })
      ?? this.accountRepo.create({ tenant_id: actor.tenant_id, courier_id: courierId });
    row.api_key_enc = encrypted;
    row.connected_by = actor.sub;
    row.last_ok_at = new Date();
    row.last_error = null;
    await this.accountRepo.save(row);
    return { ok: true };
  }

  /** Forgets the key. Statement settings stay, and orders keep what was already synced. */
  async disconnect(tenantId: number, courierId: number) {
    const row = await this.accountRepo.findOne({ where: { tenant_id: tenantId, courier_id: courierId } });
    if (row) {
      row.api_key_enc = null;
      row.last_error = null;
      await this.accountRepo.save(row);
    }
    return { ok: true };
  }

  // ── syncing ──

  @Cron('*/30 * * * *')
  async runScheduled() {
    if (this.running || process.env.COD_COURIER_SYNC_DISABLED === 'true') return;
    this.running = true;
    try {
      const accounts = await this.accountRepo.find({ where: { api_key_enc: Not(IsNull()) } });
      for (const account of accounts) {
        try {
          await this.syncAccount(account);
        } catch (err) {
          this.logger.warn(`courier sync failed for account ${account.id}: ${(err as Error).message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** The longest-waiting open parcels first, so a business with many orders gets through them all over several runs. */
  async syncAccount(account: CodCourierAccount) {
    if (!(await this.account.isPremium(account.tenant_id))) return { checked: 0 };
    const courier = await this.courierRepo.findOne({ where: { id: account.courier_id } });
    const adapter = courierAdapter(courier?.adapter);
    if (!courier || !adapter || !account.api_key_enc) return { checked: 0 };

    const apiKey = decryptSecret(account.api_key_enc);
    const open = await this.orderRepo.find({
      where: { tenant_id: account.tenant_id, courier_id: account.courier_id, status: In([...OPEN_STATUSES]), tracking_number: Not(IsNull()) },
    });
    const queue = open
      .sort((a, b) => (a.courier_synced_at?.getTime() ?? 0) - (b.courier_synced_at?.getTime() ?? 0))
      .slice(0, MAX_ORDERS_PER_RUN);

    let checked = 0;
    let failures = 0;
    let lastError: string | null = null;
    for (const order of queue) {
      try {
        await this.syncOrder(order, account, courier.name, await adapter.getTracking(order.tracking_number!, apiKey));
        checked++;
        failures = 0;
        lastError = null;
      } catch (err) {
        if (!(err instanceof CourierApiError)) throw err;
        lastError = err.message;
        // A bad key or an outage fails every parcel: stop rather than hammer the courier
        if (err.rejectedKey || ++failures >= MAX_FAILURES_PER_RUN) break;
      }
      await new Promise(res => setTimeout(res, this.pauseMs));
    }
    await this.accountRepo.update({ id: account.id }, { last_error: lastError, ...(checked ? { last_ok_at: new Date() } : {}) });
    return { checked };
  }

  private async saveEvents(order: CodOrder, update: ShipmentUpdate) {
    if (!update.events.length) return;
    const known = new Set((await this.eventRepo.find({ where: { order_id: order.id, tenant_id: order.tenant_id }, select: ['event_key'] })).map(e => e.event_key));
    for (const e of update.events) {
      if (known.has(e.key)) continue;
      known.add(e.key);
      await this.eventRepo.insert({
        tenant_id: order.tenant_id, order_id: order.id, event_key: e.key, status: e.status, occurred_at: e.occurred_at, note: e.note,
      }).catch(err => { if (!isDuplicate(err)) throw err; });
    }
  }

  /** Applies one courier reply. Each state acts once, so a status staff corrected by hand isn't changed back. */
  private async syncOrder(order: CodOrder, account: CodCourierAccount, courierName: string, update: ShipmentUpdate | null) {
    const where = { id: order.id, tenant_id: order.tenant_id };
    const now = new Date();
    if (!update) {
      await this.orderRepo.update(where, { courier_synced_at: now, courier_attention: 'NOT_FOUND' });
      return;
    }
    await this.saveEvents(order, update);
    const changes: Partial<CodOrder> = { courier_status: update.status, courier_synced_at: now };
    if (update.state !== order.courier_state) {
      const decision = courierDecision(order.status, update.state);
      let attention: string | null = decision.attention;
      if (decision.status && decision.status !== order.status) {
        const actor = { sub: account.connected_by ?? order.created_by ?? 0, tenant_id: order.tenant_id };
        try {
          await this.cod.updateOrderStatus(actor, order.id, decision.status, `courier sync: ${courierName} "${update.status}"`);
        } catch (err) {
          // The parcel has already gone, so retrying can't help: leave it for someone to fix the stock count
          if (!(err instanceof ConflictException)) throw err;
          attention = 'INSUFFICIENT_STOCK';
        }
      }
      changes.courier_state = update.state;
      changes.courier_attention = attention;
    } else if (order.courier_attention === 'NOT_FOUND') {
      changes.courier_attention = null;
    }
    await this.orderRepo.update(where, changes);
  }

  /** The "Check now" button on an order. */
  async syncOrderNow(actor: Actor, orderId: number) {
    await this.requirePremium(actor.tenant_id);
    const order = await this.orderRepo.findOne({ where: { id: orderId, tenant_id: actor.tenant_id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.courier_id || !order.tracking_number) throw new BadRequestException(coded('COURIER_NOT_CONNECTED'));
    const account = await this.accountRepo.findOne({ where: { tenant_id: actor.tenant_id, courier_id: order.courier_id } });
    const courier = await this.courierRepo.findOne({ where: { id: order.courier_id } });
    const adapter = courierAdapter(courier?.adapter);
    if (!account?.api_key_enc || !adapter || !courier) throw new BadRequestException(coded('COURIER_NOT_CONNECTED'));
    if (order.courier_synced_at && Date.now() - order.courier_synced_at.getTime() < MANUAL_SYNC_COOLDOWN_MS) return { ok: true, skipped: true };
    try {
      await this.syncOrder(order, account, courier.name, await adapter.getTracking(order.tracking_number, decryptSecret(account.api_key_enc)));
    } catch (err) {
      if (!(err instanceof CourierApiError)) throw err;
      await this.accountRepo.update({ id: account.id }, { last_error: err.message });
      throw new BadGatewayException({ statusCode: 502, code: 'COURIER_UNREACHABLE', message: 'COURIER_UNREACHABLE' });
    }
    return { ok: true, skipped: false };
  }
}
