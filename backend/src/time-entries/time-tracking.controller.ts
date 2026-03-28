import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../entities/index.js';
import { TimeEntriesService } from './time-entries.service.js';

@Controller('time-tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeTrackingController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  /**
   * GET /time-tracking/today
   * Returns today's dashboard data for the authenticated technician.
   * Admin/Office can pass ?userId=... to view another technician's day.
   */
  @Get('today')
  async getToday(
    @Query('userId') userId: string | undefined,
    @CurrentUser() user: { id: string; role: string },
  ) {
    // Validate userId format if provided
    if (userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        throw new BadRequestException('userId muss eine gültige UUID sein');
      }
    }

    // If userId is provided, only admin/office can view other users' data
    if (userId && userId !== user.id) {
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.OFFICE) {
        throw new ForbiddenException(
          'Nur Admins und Office-Mitarbeiter koennen Daten anderer Techniker einsehen',
        );
      }
    }

    const targetUserId = userId ?? user.id;
    return this.timeEntriesService.getTodayDashboard(targetUserId);
  }
}
