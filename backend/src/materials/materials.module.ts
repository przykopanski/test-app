import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketMaterial } from '../entities/ticket-material.entity.js';
import { Ticket } from '../entities/ticket.entity.js';
import { VatRate } from '../entities/vat-rate.entity.js';
import { MaterialsController } from './materials.controller.js';
import { MaterialsService } from './materials.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([TicketMaterial, Ticket, VatRate])],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
