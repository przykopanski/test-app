import { IsUUID, IsEnum, IsString, MinLength, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { WorkType } from '../../entities/time-entry.entity.js';

export class CreateManualEntryDto {
  @IsUUID()
  ticketId!: string;

  @IsEnum(WorkType, {
    message: 'Arbeitstyp muss phone, remote oder onsite sein',
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
}
