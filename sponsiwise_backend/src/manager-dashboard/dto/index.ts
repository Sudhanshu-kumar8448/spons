import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

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
