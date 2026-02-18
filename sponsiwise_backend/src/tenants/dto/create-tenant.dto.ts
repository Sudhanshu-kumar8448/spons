import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

/**
 * DTO for creating a new tenant.
 * Only SUPER_ADMIN can call this.
 */
export class CreateTenantDto {
  @IsString()
  @IsNotEmpty({ message: 'Tenant name is required' })
  @MaxLength(255, { message: 'Tenant name must be 255 characters or fewer' })
  name!: string;

  /**
   * URL-safe slug, lowercase, letters/numbers/hyphens only.
   * Must start with a letter and end with a letter or number.
   */
  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  @MaxLength(255, { message: 'Slug must be 255 characters or fewer' })
  @Matches(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
    message:
      'Slug must be lowercase, start with a letter, end with a letter or number, and contain only letters, numbers, or hyphens',
  })
  slug!: string;
}
