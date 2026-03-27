import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity.js';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  customerId!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ default: '' })
  phone!: string;

  @Column({ default: '' })
  email!: string;

  @Column({ default: '' })
  position!: string;

  @ManyToOne(() => Customer, (customer) => customer.contacts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;
}
