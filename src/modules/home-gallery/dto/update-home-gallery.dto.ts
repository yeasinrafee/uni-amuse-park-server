import { PartialType } from '@nestjs/mapped-types';
import { CreateHomeGalleryDto } from './create-home-gallery.dto';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHomeGalleryDto extends PartialType(CreateHomeGalleryDto) {}

export class UpdateHomeOrderDto {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

export class BatchUpdateHomeOrdersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateHomeOrderDto)
  items!: UpdateHomeOrderDto[];
}