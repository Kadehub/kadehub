import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { User } from '../../database/entities/user.entity';
import { Package } from '../../database/entities/package.entity';
import { CompanyProfile } from '../../database/entities/company-profile.entity';
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';
import * as bcrypt from 'bcryptjs';

export class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() role: 'ADMIN' | 'CASHIER';
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() emp_no?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsString() role?: 'ADMIN' | 'CASHIER';
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() emp_no?: string;
}

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    @InjectRepository(CompanyProfile) private profileRepo: Repository<CompanyProfile>,
  ) {}

  async getTenant(tenantId: number) {
    return this.tenantRepo.findOne({ where: { id: tenantId } });
  }

  async getSubscriptions(tenantId: number) {
    return this.subRepo.find({ where: { tenant_id: tenantId } });
  }

  async getUsers(tenantId: number) {
    return this.userRepo.find({ where: { tenant_id: tenantId }, select: ['id', 'name', 'email', 'role', 'phone', 'emp_no', 'photo_url', 'created_at'] });
  }

  async updateUser(tenantId: number, userId: number, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id: userId, tenant_id: tenantId } });
    if (!user) throw new NotFoundException('Employee not found');
    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email;
    if (dto.role) user.role = dto.role;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.emp_no !== undefined) user.emp_no = dto.emp_no;
    if (dto.password) user.password_hash = await bcrypt.hash(dto.password, 10);
    return this.userRepo.save(user);
  }

  async updateCompanyLogo(tenantId: number, logoUrl: string) {
    let profile = await this.profileRepo.findOne({ where: { tenant_id: tenantId } });
    if (!profile) profile = this.profileRepo.create({ tenant_id: tenantId });
    profile.logo_url = logoUrl;
    return this.profileRepo.save(profile);
  }

  async updateUserPhoto(tenantId: number, userId: number, photoUrl: string) {
    const user = await this.userRepo.findOne({ where: { id: userId, tenant_id: tenantId } });
    if (!user) throw new NotFoundException('Employee not found');
    user.photo_url = photoUrl;
    return this.userRepo.save(user);
  }

  async createUser(tenantId: number, dto: CreateUserDto) {
    // Enforce employee limit based on active package
    const activeSub = await this.subRepo.findOne({ where: { tenant_id: tenantId, status: 'active', payment_status: 'paid' } });
    if (activeSub?.package_id) {
      const pkg = await this.packageRepo.findOne({ where: { id: activeSub.package_id } });
      if (pkg?.employee_limit !== null && pkg?.employee_limit !== undefined) {
        const currentCount = await this.userRepo.count({ where: { tenant_id: tenantId } });
        if (currentCount >= pkg.employee_limit) {
          throw new BadRequestException(`Employee limit reached (${pkg.employee_limit}) for your ${pkg.name} plan. Please upgrade.`);
        }
      }
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ tenant_id: tenantId, name: dto.name, email: dto.email, password_hash: hash, role: dto.role });
    return this.userRepo.save(user);
  }
}
