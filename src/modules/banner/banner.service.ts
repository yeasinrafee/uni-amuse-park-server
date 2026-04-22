import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { slugify, uploadToCloudinary } from 'src/common/utils/file.util';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBannerDto, file?: Express.Multer.File) {
    let imageUrl = data.image ?? null;

    if (file) {
      const publicId = `${slugify(data.title)}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'banner-images',
      });
      imageUrl = uploadResult.secure_url;
    }

    const banner = await this.prisma.banner.create({
      data: {
        title: data.title,
        subTitle: data.subTitle,
        shortDescription: data.shortDescription,
        image: imageUrl,
      },
    });
    return banner;
  }

  async findAll() {
    const banners = await this.prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return banners;
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return banner;
  }

  async updateBanner(
    id: string,
    data: UpdateBannerDto,
    file?: Express.Multer.File,
  ) {
    const existingBanner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!existingBanner) {
      throw new NotFoundException('Banner not found');
    }

    let imageUrl = existingBanner.image;

    if (file) {
      const publicId = `${slugify(data.title ?? existingBanner.title)}-${Date.now()}`;

      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'banner-images',
      });

      imageUrl = uploadResult.secure_url;
    }

    const updatedBanner = await this.prisma.banner.update({
      where: { id },
      data: {
        ...data,
        image: imageUrl,
      },
    });

    return updatedBanner;
  }

  async toggleBannerStatus(id: string) {
    const existingBanner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!existingBanner) {
      throw new NotFoundException('Banner not found');
    }

    if (!existingBanner.isActive) {
      // Check if another banner is already active
      const activeBanner = await this.prisma.banner.findFirst({
        where: {
          isActive: true,
          id: { not: id },
        },
      });

      if (activeBanner) {
        throw new BadRequestException(
          `Cannot activate this banner. Banner "${activeBanner.title}" is already active. Please deactivate it first.`,
        );
      }

      // Activate the current banner
      const updatedBanner = await this.prisma.banner.update({
        where: { id },
        data: { isActive: true },
      });

      return updatedBanner;
    } else {
      // Deactivate the current banner (toggle from true to false)
      const updatedBanner = await this.prisma.banner.update({
        where: { id },
        data: { isActive: false },
      });

      return updatedBanner;
    }
  }

  async delete(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    await this.prisma.banner.delete({
      where: { id },
    });

    return {
      message: 'Banner deleted successfully',
    };
  }
}