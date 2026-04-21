import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-admin')
  @HttpCode(HttpStatus.CREATED)
  async registerAdmin(@Body() createAdminDto: CreateAdminDto) {
    const user = await this.authService.createAdmin(
      createAdminDto.email,
      createAdminDto.password,
      createAdminDto.name,
      createAdminDto.phone,
    );

    return {
      message: 'Admin user created successfully',
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.authService.getAccessToken(user.userId);
    res.cookie('access_token', token, this.authService.getCookieOptions());

    return {
      message: 'Logged in successfully',
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }
}
