import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBannerDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  subTitle!: string;

  @IsNotEmpty()
  @IsString()
  shortDescription!: string;

  @IsOptional()
  @IsString()
  image?: string;
}
