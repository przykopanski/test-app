import { IsString, MinLength, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class StopTimerDto {
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(10, { message: 'Beschreibung muss mindestens 10 Zeichen lang sein' })
  description!: string;

  @IsOptional()
  @IsNumber({}, { message: 'Kilometer muss eine Zahl sein' })
  @Min(0, { message: 'Kilometer darf nicht negativ sein' })
  @Transform(({ value }) => value !== undefined && value !== null ? Number(value) : undefined)
  distanceKm?: number;
}
