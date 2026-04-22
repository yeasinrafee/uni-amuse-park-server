import { Module } from '@nestjs/common';
import { MomentsController } from './moments.controller';
import { MomentsService } from './moments.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [MomentsController],
  providers: [MomentsService, PrismaService],
  exports: [MomentsService],
})
export class MomentsModule {}