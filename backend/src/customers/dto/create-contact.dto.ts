import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

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
