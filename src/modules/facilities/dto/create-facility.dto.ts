import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum FacilityType {
  ROOM = 'ROOM',
  HALL = 'HALL',
  RIDE = 'RIDE',
  RESTAURANT = 'RESTAURANT',
  THEATER = 'THEATER',
  PARK = 'PARK',
}

export class CreateFacilitiesDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  subTitle?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  })
  description!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  })
  features!: string[];

  @IsOptional()
  @IsString()
  footerTitle?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsNotEmpty()
  @IsEnum(FacilityType, {
    message: 'type must be one of: ROOM, HALL, RIDE, RESTAURANT, THEATER, PARK',
  })
  type!: FacilityType;
}
