import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportDto } from './dto/create-support.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  async create(@Body() createDto: CreateSupportDto) {
    const result = await this.supportService.create(createDto);
    return {
      success: true,
      message: 'Message sent successfully',
      data: result,
    };
  }

  @Get()
  async findAll() {
    const result = await this.supportService.findAll();
    return {
      success: true,
      message: 'Support messages retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.supportService.findOne(id);
    return {
      success: true,
      message: 'Support message details retrieved',
      data: result,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.supportService.remove(id);
    return {
      success: true,
      message: 'Support message deleted successfully',
    };
  }
}