import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateServiceReportDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  description?: string;
}
