import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { Ticket } from './ticket.entity.js';
import { VatRate } from './vat-rate.entity.js';

@Entity('ticket_materials')
export class TicketMaterial {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPriceNet!: number;

  /** Snapshot of the VAT rate percentage at time of creation */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  vatRateSnapshot!: number;

  /** Snapshot of the VAT rate label at time of creation */
  @Column({ length: 50 })
  vatRateLabel!: string;

  // --- Relations ---

  @Column()
  ticketId!: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: Ticket;

  @Column({ nullable: true })
  vatRateId!: string | null;

  @ManyToOne(() => VatRate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vatRateId' })
  vatRate!: VatRate | null;

  @Column()
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
