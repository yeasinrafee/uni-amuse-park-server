import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { slugify, uploadToCloudinary } from 'src/common/utils/file.util';
import { Prisma } from 'src/generated/prisma/client';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto, UpdateOrderDto } from './dto/update-gallery.dto';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateGalleryDto, file?: Express.Multer.File) {
    const existingOrder = await this.prisma.gallery.findFirst({
      where: { order: data.order },
    });

    if (existingOrder) {
      throw new BadRequestException(
        'Order already exists! Please choose a different order value.',
      );
    }

    let imageUrl = data.image ?? null;

    if (file) {
      const publicId = `${slugify('gallery')}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'gallery-images',
      });
      imageUrl = uploadResult.secure_url;
    }

    try {
      return await this.prisma.gallery.create({
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
    const galleryItems = await this.prisma.gallery.findMany();
    return galleryItems;
  }

  async findOne(id: string) {
    const banner = await this.prisma.gallery.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Gallery item not found');
    }

    return banner;
  }

  async updateGalleryItem(
    id: string,
    data: UpdateGalleryDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.gallery.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Gallery item not found');
    }

    if (data.order && data.order !== existing.order) {
      const orderTaken = await this.prisma.gallery.findFirst({
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
      const publicId = `${slugify('gallery')}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'gallery-images',
      });

      imageUrl = uploadResult.secure_url;
    }

    try {
      return await this.prisma.gallery.update({
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

  async batchUpdateGalleryOrders(updates: UpdateOrderDto[]) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new BadRequestException('Invalid updates array');
    }

    // Validate IDs
    const ids = updates.map((u) => u.id);
    const existingItems = await this.prisma.gallery.findMany({
      where: { id: { in: ids } },
    });

    // console.log(`Found ${existingItems.length} of ${ids.length} items`);

    if (existingItems.length !== ids.length) {
      throw new NotFoundException('Gallery items not found');
    }

    try {
      const results = await this.prisma.$transaction(async (prisma) => {
        const updatedItems: Prisma.GalleryGetPayload<true>[] = [];

        // Temporary negative orders
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i];
          await prisma.gallery.update({
            where: { id: update.id },
            data: { order: -(i + 1) },
          });
        }

        // Final orders
        for (const update of updates) {
          const result = await prisma.gallery.update({
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
    const existing = await this.prisma.gallery.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Gallery item not found');
    }

    await this.prisma.gallery.delete({
      where: { id },
    });

    return {
      message: 'Gallery item deleted successfully',
    };
  }
}
