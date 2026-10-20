import { Type } from 'class-transformer';
import {
  IsString, IsOptional, IsNumber, IsInt, Min, MaxLength, MinLength, IsBoolean, IsIn, IsArray,
  ValidateNested, ArrayMaxSize, Matches, IsNotEmpty,
} from 'class-validator';
import { COD_ORDER_STATUSES, CodOrderStatus } from '../../database/entities/cod-order.entity';

export const COD_BUSINESS_TYPES = [
  'fashion', 'electronics', 'beauty', 'food', 'grocery', 'home', 'kids', 'jewellery', 'health', 'books', 'auto', 'general',
] as const;

export class UpdateCodBusinessDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(500) logo_url?: string | null;
  @IsOptional() @IsIn(COD_BUSINESS_TYPES as unknown as string[]) business_type?: string;
  @IsOptional() @IsString() @MaxLength(100) tagline?: string;
  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) brand_color?: string;
  @IsOptional() @IsString() @MaxLength(300) invoice_footer?: string;
  @IsOptional() @IsBoolean() imports_goods?: boolean;
}

export class ChangePasswordDto {
  @IsString() current_password: string;
  @IsString() @MinLength(8) password: string;
}

export class SaveCodItemDto {
  @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @IsString() @IsNotEmpty() @MaxLength(100) sku: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() @MaxLength(500) image_url?: string | null;
  @IsOptional() @IsIn(['LKR', 'USD', 'CNY']) cost_currency?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) buying_price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) exchange_rate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) shipping_cost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) customs_price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) other_cost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) selling_price?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stock_quantity?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) low_stock_threshold?: number;
}

export class SaveCodExpenseDto {
  @IsString() @IsNotEmpty() @MaxLength(255) title: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) expense_date?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}

export class CodOrderLineDto {
  @Type(() => Number) @IsInt() item_id: number;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) unit_price: number;
}

export class CreateCodOrderDto {
  @IsString() @IsNotEmpty() @MaxLength(255) customer_name: string;
  @IsOptional() @IsString() @MaxLength(40) customer_phone?: string;
  @IsOptional() @IsString() @MaxLength(300) customer_address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) delivery_charge?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => CodOrderLineDto) lines: CodOrderLineDto[];
}

export class UpdateCodOrderStatusDto {
  @IsIn(COD_ORDER_STATUSES as unknown as string[]) status: CodOrderStatus;
}

export class BulkCodOrderStatusDto {
  @IsArray() @ArrayMaxSize(2000) @Type(() => Number) @IsInt({ each: true }) ids: number[];
  @IsIn(COD_ORDER_STATUSES as unknown as string[]) status: CodOrderStatus;
}
