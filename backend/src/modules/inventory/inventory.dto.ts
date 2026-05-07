import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
export class CsvImportResultDto { imported: number; skipped: number; errors: string[]; }

export class CreateProductDto {
  @IsString() @MaxLength(200) name: string;
  @IsOptional() @IsString() @MaxLength(100) barcode?: string;
  @IsNumber() @Min(0.01) price: number;
  @IsOptional() @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsInt() @Min(0) initialStock: number;
  @IsOptional() @IsInt() @Min(0) reorderLevel?: number;
  @IsOptional() @IsString() image_url?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(100) barcode?: string;
  @IsOptional() @IsNumber() @Min(0.01) price?: number;
  @IsOptional() @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() image_url?: string;
}

export class AdjustStockDto {
  @IsInt() quantity: number;
}
