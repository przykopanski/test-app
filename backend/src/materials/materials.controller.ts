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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../entities/user.entity.js';
import { MaterialsService } from './materials.service.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';
import { UpdateMaterialDto } from './dto/update-material.dto.js';

interface JwtUser {
  id: string;
  role: UserRole;
}

@Controller('tickets/:ticketId/materials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  /** GET /tickets/:ticketId/materials */
  @Get()
  findAll(@Param('ticketId', ParseUUIDPipe) ticketId: string) {
    return this.materialsService.findByTicket(ticketId);
  }

  /** POST /tickets/:ticketId/materials */
  @Post()
  create(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateMaterialDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.materialsService.create(ticketId, dto, user.id, user.role);
  }

  /** PATCH /tickets/:ticketId/materials/:id */
  @Patch(':id')
  update(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.materialsService.update(ticketId, id, dto, user.role);
  }

  /** DELETE /tickets/:ticketId/materials/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    await this.materialsService.remove(ticketId, id, user.role);
  }
}
