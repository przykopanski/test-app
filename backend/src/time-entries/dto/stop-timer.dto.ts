import { IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class StopTimerDto {
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(10, { message: 'Beschreibung muss mindestens 10 Zeichen lang sein' })
  description!: string;
}
