import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('vat_rates')
export class VatRate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50 })
  label!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate!: number;

  @Column({ default: true })
  isActive!: boolean;
}
