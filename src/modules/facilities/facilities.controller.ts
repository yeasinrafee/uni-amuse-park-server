import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateFacilitiesDto } from './dto/create-facility.dto';
import { UpdateFacilitiesDto } from './dto/update-facility.dto';

@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilityService: FacilitiesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createFacilityDto: CreateFacilitiesDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.facilityService.create(createFacilityDto, file);
    return {
      success: true,
      message: 'Facility created successfully',
      data: result,
    };
  }

  @Get()
  async findAll() {
    const result = await this.facilityService.findAll();
    return {
      success: true,
      message: 'Facilities retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.facilityService.findOne(id);
    return {
      success: true,
      message: 'Facility retrieved successfully',
      data: result,
    };
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateFacilityDto: UpdateFacilitiesDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.facilityService.updateFacility(
      id,
      updateFacilityDto,
      file,
    );
    return {
      success: true,
      message: 'Facility updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = await this.facilityService.delete(id);
    return {
      success: true,
      message: 'Facility deleted successfully',
      data: result,
    };
  }
}
