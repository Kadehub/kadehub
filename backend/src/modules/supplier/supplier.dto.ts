import { IsString, IsOptional, IsEmail, IsInt, IsNumber, IsArray, ValidateNested, Min, Matches, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplierDto {
  @IsString() @MaxLength(200) name: string;
  @IsOptional() @IsString() @MaxLength(100) contact_person?: string;
  @IsOptional() @IsString() @Matches(/^\+?[\d\s\-]{7,15}$/, { message: 'Invalid phone number' }) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSupplierDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(100) contact_person?: string;
  @IsOptional() @IsString() @Matches(/^\+?[\d\s\-]{7,15}$/, { message: 'Invalid phone number' }) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() is_active?: boolean;
}

export class PurchaseOrderItemDto {
  @IsInt() product_id: number;
  @IsInt() @Min(1) quantity: number;
  @IsNumber() @Min(0) cost: number;
}

export class CreatePurchaseOrderDto {
  @IsInt() supplier_id: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PurchaseOrderItemDto) items: PurchaseOrderItemDto[];
  @IsOptional() @IsString() notes?: string;
}
