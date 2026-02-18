import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { TenantStatus } from '@prisma/client';

/**
 * DTO for updating an existing tenant.
 * Only name and status are mutable after creation.
 */
export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Tenant name must be 255 characters or fewer' })
  name?: string;

  @IsOptional()
  @IsEnum(TenantStatus, {
    message: `Status must be one of: ${Object.values(TenantStatus).join(', ')}`,
  })
  status?: TenantStatus;
}
