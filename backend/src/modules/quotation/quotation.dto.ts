import { IsArray, IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuotationLineItemDto {
  @IsString() description: string;
  @IsOptional() @IsNumber() quantity?: number;
  @IsNumber() unit_price: number;
}

export class CreateQuotationDto {
  @IsString() @MinLength(2) contact_name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() business_type?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() budget_range?: string;
}

export class AdminCreateQuotationDto {
  @IsString() @MinLength(2) contact_name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() business_type?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() package_id?: number;
  @IsOptional() @IsEnum(['monthly', 'yearly']) billing_cycle?: string;
  @IsOptional() @IsNumber() quoted_amount?: number;
  @IsOptional() @IsString() valid_until?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => QuotationLineItemDto) line_items?: QuotationLineItemDto[];
  @IsOptional() @IsBoolean() include_registration_fee?: boolean;
}

export class UpdateQuotationDto {
  @IsOptional() @IsString() contact_name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() business_type?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['new', 'sent', 'accepted', 'rejected', 'converted']) status?: string;
  @IsOptional() @IsNumber() package_id?: number;
  @IsOptional() @IsEnum(['monthly', 'yearly']) billing_cycle?: string;
  @IsOptional() @IsNumber() quoted_amount?: number;
  @IsOptional() @IsString() valid_until?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => QuotationLineItemDto) line_items?: QuotationLineItemDto[];
}
