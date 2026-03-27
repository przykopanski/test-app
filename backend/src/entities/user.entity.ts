import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity.js';

export enum UserRole {
  ADMIN = 'admin',
  TECHNICIAN = 'technician',
  OFFICE = 'office',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.TECHNICIAN })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];
}
