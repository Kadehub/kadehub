import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateBatchDto {
  @IsNumber() product_id: number;
  @IsString() batch_number: string;
  @IsNumber() @Min(1) quantity: number;
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsDateString() manufactured_date?: string;
  @IsOptional() @IsDateString() expiry_date?: string;
}
