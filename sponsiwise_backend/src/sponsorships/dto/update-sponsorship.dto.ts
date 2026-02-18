import { IsOptional, IsString, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { SponsorshipStatus } from '@prisma/client';

/**
 * DTO for updating an existing sponsorship.
 * companyId, eventId, tenantId, and id are immutable after creation.
 */
export class UpdateSponsorshipDto {
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

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
