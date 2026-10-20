import { Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export const SL_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota',
  'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale',
  'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
];

export class CreateTaskDto {
  @Type(() => Number) @IsInt() category_id: number;
  @IsString() @MinLength(10) @MaxLength(150) title: string;
  @IsString() @MinLength(25) @MaxLength(5000) description: string;
  @IsIn(['in_person', 'remote']) location_type: string;
  @IsOptional() @IsIn(SL_DISTRICTS) district?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsBoolean() flexible?: boolean;
  @Type(() => Number) @IsNumber() @Min(500) @Max(10_000_000) budget: number;
}

export class UpdateTaskDto {
  @IsOptional() @Type(() => Number) @IsInt() category_id?: number;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(150) title?: string;
  @IsOptional() @IsString() @MinLength(25) @MaxLength(5000) description?: string;
  @IsOptional() @IsIn(['in_person', 'remote']) location_type?: string;
  @IsOptional() @IsIn(SL_DISTRICTS) district?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsBoolean() flexible?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(500) @Max(10_000_000) budget?: number;
}

export class QuestionDto {
  @IsString() @MinLength(2) @MaxLength(1000) body: string;
  @IsOptional() @Type(() => Number) @IsInt() parent_id?: number;
}

export class OfferDto {
  @Type(() => Number) @IsNumber() @Min(500) @Max(10_000_000) amount: number;
  @IsString() @MinLength(10) @MaxLength(2000) message: string;
}

export class MessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) body: string;
}

export class ReviewDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

export class ProfileDto {
  @IsOptional() @IsString() @MaxLength(120) headline?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsString() @MaxLength(500) skills?: string;
  @IsOptional() @IsIn(SL_DISTRICTS) district?: string;
}

export class ReportDto {
  @IsOptional() @Type(() => Number) @IsInt() task_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() user_id?: number;
  @IsIn(['spam', 'scam', 'inappropriate', 'off_platform_payment', 'no_show', 'other']) reason: string;
  @IsOptional() @IsString() @MaxLength(1000) details?: string;
}

export class CategoryDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(60) slug?: string;
  @IsOptional() @IsString() @MaxLength(40) icon?: string;
  @IsOptional() @Type(() => Number) @IsInt() sort_order?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class HideDto {
  @IsBoolean() hidden: boolean;
}

export interface ListTasksQuery {
  q?: string;
  category?: string;
  district?: string;
  remote?: string;
  min?: string;
  max?: string;
  status?: string;
  sort?: string;
  page?: string;
  limit?: string;
}
