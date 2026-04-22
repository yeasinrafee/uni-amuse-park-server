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
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createBannerDto: CreateBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.bannerService.create(createBannerDto, file);
    return {
      success: true,
      message: 'Banner created successfully',
      data: result,
    };
  }

  @Get()
  async findAll() {
    const result = await this.bannerService.findAll();
    return {
      success: true,
      message: 'Banners retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.bannerService.findOne(id);
    return {
      success: true,
      message: 'Banner retrieved successfully',
      data: result,
    };
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.bannerService.updateBanner(
      id,
      updateBannerDto,
      file,
    );
    return {
      success: true,
      message: 'Banner updated successfully',
      data: result,
    };
  }

  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string) {
    const result = await this.bannerService.toggleBannerStatus(id);
    return {
      success: true,
      message: 'Banner status updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = await this.bannerService.delete(id);
    return {
      success: true,
      message: 'Banner deleted successfully',
      data: result,
    };
  }
}
