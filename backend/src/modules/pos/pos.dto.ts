import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, ValidateNested, Min, ArrayMinSize, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @IsInt() product_id: number;
  @IsInt() @Min(1) quantity: number;
  @IsNumber() @Min(0) price: number;
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Cart must have at least one item' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsEnum(['CASH', 'CARD', 'LANKAQR', 'CREDIT'], { message: 'Invalid payment method' })
  payment_method: string;

  @IsOptional() @IsInt() customer_id?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsDateString() due_date?: string;
}
