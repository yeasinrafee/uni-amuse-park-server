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
import { MomentsService } from './moments.service';
import { CreateMomentsDto } from './dto/create-moments.dto';
import { UpdateGalleryDto } from '../gallery/dto/update-gallery.dto';
import {
  UpdateMomentsDto,
  UpdateMomentsOrderDto,
} from './dto/update-moments.dto';

@Controller('moments')
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createMomentsDto: CreateMomentsDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.momentsService.create(createMomentsDto, file);
    return {
      success: true,
      message: 'Moments item created successfully',
      data: result,
    };
  }

  @Get()
  async findAll() {
    const result = await this.momentsService.findAll();
    return {
      success: true,
      message: 'Moments items retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.momentsService.findOne(id);
    return {
      success: true,
      message: 'Moments item retrieved successfully',
      data: result,
    };
  }

  @Patch('batch-update-orders')
  async batchUpdateOrders(
    @Body(new ParseArrayPipe({ items: UpdateMomentsOrderDto }))
    updates: UpdateMomentsOrderDto[],
  ) {
    try {
      const result =
        await this.momentsService.batchUpdateMomentsOrders(updates);
      return {
        success: true,
        statusCode: 200,
        message: 'Moments orders updated successfully',
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
    @Body() updateMomentsDto: UpdateMomentsDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.momentsService.updateMomentsItem(
      id,
      updateMomentsDto,
      file,
    );
    return {
      success: true,
      message: 'Moments item updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = await this.momentsService.delete(id);
    return {
      success: true,
      message: 'Moments item deleted successfully',
      data: result,
    };
  }
}
