import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export { CreateOrganizerEventDto } from './create-organizer-event.dto';

/**
 * Pagination DTO shared across organizer endpoints.
 */
export class OrganizerPaginationQueryDto {
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
 * GET /organizer/events query params.
 */
export class OrganizerEventsQueryDto extends OrganizerPaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * GET /organizer/proposals query params.
 */
export class OrganizerProposalsQueryDto extends OrganizerPaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  event_id?: string;
}

/**
 * POST /organizer/proposals/:id/review body.
 */
export class ReviewProposalDto {
  @IsIn(['approve', 'reject'], {
    message: 'action must be either "approve" or "reject"',
  })
  action!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  reviewer_notes?: string;
}
