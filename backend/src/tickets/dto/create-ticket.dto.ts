import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TicketPriority, TicketStatus } from '../../entities/ticket.entity.js';

export class CreateTicketDto {
  @IsString()
  @MinLength(1, { message: 'Betreff ist erforderlich' })
  @MaxLength(200, { message: 'Betreff darf maximal 200 Zeichen lang sein' })
  subject!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketPriority)
  priority!: TicketPriority;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsUUID()
  customerId!: string;

  @IsUUID()
  @IsOptional()
  contactId?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}
