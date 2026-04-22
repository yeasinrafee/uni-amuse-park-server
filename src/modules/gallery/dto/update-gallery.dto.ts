import { PartialType } from '@nestjs/mapped-types';
import { CreateGalleryDto } from './create-gallery.dto';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateGalleryDto extends PartialType(CreateGalleryDto) {}

export class UpdateOrderDto {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

export class BatchUpdateOrdersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderDto)
  items!: UpdateOrderDto[];
}
