import {
  IsString,
  IsInt,
  IsNumber,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Artikelname muss mindestens 2 Zeichen haben' })
  @MaxLength(200, { message: 'Maximal 200 Zeichen' })
  name?: string;

  @IsOptional()
  @IsInt({ message: 'Menge muss eine ganze Zahl sein' })
  @Min(1, { message: 'Mindestens 1' })
  @Max(9999, { message: 'Maximal 9999' })
  quantity?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Maximal 2 Nachkommastellen' },
  )
  @Min(0, { message: 'Preis darf nicht negativ sein' })
  @Max(999999.99, { message: 'Maximal 999.999,99 EUR' })
  unitPriceNet?: number;

  @IsOptional()
  @IsUUID(undefined, { message: 'MwSt.-Satz ist erforderlich' })
  vatRateId?: string;
}
