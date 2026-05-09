import { IsOptional, IsString, IsEmail, IsEnum, IsNumber, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCompanyDto {
  @IsOptional() @IsString() logo_url?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() tax_number?: string;
  @IsOptional() @IsString() currency?: string;
}

export class CreateSubscriptionDto {
  @Type(() => Number)
  @IsNumber()
  package_id: number;

  @IsEnum(['monthly', 'yearly'])
  billing_cycle: 'monthly' | 'yearly';

  @IsEnum(['paypal', 'card', 'bank', 'bank_transfer', 'onepay'])
  gateway: 'paypal' | 'card' | 'bank' | 'bank_transfer' | 'onepay';

  @IsOptional() @IsString() gateway_ref?: string;

  @IsOptional() @IsEnum(['LKR', 'USD']) currency?: 'LKR' | 'USD';

  @IsOptional() @IsNumber() registration_fee?: number;
}

export class InitiateOnepayDto {
  @Type(() => Number)
  @IsNumber()
  package_id: number;

  @IsEnum(['monthly', 'yearly'])
  billing_cycle: 'monthly' | 'yearly';

  @IsOptional() @IsNumber() registration_fee?: number;
}

export class BankTransferDto {
  @Type(() => Number)
  @IsInt() @Min(1)
  package_id: number;

  @IsEnum(['monthly', 'yearly'])
  billing_cycle: 'monthly' | 'yearly';

  @IsString()
  depositor_name: string;

  @IsString()
  slip_reference: string;

  @IsOptional() @IsString() notes?: string;
}
