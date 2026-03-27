import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../entities/ticket.entity.js';
import { TicketNote } from '../entities/ticket-note.entity.js';
import { Contact } from '../entities/contact.entity.js';
import { AuditLog } from '../entities/audit-log.entity.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketNote, Contact, AuditLog])],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
