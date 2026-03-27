import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../../entities/index.js';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
