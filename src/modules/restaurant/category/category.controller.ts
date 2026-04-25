import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller('restaurant/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.categoryService.create(createCategoryDto);
    return {
      message: 'Category created successfully',
      category,
    };
  }

  @Get()
  async findAll() {
    const categories = await this.categoryService.findAll();
    return {
      message: 'Categories fetched successfully',
      categories,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const category = await this.categoryService.findOne(id);
    return {
      message: 'Category fetched successfully',
      category,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.categoryService.update(id, updateCategoryDto);
    return {
      message: 'Category updated successfully',
      category,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const category = await this.categoryService.remove(id);
    return {
      message: 'Category deleted successfully',
      category,
    };
  }
}
