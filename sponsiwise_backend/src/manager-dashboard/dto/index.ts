import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsNotEmpty, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { TierType } from '@prisma/client';

export { UpdateManagerEventDto } from './update-manager-event.dto';

/**
 * Pagination DTO shared across manager endpoints.
 */
export class ManagerPaginationQueryDto {
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
 * GET /manager/companies query params.
 */
export class ManagerCompaniesQueryDto extends ManagerPaginationQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'VERIFIED', 'REJECTED'], {
    message: 'verification_status must be PENDING, VERIFIED, or REJECTED',
  })
  verification_status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * GET /manager/events query params.
 */
export class ManagerEventsQueryDto extends ManagerPaginationQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'VERIFIED', 'REJECTED'], {
    message: 'verification_status must be PENDING, VERIFIED, or REJECTED',
  })
  verification_status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * GET /manager/activity query params.
 */
export class ManagerActivityQueryDto extends ManagerPaginationQueryDto {
  @IsOptional()
  @IsString()
  type?: string;
}

/**
 * POST /manager/companies/:id/verify and POST /manager/events/:id/verify body.
 */
export class VerifyEntityDto {
  @IsNotEmpty()
  @IsIn(['verify', 'reject'], {
    message: 'action must be "verify" or "reject"',
  })
  action!: 'verify' | 'reject';

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * POST /manager/events/:id/tiers/:tierId body.
 * Managers can update tier pricing and slots.
 */
export class UpdateEventTierDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  askingPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalSlots?: number;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}

/**
 * POST /manager/events/:id/tiers body.
 * Managers can create new tiers for events.
 */
export class CreateEventTierDto {
  @IsNotEmpty()
  @IsIn(['TITLE', 'PLATINUM', 'PRESENTING', 'POWERED_BY', 'GOLD', 'SILVER'], {
    message: 'tierType must be TITLE, PLATINUM, PRESENTING, POWERED_BY, GOLD, or SILVER',
  })
  tierType!: TierType;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  askingPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalSlots?: number;
}

/**
 * GET /manager/proposals query params.
 */
export class ManagerProposalsQueryDto extends ManagerPaginationQueryDto {
  @IsOptional()
  @IsIn([
    'DRAFT',
    'SUBMITTED',
    'UNDER_MANAGER_REVIEW',
    'FORWARDED_TO_ORGANIZER',
    'APPROVED',
    'REJECTED',
    'REQUEST_CHANGES',
    'WITHDRAWN',
  ])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * PATCH /manager/proposals/:id body.
 */
export class UpdateManagerProposalDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  proposedAmount?: number;

  @IsOptional()
  @IsString()
  proposedTier?: string;

  @IsOptional()
  @IsIn([
    'UNDER_MANAGER_REVIEW',
    'FORWARDED_TO_ORGANIZER',
    'REJECTED',
    'REQUEST_CHANGES',
  ])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

