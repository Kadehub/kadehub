import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const slug = dto.shopName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const tenant = this.tenantRepo.create({ name: dto.shopName, slug });
    await this.tenantRepo.save(tenant);

    const modules = ['pos', 'inventory', 'customer', 'analytics'];
    await this.subRepo.save(modules.map((m) => this.subRepo.create({ tenant_id: tenant.id, module_name: m })));

    const hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ tenant_id: tenant.id, name: dto.name, email: dto.email, password_hash: hash, role: 'ADMIN' });
    await this.userRepo.save(user);

    return this.signToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.signToken(user);
  }

  private signToken(user: User) {
    const payload = { sub: user.id, tenant_id: user.tenant_id, role: user.role, name: user.name };
    return { access_token: this.jwtService.sign(payload), user: { id: user.id, name: user.name, role: user.role, tenant_id: user.tenant_id } };
  }
}
