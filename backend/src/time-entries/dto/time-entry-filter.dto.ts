import { IsOptional, IsUUID } from 'class-validator';

export class TimeEntryFilterDto {
  @IsUUID()
  @IsOptional()
  ticketId?: string;
}
