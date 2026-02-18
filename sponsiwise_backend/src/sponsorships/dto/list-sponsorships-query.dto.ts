import { IsOptional, IsBoolean, IsInt, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SponsorshipStatus } from '@prisma/client';

/**
 * DTO for listing / filtering sponsorships.
 * All fields are optional query parameters.
 */
export class ListSponsorshipsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(SponsorshipStatus, {
    message: `Status must be one of: ${Object.values(SponsorshipStatus).join(', ')}`,
  })
  status?: SponsorshipStatus;

  @IsOptional()
  @IsUUID('4', { message: 'companyId must be a valid UUID' })
  companyId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'eventId must be a valid UUID' })
  eventId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
