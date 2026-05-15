import { IsEmail, IsString, MinLength, MaxLength, Matches, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @IsString()
  @MaxLength(100)
  shopName: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, { message: 'Password must contain at least one uppercase letter and one number' })
  password: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, { message: 'Subdomain must be lowercase letters, numbers, or hyphens, and cannot start or end with a hyphen' })
  subdomain: string;
}

export class PinLoginDto {
  @IsString()
  @Length(4, 6)
  pin: string;

  @IsString()
  tenant_slug: string;
}
