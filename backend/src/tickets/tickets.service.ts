import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ticket,
  TicketStatus,
  TicketPriority,
} from '../entities/ticket.entity.js';
import { TicketNote } from '../entities/ticket-note.entity.js';
import { Contact } from '../entities/contact.entity.js';
import { AuditLog, AuditAction } from '../entities/audit-log.entity.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { CloseTicketDto } from './dto/close-ticket.dto.js';
import { TicketFilterDto } from './dto/ticket-filter.dto.js';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepo: Repository<Ticket>,
    @InjectRepository(TicketNote)
    private notesRepo: Repository<TicketNote>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    @InjectRepository(Contact)
    private contactsRepo: Repository<Contact>,
  ) {}

  // Valid status transitions (excluding closed — handled by close endpoint)
  private readonly allowedTransitions: Record<string, TicketStatus[]> = {
    [TicketStatus.OPEN]: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.ON_HOLD,
    ],
    [TicketStatus.IN_PROGRESS]: [
      TicketStatus.RESOLVED,
      TicketStatus.ON_HOLD,
      TicketStatus.OPEN,
    ],
    [TicketStatus.RESOLVED]: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.OPEN,
    ],
    [TicketStatus.ON_HOLD]: [
      TicketStatus.OPEN,
      TicketStatus.IN_PROGRESS,
    ],
    [TicketStatus.CLOSED]: [],
  };

  // Priority sort order for CASE-based sorting
  private readonly priorityOrder: Record<string, number> = {
    [TicketPriority.LOW]: 0,
    [TicketPriority.MEDIUM]: 1,
    [TicketPriority.HIGH]: 2,
    [TicketPriority.CRITICAL]: 3,
  };

  private readonly statusOrder: Record<string, number> = {
    [TicketStatus.OPEN]: 0,
    [TicketStatus.IN_PROGRESS]: 1,
    [TicketStatus.ON_HOLD]: 2,
    [TicketStatus.RESOLVED]: 3,
    [TicketStatus.CLOSED]: 4,
  };

  private readonly ticketRelations = [
    'customer',
    'contact',
    'assignee',
    'createdBy',
  ];

  async findAll(filters: TicketFilterDto) {
    const page = Math.max(1, parseInt(filters.page ?? '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(filters.limit ?? '20', 10)),
    );
    const offset = (page - 1) * limit;

    const qb = this.ticketsRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.customer', 'customer')
      .leftJoinAndSelect('ticket.contact', 'contact')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy');

    if (filters.status) {
      qb.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      qb.andWhere('ticket.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters.assigneeId) {
      if (filters.assigneeId === 'unassigned') {
        qb.andWhere('ticket.assigneeId IS NULL');
      } else {
        qb.andWhere('ticket.assigneeId = :assigneeId', {
          assigneeId: filters.assigneeId,
        });
      }
    }

    if (filters.customerId) {
      qb.andWhere('ticket.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }

    if (filters.search) {
      qb.andWhere(
        '(ticket.subject ILIKE :search OR ticket.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Sorting
    const sortOrder =
      filters.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = filters.sortBy ?? 'createdAt';

    if (sortBy === 'priority') {
      // Sort by logical severity, not alphabetical
      qb.addSelect(
        `CASE ticket.priority ${Object.entries(this.priorityOrder)
          .map(([val, ord]) => `WHEN '${val}' THEN ${ord}`)
          .join(' ')} END`,
        'priority_order',
      );
      qb.orderBy('priority_order', sortOrder);
    } else if (sortBy === 'status') {
      // Sort by workflow order, not alphabetical
      qb.addSelect(
        `CASE ticket.status ${Object.entries(this.statusOrder)
          .map(([val, ord]) => `WHEN '${val}' THEN ${ord}`)
          .join(' ')} END`,
        'status_order',
      );
      qb.orderBy('status_order', sortOrder);
    } else {
      qb.orderBy('ticket.createdAt', sortOrder);
    }

    const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();

    // Sanitize user fields (remove passwordHash)
    const sanitized = data.map((t) => this.sanitizeTicket(t));

    return {
      data: sanitized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const ticket = await this.ticketsRepo.findOne({
      where: { id },
      relations: [...this.ticketRelations, 'notes', 'notes.author'],
      order: { notes: { createdAt: 'ASC' } },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket nicht gefunden');
    }

    return this.sanitizeTicketDetail(ticket);
  }

  async create(dto: CreateTicketDto, userId: string) {
    if (dto.status === TicketStatus.CLOSED) {
      throw new BadRequestException(
        'Tickets koennen nicht mit Status "closed" erstellt werden.',
      );
    }

    // Validate contact belongs to selected customer
    if (dto.contactId) {
      const contact = await this.contactsRepo.findOne({
        where: { id: dto.contactId },
      });
      if (!contact || contact.customerId !== dto.customerId) {
        throw new BadRequestException(
          'Ansprechpartner gehoert nicht zum ausgewaehlten Kunden.',
        );
      }
    }

    const ticket = this.ticketsRepo.create({
      ...dto,
      contactId: dto.contactId ?? null,
      assigneeId: dto.assigneeId ?? null,
      createdById: userId,
    });

    const saved = await this.ticketsRepo.save(ticket);

    await this.auditRepo.save({
      userId,
      action: AuditAction.TICKET_CREATED,
      metadata: { ticketId: saved.id, ticketNumber: saved.ticketNumber },
    });

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateTicketDto, userId: string) {
    const ticket = await this.ticketsRepo.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket nicht gefunden');
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException(
        'Geschlossene Tickets koennen nicht mehr bearbeitet werden.',
      );
    }

    if (dto.status === TicketStatus.CLOSED) {
      throw new BadRequestException(
        'Ticket kann nicht direkt auf "closed" gesetzt werden. Verwende den Schliessen-Endpunkt.',
      );
    }

    // Validate status transition
    if (dto.status && dto.status !== ticket.status) {
      const allowed = this.allowedTransitions[ticket.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Statuswechsel von "${ticket.status}" zu "${dto.status}" ist nicht erlaubt.`,
        );
      }
    }

    // Validate contact belongs to selected customer
    const targetCustomerId = dto.customerId ?? ticket.customerId;
    const targetContactId =
      dto.contactId !== undefined ? dto.contactId : ticket.contactId;
    if (targetContactId) {
      const contact = await this.contactsRepo.findOne({
        where: { id: targetContactId },
      });
      if (!contact || contact.customerId !== targetCustomerId) {
        throw new BadRequestException(
          'Ansprechpartner gehoert nicht zum ausgewaehlten Kunden.',
        );
      }
    }

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const ticketRecord = ticket as unknown as Record<string, unknown>;

    for (const key of Object.keys(dto) as (keyof UpdateTicketDto)[]) {
      if (dto[key] !== undefined && dto[key] !== ticketRecord[key]) {
        changes[key] = { old: ticketRecord[key], new: dto[key] };
      }
    }

    Object.assign(ticket, {
      ...dto,
      contactId:
        dto.contactId !== undefined ? dto.contactId || null : ticket.contactId,
      assigneeId:
        dto.assigneeId !== undefined
          ? dto.assigneeId || null
          : ticket.assigneeId,
    });

    await this.ticketsRepo.save(ticket);

    if (Object.keys(changes).length > 0) {
      await this.auditRepo.save({
        userId,
        action: AuditAction.TICKET_UPDATED,
        metadata: { ticketId: id, changes },
      });
    }

    return this.findOne(id);
  }

  async close(id: string, dto: CloseTicketDto, userId: string) {
    const ticket = await this.ticketsRepo.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket nicht gefunden');
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Ticket ist bereits geschlossen');
    }

    // Create closing note
    const note = this.notesRepo.create({
      ticketId: id,
      authorId: userId,
      text: dto.closingNote,
      isClosingNote: true,
    });
    await this.notesRepo.save(note);

    // Update status
    ticket.status = TicketStatus.CLOSED;
    await this.ticketsRepo.save(ticket);

    await this.auditRepo.save({
      userId,
      action: AuditAction.TICKET_CLOSED,
      metadata: { ticketId: id, ticketNumber: ticket.ticketNumber },
    });

    return this.findOne(id);
  }

  async addNote(ticketId: string, dto: CreateNoteDto, userId: string) {
    const ticket = await this.ticketsRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket nicht gefunden');
    }

    const note = this.notesRepo.create({
      ticketId,
      authorId: userId,
      text: dto.text,
      isClosingNote: false,
    });

    const saved = await this.notesRepo.save(note);

    // Re-fetch with author relation
    const result = await this.notesRepo.findOne({
      where: { id: saved.id },
      relations: ['author'],
    });

    return this.sanitizeNote(result!);
  }

  // --- Sanitization helpers (strip passwordHash from user objects) ---

  private sanitizeUser(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    } | null,
  ) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  private sanitizeTicket(ticket: Ticket) {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      customer: ticket.customer,
      contact: ticket.contact,
      assignee: this.sanitizeUser(ticket.assignee),
      createdBy: this.sanitizeUser(ticket.createdBy),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  private sanitizeNote(note: TicketNote) {
    return {
      id: note.id,
      text: note.text,
      isClosingNote: note.isClosingNote,
      author: this.sanitizeUser(note.author),
      createdAt: note.createdAt,
    };
  }

  private sanitizeTicketDetail(ticket: Ticket) {
    return {
      ...this.sanitizeTicket(ticket),
      notes: (ticket.notes ?? []).map((n) => this.sanitizeNote(n)),
    };
  }
}
