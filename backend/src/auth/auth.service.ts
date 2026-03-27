import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { AuditLog, AuditAction } from '../entities/audit-log.entity.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshRepo: Repository<RefreshToken>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersRepo.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }

    const tokens = await this.generateTokens(user);

    await this.auditRepo.save({
      userId: user.id,
      action: AuditAction.LOGIN,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.refreshRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Ungültiger Refresh Token');
    }

    if (!stored.user.isActive) {
      await this.revokeToken(stored);
      throw new UnauthorizedException('Ungültiger Refresh Token');
    }

    // Rotate: revoke old, issue new
    await this.revokeToken(stored);
    const tokens = await this.generateTokens(stored.user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(stored.user),
    };
  }

  async logout(refreshToken: string, userId: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.refreshRepo.findOne({
      where: { tokenHash, userId },
    });

    if (stored && !stored.revokedAt) {
      await this.revokeToken(stored);
    }

    await this.auditRepo.save({
      userId,
      action: AuditAction.LOGOUT,
    });
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshRepo.save({
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private async revokeToken(token: RefreshToken) {
    token.revokedAt = new Date();
    await this.refreshRepo.save(token);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
