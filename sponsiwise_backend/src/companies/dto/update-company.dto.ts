import { IsString, IsOptional, IsUrl, IsBoolean, MaxLength } from 'class-validator';

/**
 * DTO for updating an existing company.
 * Only mutable fields are exposed.
 * tenantId, type, and id are immutable after creation.
 */
export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Company name must be 255 characters or fewer' })
  name?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(500, { message: 'Website must be 500 characters or fewer' })
  website?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  @MaxLength(500, { message: 'Logo URL must be 500 characters or fewer' })
  logoUrl?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
