import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeEntry } from '../entities/time-entry.entity.js';
import { Ticket } from '../entities/ticket.entity.js';
import { AuditLog } from '../entities/audit-log.entity.js';
import { TimeEntriesController } from './time-entries.controller.js';
import { TimeEntriesService } from './time-entries.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([TimeEntry, Ticket, AuditLog])],
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
