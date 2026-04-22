import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMomentsDto {
  @IsOptional()
  @IsString()
  image?: string;

  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber()
  order!: number;
}
