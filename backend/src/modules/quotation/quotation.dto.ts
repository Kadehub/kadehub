import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateQuotationDto {
  @IsString() @MinLength(2) contact_name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() business_type?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() budget_range?: string;
}

export class UpdateQuotationDto {
  @IsOptional() @IsEnum(['new', 'sent', 'accepted', 'rejected', 'converted']) status?: string;
  @IsOptional() @IsNumber() package_id?: number;
  @IsOptional() @IsNumber() quoted_amount?: number;
  @IsOptional() @IsString() valid_until?: string;
  @IsOptional() @IsString() notes?: string;
}
