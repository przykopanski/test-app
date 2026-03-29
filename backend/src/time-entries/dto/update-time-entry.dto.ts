import { IsString, IsOptional, IsInt, IsNumber, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateTimeEntryDto {
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(10, { message: 'Beschreibung muss mindestens 10 Zeichen lang sein' })
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(15, { message: 'Abrechenbare Minuten muessen mindestens 15 sein' })
  @IsOptional()
  billableMinutes?: number;

  @IsString()
  @MinLength(1, { message: 'Override-Notiz ist erforderlich wenn abrechenbare Minuten geaendert werden' })
  @IsOptional()
  overrideNote?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Kilometer muss eine Zahl sein' })
  @Min(0, { message: 'Kilometer darf nicht negativ sein' })
  @Transform(({ value }) => value !== undefined && value !== null ? Number(value) : undefined)
  distanceKm?: number;
}
