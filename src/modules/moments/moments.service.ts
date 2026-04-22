import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { slugify, uploadToCloudinary } from 'src/common/utils/file.util';
import { Prisma } from 'src/generated/prisma/client';
import { CreateMomentsDto } from './dto/create-moments.dto';
import {
  UpdateMomentsDto,
  UpdateMomentsOrderDto,
} from './dto/update-moments.dto';

@Injectable()
export class MomentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMomentsDto, file?: Express.Multer.File) {
    const existingOrder = await this.prisma.moments.findFirst({
      where: { order: data.order },
    });

    if (existingOrder) {
      throw new BadRequestException(
        'Order already exists! Please choose a different order value.',
      );
    }

    let imageUrl = data.image ?? null;

    if (file) {
      const publicId = `${slugify('moments')}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'moments-images',
      });
      imageUrl = uploadResult.secure_url;
    }

    try {
      return await this.prisma.moments.create({
        data: {
          order: data.order,
          image: imageUrl,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Order must be unique!');
      }
      throw error;
    }
  }

  async findAll() {
    const momentsItems = await this.prisma.moments.findMany();
    return momentsItems;
  }

  async findOne(id: string) {
    const banner = await this.prisma.moments.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Moments item not found');
    }

    return banner;
  }

  async updateMomentsItem(
    id: string,
    data: UpdateMomentsDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.moments.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Moments item not found');
    }

    if (data.order && data.order !== existing.order) {
      const orderTaken = await this.prisma.moments.findFirst({
        where: {
          order: data.order,
          NOT: { id },
        },
      });

      if (orderTaken) {
        throw new BadRequestException('Order already taken!');
      }
    }

    let imageUrl = existing.image;

    if (file) {
      const publicId = `${slugify('moments')}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'moments-images',
      });

      imageUrl = uploadResult.secure_url;
    }

    try {
      return await this.prisma.moments.update({
        where: { id },
        data: {
          ...data,
          image: imageUrl,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Order must be unique!');
      }
      throw error;
    }
  }

  async batchUpdateMomentsOrders(updates: UpdateMomentsOrderDto[]) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new BadRequestException('Invalid updates array');
    }

    // Validate IDs
    const ids = updates.map((u) => u.id);
    const existingItems = await this.prisma.moments.findMany({
      where: { id: { in: ids } },
    });

    if (existingItems.length !== ids.length) {
      throw new NotFoundException('Moments items not found');
    }

    try {
      const results = await this.prisma.$transaction(async (prisma) => {
        const updatedItems: any[] = [];

        // Temporary negative orders
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i];
          await prisma.moments.update({
            where: { id: update.id },
            data: { order: -(i + 1) },
          });
        }

        // Final orders
        for (const update of updates) {
          const result = await prisma.moments.update({
            where: { id: update.id },
            data: { order: update.order },
          });
          updatedItems.push(result);
        }

        return updatedItems;
      });

      return results;
    } catch (error) {
      console.error('Transaction error:', error);
      throw new BadRequestException(
        'Failed to update orders: ' + error.message,
      );
    }
  }

  async delete(id: string) {
    const existing = await this.prisma.moments.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Moments item not found');
    }

    await this.prisma.moments.delete({
      where: { id },
    });

    return {
      message: 'Moments item deleted successfully',
    };
  }
}
