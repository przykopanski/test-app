import { IsString, MinLength } from 'class-validator';

export class CloseTicketDto {
  @IsString()
  @MinLength(1, { message: 'Abschlussnotiz ist erforderlich' })
  closingNote!: string;
}
