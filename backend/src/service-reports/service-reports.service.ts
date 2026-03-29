import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceReport, ServiceReportStatus } from '../entities/service-report.entity.js';
import { ServiceReportUnlock } from '../entities/service-report-unlock.entity.js';
import { Ticket } from '../entities/ticket.entity.js';
import { AuditLog, AuditAction } from '../entities/audit-log.entity.js';
import { User } from '../entities/user.entity.js';
import { TimeEntry } from '../entities/time-entry.entity.js';
import { CreateServiceReportDto } from './dto/create-service-report.dto.js';
import { UpdateServiceReportDto } from './dto/update-service-report.dto.js';
import { UnlockServiceReportDto } from './dto/unlock-service-report.dto.js';

@Injectable()
export class ServiceReportsService {
  constructor(
    @InjectRepository(ServiceReport)
    private reportsRepo: Repository<ServiceReport>,
    @InjectRepository(ServiceReportUnlock)
    private unlocksRepo: Repository<ServiceReportUnlock>,
    @InjectRepository(Ticket)
    private ticketsRepo: Repository<Ticket>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(TimeEntry)
    private timeEntriesRepo: Repository<TimeEntry>,
  ) {}

  /**
   * GET /tickets/:ticketId/service-report
   * Returns the service report for a ticket, or null if none exists.
   */
  async findByTicket(ticketId: string) {
    await this.ensureTicketExists(ticketId);

    const report = await this.reportsRepo.findOne({
      where: { ticketId },
    });

    if (!report) return null;

    return this.sanitize(report);
  }

  /**
   * POST /tickets/:ticketId/service-report
   * Create a new draft service report for a ticket (1:1 relationship).
   */
  async create(ticketId: string, dto: CreateServiceReportDto, userId: string) {
    const ticket = await this.ensureTicketExists(ticketId);

    // Ownership check: only assigned technician or admin can create reports
    await this.ensureTicketAccess(ticket, userId);

    // Check if a report already exists
    const existing = await this.reportsRepo.findOne({ where: { ticketId } });
    if (existing) {
      throw new ConflictException('Fuer dieses Ticket existiert bereits ein Einsatzbericht');
    }

    const report = this.reportsRepo.create({
      ticketId,
      description: dto.description ?? '',
      status: ServiceReportStatus.DRAFT,
    });

    const saved = await this.reportsRepo.save(report);

    await this.auditRepo.save({
      userId,
      action: AuditAction.SERVICE_REPORT_CREATED,
      metadata: { ticketId, serviceReportId: saved.id },
    });

    return this.sanitize(saved);
  }

  /**
   * PATCH /tickets/:ticketId/service-report
   * Update description and/or finalize (set status to completed).
   */
  async update(ticketId: string, dto: UpdateServiceReportDto, userId: string) {
    const ticket = await this.ensureTicketExists(ticketId);
    await this.ensureTicketAccess(ticket, userId);

    const report = await this.reportsRepo.findOne({ where: { ticketId } });
    if (!report) {
      throw new NotFoundException('Einsatzbericht nicht gefunden');
    }

    if (report.status === ServiceReportStatus.COMPLETED) {
      throw new BadRequestException(
        'Abgeschlossener Einsatzbericht kann nicht bearbeitet werden. Ein Admin muss den Bericht zuerst entsperren.',
      );
    }

    // Update description if provided
    if (dto.description !== undefined) {
      report.description = dto.description;
    }

    // Finalize if requested
    if (dto.status === ServiceReportStatus.COMPLETED) {
      if (!report.description || report.description.trim() === '') {
        throw new BadRequestException(
          'Arbeitsbeschreibung ist erforderlich um den Bericht zu finalisieren',
        );
      }

      // Validate signature data (PROJ-7)
      const isRefusal = dto.signatureRefused === true;

      if (isRefusal) {
        // Refusal: require reason, no signature data
        if (!dto.refusalReason || dto.refusalReason.trim() === '') {
          throw new BadRequestException(
            'Verweigerungsgrund ist erforderlich wenn die Unterschrift verweigert wird',
          );
        }
        report.signatureRefused = true;
        report.refusalReason = dto.refusalReason.trim();
        report.signatureData = null;
        report.signerName = null;
        report.signedAt = new Date();
      } else {
        // Signature: require signatureData and signerName
        if (!dto.signatureData) {
          throw new BadRequestException(
            'Unterschrift ist erforderlich um den Bericht zu finalisieren',
          );
        }
        if (!dto.signerName || dto.signerName.trim() === '') {
          throw new BadRequestException(
            'Name des Unterzeichners ist erforderlich',
          );
        }
        // Validate base64 data URL format
        if (
          (!dto.signatureData.startsWith('data:image/jpeg') &&
            !dto.signatureData.startsWith('data:image/png')) ||
          !dto.signatureData.includes(';base64,')
        ) {
          throw new BadRequestException(
            'Unterschrift muss ein gueltiges base64-Bild sein',
          );
        }
        report.signatureData = dto.signatureData;
        report.signerName = dto.signerName.trim();
        report.signatureRefused = false;
        report.refusalReason = null;
        report.signedAt = new Date();
      }

      report.status = ServiceReportStatus.COMPLETED;
      report.lockedAt = new Date();
      report.lockedBy = userId;

      await this.reportsRepo.save(report);

      await this.auditRepo.save({
        userId,
        action: AuditAction.SERVICE_REPORT_FINALIZED,
        metadata: {
          ticketId,
          serviceReportId: report.id,
          signatureRefused: isRefusal,
        },
      });

      return this.sanitize(report);
    }

    await this.reportsRepo.save(report);

    await this.auditRepo.save({
      userId,
      action: AuditAction.SERVICE_REPORT_UPDATED,
      metadata: { ticketId, serviceReportId: report.id },
    });

    return this.sanitize(report);
  }

