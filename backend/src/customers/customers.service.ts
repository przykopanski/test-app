import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Customer, CustomerStatus } from '../entities/customer.entity.js';
import { Contact } from '../entities/contact.entity.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
  ) {}

  // --- Customers ---

  async findAll(params?: {
    search?: string;
    status?: string;
  }): Promise<Customer[]> {
    const qb = this.customersRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.contacts', 'contact')
      .orderBy('customer.name', 'ASC');

    if (params?.status && params.status !== 'all') {
      qb.andWhere('customer.status = :status', { status: params.status });
    }

    if (params?.search) {
      qb.andWhere(
        '(customer.name ILIKE :search OR customer.customerNumber ILIKE :search)',
        { search: `%${params.search}%` },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { id },
      relations: ['contacts'],
    });

    if (!customer) {
      throw new NotFoundException('Kunde nicht gefunden');
    }

    return customer;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    if (dto.customerNumber) {
      const existing = await this.customersRepository.findOne({
        where: { customerNumber: dto.customerNumber },
      });
      if (existing) {
        throw new ConflictException(
          `Kundennummer "${dto.customerNumber}" ist bereits vergeben`,
        );
      }
    }

    const customer = this.customersRepository.create({
      ...dto,
      customerNumber: dto.customerNumber || null,
    });

    const saved = await this.customersRepository.save(customer);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);

    if (dto.customerNumber && dto.customerNumber !== customer.customerNumber) {
      const existing = await this.customersRepository.findOne({
        where: { customerNumber: dto.customerNumber },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Kundennummer "${dto.customerNumber}" ist bereits vergeben`,
        );
      }
    }

    Object.assign(customer, {
      ...dto,
      customerNumber:
        dto.customerNumber !== undefined
          ? dto.customerNumber || null
          : customer.customerNumber,
    });

    await this.customersRepository.save(customer);
    return this.findOne(id);
  }

  async toggleArchive(id: string): Promise<Customer> {
    const customer = await this.findOne(id);

    customer.status =
      customer.status === CustomerStatus.ACTIVE
        ? CustomerStatus.INACTIVE
        : CustomerStatus.ACTIVE;

    await this.customersRepository.save(customer);
    return this.findOne(id);
  }

  // --- Contacts ---

  async createContact(
    customerId: string,
    dto: CreateContactDto,
  ): Promise<Contact> {
    // Verify customer exists
    await this.findOne(customerId);

    const contact = this.contactsRepository.create({
      ...dto,
      customerId,
    });

    return this.contactsRepository.save(contact);
  }

  async updateContact(
    customerId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.contactsRepository.findOne({
      where: { id: contactId, customerId },
    });

    if (!contact) {
      throw new NotFoundException('Ansprechpartner nicht gefunden');
    }

    Object.assign(contact, dto);
    return this.contactsRepository.save(contact);
  }

  async deleteContact(customerId: string, contactId: string): Promise<void> {
    const contact = await this.contactsRepository.findOne({
      where: { id: contactId, customerId },
    });

    if (!contact) {
      throw new NotFoundException('Ansprechpartner nicht gefunden');
    }

    // TODO: In PROJ-3, check if contact is referenced on a ticket before deleting
    await this.contactsRepository.remove(contact);
  }
}
