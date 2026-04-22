import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateSupportDto } from './dto/create-support.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSupportDto) {
    return this.prisma.support.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.support.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const support = await this.prisma.support.findUnique({
      where: { id },
    });
    if (!support) throw new NotFoundException('Support message not found');
    return support;
  }

  async remove(id: string) {
    const existing = await this.prisma.support.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Support message not found');
    }

    return this.prisma.support.delete({
      where: { id },
    });
  }
}