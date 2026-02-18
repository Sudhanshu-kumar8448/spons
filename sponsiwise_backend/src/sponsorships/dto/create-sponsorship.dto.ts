import { IsNotEmpty, IsUUID, IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { SponsorshipStatus } from '@prisma/client';

/**
 * DTO for creating a new sponsorship (Company ↔ Event link).
 * tenantId is derived from the Company/Event in the service — never from body.
 */
export class CreateSponsorshipDto {
  @IsUUID('4', { message: 'companyId must be a valid UUID' })
  @IsNotEmpty({ message: 'companyId is required' })
  companyId!: string;

  @IsUUID('4', { message: 'eventId must be a valid UUID' })
  @IsNotEmpty({ message: 'eventId is required' })
  eventId!: string;

  @IsOptional()
  @IsEnum(SponsorshipStatus, {
    message: `Status must be one of: ${Object.values(SponsorshipStatus).join(', ')}`,
  })
  status?: SponsorshipStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tier must be 100 characters or fewer' })
  tier?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
