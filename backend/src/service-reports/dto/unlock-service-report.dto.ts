import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UnlockServiceReportDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  reason?: string;
}
