import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateOpeningDto } from './dto/create-opening.dto';
import { UpdateOpeningDto } from './dto/update-opening.dto';

@Injectable()
export class OpeningService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOpeningDto) {
    const opening = await this.prisma.opening.create({
      data: {
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
    return opening;
  }

  async findAll() {
    const opening = await this.prisma.opening.findMany();
    return opening;
  }

  async findOne(id: string) {
    const opening = await this.prisma.opening.findUnique({
      where: { id },
    });

    if (!opening) {
      throw new NotFoundException('Opening not found');
    }

    return opening;
  }

  async updateOpening(id: string, data: UpdateOpeningDto) {
    const existingOpening = await this.prisma.opening.findUnique({
      where: { id },
    });

    if (!existingOpening) {
      throw new NotFoundException('Opening not found!');
    }

    const updatedOpening = await this.prisma.opening.update({
      where: { id },
      data: {
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });

    return updatedOpening;
  }

  async delete(id: string) {
    const existing = await this.prisma.opening.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Opening not found');
    }

    await this.prisma.opening.delete({
      where: { id },
    });

    return {
      message: 'Opening deleted successfully',
    };
  }
}
