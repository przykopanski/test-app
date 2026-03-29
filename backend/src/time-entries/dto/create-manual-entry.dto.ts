import { IsUUID, IsEnum, IsString, MinLength, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { WorkType } from '../../entities/time-entry.entity.js';

export class CreateManualEntryDto {
  @IsUUID()
  ticketId!: string;

  @IsEnum(WorkType, {
    message: 'Arbeitstyp muss phone, remote, onsite oder travel sein',
  })
  workType!: WorkType;

  @IsDateString()
  startedAt!: string;

  @IsDateString()
  stoppedAt!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(10, {
    message: 'Beschreibung muss mindestens 10 Zeichen lang sein',
  })
  description!: string;

  @IsOptional()
  @IsNumber({}, { message: 'Kilometer muss eine Zahl sein' })
  @Min(0, { message: 'Kilometer darf nicht negativ sein' })
  @Transform(({ value }) => value !== undefined && value !== null ? Number(value) : undefined)
  distanceKm?: number;
}
