import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VatRate } from '../entities/vat-rate.entity.js';
import { CreateVatRateDto } from './dto/create-vat-rate.dto.js';
import { UpdateVatRateDto } from './dto/update-vat-rate.dto.js';

@Injectable()
export class VatRatesService {
  constructor(
    @InjectRepository(VatRate)
    private vatRatesRepo: Repository<VatRate>,
  ) {}

  /** Return only active VAT rates (for dropdowns) */
  async findActive() {
    const rates = await this.vatRatesRepo.find({
      where: { isActive: true },
      order: { rate: 'ASC' },
    });
    return rates.map((r) => this.sanitize(r));
  }

  /** Return all VAT rates including inactive (admin view) */
  async findAll() {
    const rates = await this.vatRatesRepo.find({
      order: { rate: 'ASC' },
    });
    return rates.map((r) => this.sanitize(r));
  }

  async findOneOrFail(id: string): Promise<VatRate> {
    const vatRate = await this.vatRatesRepo.findOne({ where: { id } });
    if (!vatRate) {
      throw new NotFoundException('MwSt.-Satz nicht gefunden');
    }
    return vatRate;
  }

  async create(dto: CreateVatRateDto) {
    const vatRate = this.vatRatesRepo.create(dto);
    const saved = await this.vatRatesRepo.save(vatRate);
    return this.sanitize(saved);
  }

  async update(id: string, dto: UpdateVatRateDto) {
    const vatRate = await this.findOneOrFail(id);
    Object.assign(vatRate, dto);
    const saved = await this.vatRatesRepo.save(vatRate);
    return this.sanitize(saved);
  }

  async remove(id: string): Promise<void> {
    const vatRate = await this.findOneOrFail(id);
    await this.vatRatesRepo.remove(vatRate);
  }

  private sanitize(vatRate: VatRate) {
    return {
      id: vatRate.id,
      label: vatRate.label,
      rate: Number(vatRate.rate),
      isActive: vatRate.isActive,
    };
  }

  /**
   * Seed default VAT rates if none exist.
   * Called on module init so the system always has defaults.
   */
  async seedDefaults(): Promise<void> {
    const count = await this.vatRatesRepo.count();
    if (count > 0) return;

    const defaults = [
      { label: 'MwSt. 19%', rate: 19.0, isActive: true },
      { label: 'MwSt. 7%', rate: 7.0, isActive: true },
      { label: 'Steuerfrei', rate: 0.0, isActive: true },
    ];

    await this.vatRatesRepo.save(defaults.map((d) => this.vatRatesRepo.create(d)));
  }
}
