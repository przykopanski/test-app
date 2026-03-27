import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TicketPriority, TicketStatus } from '../../entities/ticket.entity.js';

export class UpdateTicketDto {
  @IsString()
  @MinLength(1, { message: 'Betreff darf nicht leer sein' })
  @MaxLength(200, { message: 'Betreff darf maximal 200 Zeichen lang sein' })
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsUUID()
  @IsOptional()
  contactId?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}
