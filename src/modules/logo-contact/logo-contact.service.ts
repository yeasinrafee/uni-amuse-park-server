import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { LogoContactDto } from './dto/create-logo-contact.dto';
import { slugify, uploadToCloudinary } from 'src/common/utils/file.util';
import { Prisma } from 'src/generated/prisma/client';

const FIXED_ID = 'LOGO_CONTACT';

@Injectable()
export class LogoContactService {
  constructor(private prisma: PrismaService) {}

  async upsert(
    data: LogoContactDto,
    files?: {
      headerLogo?: Express.Multer.File[];
      footerLogo?: Express.Multer.File[];
    },
  ) {
    let headerLogoUrl = data.headerLogo;
    let footerLogoUrl = data.footerLogo;

    // Header logo upload
    if (files?.headerLogo?.[0]) {
      const file = files.headerLogo[0];
      const uploadResult = await uploadToCloudinary(file, {
        public_id: `${slugify('header-logo')}-${Date.now()}`,
        folder: 'logo/header',
      });
      headerLogoUrl = uploadResult.secure_url;
    }

    // Footer logo upload
    if (files?.footerLogo?.[0]) {
      const file = files.footerLogo[0];
      const uploadResult = await uploadToCloudinary(file, {
        public_id: `${slugify('footer-logo')}-${Date.now()}`,
        folder: 'logo/footer',
      });
      footerLogoUrl = uploadResult.secure_url;
    }

    // Prisma-compatible JSON
    const socialLinksJson: Prisma.InputJsonValue | undefined = data.socialLinks
      ? { ...data.socialLinks }
      : undefined;

    return this.prisma.logoContact.upsert({
      where: { id: FIXED_ID },

      update: {
        ...(headerLogoUrl && { headerLogo: headerLogoUrl }),
        ...(footerLogoUrl && { footerLogo: footerLogoUrl }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.location && { location: data.location }),
        ...(socialLinksJson && { socialLinks: socialLinksJson }),
      },

      create: {
        id: FIXED_ID,
        headerLogo: headerLogoUrl ?? '',
        footerLogo: footerLogoUrl ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        location: data.location ?? '',
        socialLinks: socialLinksJson ?? {},
      },
    });
  }

  async find() {
    const logoContact = await this.prisma.logoContact.findUnique({
      where: { id: FIXED_ID },
    });
    return logoContact;
  }
}
