import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceReport } from '../entities/service-report.entity.js';
import { ServiceReportUnlock } from '../entities/service-report-unlock.entity.js';
import { Ticket } from '../entities/ticket.entity.js';
import { AuditLog } from '../entities/audit-log.entity.js';
import { User } from '../entities/user.entity.js';
import { TimeEntry } from '../entities/time-entry.entity.js';
import { ServiceReportsController } from './service-reports.controller.js';
import { ServiceReportsService } from './service-reports.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceReport, ServiceReportUnlock, Ticket, AuditLog, User, TimeEntry]),
  ],
  controllers: [ServiceReportsController],
  providers: [ServiceReportsService],
  exports: [ServiceReportsService],
})
export class ServiceReportsModule {}
