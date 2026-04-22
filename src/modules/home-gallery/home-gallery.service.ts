import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { slugify, uploadToCloudinary } from 'src/common/utils/file.util';
import { Prisma } from 'src/generated/prisma/client';
import { CreateHomeGalleryDto } from './dto/create-home-gallery.dto';
import {
  UpdateHomeGalleryDto,
  UpdateHomeOrderDto,
} from './dto/update-home-gallery.dto';

@Injectable()
export class HomeGalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateHomeGalleryDto, file?: Express.Multer.File) {
    const totalCount = await this.prisma.homeGallery.count();
    if (totalCount >= 6) {
      throw new BadRequestException(
        'Maximum 6 gallery items allowed. Please delete one before adding a new item.',
      );
    }

    const existingOrder = await this.prisma.homeGallery.findFirst({
      where: { order: data.order },
    });

    if (existingOrder) {
      throw new BadRequestException(
        'Order already exists! Please choose a different order value.',
      );
    }

    let imageUrl = data.image ?? null;

    if (file) {
      const publicId = `${slugify('home-gallery')}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'home-gallery-images',
      });
      imageUrl = uploadResult.secure_url;
    }

    try {
      return await this.prisma.homeGallery.create({
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
    const galleryItems = await this.prisma.homeGallery.findMany();
    return galleryItems;
  }

  async findOne(id: string) {
    const banner = await this.prisma.homeGallery.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Home gallery item not found');
    }

    return banner;
  }

  async updateHomeGalleryItem(
    id: string,
    data: UpdateHomeGalleryDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.homeGallery.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Home gallery item not found');
    }

    if (data.order && data.order !== existing.order) {
      const orderTaken = await this.prisma.homeGallery.findFirst({
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
      const publicId = `${slugify('home-gallery')}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'home-gallery-images',
      });

      imageUrl = uploadResult.secure_url;
    }

    try {
      return await this.prisma.homeGallery.update({
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

  async batchUpdateHomeGalleryOrders(updates: UpdateHomeOrderDto[]) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new BadRequestException('Invalid updates array');
    }

    // Validate IDs
    const ids = updates.map((u) => u.id);
    const existingItems = await this.prisma.homeGallery.findMany({
      where: { id: { in: ids } },
    });

    // console.log(`Found ${existingItems.length} of ${ids.length} items`);

    if (existingItems.length !== ids.length) {
      throw new NotFoundException('Home Gallery items not found');
    }

    try {
      const results = await this.prisma.$transaction(async (prisma) => {
        const updatedItems: Prisma.HomeGalleryGetPayload<true>[] = [];

        // Temporary negative orders
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i];
          await prisma.homeGallery.update({
            where: { id: update.id },
            data: { order: -(i + 1) },
          });
        }

        // Final orders
        for (const update of updates) {
          const result = await prisma.homeGallery.update({
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
    const existing = await this.prisma.homeGallery.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Home gallery item not found');
    }

    await this.prisma.homeGallery.delete({
      where: { id },
    });

    return {
      message: 'Home gallery item deleted successfully',
    };
  }
}
