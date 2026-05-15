import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { CloudflareService } from '../../common/cloudflare.service';
import { LoginDto, RegisterDto, PinLoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    private jwtService: JwtService,
    private cloudflare: CloudflareService,
  ) {}

  async register(dto: RegisterDto) {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const slug = dto.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + randomSuffix;

    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const subdomainTaken = await this.tenantRepo.findOne({ where: { subdomain: dto.subdomain } });
    if (subdomainTaken) throw new ConflictException('Subdomain already taken');

    // 1. Save tenant (status: suspended until registration fee is paid)
    const tenant = this.tenantRepo.create({ name: dto.shopName, slug, subdomain: dto.subdomain, status: 'suspended' });
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

    // NOTE: No trial subscriptions created here.
    // Trial is activated only after the LKR 25,000 registration fee is paid.
    // Frontend redirects to /register/pay after this step.

    return {
      ...this.signToken(user),
      subdomain: dto.subdomain,
      shop_url: `https://${dto.subdomain}.${process.env.CLOUDFLARE_BASE_DOMAIN || 'kadehub.com'}`,
      requires_registration_fee: true,
    };
  }

  private parsePlanNote(note: string | null): Record<string, any> {
    try { return note ? JSON.parse(note) : {}; } catch { return {}; }
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
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
    const tenant = await this.tenantRepo.findOne({ where: { slug: dto.tenant_slug } });
    if (!tenant) throw new UnauthorizedException('Shop not found');
    const user = await this.userRepo.findOne({ where: { tenant_id: tenant.id, pin: dto.pin } });
    if (!user) throw new UnauthorizedException('Invalid PIN');
    return this.signToken(user);
  }

  async checkSubdomain(subdomain: string) {
    const reserved = ['www', 'api', 'app', 'admin', 'mail', 'ftp', 'kadehub', 'support', 'billing', 'dashboard'];
    if (reserved.includes(subdomain)) return { available: false, reason: 'reserved' };
    const taken = await this.tenantRepo.findOne({ where: { subdomain } });
    return { available: !taken };
  }
}
