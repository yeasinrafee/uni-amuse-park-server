import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UsefulLinkService } from './useful-link.service';
import { UpdateUsefulLinkDto } from './dto/update-useful-link.dto';

@Controller('useful-link')
export class UsefulLinkController {
  constructor(private readonly usefulLinkService: UsefulLinkService) {}

  @Get()
  async get() {
    const result = await this.usefulLinkService.find();
    return {
      success: true,
      message: 'Useful links retrieved successfully',
      data: result,
    };
  }

  @Patch()
  async update(@Body() updateDto: UpdateUsefulLinkDto) {
    const result = await this.usefulLinkService.upsert(updateDto);
    return {
      success: true,
      message: 'Useful links updated successfully',
      data: result,
    };
  }
}