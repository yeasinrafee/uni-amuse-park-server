import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { slugify, uploadToCloudinary } from 'src/common/utils/file.util';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTeamDto, file?: Express.Multer.File) {
    const existingOrder = await this.prisma.team.findFirst({
      where: { order: data.order },
    });

    if (existingOrder) {
      throw new BadRequestException(
        'Order already exists! Please choose a different order value.',
      );
    }

    let imageUrl = data.image ?? null;

    if (file) {
      const publicId = `${slugify(data.name)}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'team-images',
      });
      imageUrl = uploadResult.secure_url;
    }

    try {
      return await this.prisma.team.create({
        data: {
          name: data.name,
          designation: data.designation,
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
    const teamMembers = await this.prisma.team.findMany();
    return teamMembers;
  }

  async findOne(id: string) {
    const banner = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Team member not found');
    }

    return banner;
  }

  async updateTeamMember(
    id: string,
    data: UpdateTeamDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Team member not found');
    }

    if (data.order && data.order !== existing.order) {
      const orderTaken = await this.prisma.team.findFirst({
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
      const publicId = `${slugify(data.name ?? existing.name)}-${Date.now()}`;
      const uploadResult = await uploadToCloudinary(file, {
        public_id: publicId,
        folder: 'team-images',
      });

      imageUrl = uploadResult.secure_url;
    }

    try {
      return await this.prisma.team.update({
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

  async delete(id: string) {
    const existing = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Team member not found');
    }

    await this.prisma.team.delete({
      where: { id },
    });

    return {
      message: 'Team member deleted successfully',
    };
  }
}
