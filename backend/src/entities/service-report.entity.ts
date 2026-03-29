import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Ticket } from './ticket.entity.js';
import { User } from './user.entity.js';

export enum ServiceReportStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
}

@Entity('service_reports')
export class ServiceReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index('IDX_service_reports_ticket', { unique: true })
  ticketId!: string;

  @OneToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: Ticket;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({
    type: 'enum',
    enum: ServiceReportStatus,
    default: ServiceReportStatus.DRAFT,
  })
  status!: ServiceReportStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lockedAt!: Date | null;

  @Column({ nullable: true })
  lockedBy!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lockedBy' })
  lockedByUser!: User | null;

  // --- Signature fields (PROJ-7) ---

  @Column({ type: 'text', nullable: true })
  signatureData!: string | null;

  @Column({ type: 'varchar', nullable: true })
  signerName!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  signedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  signatureRefused!: boolean;

  @Column({ type: 'text', nullable: true })
  refusalReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
