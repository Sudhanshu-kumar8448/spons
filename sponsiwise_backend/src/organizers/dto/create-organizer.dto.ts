import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUrl, MaxLength } from 'class-validator';

/**
 * DTO for creating a new organizer within a tenant.
 * tenantId is derived from the caller's JWT — never from body.
 */
export class CreateOrganizerDto {
  @IsString()
  @IsNotEmpty({ message: 'Organizer name is required' })
  @MaxLength(255, { message: 'Organizer name must be 255 characters or fewer' })
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Contact email must be a valid email address' })
  @MaxLength(255, { message: 'Contact email must be 255 characters or fewer' })
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Contact phone must be 50 characters or fewer' })
  contactPhone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(500, { message: 'Website must be 500 characters or fewer' })
  website?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  @MaxLength(500, { message: 'Logo URL must be 500 characters or fewer' })
  logoUrl?: string;
}
