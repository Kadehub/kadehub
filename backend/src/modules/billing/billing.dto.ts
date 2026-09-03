import { IsOptional, IsString, IsEmail, IsEnum, IsNumber, IsInt, Min, MinLength } from 'class-validator';
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
  @IsEnum(['registration_fee', 'subscription'])
  type: 'registration_fee' | 'subscription';

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1)
  package_id?: number;

  @IsOptional()
  @IsEnum(['monthly', 'yearly'])
  billing_cycle?: 'monthly' | 'yearly';

  @IsString()
  @MinLength(2)
  depositor_name: string;

  @IsOptional() @IsString()
  slip_reference?: string;

  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  registration_fee?: number;
}

export class UpdateBankDetailsDto {
  @IsOptional() @IsString() bank_name?: string;
  @IsOptional() @IsString() account_name?: string;
  @IsOptional() @IsString() account_number?: string;
  @IsOptional() @IsString() branch?: string;
  @IsOptional() @IsString() instructions?: string;
}

export class RejectBankTransferDto {
  @IsOptional() @IsString() reason?: string;
}