  /**
   * POST /tickets/:ticketId/service-report/unlock
   * Admin: unlock a completed report back to draft.
   */
  async unlock(ticketId: string, dto: UnlockServiceReportDto, userId: string, userRole: string) {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Nur Administratoren koennen Berichte entsperren');
    }

    const report = await this.reportsRepo.findOne({ where: { ticketId } });
    if (!report) {
      throw new NotFoundException('Einsatzbericht nicht gefunden');
    }

    if (report.status !== ServiceReportStatus.COMPLETED) {
      throw new BadRequestException('Nur abgeschlossene Berichte koennen entsperrt werden');
    }

    // Create unlock audit record
    const unlock = this.unlocksRepo.create({
      serviceReportId: report.id,
      unlockedBy: userId,
      reason: dto.reason ?? null,
    });
    await this.unlocksRepo.save(unlock);

    // Reset report to draft and clear signature fields
    report.status = ServiceReportStatus.DRAFT;
    report.lockedAt = null;
    report.lockedBy = null;
    report.signatureData = null;
    report.signerName = null;
    report.signedAt = null;
    report.signatureRefused = false;
    report.refusalReason = null;
    await this.reportsRepo.save(report);

    await this.auditRepo.save({
      userId,
      action: AuditAction.SERVICE_REPORT_UNLOCKED,
      metadata: {
        ticketId,
        serviceReportId: report.id,
        reason: dto.reason ?? null,
      },
    });

    return this.sanitize(report);
  }

  // --- Private helpers ---

  private async ensureTicketExists(ticketId: string) {
    const ticket = await this.ticketsRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket nicht gefunden');
    }
    return ticket;
  }

  /**
   * Ensure the user has access to modify the service report for this ticket.
   * Admins always have access. Technicians must be the assignee or have time entries on the ticket.
   */
  private async ensureTicketAccess(ticket: Ticket, userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user?.role === 'admin') return;

    if (ticket.assigneeId === userId) return;

    const hasEntries = await this.timeEntriesRepo.count({
      where: { ticketId: ticket.id, technicianId: userId },
    });
    if (hasEntries > 0) return;

    throw new ForbiddenException(
      'Sie haben keinen Zugriff auf den Einsatzbericht dieses Tickets',
    );
  }

  private async sanitize(report: ServiceReport) {
    let lockedByName: string | null = null;
    if (report.lockedBy) {
      const user = await this.usersRepo.findOne({ where: { id: report.lockedBy } });
      if (user) {
        lockedByName = `${user.firstName} ${user.lastName}`;
      }
    }

    return {
      id: report.id,
      ticketId: report.ticketId,
      description: report.description,
      status: report.status,
      lockedAt: report.lockedAt,
      lockedBy: lockedByName,
      signatureData: report.signatureData,
      signerName: report.signerName,
      signedAt: report.signedAt,
      signatureRefused: report.signatureRefused,
      refusalReason: report.refusalReason,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }
}
