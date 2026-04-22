import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSupportDto {
  @IsOptional() 
  @IsString()
  name?: string;

  @IsNotEmpty() 
  @IsEmail()
  email!: string;

  @IsOptional() 
  @IsString()
  subject?: string;

  @IsNotEmpty() 
  @IsString()
  message!: string;
}