import { PartialType } from '@nestjs/mapped-types';
import { CreateMomentsDto } from './create-moments.dto';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMomentsDto extends PartialType(CreateMomentsDto) {}

export class UpdateMomentsOrderDto {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

export class BatchUpdateMomentsOrdersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateMomentsOrderDto)
  items!: UpdateMomentsOrderDto[];
}
