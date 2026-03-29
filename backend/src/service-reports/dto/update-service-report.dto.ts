import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ServiceReportStatus } from '../../entities/service-report.entity.js';

export class UpdateServiceReportDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsEnum(ServiceReportStatus, {
    message: 'Status muss draft oder completed sein',
  })
  @IsOptional()
  status?: ServiceReportStatus;

  // --- Signature fields (PROJ-7) ---

  /** Base64-encoded signature image (JPEG). Required when finalizing without refusal. */
  @IsString()
  @IsOptional()
  @MaxLength(200_000, {
    message: 'Unterschrift-Daten sind zu gross (max 200KB base64)',
  })
  signatureData?: string;

  /** Name of the person who signed. Required when finalizing without refusal. */
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Name darf maximal 200 Zeichen lang sein' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  signerName?: string;

  /** True if the customer refused to sign. */
  @IsBoolean()
  @IsOptional()
  signatureRefused?: boolean;

  /** Reason for refusal. Required when signatureRefused is true. */
  @IsString()
  @IsOptional()
  @MaxLength(1000, {
    message: 'Verweigerungsgrund darf maximal 1000 Zeichen lang sein',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  refusalReason?: string;
}
