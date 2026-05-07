import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenShiftDto {
  @IsNumber() @Min(0) opening_cash: number;
  @IsOptional() @IsString() notes?: string;
}

export class CloseShiftDto {
  @IsNumber() @Min(0) closing_cash: number;
  @IsOptional() @IsString() notes?: string;
}
