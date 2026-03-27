import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { User } from '../entities/user.entity.js';
import { AuditLog } from '../entities/audit-log.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuditLog])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
