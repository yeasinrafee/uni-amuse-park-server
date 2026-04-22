import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GalleryService } from './gallery.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto, UpdateOrderDto } from './dto/update-gallery.dto';

@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createGalleryDto: CreateGalleryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.galleryService.create(createGalleryDto, file);
    return {
      success: true,
      message: 'Gallery item created successfully',
      data: result,
    };
  }

  @Get()
  async findAll() {
    const result = await this.galleryService.findAll();
    return {
      success: true,
      message: 'Gallery items retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.galleryService.findOne(id);
    return {
      success: true,
      message: 'Gallery item retrieved successfully',
      data: result,
    };
  }

  @Patch('batch-update-orders')
  async batchUpdateOrders(
    @Body(new ParseArrayPipe({ items: UpdateOrderDto }))
    updates: UpdateOrderDto[],
  ) {
    try {
      const result =
        await this.galleryService.batchUpdateGalleryOrders(updates);
      return {
        success: true,
        statusCode: 200,
        message: 'Gallery orders updated successfully',
        data: result,
      };
    } catch (error) {
      console.error('Controller Error:', error.message);
      throw error;
    }
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateGalleryDto: UpdateGalleryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.galleryService.updateGalleryItem(
      id,
      updateGalleryDto,
      file,
    );
    return {
      success: true,
      message: 'Gallery item updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = await this.galleryService.delete(id);
    return {
      success: true,
      message: 'Gallery item deleted successfully',
      data: result,
    };
  }
}
