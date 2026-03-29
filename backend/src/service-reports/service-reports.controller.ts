import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../entities/index.js';
import { ServiceReportsService } from './service-reports.service.js';
import { CreateServiceReportDto } from './dto/create-service-report.dto.js';
import { UpdateServiceReportDto } from './dto/update-service-report.dto.js';
import { UnlockServiceReportDto } from './dto/unlock-service-report.dto.js';

@Controller('tickets/:ticketId/service-report')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceReportsController {
  constructor(private readonly serviceReportsService: ServiceReportsService) {}

  /**
   * GET /tickets/:ticketId/service-report
   * Get the service report for a ticket (or 404 if none exists).
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.OFFICE)
  async findByTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ) {
    const report = await this.serviceReportsService.findByTicket(ticketId);
    if (report === null) {
      throw new NotFoundException('Kein Einsatzbericht fuer dieses Ticket vorhanden');
    }
    return report;
  }

  /**
   * POST /tickets/:ticketId/service-report
   * Create a new draft service report.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateServiceReportDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.serviceReportsService.create(ticketId, dto, user.id);
  }

  /**
   * PATCH /tickets/:ticketId/service-report
   * Update description or finalize the report.
   */
  @Patch()
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  update(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: UpdateServiceReportDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.serviceReportsService.update(ticketId, dto, user.id);
  }

  /**
   * POST /tickets/:ticketId/service-report/unlock
   * Admin: unlock a completed report back to draft.
   */
  @Post('unlock')
  @Roles(UserRole.ADMIN)
  unlock(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: UnlockServiceReportDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.serviceReportsService.unlock(ticketId, dto, user.id, user.role);
  }
}
