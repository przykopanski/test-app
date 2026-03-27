import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Contact } from './contact.entity.js';

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  customerNumber!: string | null;

  @Column({ default: '' })
  street!: string;

  @Column({ default: '' })
  city!: string;

  @Column({ default: '' })
  zip!: string;

  @Column({ default: '' })
  country!: string;

  @Column({ default: '' })
  phone!: string;

  @Column({ default: '' })
  email!: string;

  @Column({ type: 'text', default: '' })
  notes!: string;

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status!: CustomerStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Contact, (contact) => contact.customer, { cascade: true })
  contacts!: Contact[];
}
