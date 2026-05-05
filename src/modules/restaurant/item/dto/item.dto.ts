import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',');
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];
}

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',');
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];
}
