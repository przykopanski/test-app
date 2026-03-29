import { IsUUID, IsEnum } from 'class-validator';
import { WorkType } from '../../entities/time-entry.entity.js';

export class StartTimerDto {
  @IsUUID()
  ticketId!: string;

  @IsEnum(WorkType, {
    message: 'Arbeitstyp muss phone, remote, onsite oder travel sein',
  })
  workType!: WorkType;
}
