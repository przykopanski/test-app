import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
  IsNumberString,
} from 'class-validator';
import { TicketPriority, TicketStatus } from '../../entities/ticket.entity.js';

export class TicketFilterDto {
  @IsNumberString()
  @IsOptional()
  page?: string;

  @IsNumberString()
  @IsOptional()
  limit?: string;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: string;
}
