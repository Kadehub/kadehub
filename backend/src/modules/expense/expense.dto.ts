import { IsString, IsNumber, IsDateString, Min, MinLength, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @IsString() category: string;
  @IsString() description: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsDateString() expense_date: string;
}

export class CreateExpenseCategoryDto {
  @IsString() @MinLength(1) @MaxLength(50) name: string;
}
