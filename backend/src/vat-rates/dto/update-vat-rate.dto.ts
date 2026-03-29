import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class UpdateVatRateDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Label ist erforderlich' })
  @MaxLength(50, { message: 'Maximal 50 Zeichen' })
  label?: string;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Maximal 2 Nachkommastellen' },
  )
  @Min(0, { message: 'Prozentsatz darf nicht negativ sein' })
  @Max(100, { message: 'Maximal 100%' })
  rate?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
