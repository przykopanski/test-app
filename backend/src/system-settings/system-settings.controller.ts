import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../entities/index.js';
import { SystemSettingsService } from './system-settings.service.js';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  /**
   * GET /admin/settings
   * List all system settings. Admin only.
   */
  @Get()
  async getAll() {
    const settings = await this.settingsService.getAll();
    return settings.map((s) => ({
      key: s.key,
      value: this.parseValue(s.value),
      description: s.description,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * GET /admin/settings/:key
   * Get a single setting by key. Admin only.
   */
  @Get(':key')
  async getOne(@Param('key') key: string) {
    const value = await this.settingsService.get(key);
    if (value === null) {
      throw new BadRequestException(`Setting '${key}' nicht gefunden`);
    }
    return { key, value };
  }

  /**
   * PUT /admin/settings/:key
   * Update a setting value. Admin only.
   * Body: { value: any }
   */
  @Put(':key')
  async update(
    @Param('key') key: string,
    @Body() body: { value: unknown },
  ) {
    if (body.value === undefined) {
      throw new BadRequestException('Feld "value" ist erforderlich');
    }
    await this.settingsService.set(key, body.value);
    return { key, value: body.value };
  }

  private parseValue(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
