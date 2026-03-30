import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SystemSettingsService } from './system-settings.service.js';

/**
 * Public (all authenticated users) endpoint for reading color settings.
 * Technicians and office users need color settings to render ticket badges,
 * but the /admin/settings endpoint is admin-only.
 */
@Controller('color-settings')
@UseGuards(JwtAuthGuard)
export class ColorSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  /**
   * GET /color-settings
   * Returns a flat key-value map of all ticket color settings.
   * Example: { "ticket_status_color_open": "green", "ticket_priority_color_low": "slate", ... }
   */
  @Get()
  async getColorSettings(): Promise<Record<string, string>> {
    return this.settingsService.getColorSettings();
  }
}
