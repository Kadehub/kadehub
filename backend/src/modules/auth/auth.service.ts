import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { CloudflareService } from '../../common/cloudflare.service';
import { BillingService } from '../billing/billing.service';
import { LoginDto, RegisterDto, PinLoginDto } from './auth.dto';

const PIN_LOGIN_MAX_ATTEMPTS = 5;
const PIN_LOGIN_LOCKOUT_MS = 5 * 60 * 1000;

@Injectable()
export class AuthService {
  // In-memory PIN brute-force guard, keyed by tenant slug. Resets on restart —
  // acceptable for this single-instance deployment; the goal is to blunt
  // automated guessing of a 4-6 digit PIN, not to be a durable audit trail.
  private pinAttempts = new Map<string, { count: number; lockedUntil: number }>();

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    private jwtService: JwtService,
    private cloudflare: CloudflareService,
    private billingService: BillingService,
  ) {}

  async register(dto: RegisterDto) {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const slug = dto.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + randomSuffix;

    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const subdomainTaken = await this.tenantRepo.findOne({ where: { subdomain: dto.subdomain } });
    if (subdomainTaken) throw new ConflictException('Subdomain already taken');

    // 1. Save tenant — active immediately with free trial
    const tenant = this.tenantRepo.create({ name: dto.shopName, slug, subdomain: dto.subdomain, status: 'active' });
    await this.tenantRepo.save(tenant);

    // 2. Create Cloudflare DNS record — roll back tenant on failure
    let dnsRecordId: string | null = null;
    try {
      dnsRecordId = await this.cloudflare.createSubdomain(dto.subdomain);
    } catch (err) {
      await this.tenantRepo.delete(tenant.id);
      throw new InternalServerErrorException(`Subdomain DNS setup failed: ${err.message}`);
    }

    if (dnsRecordId) {
      tenant.plan_note = JSON.stringify({ ...this.parsePlanNote(tenant.plan_note), cf_dns_record_id: dnsRecordId });
      await this.tenantRepo.save(tenant);
    }

    // 3. Create ADMIN user
    const hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ tenant_id: tenant.id, name: dto.name, email: dto.email, password_hash: hash, role: 'ADMIN' });
    await this.userRepo.save(user);

    // 14-day full-access trial — no upfront payment
    await this.billingService.activateTrial(tenant.id);

    return {
      ...this.signToken(user),
      subdomain: dto.subdomain,
      shop_url: `https://${dto.subdomain}.${process.env.CLOUDFLARE_BASE_DOMAIN || 'kadehub.com'}`,
      trial_activated: true,
      trial_days: 14,
    };
  }

  private parsePlanNote(note: string | null): Record<string, any> {
    try { return note ? JSON.parse(note) : {}; } catch { return {}; }
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email })
      .getOne();
    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // SUPER_ADMIN has no shop to block — skip tenant check
    if (user.role !== 'SUPER_ADMIN') {
      const tenant = await this.tenantRepo.findOne({ where: { id: user.tenant_id } });
      if (tenant?.status === 'blocked') {
        throw new UnauthorizedException('Your shop has been blocked. Contact support.');
      }
    }
    return this.signToken(user);
  }

  private signToken(user: User) {
    const payload = { sub: user.id, tenant_id: user.tenant_id, role: user.role, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, role: user.role, tenant_id: user.tenant_id },
    };
  }

  async pinLogin(dto: PinLoginDto) {
    const key = dto.tenant_slug.toLowerCase();
    const attempt = this.pinAttempts.get(key);
    if (attempt?.lockedUntil && attempt.lockedUntil > Date.now()) {
      const waitMin = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
      throw new UnauthorizedException(`Too many failed attempts. Try again in ${waitMin} minute(s).`);
    }

    const tenant = await this.tenantRepo.findOne({ where: { slug: dto.tenant_slug } });
    const candidates = tenant
      ? await this.userRepo.find({ where: { tenant_id: tenant.id }, select: ['id', 'tenant_id', 'name', 'role', 'pin'] })
      : [];

    let match: User | undefined;
    for (const candidate of candidates) {
      if (candidate.pin && (await bcrypt.compare(dto.pin, candidate.pin))) {
        match = candidate;
        break;
      }
    }

    if (!match) {
      const count = (attempt?.count || 0) + 1;
      const lockedUntil = count >= PIN_LOGIN_MAX_ATTEMPTS ? Date.now() + PIN_LOGIN_LOCKOUT_MS : 0;
      this.pinAttempts.set(key, { count, lockedUntil });
      throw new UnauthorizedException('Invalid PIN');
    }

    this.pinAttempts.delete(key);
    return this.signToken(match);
  }

  async checkSubdomain(subdomain: string) {
    const reserved = ['www', 'api', 'app', 'admin', 'mail', 'ftp', 'kadehub', 'support', 'billing', 'dashboard'];
    if (reserved.includes(subdomain)) return { available: false, reason: 'reserved' };
    const taken = await this.tenantRepo.findOne({ where: { subdomain } });
    return { available: !taken };
  }
}
