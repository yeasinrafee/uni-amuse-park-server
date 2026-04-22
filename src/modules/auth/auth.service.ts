import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async createAdmin(email: string, password: string, name: string, phone: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    return this.prisma.user.create({
      data: {
        email,
        password,
        role: 'ADMIN',
        verified: true,
        name,
        phone,
      },
    });
  }

  async validateUser(email: string, password: string) {
    if (!email) return null;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return null;
    }
    return user;
  }

  getAccessToken(userId: string) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT access secret is not configured');
    }
    return sign({ sub: userId }, secret, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '10h',
    });
  }

  getCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: this.parseExpiresToMs(process.env.JWT_ACCESS_EXPIRES || '10h'),
    };
  }

  private parseExpiresToMs(expires: string) {
    if (expires.endsWith('h')) {
      return Number(expires.slice(0, -1)) * 60 * 60 * 1000;
    }
    if (expires.endsWith('m')) {
      return Number(expires.slice(0, -1)) * 60 * 1000;
    }
    if (expires.endsWith('s')) {
      return Number(expires.slice(0, -1)) * 1000;
    }
    return undefined;
  }
}
