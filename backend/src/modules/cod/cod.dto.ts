import { Type } from 'class-transformer';
import {
  IsString, IsOptional, IsNumber, IsInt, Min, Max, MaxLength, MinLength, IsBoolean, IsIn, IsArray,
  ValidateNested, ArrayMaxSize, Matches, IsNotEmpty,
} from 'class-validator';
import {
  COD_ORDER_STATUSES, CodOrderStatus, COD_PAYMENT_TYPES, CodPaymentType, COD_CUSTOMER_TYPES, CodCustomerType,
} from '../../database/entities/cod-order.entity';
import { COD_PAYMENT_METHODS, CodPaymentMethod } from '../../database/entities/cod-credit-payment.entity';

import { MAX_AMOUNT } from './cod-orders-calc';

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
  /** Catalogue item; omit / null for a custom (off-catalogue) line */
  @IsOptional() @Type(() => Number) @IsInt() item_id?: number | null;
  /** Required for custom lines; ignored for catalogue lines (the item's name is snapshotted) */
  @IsOptional() @IsString() @MaxLength(255) custom_name?: string | null;
  // No arbitrary cap: the order rules reject only what the INT column can't hold (QUANTITY_TOO_LARGE)
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_AMOUNT, { message: 'AMOUNT_TOO_LARGE' }) unit_price: number;
}

/** Fields shared by create and edit. */
export class SaveCodOrderDto {
  @IsString() @IsNotEmpty() @MaxLength(255) customer_name: string;
  @IsOptional() @IsString() @MaxLength(40) customer_phone?: string;
  @IsOptional() @IsString() @MaxLength(255) customer_email?: string | null;
  @IsOptional() @IsString() @MaxLength(300) customer_address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_AMOUNT, { message: 'AMOUNT_TOO_LARGE' }) delivery_charge?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_AMOUNT, { message: 'AMOUNT_TOO_LARGE' }) discount?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
  @IsOptional() @IsIn(COD_PAYMENT_TYPES as unknown as string[]) payment_type?: CodPaymentType;
  @IsOptional() @IsIn(COD_CUSTOMER_TYPES as unknown as string[]) customer_type?: CodCustomerType;
  @IsOptional() @IsString() @MaxLength(100) po_number?: string | null;
  @IsOptional() @IsString() @MaxLength(100) tracking_number?: string | null;
  // Credit terms (only kept when payment_type = credit)
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3650) credit_period_days?: number | null;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) payment_due_date?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) credit_note?: string | null;
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => CodOrderLineDto) lines: CodOrderLineDto[];
}

export class CreateCodOrderDto extends SaveCodOrderDto {
  /** Status to create the order in (default pending). Delivered is applied after insert so stock moves. */
  @IsOptional() @IsIn(COD_ORDER_STATUSES as unknown as string[]) status?: CodOrderStatus;
  /** Credit orders: money received at sale, recorded as the first credit payment */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_AMOUNT, { message: 'AMOUNT_TOO_LARGE' }) initial_payment?: number;
  @IsOptional() @IsIn(COD_PAYMENT_METHODS as unknown as string[]) initial_payment_method?: CodPaymentMethod;
  @IsOptional() @Type(() => Number) @IsInt() reordered_from_order_id?: number | null;
}

export class UpdateCodOrderDto extends SaveCodOrderDto {}

export class CodTrackingDto {
  @IsOptional() @IsString() @MaxLength(100) tracking_number?: string | null;
}

export class AddCreditPaymentDto {
  @Type(() => Number) @IsNumber() @Min(0.01) @Max(MAX_AMOUNT, { message: 'AMOUNT_TOO_LARGE' }) amount: number;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) payment_date?: string;
  @IsOptional() @IsIn(COD_PAYMENT_METHODS as unknown as string[]) method?: CodPaymentMethod;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string | null;
}

export class SettleCreditDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) payment_date?: string;
  @IsOptional() @IsIn(COD_PAYMENT_METHODS as unknown as string[]) method?: CodPaymentMethod;
}

export class UpdateCodOrderStatusDto {
  @IsIn(COD_ORDER_STATUSES as unknown as string[]) status: CodOrderStatus;
}

export class BulkCodOrderStatusDto {
  @IsArray() @ArrayMaxSize(2000) @Type(() => Number) @IsInt({ each: true }) ids: number[];
  @IsIn(COD_ORDER_STATUSES as unknown as string[]) status: CodOrderStatus;
}
