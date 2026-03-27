import { IsString, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MinLength(1, { message: 'Notiz darf nicht leer sein' })
  text!: string;
}
