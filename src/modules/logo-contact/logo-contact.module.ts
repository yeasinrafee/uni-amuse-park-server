import { Module } from '@nestjs/common';
import { LogoContactController } from './logo-contact.controller';
import { LogoContactService } from './logo-contact.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [LogoContactController],
  providers: [LogoContactService, PrismaService],
  exports: [LogoContactService],
})
export class LogoContactModule {}