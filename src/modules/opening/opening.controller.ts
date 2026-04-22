import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { OpeningService } from './opening.service';
import { CreateOpeningDto } from './dto/create-opening.dto';
import { UpdateOpeningDto } from './dto/update-opening.dto';

@Controller('opening')
export class OpeningController {
  constructor(private readonly openingService: OpeningService) {}

  @Post()
  async create(@Body() createOpeningDto: CreateOpeningDto) {
    const result = await this.openingService.create(createOpeningDto);
    return {
      success: true,
      message: 'Opening created successfully',
      data: result,
    };
  }

  @Get()
  async findAll() {
    const result = await this.openingService.findAll();
    return {
      success: true,
      message: 'Openings retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.openingService.findOne(id);
    return {
      success: true,
      message: 'Opening retrieved successfully',
      data: result,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOpeningDto: UpdateOpeningDto,
  ) {
    const result = await this.openingService.updateOpening(
      id,
      updateOpeningDto,
    );
    return {
      success: true,
      message: 'Opening updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = await this.openingService.delete(id);
    return {
      success: true,
      message: 'Opening deleted successfully',
      data: result,
    };
  }
}
