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
import { HomeGalleryService } from './home-gallery.service';
import { CreateHomeGalleryDto } from './dto/create-home-gallery.dto';
import {
  UpdateHomeGalleryDto,
  UpdateHomeOrderDto,
} from './dto/update-home-gallery.dto';

@Controller('home-gallery')
export class HomeGalleryController {
  constructor(private readonly homeGalleryService: HomeGalleryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createHomeGalleryDto: CreateHomeGalleryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.homeGalleryService.create(
      createHomeGalleryDto,
      file,
    );
    return {
      success: true,
      message: 'Home gallery item created successfully',
      data: result,
    };
  }

  @Get()
  async findAll() {
    const result = await this.homeGalleryService.findAll();
    return {
      success: true,
      message: 'Home gallery items retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.homeGalleryService.findOne(id);
    return {
      success: true,
      message: 'Home gallery item retrieved successfully',
      data: result,
    };
  }

  @Patch('batch-update-orders')
  async batchUpdateOrders(
    @Body(new ParseArrayPipe({ items: UpdateHomeOrderDto }))
    updates: UpdateHomeOrderDto[],
  ) {
    try {
      const result =
        await this.homeGalleryService.batchUpdateHomeGalleryOrders(updates);
      return {
        success: true,
        statusCode: 200,
        message: 'Home gallery orders updated successfully',
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
    @Body() updateHomeGalleryDto: UpdateHomeGalleryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.homeGalleryService.updateHomeGalleryItem(
      id,
      updateHomeGalleryDto,
      file,
    );
    return {
      success: true,
      message: 'Home gallery item updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = await this.homeGalleryService.delete(id);
    return {
      success: true,
      message: 'Home gallery item deleted successfully',
      data: result,
    };
  }
}
