import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity.js';
import { Ticket } from './ticket.entity.js';

export enum WorkType {
  PHONE = 'phone',
  REMOTE = 'remote',
  ONSITE = 'onsite',
  TRAVEL = 'travel',
}

@Entity('time_entries')
@Index('IDX_time_entries_ticket', ['ticketId'])
@Index('IDX_time_entries_technician', ['technicianId'])
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  ticketId!: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: Ticket;

  @Column()
  technicianId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'technicianId' })
  technician!: User;

  @Column({ type: 'enum', enum: WorkType })
  workType!: WorkType;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  stoppedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isRunning!: boolean;

  @Column({ type: 'int', nullable: true })
  rawSeconds!: number | null;

  @Column({ type: 'int', nullable: true })
  billableMinutes!: number | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: false })
  billableOverride!: boolean;

  @Column({ type: 'text', nullable: true })
  overrideNote!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 1, nullable: true })
  distanceKm!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
