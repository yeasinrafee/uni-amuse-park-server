import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateFacilitiesDto } from './dto/create-facility.dto';
import { slugify, uploadToCloudinary } from 'src/common/utils/file.util';
import { UpdateFacilitiesDto } from './dto/update-facility.dto';

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFacilitiesDto, file?: Express.Multer.File) {
    let imageUrl = data.image ?? null;

    if (file) {
      const publicId = `${slugify(data.title)}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'facility-images',
      });
      imageUrl = uploadResult.secure_url;
    }

    const facility = await this.prisma.facilities.create({
      data: {
        title: data.title,
        subTitle: data.subTitle,
        description: data.description,
        features: data.features,
        footerTitle: data.footerTitle,
        image: imageUrl,
        type: data.type,
      },
    });
    return facility;
  }

  async findAll() {
    const facilities = await this.prisma.facilities.findMany();
    return facilities;
  }

  async findOne(id: string) {
    const facility = await this.prisma.facilities.findUnique({
      where: { id },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found');
    }

    return facility;
  }

  async updateFacility(
    id: string,
    data: UpdateFacilitiesDto,
    file?: Express.Multer.File,
  ) {
    const existingFacility = await this.prisma.facilities.findUnique({
      where: { id },
    });

    if (!existingFacility) {
      throw new NotFoundException('Facility not found');
    }

    let imageUrl = existingFacility.image;

    if (file) {
      const publicId = `${slugify(data.title ?? existingFacility.title)}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'facility-images',
      });
      imageUrl = uploadResult.secure_url;
    }

    return this.prisma.facilities.update({
      where: { id },
      data: {
        ...data,
        image: imageUrl,
      },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.facilities.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Facility not found');
    }

    await this.prisma.facilities.delete({
      where: { id },
    });

    return {
      message: 'Facility deleted successfully',
    };
  }
}
