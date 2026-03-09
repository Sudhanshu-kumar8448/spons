import { IsOptional, IsString, IsInt, Min, Max, IsUUID, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Pagination DTO shared across sponsor endpoints.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  page_size: number = 12;
}

/**
 * GET /sponsor/events query params.
 */
export class SponsorEventsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

/**
 * GET /sponsor/proposals query params.
 */
export class SponsorProposalsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  eventId?: string;
}

/**
 * GET /sponsor/sponsorships query params.
 */
export class SponsorSponsorshipsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}

/**
 * POST /sponsor/proposals — create a new sponsorship proposal.
 */
export class CreateProposalDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  tierId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  proposedAmount?: number;

  @IsOptional()
  @IsString()
  proposedTier?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

/**
 * PATCH /sponsor/proposals/:id/resubmit — revise a requested proposal.
 */
export class ResubmitProposalDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  proposedAmount?: number;

  @IsOptional()
  @IsString()
  proposedTier?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
