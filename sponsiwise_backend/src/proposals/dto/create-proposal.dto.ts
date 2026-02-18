import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { ProposalStatus } from '@prisma/client';

/**
 * DTO for creating a new proposal.
 * sponsorshipId is required; tenantId is derived from the Sponsorship in the service.
 */
export class CreateProposalDto {
  @IsUUID('4', { message: 'sponsorshipId must be a valid UUID' })
  @IsNotEmpty({ message: 'sponsorshipId is required' })
  sponsorshipId!: string;

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
}
