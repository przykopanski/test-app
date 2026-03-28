import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TimeEntry } from '../entities/time-entry.entity.js';
import { Ticket } from '../entities/ticket.entity.js';
import { AuditLog, AuditAction } from '../entities/audit-log.entity.js';
import { StartTimerDto } from './dto/start-timer.dto.js';
import { StopTimerDto } from './dto/stop-timer.dto.js';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto.js';
import { TimeEntryFilterDto } from './dto/time-entry-filter.dto.js';

@Injectable()
export class TimeEntriesService implements OnModuleInit {
  private readonly logger = new Logger(TimeEntriesService.name);

  constructor(
    @InjectRepository(TimeEntry)
    private timeEntriesRepo: Repository<TimeEntry>,
    @InjectRepository(Ticket)
    private ticketsRepo: Repository<Ticket>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a partial unique index to enforce max one running timer per technician
   * per ticket at the database level. This cannot be expressed via TypeORM decorators.
   *
   * PROJ-11: Changed from per-technician to per-technician-per-ticket to allow
   * multiple parallel timers on different tickets.
   */
  async onModuleInit() {
    try {
      // Drop the old single-timer-per-technician constraint if it exists
      await this.dataSource.query(`
        DROP INDEX IF EXISTS "UQ_one_running_timer_per_technician"
      `);
      // Create new constraint: one running timer per technician per ticket
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_one_running_timer_per_technician_per_ticket"
        ON "time_entries" ("technicianId", "ticketId")
        WHERE "isRunning" = true
      `);
      this.logger.log('Partial unique index for running timers (per technician per ticket) ensured');
    } catch (error) {
      this.logger.warn('Could not create partial unique index', error);
    }
  }

  /**
   * Start a new timer for the current technician.
   * PROJ-11: Enforces max one running timer per technician per ticket
   * (multiple timers on different tickets are allowed).
   */
  async start(dto: StartTimerDto, userId: string) {
    // Check ticket exists
    const ticket = await this.ticketsRepo.findOne({
      where: { id: dto.ticketId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket nicht gefunden');
    }

    // Enforce single active timer per technician per ticket
    const existing = await this.timeEntriesRepo.findOne({
      where: { technicianId: userId, ticketId: dto.ticketId, isRunning: true },
    });
    if (existing) {
      throw new ConflictException(
        'Du hast bereits einen aktiven Timer auf diesem Ticket',
      );
    }

    const entry = this.timeEntriesRepo.create({
      ticketId: dto.ticketId,
      technicianId: userId,
      workType: dto.workType,
      startedAt: new Date(),
      isRunning: true,
    });

    let saved: TimeEntry;
    try {
      saved = await this.timeEntriesRepo.save(entry);
    } catch (error: unknown) {
      // Handle race condition: DB unique constraint prevents duplicate running timers per ticket
      if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
        throw new ConflictException(
          'Du hast bereits einen aktiven Timer auf diesem Ticket',
        );
      }
      throw error;
    }

    await this.auditRepo.save({
      userId,
      action: AuditAction.TIMER_STARTED,
      metadata: {
        timeEntryId: saved.id,
        ticketId: dto.ticketId,
        ticketNumber: ticket.ticketNumber,
        workType: dto.workType,
      },
    });

    return this.findOneWithRelations(saved.id);
  }

  /**
   * Stop a running timer. Computes raw_seconds and billable_minutes.
   */
  async stop(id: string, dto: StopTimerDto, userId: string) {
    const entry = await this.timeEntriesRepo.findOne({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('Zeiteintrag nicht gefunden');
    }

    if (!entry.isRunning) {
      throw new BadRequestException('Dieser Timer laeuft nicht mehr');
    }

    // Only the technician who started the timer can stop it
    if (entry.technicianId !== userId) {
      throw new ForbiddenException(
        'Nur der Techniker der den Timer gestartet hat kann ihn stoppen',
      );
    }

    const now = new Date();
    const rawSeconds = Math.floor(
      (now.getTime() - entry.startedAt.getTime()) / 1000,
    );
    const billableMinutes = this.roundToBillableMinutes(rawSeconds);

    entry.stoppedAt = now;
    entry.isRunning = false;
    entry.rawSeconds = rawSeconds;
    entry.billableMinutes = billableMinutes;
    entry.description = dto.description;

    await this.timeEntriesRepo.save(entry);

    await this.auditRepo.save({
      userId,
      action: AuditAction.TIMER_STOPPED,
      metadata: {
        timeEntryId: id,
        ticketId: entry.ticketId,
        rawSeconds,
        billableMinutes,
      },
    });

    return this.findOneWithRelations(id);
  }

  /**
   * Get all currently running timers for a technician (for ActiveTimerBar).
   * PROJ-11: Returns an array of all active timers (was single object before).
   */
  async findActive(userId: string) {
    const entries = await this.timeEntriesRepo.find({
      where: { technicianId: userId, isRunning: true },
      relations: ['technician', 'ticket'],
      order: { startedAt: 'ASC' },
    });

    return entries.map((e) => this.sanitize(e));
  }

  /**
   * List time entries for a ticket (chronological order).
   */
  async findByFilters(filters: TimeEntryFilterDto) {
    const qb = this.timeEntriesRepo
      .createQueryBuilder('te')
      .leftJoinAndSelect('te.technician', 'technician')
      .leftJoinAndSelect('te.ticket', 'ticket')
      .orderBy('te.startedAt', 'ASC');

    if (filters.ticketId) {
      qb.andWhere('te.ticketId = :ticketId', { ticketId: filters.ticketId });
    }

    if (filters.technicianId) {
      qb.andWhere('te.technicianId = :technicianId', { technicianId: filters.technicianId });
    }

    if (filters.from) {
      qb.andWhere('te.startedAt >= :from', { from: filters.from });
    }

    if (filters.to) {
      qb.andWhere('te.startedAt < :to', { to: filters.to });
    }

    if (!filters.ticketId && !filters.technicianId && !filters.from) {
      throw new BadRequestException('Mindestens ein Filter (ticketId, technicianId oder from) ist erforderlich');
    }

    const entries = await qb.getMany();
    return entries.map((e) => this.sanitize(e));
  }

  /**
   * Admin: update a time entry (description, billable override).
   */
  async update(id: string, dto: UpdateTimeEntryDto, userId: string, userRole: string) {
    if (userRole !== 'admin') {
      throw new ForbiddenException(
        'Nur Administratoren koennen Zeiteintraege bearbeiten',
      );
    }

    const entry = await this.timeEntriesRepo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Zeiteintrag nicht gefunden');
    }

    if (entry.isRunning) {
      throw new BadRequestException(
        'Laufende Timer koennen nicht bearbeitet werden',
      );
    }

    // If billableMinutes is being changed, overrideNote is required
    if (
      dto.billableMinutes !== undefined &&
      dto.billableMinutes !== entry.billableMinutes
    ) {
      if (!dto.overrideNote) {
        throw new BadRequestException(
          'Override-Notiz ist erforderlich wenn abrechenbare Minuten geaendert werden',
        );
      }
      entry.billableMinutes = dto.billableMinutes;
      entry.billableOverride = true;
      entry.overrideNote = dto.overrideNote;
    }

    if (dto.description !== undefined) {
      entry.description = dto.description;
    }

    await this.timeEntriesRepo.save(entry);

    await this.auditRepo.save({
      userId,
      action: AuditAction.TIME_ENTRY_UPDATED,
      metadata: {
        timeEntryId: id,
        changes: dto,
      },
    });

    return this.findOneWithRelations(id);
  }

  /**
   * Admin: delete a time entry.
   */
  async remove(id: string, userId: string, userRole: string) {
    if (userRole !== 'admin') {
      throw new ForbiddenException(
        'Nur Administratoren koennen Zeiteintraege loeschen',
      );
    }

    const entry = await this.timeEntriesRepo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Zeiteintrag nicht gefunden');
    }

    if (entry.isRunning) {
      throw new BadRequestException(
        'Laufende Timer koennen nicht geloescht werden. Zuerst stoppen.',
      );
    }

    await this.timeEntriesRepo.remove(entry);

    await this.auditRepo.save({
      userId,
      action: AuditAction.TIME_ENTRY_DELETED,
      metadata: {
        timeEntryId: id,
        ticketId: entry.ticketId,
        technicianId: entry.technicianId,
      },
    });
  }

  // --- Private helpers ---

  /**
   * Round raw seconds to billable minutes in 15-min blocks.
   * 1-15 min -> 15, 16-30 -> 30, 31-45 -> 45, etc.
   * Minimum: 15 minutes.
   */
  private roundToBillableMinutes(rawSeconds: number): number {
    if (rawSeconds <= 0) return 15;
    const rawMinutes = Math.ceil(rawSeconds / 60);
    return Math.ceil(rawMinutes / 15) * 15;
  }

  private async findOneWithRelations(id: string) {
    const entry = await this.timeEntriesRepo.findOne({
      where: { id },
      relations: ['technician', 'ticket'],
    });

    if (!entry) {
      throw new NotFoundException('Zeiteintrag nicht gefunden');
    }

    return this.sanitize(entry);
  }

  private sanitize(entry: TimeEntry) {
    return {
      id: entry.id,
      ticketId: entry.ticketId,
      technicianId: entry.technicianId,
      workType: entry.workType,
      startedAt: entry.startedAt,
      stoppedAt: entry.stoppedAt,
      isRunning: entry.isRunning,
      rawSeconds: entry.rawSeconds,
      billableMinutes: entry.billableMinutes,
      description: entry.description,
      billableOverride: entry.billableOverride,
      overrideNote: entry.overrideNote,
      technician: entry.technician
        ? {
            id: entry.technician.id,
            firstName: entry.technician.firstName,
            lastName: entry.technician.lastName,
          }
        : null,
      ticket: entry.ticket
        ? {
            id: entry.ticket.id,
            ticketNumber: entry.ticket.ticketNumber,
            subject: entry.ticket.subject,
            status: entry.ticket.status,
          }
        : null,
    };
  }
}
