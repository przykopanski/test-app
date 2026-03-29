import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ServiceReport } from './service-report.entity.js';
import { User } from './user.entity.js';

@Entity('service_report_unlocks')
@Index('IDX_service_report_unlocks_report', ['serviceReportId'])
export class ServiceReportUnlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  serviceReportId!: string;

  @ManyToOne(() => ServiceReport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceReportId' })
  serviceReport!: ServiceReport;

  @Column()
  unlockedBy!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unlockedBy' })
  unlockedByUser!: User;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn()
  unlockedAt!: Date;
}
