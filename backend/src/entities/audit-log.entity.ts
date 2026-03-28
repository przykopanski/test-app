import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'passwort_geändert',
  ROLE_CHANGED = 'rolle_geändert',
  USER_DEACTIVATED = 'benutzer_deaktiviert',
  USER_CREATED = 'benutzer_erstellt',
  USER_UPDATED = 'benutzer_aktualisiert',
  TICKET_CREATED = 'ticket_erstellt',
  TICKET_UPDATED = 'ticket_aktualisiert',
  TICKET_CLOSED = 'ticket_geschlossen',
  TIMER_STARTED = 'timer_gestartet',
  TIMER_STOPPED = 'timer_gestoppt',
  TIME_ENTRY_UPDATED = 'zeiteintrag_aktualisiert',
  TIME_ENTRY_CREATED = 'zeiteintrag_erstellt',
  TIME_ENTRY_DELETED = 'zeiteintrag_geloescht',
}

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
