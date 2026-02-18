import { IsOptional, IsEnum, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyType } from '@prisma/client';

/**
 * DTO for listing / filtering companies.
 * All fields are optional query parameters.
 */
export class ListCompaniesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(CompanyType, {
    message: `Type must be one of: ${Object.values(CompanyType).join(', ')}`,
  })
  type?: CompanyType;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
