import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketMaterial } from '../entities/ticket-material.entity.js';
import { Ticket, TicketStatus } from '../entities/ticket.entity.js';
import { VatRate } from '../entities/vat-rate.entity.js';
import { UserRole } from '../entities/user.entity.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';
import { UpdateMaterialDto } from './dto/update-material.dto.js';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(TicketMaterial)
    private materialsRepo: Repository<TicketMaterial>,
    @InjectRepository(Ticket)
    private ticketsRepo: Repository<Ticket>,
    @InjectRepository(VatRate)
    private vatRatesRepo: Repository<VatRate>,
  ) {}

  async findByTicket(ticketId: string) {
    await this.getTicketOrFail(ticketId);

    const materials = await this.materialsRepo.find({
      where: { ticketId },
      relations: ['createdBy'],
      order: { createdAt: 'ASC' },
    });

    return materials.map((m) => this.sanitize(m));
  }

  async create(
    ticketId: string,
    dto: CreateMaterialDto,
    userId: string,
    userRole: UserRole,
  ) {
    const ticket = await this.getTicketOrFail(ticketId);

    this.assertCanModify(ticket, userRole, 'hinzufuegen');

    const vatRate = await this.getActiveVatRateOrFail(dto.vatRateId);

    const material = this.materialsRepo.create({
      ticketId,
      name: dto.name,
      quantity: dto.quantity,
      unitPriceNet: dto.unitPriceNet,
      vatRateSnapshot: vatRate.rate,
      vatRateLabel: vatRate.label,
      vatRateId: vatRate.id,
      createdById: userId,
    });

    const saved = await this.materialsRepo.save(material);

    // Re-fetch with relations
    const result = await this.materialsRepo.findOne({
      where: { id: saved.id },
      relations: ['createdBy'],
    });

    return this.sanitize(result!);
  }

  async update(
    ticketId: string,
    materialId: string,
    dto: UpdateMaterialDto,
    userRole: UserRole,
  ) {
    const ticket = await this.getTicketOrFail(ticketId);
    const material = await this.getMaterialOrFail(materialId, ticketId);

    this.assertCanModify(ticket, userRole, 'bearbeiten');

    // If vatRateId changed, fetch the new rate and update snapshot
    if (dto.vatRateId && dto.vatRateId !== material.vatRateId) {
      const vatRate = await this.getActiveVatRateOrFail(dto.vatRateId);
      material.vatRateSnapshot = vatRate.rate;
      material.vatRateLabel = vatRate.label;
      material.vatRateId = vatRate.id;
    }

    if (dto.name !== undefined) material.name = dto.name;
    if (dto.quantity !== undefined) material.quantity = dto.quantity;
    if (dto.unitPriceNet !== undefined) material.unitPriceNet = dto.unitPriceNet;

    await this.materialsRepo.save(material);

    // Re-fetch with relations
    const result = await this.materialsRepo.findOne({
      where: { id: material.id },
      relations: ['createdBy'],
    });

    return this.sanitize(result!);
  }

  async remove(
    ticketId: string,
    materialId: string,
    userRole: UserRole,
  ) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Nur Admins koennen Materialeintraege loeschen.',
      );
    }

    await this.getTicketOrFail(ticketId);
    const material = await this.getMaterialOrFail(materialId, ticketId);

    await this.materialsRepo.remove(material);
  }

  // --- Private helpers ---

  private async getTicketOrFail(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket nicht gefunden');
    }
    return ticket;
  }

  private async getMaterialOrFail(
    materialId: string,
    ticketId: string,
  ): Promise<TicketMaterial> {
    const material = await this.materialsRepo.findOne({
      where: { id: materialId, ticketId },
      relations: ['createdBy'],
    });
    if (!material) {
      throw new NotFoundException('Materialeintrag nicht gefunden');
    }
    return material;
  }

  private async getActiveVatRateOrFail(vatRateId: string): Promise<VatRate> {
    const vatRate = await this.vatRatesRepo.findOne({
      where: { id: vatRateId },
    });
    if (!vatRate) {
      throw new BadRequestException('MwSt.-Satz nicht gefunden');
    }
    if (!vatRate.isActive) {
      throw new BadRequestException(
        'Der gewaehlte MwSt.-Satz ist deaktiviert.',
      );
    }
    return vatRate;
  }

  /**
   * Check if the user can add/edit material on this ticket.
   * - Open tickets: all roles can modify
   * - Closed tickets: only admin can modify
   */
  private assertCanModify(
    ticket: Ticket,
    userRole: UserRole,
    action: string,
  ): void {
    if (
      ticket.status === TicketStatus.CLOSED &&
      userRole !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        `Ticket ist geschlossen. Nur Admins koennen Material ${action}.`,
      );
    }
  }

  private sanitize(material: TicketMaterial) {
    return {
      id: material.id,
      ticketId: material.ticketId,
      name: material.name,
      quantity: material.quantity,
      unitPriceNet: Number(material.unitPriceNet),
      vatRateSnapshot: Number(material.vatRateSnapshot),
      vatRateLabel: material.vatRateLabel,
      vatRateId: material.vatRateId,
      createdBy: material.createdBy
        ? {
            id: material.createdBy.id,
            firstName: material.createdBy.firstName,
            lastName: material.createdBy.lastName,
          }
        : null,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
    };
  }
}
