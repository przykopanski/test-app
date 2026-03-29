import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VatRate } from '../entities/vat-rate.entity.js';
import { VatRatesController } from './vat-rates.controller.js';
import { VatRatesService } from './vat-rates.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([VatRate])],
  controllers: [VatRatesController],
  providers: [VatRatesService],
  exports: [VatRatesService],
})
export class VatRatesModule implements OnModuleInit {
  constructor(private readonly vatRatesService: VatRatesService) {}

  async onModuleInit() {
    await this.vatRatesService.seedDefaults();
  }
}
