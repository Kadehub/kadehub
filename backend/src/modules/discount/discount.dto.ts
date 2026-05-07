import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateDiscountDto {
  @IsString() name: string;
  @IsEnum(['percentage', 'fixed']) type: string;
  @IsNumber() @Min(0) value: number;
  @IsOptional() @IsNumber() @Min(0) min_purchase?: number;
  @IsOptional() @IsDateString() valid_from?: string;
  @IsOptional() @IsDateString() valid_to?: string;
}

export class UpdateDiscountDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(['percentage', 'fixed']) type?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsNumber() @Min(0) min_purchase?: number;
  @IsOptional() is_active?: boolean;
  @IsOptional() @IsDateString() valid_from?: string;
  @IsOptional() @IsDateString() valid_to?: string;
}
