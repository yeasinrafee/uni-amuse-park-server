import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsObject } from 'class-validator';

export class SocialLinksDto {
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() twitter?: string;
  @IsOptional() @IsString() youtube?: string;
  @IsOptional() @IsString() linkedin?: string;
}

export class LogoContactDto {
  @IsOptional()
  @IsString()
  headerLogo?: string;

  @IsOptional()
  @IsString()
  footerLogo?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  })
  @IsObject()
  socialLinks?: SocialLinksDto;
}
