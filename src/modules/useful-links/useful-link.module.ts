import { Module } from '@nestjs/common';
import { UsefulLinkController } from './useful-link.controller';
import { UsefulLinkService } from './useful-link.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [UsefulLinkController],
  providers: [UsefulLinkService, PrismaService],
  exports: [UsefulLinkService],
})
export class UsefulLinkModule {}