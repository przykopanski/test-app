import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../entities/customer.entity.js';
import { Contact } from '../entities/contact.entity.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Contact])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
