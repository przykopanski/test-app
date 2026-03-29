import { IsString, MinLength, IsOptional, IsNumber, Min, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class StopTimerDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf((o) => o.description !== undefined && o.description !== '')
  @MinLength(10, { message: 'Beschreibung muss mindestens 10 Zeichen lang sein' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Kilometer muss eine Zahl sein' })
  @Min(0, { message: 'Kilometer darf nicht negativ sein' })
  @Transform(({ value }) => value !== undefined && value !== null ? Number(value) : undefined)
  distanceKm?: number;
}
