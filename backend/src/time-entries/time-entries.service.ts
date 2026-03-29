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
import { User, UserRole } from '../entities/user.entity.js';
import { StartTimerDto } from './dto/start-timer.dto.js';
import { StopTimerDto } from './dto/stop-timer.dto.js';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto.js';
import { TimeEntryFilterDto } from './dto/time-entry-filter.dto.js';
import { CreateManualEntryDto } from './dto/create-manual-entry.dto.js';
import { ServiceReport, ServiceReportStatus } from '../entities/service-report.entity.js';
import { SystemSettingsService } from '../system-settings/system-settings.service.js';

const TIMEZONE = 'Europe/Berlin';

/** Returns { todayStart, todayEnd } as UTC Dates for midnight-to-midnight in Europe/Berlin. */
function getTodayBounds(): { todayStart: Date; todayEnd: Date } {
  const now = new Date();
  // Get today's date in Europe/Berlin (YYYY-MM-DD)
  const localDate = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  // Compute UTC offset for the timezone: parse "now" as if it were local time
  const localNow = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const offsetMs = now.getTime() - localNow.getTime();
  // Midnight in Europe/Berlin, expressed as UTC
  const todayStart = new Date(new Date(`${localDate}T00:00:00.000Z`).getTime() + offsetMs);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return { todayStart, todayEnd };
}

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
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(ServiceReport)
    private serviceReportsRepo: Repository<ServiceReport>,
    private dataSource: DataSource,
    private systemSettings: SystemSettingsService,
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

    // Save distance for travel entries
    if (dto.distanceKm !== undefined) {
      entry.distanceKm = dto.distanceKm;
    }

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
   * Update a time entry.
   * - Admin: can update description, billable override, distanceKm
   * - Technician: can only update distanceKm on their own travel entries
   */
  async update(id: string, dto: UpdateTimeEntryDto, userId: string, userRole: string) {
    const entry = await this.timeEntriesRepo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Zeiteintrag nicht gefunden');
    }

    if (entry.isRunning) {
      throw new BadRequestException(
        'Laufende Timer koennen nicht bearbeitet werden',
      );
    }

    // Check if the ticket's service report is completed — block km edits
    const report = await this.serviceReportsRepo.findOne({
      where: { ticketId: entry.ticketId },
    });
    if (report?.status === ServiceReportStatus.COMPLETED && dto.distanceKm !== undefined) {
      throw new BadRequestException(
        'Kilometer koennen nicht geaendert werden, da der Einsatzbericht bereits abgeschlossen ist.',
      );
    }

    // Technicians can only update distanceKm on their own travel entries
    const isTechnicianOwnEntry = entry.technicianId === userId;
    const isOnlyDistanceUpdate =
      dto.distanceKm !== undefined &&
      dto.description === undefined &&
      dto.billableMinutes === undefined &&
      dto.overrideNote === undefined;

    if (userRole !== 'admin') {
      if (!isTechnicianOwnEntry || !isOnlyDistanceUpdate) {
        throw new ForbiddenException(
          'Nur Administratoren koennen Zeiteintraege bearbeiten. Techniker koennen nur Kilometer auf eigenen Fahrt-Eintraegen aktualisieren.',
        );
      }
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

    if (dto.distanceKm !== undefined) {
      entry.distanceKm = dto.distanceKm;
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

  /**
   * GET /time-tracking/today
   * Returns active timers, today's completed time entries, server-calculated gaps,
   * and daily totals for a given technician.
   * If userId is provided (admin view), returns data for that user.
   */
  async getTodayDashboard(technicianId: string) {
    const now = new Date();
    const { todayStart, todayEnd } = getTodayBounds();

    // Fetch active timers
    const activeTimers = await this.timeEntriesRepo.find({
      where: { technicianId, isRunning: true },
      relations: ['ticket'],
      order: { startedAt: 'ASC' },
    });

    // Fetch completed entries for today
    const completedEntries = await this.timeEntriesRepo
      .createQueryBuilder('te')
      .leftJoinAndSelect('te.ticket', 'ticket')
      .where('te.technicianId = :technicianId', { technicianId })
      .andWhere('te.isRunning = false')
      .andWhere('te.startedAt >= :todayStart', { todayStart: todayStart.toISOString() })
      .andWhere('te.startedAt < :todayEnd', { todayEnd: todayEnd.toISOString() })
      .orderBy('te.startedAt', 'ASC')
      .getMany();

    // Build active timers response
    const activeTimerData = activeTimers.map((t) => ({
      timerId: t.id,
      ticketId: t.ticketId,
      ticketNumber: t.ticket?.ticketNumber ?? 0,
      ticketTitle: t.ticket?.subject ?? '',
      workType: t.workType,
      startedAt: t.startedAt.toISOString(),
      elapsedSeconds: Math.floor((now.getTime() - t.startedAt.getTime()) / 1000),
    }));

    // Build time entries response
    const timeEntryData = completedEntries.map((e) => ({
      entryId: e.id,
      ticketId: e.ticketId,
      ticketNumber: e.ticket?.ticketNumber ?? 0,
      ticketTitle: e.ticket?.subject ?? '',
      workType: e.workType,
      startTime: e.startedAt.toISOString(),
      endTime: e.stoppedAt?.toISOString() ?? '',
      durationMinutes: e.rawSeconds ? Math.round(e.rawSeconds / 60) : 0,
      description: e.description,
      isBillable: (e.billableMinutes ?? 0) > 0,
    }));

    // Calculate gaps between completed entries (gated by system setting)
    const gapDetectionEnabled = await this.systemSettings.get('gap_detection_enabled');
    let gaps: Array<{ gapStart: string; gapEnd: string; durationMinutes: number }> = [];
    if (gapDetectionEnabled === true) {
      const thresholdMinutes = (await this.systemSettings.get('gap_threshold_minutes') as number) ?? 30;
      gaps = this.calculateGaps(completedEntries, thresholdMinutes);
    }

    // Calculate daily totals
    const totalMinutesRaw = completedEntries.reduce(
      (sum, e) => sum + (e.rawSeconds ? Math.round(e.rawSeconds / 60) : 0),
      0,
    );
    const totalMinutesBillable = completedEntries.reduce(
      (sum, e) => sum + (e.billableMinutes ?? 0),
      0,
    );

    const byWorkTypeMap = new Map<string, number>();
    for (const e of completedEntries) {
      const mins = e.rawSeconds ? Math.round(e.rawSeconds / 60) : 0;
      byWorkTypeMap.set(e.workType, (byWorkTypeMap.get(e.workType) ?? 0) + mins);
    }
    const byWorkType = Array.from(byWorkTypeMap.entries()).map(([workType, minutes]) => ({
      workType,
      minutes,
    }));

    return {
      date: todayStart.toISOString().split('T')[0],
      activeTimers: activeTimerData,
      timeEntries: timeEntryData,
      gaps,
      dailyTotals: {
        totalMinutesRaw,
        totalMinutesBillable,
        byWorkType,
      },
    };
  }

  /**
   * GET /admin/dashboard/today
   * Returns summary for all active technicians for today.
   */
  async getAdminTodayOverview() {
    const { todayStart, todayEnd } = getTodayBounds();

    // Get all active users who may have time entries
    const technicians = await this.usersRepo.find({
      where: { isActive: true },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });

    const result = [];

    for (const tech of technicians) {
      // Count active timers
      const activeTimerCount = await this.timeEntriesRepo.count({
        where: { technicianId: tech.id, isRunning: true },
      });

      // Sum raw seconds for today's completed entries
      const todayResult = await this.timeEntriesRepo
        .createQueryBuilder('te')
        .select('COALESCE(SUM(te.rawSeconds), 0)', 'totalSeconds')
        .addSelect('MAX(te.stoppedAt)', 'lastStopped')
        .where('te.technicianId = :techId', { techId: tech.id })
        .andWhere('te.isRunning = false')
        .andWhere('te.startedAt >= :todayStart', { todayStart: todayStart.toISOString() })
        .andWhere('te.startedAt < :todayEnd', { todayEnd: todayEnd.toISOString() })
        .getRawOne();

      const totalSeconds = parseInt(todayResult?.totalSeconds ?? '0', 10);
      const lastStopped = todayResult?.lastStopped ?? null;

      // Determine last activity (either last stopped entry or latest active timer start)
      let lastActivity: string | null = lastStopped
        ? new Date(lastStopped).toISOString()
        : null;

      if (activeTimerCount > 0) {
        const latestActive = await this.timeEntriesRepo.findOne({
          where: { technicianId: tech.id, isRunning: true },
          order: { startedAt: 'DESC' },
        });
        if (latestActive) {
          const activeStart = latestActive.startedAt.toISOString();
          if (!lastActivity || activeStart > lastActivity) {
            lastActivity = activeStart;
          }
        }
      }

      result.push({
        userId: tech.id,
        displayName: `${tech.firstName} ${tech.lastName}`,
        totalMinutesToday: Math.round(totalSeconds / 60),
        activeTimerCount,
        lastActivity,
      });
    }

    return result;
  }

  /**
   * POST /time-entries/manual
   * Create a completed (non-running) time entry. Admin only.
   */
  async createManual(dto: CreateManualEntryDto, userId: string) {
    // Validate ticket exists
    const ticket = await this.ticketsRepo.findOne({
      where: { id: dto.ticketId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket nicht gefunden');
    }

    const startedAt = new Date(dto.startedAt);
    const stoppedAt = new Date(dto.stoppedAt);

    if (stoppedAt <= startedAt) {
      throw new BadRequestException('Endzeit muss nach der Startzeit liegen');
    }

    const rawSeconds = Math.floor((stoppedAt.getTime() - startedAt.getTime()) / 1000);
    const billableMinutes = this.roundToBillableMinutes(rawSeconds);

    const entry = this.timeEntriesRepo.create({
      ticketId: dto.ticketId,
      technicianId: userId,
      workType: dto.workType,
      startedAt,
      stoppedAt,
      isRunning: false,
      rawSeconds,
      billableMinutes,
      description: dto.description,
      distanceKm: dto.distanceKm ?? null,
    });

    const saved = await this.timeEntriesRepo.save(entry);

    await this.auditRepo.save({
      userId,
      action: AuditAction.TIME_ENTRY_CREATED,
      metadata: {
        timeEntryId: saved.id,
        ticketId: dto.ticketId,
        ticketNumber: ticket.ticketNumber,
        workType: dto.workType,
        manual: true,
      },
    });

    return this.findOneWithRelations(saved.id);
  }

  /**
   * Calculate gaps exceeding thresholdMinutes between completed time entries.
   * No gap before the first entry (work start is unknown).
   */
  private calculateGaps(entries: TimeEntry[], thresholdMinutes: number) {
    const gaps: Array<{ gapStart: string; gapEnd: string; durationMinutes: number }> = [];

    if (entries.length < 2) return gaps;

    for (let i = 0; i < entries.length - 1; i++) {
      const currentEnd = entries[i].stoppedAt;
      const nextStart = entries[i + 1].startedAt;

      if (!currentEnd) continue;

      const gapMs = nextStart.getTime() - currentEnd.getTime();
      const gapMinutes = Math.round(gapMs / (1000 * 60));

      if (gapMinutes > thresholdMinutes) {
        gaps.push({
          gapStart: currentEnd.toISOString(),
          gapEnd: nextStart.toISOString(),
          durationMinutes: gapMinutes,
        });
      }
    }

    return gaps;
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
      distanceKm: entry.distanceKm ? Number(entry.distanceKm) : null,
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
