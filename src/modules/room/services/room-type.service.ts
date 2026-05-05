import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateRoomTypeDto, UpdateRoomTypeDto } from '../dto/room-type.dto';

@Injectable()
export class RoomTypeService {
  constructor(private prisma: PrismaService) {}

  async create(createRoomTypeDto: CreateRoomTypeDto) {
    return this.prisma.roomType.create({
      data: createRoomTypeDto,
    });
  }

  async findAll() {
    return this.prisma.roomType.findMany({
      where: { deletedAt: null },
      include: {
        rooms: {
          where: { deletedAt: null },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const roomType = await this.prisma.roomType.findFirst({
      where: { id, deletedAt: null },
      include: {
        rooms: {
          where: { deletedAt: null },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundException(`RoomType with ID ${id} not found`);
    }

    return roomType;
  }

  async update(id: string, updateRoomTypeDto: UpdateRoomTypeDto) {
    await this.findOne(id);
    return this.prisma.roomType.update({
      where: { id },
      data: updateRoomTypeDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.roomType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
