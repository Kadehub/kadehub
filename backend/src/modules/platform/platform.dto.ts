import { IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
}

export class ChangeAccountPasswordDto {
  @IsString() current_password: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, { message: 'Password must contain at least one uppercase letter and one number' })
  new_password: string;
}
