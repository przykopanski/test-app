import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { Customer } from './customer.entity.js';
import { Contact } from './contact.entity.js';
import { TicketNote } from './ticket-note.entity.js';

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ON_HOLD = 'on_hold',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', generated: 'increment', unique: true })
  ticketNumber!: number;

  @Column({ length: 200 })
  subject!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority!: TicketPriority;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status!: TicketStatus;

  // --- Relations ---

  @Column()
  customerId!: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column({ nullable: true })
  contactId!: string | null;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contactId' })
  contact!: Contact | null;

  @Column({ nullable: true })
  assigneeId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee!: User | null;

  @Column()
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => TicketNote, (note) => note.ticket, { cascade: true })
  notes!: TicketNote[];
}
