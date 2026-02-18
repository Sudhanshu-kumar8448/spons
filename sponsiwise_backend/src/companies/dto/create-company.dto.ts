import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { CompanyType } from '@prisma/client';

/**
 * DTO for creating a new company within a tenant.
 * tenantId is derived from the caller's JWT — never from body.
 */
export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  @MaxLength(255, { message: 'Company name must be 255 characters or fewer' })
  name!: string;

  @IsEnum(CompanyType, {
    message: `Type must be one of: ${Object.values(CompanyType).join(', ')}`,
  })
  type!: CompanyType;

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
}
