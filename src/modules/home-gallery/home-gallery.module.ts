import { Module } from '@nestjs/common';
import { HomeGalleryController } from './home-gallery.controller';
import { HomeGalleryService } from './home-gallery.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [HomeGalleryController],
  providers: [HomeGalleryService, PrismaService],
  exports: [HomeGalleryService],
})
export class HomeGalleryModule {}