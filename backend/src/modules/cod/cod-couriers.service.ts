import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CodCourier } from '../../database/entities/cod-courier.entity';

const PLACEHOLDER = '{tracking}';
const PHONE_PLACEHOLDER = '{phone}';

const badRequest = (code: string) => new BadRequestException({ statusCode: 400, code, message: code });
const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');
const nameKey = (name: string) => cleanName(name).toLowerCase();

/** Only http(s) pages on a fixed host: the link is opened in the browsers of the business's staff. */
export function isValidTrackingUrl(template: string): boolean {
  try {
    const url = new URL(template);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password && !/[{}]/.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * The link for one parcel. No tracking number means no link, even for a page that doesn't take the number.
 * `{phone}` is for couriers whose page also asks for the receiver's phone.
 */
export function buildTrackingLink(template: string | null | undefined, tracking: string | null | undefined, phone?: string | null): string | null {
  const number = tracking?.trim();
  if (!template || !number || !isValidTrackingUrl(template)) return null;
  return template.split(PLACEHOLDER).join(encodeURIComponent(number)).split(PHONE_PLACEHOLDER).join(encodeURIComponent(phone?.trim() ?? ''));
}

/** Empty means "no link"; anything else has to be a usable link. */
function cleanTrackingUrl(url: string | null | undefined): string | null {
  const value = url?.trim();
  if (!value) return null;
  if (!isValidTrackingUrl(value)) throw badRequest('COURIER_URL_INVALID');
  return value;
}

function requireName(name: string | undefined): string {
  const value = cleanName(name ?? '');
  if (!value) throw badRequest('COURIER_NAME');
  return value;
}

type CourierInput = { name?: string; tracking_url?: string | null };

@Injectable()
export class CodCouriersService {
  constructor(@InjectRepository(CodCourier) private repo: Repository<CodCourier>) {}

  private view(c: CodCourier) {
    return { id: c.id, name: c.name, tracking_url: c.tracking_url, is_custom: c.tenant_id !== null };
  }

  /** What the tenant can choose from: the shared list, then their own couriers. */
  async listForTenant(tenantId: number) {
    const rows = await this.repo.find({ where: [{ tenant_id: IsNull(), is_active: true }, { tenant_id: tenantId, is_active: true }] });
    const rank = (c: CodCourier) => (c.tenant_id === null ? 0 : 1);
    return rows
      .sort((a, b) => rank(a) - rank(b) || a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .map(c => this.view(c));
  }

  /**
   * Adds a tenant's own courier. Safe to repeat: typing a name that's already available returns that courier
   * (so the shared list isn't duplicated and a retried order form doesn't add a second row), and typing the
   * name of one they removed brings it back.
   */
  async addCustom(tenantId: number, dto: CourierInput) {
    const name = requireName(dto.name);
    const tracking_url = cleanTrackingUrl(dto.tracking_url);
    const rows = await this.repo.find({ where: [{ tenant_id: IsNull() }, { tenant_id: tenantId }] });
    const same = rows.filter(c => nameKey(c.name) === nameKey(name));
    const available = same.find(c => c.is_active);
    if (available) return this.view(available);
    const archived = same.find(c => c.tenant_id === tenantId);
    if (archived) {
      archived.is_active = true;
      archived.name = name;
      if (tracking_url) archived.tracking_url = tracking_url;
      return this.view(await this.repo.save(archived));
    }
    return this.view(await this.repo.save(this.repo.create({ tenant_id: tenantId, name, tracking_url, is_active: true, sort_order: 0 })));
  }

  private async findCustom(tenantId: number, id: number) {
    const courier = await this.repo.findOne({ where: { id, tenant_id: tenantId, is_active: true } });
    if (!courier) throw new NotFoundException('Courier not found');
    return courier;
  }

  async updateCustom(tenantId: number, id: number, dto: CourierInput) {
    const courier = await this.findCustom(tenantId, id);
    if (dto.name !== undefined) {
      const name = requireName(dto.name);
      const rows = await this.repo.find({ where: [{ tenant_id: IsNull(), is_active: true }, { tenant_id: tenantId, is_active: true }] });
      if (rows.some(c => c.id !== id && nameKey(c.name) === nameKey(name))) throw this.duplicate();
      courier.name = name;
    }
    if (dto.tracking_url !== undefined) courier.tracking_url = cleanTrackingUrl(dto.tracking_url);
    return this.view(await this.repo.save(courier));
  }

  async archiveCustom(tenantId: number, id: number) {
    const courier = await this.findCustom(tenantId, id);
    courier.is_active = false;
    await this.repo.save(courier);
    return { ok: true };
  }

  private duplicate() {
    return new ConflictException({ statusCode: 409, code: 'COURIER_DUPLICATE', message: 'COURIER_DUPLICATE' });
  }

  /**
   * Stops an order pointing at another tenant's courier or a removed one. An order may keep the courier it
   * already has, even after that courier has been removed.
   */
  async assertUsable(tenantId: number, courierId: number | null | undefined, currentId: number | null = null) {
    if (courierId === null || courierId === undefined || courierId === currentId) return;
    const found = await this.repo.findOne({
      where: [{ id: courierId, tenant_id: IsNull(), is_active: true }, { id: courierId, tenant_id: tenantId, is_active: true }],
    });
    if (!found) throw badRequest('COURIER_NOT_FOUND');
  }

  /** Couriers by id for displaying orders; includes removed ones so old orders keep their name. */
  async byIds(ids: Array<number | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is number => id !== null && id !== undefined))];
    const rows = unique.length ? await this.repo.find({ where: { id: In(unique) } }) : [];
    return new Map(rows.map(c => [c.id, c]));
  }

  // ── shared list (super admin) ──

  listShared() {
    return this.repo.find({ where: { tenant_id: IsNull() }, order: { sort_order: 'ASC', name: 'ASC' } });
  }

  private async assertSharedNameFree(name: string, exceptId?: number) {
    const rows = await this.repo.find({ where: { tenant_id: IsNull() } });
    if (rows.some(c => c.id !== exceptId && nameKey(c.name) === nameKey(name))) throw this.duplicate();
  }

  async createShared(dto: CourierInput) {
    const name = requireName(dto.name);
    const tracking_url = cleanTrackingUrl(dto.tracking_url);
    await this.assertSharedNameFree(name);
    const rows = await this.repo.find({ where: { tenant_id: IsNull() } });
    const sort_order = rows.reduce((max, c) => Math.max(max, c.sort_order), 0) + 10;
    return this.repo.save(this.repo.create({ tenant_id: null, name, tracking_url, is_active: true, sort_order }));
  }

  async updateShared(id: number, dto: CourierInput & { is_active?: boolean }) {
    const courier = await this.repo.findOne({ where: { id, tenant_id: IsNull() } });
    if (!courier) throw new NotFoundException('Courier not found');
    if (dto.name !== undefined) {
      const name = requireName(dto.name);
      await this.assertSharedNameFree(name, id);
      courier.name = name;
    }
    if (dto.tracking_url !== undefined) courier.tracking_url = cleanTrackingUrl(dto.tracking_url);
    if (dto.is_active !== undefined) courier.is_active = dto.is_active;
    return this.repo.save(courier);
  }
}
