import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../entities/index.js';
import { TimeEntriesService } from './time-entries.service.js';
import { StartTimerDto } from './dto/start-timer.dto.js';
import { StopTimerDto } from './dto/stop-timer.dto.js';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto.js';
import { TimeEntryFilterDto } from './dto/time-entry-filter.dto.js';
import { CreateManualEntryDto } from './dto/create-manual-entry.dto.js';

@Controller('time-entries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  /**
   * POST /time-entries/start
   * Start a new timer for the authenticated technician.
   */
  @Post('start')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  start(
    @Body() dto: StartTimerDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.timeEntriesService.start(dto, user.id);
  }

  /**
   * POST /time-entries/manual
   * Create a completed (non-running) time entry.
   */
  @Post('manual')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  createManual(
    @Body() dto: CreateManualEntryDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.timeEntriesService.createManual(dto, user.id);
  }

  /**
   * POST /time-entries/:id/stop
   * Stop a running timer.
   */
  @Post(':id/stop')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  stop(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StopTimerDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.timeEntriesService.stop(id, dto, user.id);
  }

  /**
   * GET /time-entries/active
   * Get the currently running timer for the authenticated user.
   */
  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  findActive(@CurrentUser() user: { id: string; role: string }) {
    return this.timeEntriesService.findActive(user.id);
  }

  /**
   * GET /time-entries?ticketId=...
   * List time entries for a ticket.
   */
  @Get()
  findAll(@Query() filters: TimeEntryFilterDto) {
    return this.timeEntriesService.findByFilters(filters);
  }

  /**
   * PATCH /time-entries/:id
   * Admin: update a time entry.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.timeEntriesService.update(id, dto, user.id, user.role);
  }

  /**
   * DELETE /time-entries/:id
   * Admin: delete a time entry.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.timeEntriesService.remove(id, user.id, user.role);
  }
}
