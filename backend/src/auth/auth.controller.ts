import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password);

    res.cookie('access_token', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 Minuten
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Tage
    });

    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Kein Refresh Token' });
      return;
    }

    const result = await this.authService.refresh(refreshToken);

    res.cookie('access_token', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user: result.user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: { id: string },
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.logout(refreshToken, user.id);
    }

    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
  }
}
