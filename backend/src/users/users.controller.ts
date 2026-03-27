import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../entities/index.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('active')
  findActive() {
    return this.usersService.findActive();
  }

  @Post('me/change-password')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: string },
  ) {
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Zugriff verweigert');
    }
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: { id: string }) {
    return this.usersService.create(dto, user.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.update(id, dto, user.id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.deactivate(id, user.id);
  }
}
