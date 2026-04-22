import { Module } from '@nestjs/common';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [FacilitiesController],
  providers: [FacilitiesService, PrismaService],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}