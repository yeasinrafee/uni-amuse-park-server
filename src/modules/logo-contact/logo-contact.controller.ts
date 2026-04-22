import {
  Body,
  Controller,
  Get,
  Put,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { LogoContactService } from './logo-contact.service';
import { LogoContactDto } from './dto/create-logo-contact.dto';

@Controller('logo-contact')
export class LogoContactController {
  constructor(private readonly logoContactService: LogoContactService) {}

  @Get()
  async get() {
    const result = await this.logoContactService.find();
    return {
      success: true,
      message: 'Logo & contact data retrieved successfully',
      data: result,
    };
  }

  @Put()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'headerLogo', maxCount: 1 },
      { name: 'footerLogo', maxCount: 1 },
    ]),
  )
  async upsert(
    @Body() logoContactDto: LogoContactDto,
    @UploadedFiles()
    files?: {
      headerLogo?: Express.Multer.File[];
      footerLogo?: Express.Multer.File[];
    },
  ) {
    const result = await this.logoContactService.upsert(logoContactDto, files);
    return {
      success: true,
      message: 'Logo & contact data saved successfully',
      data: result,
    };
  }
}
