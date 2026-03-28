import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../entities/index.js';
import { TimeEntriesService } from './time-entries.service.js';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OFFICE)
export class AdminDashboardController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  /**
   * GET /admin/dashboard/today
   * Returns summary for all active technicians for today.
   * Only accessible by Admin and Office roles.
   */
  @Get('today')
  getAdminTodayOverview() {
    return this.timeEntriesService.getAdminTodayOverview();
  }
}
