import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto } from '../dto/room.dto';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  async create(createRoomDto: CreateRoomDto) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: createRoomDto.roomTypeId },
    });
    if (!roomType || roomType.deletedAt) {
      throw new BadRequestException('Invalid roomTypeId');
    }
    return this.prisma.room.create({
      data: createRoomDto,
    });
  }

  async findAll() {
    return this.prisma.room.findMany({
      where: { deletedAt: null },
      include: { roomType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: { roomType: true },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto) {
    await this.findOne(id);
    if (updateRoomDto.roomTypeId) {
      const roomType = await this.prisma.roomType.findUnique({
        where: { id: updateRoomDto.roomTypeId },
      });
      if (!roomType || roomType.deletedAt) {
        throw new BadRequestException('Invalid roomTypeId');
      }
    }
    return this.prisma.room.update({
      where: { id },
      data: updateRoomDto,
      include: { roomType: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
