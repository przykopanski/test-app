import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsOptional()
  customerNumber?: string;

  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  zip?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail({}, { message: 'Bitte gueltige E-Mail-Adresse eingeben' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
