import { IsOptional, IsString, IsBoolean, IsEnum, IsNumber, MaxLength, Min } from 'class-validator';
import { ProposalStatus } from '@prisma/client';

/**
 * DTO for updating an existing proposal.
 * sponsorshipId, tenantId, and id are immutable after creation.
 */
export class UpdateProposalDto {
  @IsOptional()
  @IsEnum(ProposalStatus, {
    message: `Status must be one of: ${Object.values(ProposalStatus).join(', ')}`,
  })
  status?: ProposalStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Proposed tier must be 100 characters or fewer' })
  proposedTier?: string;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Proposed amount must be a number with up to 2 decimal places' },
  )
  @Min(0, { message: 'Proposed amount must be non-negative' })
  proposedAmount?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
