import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ServiceReportStatus } from '../../entities/service-report.entity.js';

export class UpdateServiceReportDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  description?: string;

  @IsEnum(ServiceReportStatus, {
    message: 'Status muss draft oder completed sein',
  })
  @IsOptional()
  status?: ServiceReportStatus;
}
