import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeEntry } from '../entities/time-entry.entity.js';
import { Ticket } from '../entities/ticket.entity.js';
import { AuditLog } from '../entities/audit-log.entity.js';
import { User } from '../entities/user.entity.js';
import { TimeEntriesController } from './time-entries.controller.js';
import { TimeTrackingController } from './time-tracking.controller.js';
import { AdminDashboardController } from './admin-dashboard.controller.js';
import { TimeEntriesService } from './time-entries.service.js';
import { SystemSettingsModule } from '../system-settings/system-settings.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeEntry, Ticket, AuditLog, User]),
    SystemSettingsModule,
  ],
  controllers: [
    TimeEntriesController,
    TimeTrackingController,
    AdminDashboardController,
  ],
  providers: [TimeEntriesService],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
