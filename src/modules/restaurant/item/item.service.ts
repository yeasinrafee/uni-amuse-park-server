import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';

@Injectable()
export class ItemService {
  constructor(private prisma: PrismaService) {}

  async create(createItemDto: CreateItemDto) {
    const { categoryIds, ...itemData } = createItemDto;

    return this.prisma.item.create({
      data: {
        ...itemData,
        categories: {
          connect: categoryIds?.map((id) => ({ id })) || [],
        },
      },
      include: { categories: true },
    });
  }

  async findAll() {
    return this.prisma.item.findMany({
      where: { deletedAt: null },
      include: { categories: true },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { categories: true },
    });

    if (!item || item.deletedAt) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async update(id: string, updateItemDto: UpdateItemDto) {
    await this.findOne(id);
    const { categoryIds, ...itemData } = updateItemDto;

    return this.prisma.item.update({
      where: { id },
      data: {
        ...itemData,
        categories: {
          set: categoryIds?.map((id) => ({ id })),
        },
      },
      include: { categories: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.item.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
