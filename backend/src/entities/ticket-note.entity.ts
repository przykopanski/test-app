import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { Ticket } from './ticket.entity.js';

@Entity('ticket_notes')
export class TicketNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ default: false })
  isClosingNote!: boolean;

  // --- Relations ---

  @Column()
  ticketId!: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: Ticket;

  @Column()
  authorId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
