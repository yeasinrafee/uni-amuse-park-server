import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTeamDto {
  @IsOptional()
  @IsString()
  image?: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  designation!: string;

  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber()
  order!: number;
}
