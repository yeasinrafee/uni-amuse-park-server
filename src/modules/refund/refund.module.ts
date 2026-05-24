import { Module } from '@nestjs/common';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [RefundController],
  providers: [RefundService, PrismaService],
  exports: [RefundService],
})
export class RefundModule {}
