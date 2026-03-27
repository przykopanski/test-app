import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class UpdateContactDto {
  @IsString()
  @MinLength(1, { message: 'Vorname darf nicht leer sein' })
  @IsOptional()
  firstName?: string;

  @IsString()
  @MinLength(1, { message: 'Nachname darf nicht leer sein' })
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail({}, { message: 'Bitte gueltige E-Mail-Adresse eingeben' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  position?: string;
}
