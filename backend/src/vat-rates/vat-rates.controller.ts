import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../entities/user.entity.js';
import { VatRatesService } from './vat-rates.service.js';
import { CreateVatRateDto } from './dto/create-vat-rate.dto.js';
import { UpdateVatRateDto } from './dto/update-vat-rate.dto.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VatRatesController {
  constructor(private readonly vatRatesService: VatRatesService) {}

  /** GET /vat-rates - Active VAT rates for dropdown (all authenticated users) */
  @Get('vat-rates')
  findActive() {
    return this.vatRatesService.findActive();
  }

  /** GET /admin/vat-rates - All VAT rates including inactive (admin only) */
  @Get('admin/vat-rates')
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.vatRatesService.findAll();
  }

  /** POST /admin/vat-rates - Create a new VAT rate (admin only) */
  @Post('admin/vat-rates')
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateVatRateDto) {
    return this.vatRatesService.create(dto);
  }

  /** PATCH /admin/vat-rates/:id - Update a VAT rate (admin only) */
  @Patch('admin/vat-rates/:id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVatRateDto,
  ) {
    return this.vatRatesService.update(id, dto);
  }

  /** DELETE /admin/vat-rates/:id - Delete a VAT rate (admin only) */
  @Delete('admin/vat-rates/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.vatRatesService.remove(id);
  }
}
