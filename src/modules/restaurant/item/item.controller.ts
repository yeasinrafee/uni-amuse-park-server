import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ItemService } from './item.service';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryUploadInterceptor } from 'src/common/interceptors/cloudinary-upload.interceptor';

@Controller('restaurant/items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'), CloudinaryUploadInterceptor)
  async create(@Body() createItemDto: CreateItemDto) {
    const item = await this.itemService.create(createItemDto);
    return {
      message: 'Item created successfully',
      item,
    };
  }

  @Get()
  async findAll() {
    const items = await this.itemService.findAll();
    return {
      message: 'Items fetched successfully',
      items,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const item = await this.itemService.findOne(id);
    return {
      message: 'Item fetched successfully',
      item,
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'), CloudinaryUploadInterceptor)
  async update(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
    const item = await this.itemService.update(id, updateItemDto);
    return {
      message: 'Item updated successfully',
      item,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const item = await this.itemService.remove(id);
    return {
      message: 'Item deleted successfully',
      item,
    };
  }
}
