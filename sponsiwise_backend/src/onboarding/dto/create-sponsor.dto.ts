import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUrl,
    MaxLength,
} from 'class-validator';

/**
 * DTO for sponsor onboarding.
 * Creates a Company with type SPONSOR.
 * tenantId and ownerId are derived from the JWT — never from the body.
 */
export class CreateSponsorDto {
    @IsString()
    @IsNotEmpty({ message: 'Company name is required' })
    @MaxLength(255, { message: 'Company name must be 255 characters or fewer' })
    name!: string;

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
