import { IsOptional, IsUUID, IsDateString } from 'class-validator';

export class TimeEntryFilterDto {
  @IsUUID()
  @IsOptional()
  ticketId?: string;

  @IsUUID()
  @IsOptional()
  technicianId?: string;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;
}
