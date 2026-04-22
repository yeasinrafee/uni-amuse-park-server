import { Module } from '@nestjs/common';
import { OpeningController } from './opening.controller';
import { OpeningService } from './opening.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [OpeningController],
  providers: [OpeningService, PrismaService],
  exports: [OpeningService],
})
export class OpeningModule {}