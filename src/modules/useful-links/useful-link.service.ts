import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UpdateUsefulLinkDto } from './dto/update-useful-link.dto';

const FIXED_ID = 'USEFUL_LINK';

@Injectable()
export class UsefulLinkService {
  constructor(private prisma: PrismaService) {}

  async find() {
    return await this.prisma.usefulLink.findUnique({
      where: { id: FIXED_ID },
    });
  }

  async upsert(data: UpdateUsefulLinkDto) {
    return this.prisma.usefulLink.upsert({
      where: { id: FIXED_ID },
      update: {
        ...data,
      },
      create: {
        id: FIXED_ID,
        ...data,
      },
    });
  }
}