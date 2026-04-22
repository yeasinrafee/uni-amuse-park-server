import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateUsefulLinkDto {
  @IsOptional()
  @IsString()
  privacyPolicy?: string;

  @IsOptional()
  @IsString()
  termsAndCondition?: string;

  @IsOptional()
  @IsString()
  disclaimer?: string;

  @IsOptional()
  @IsArray()
  faq?: { question: string; answer: string }[];
}