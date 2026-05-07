import { IsInt, IsNumber, IsOptional, IsDateString, IsEnum, Min } from 'class-validator';

export class CreateCreditSaleDto {
  @IsInt() sale_id: number;
  @IsInt() customer_id: number;
  @IsNumber() @Min(0.01) amount_due: number;
  @IsOptional() @IsDateString() due_date?: string;
}

export class RecordPaymentDto {
  @IsNumber() @Min(0.01) amount: number;
  @IsEnum(['CASH', 'CARD', 'LANKAQR'], { message: 'Invalid payment method' }) payment_method: string;
}
