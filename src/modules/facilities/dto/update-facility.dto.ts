import { PartialType } from '@nestjs/mapped-types';
import { CreateFacilitiesDto } from './create-facility.dto';

export class UpdateFacilitiesDto extends PartialType(CreateFacilitiesDto) {}
