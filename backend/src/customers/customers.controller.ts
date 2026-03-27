import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../entities/index.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // --- Customers ---

  @Get()
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    return this.customersService.findAll({ search, status });
  }

  @Post()
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Patch(':id/archive')
  @Roles(UserRole.ADMIN)
  toggleArchive(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.toggleArchive(id);
  }

  // --- Contacts ---

  @Post(':id/contacts')
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  createContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.customersService.createContact(id, dto);
  }

  @Patch(':id/contacts/:contactId')
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.customersService.updateContact(id, contactId, dto);
  }

  @Delete(':id/contacts/:contactId')
  @Roles(UserRole.OFFICE, UserRole.ADMIN)
  deleteContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.customersService.deleteContact(id, contactId);
  }
}
