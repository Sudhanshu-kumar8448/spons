import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUrl,
    IsEnum,
    IsObject,
    MaxLength,
} from 'class-validator';
import { OrganizerType } from '@prisma/client';

/**
 * DTO for organizer onboarding.
 * Creates an Organizer record.
 * userId is derived from the JWT — never from the body.
 */
export class CreateOrganizerDto {
    @IsString()
    @IsNotEmpty({ message: 'Organizer name is required' })
    @MaxLength(255, { message: 'Organizer name must be 255 characters or fewer' })
    name!: string;

    @IsEnum(OrganizerType, {
        message: `Type must be one of: ${Object.values(OrganizerType).join(', ')}`,
    })
    type!: OrganizerType;

    @IsString()
    @MaxLength(50, { message: 'Contact phone must be 50 characters or fewer' })
    contactPhone!: string;

    @IsOptional()
    @IsUrl({}, { message: 'Website must be a valid URL' })
    @MaxLength(500, { message: 'Website must be 500 characters or fewer' })
    website?: string;

    @IsString()
    pastRecords!: string;

    @IsObject({ message: 'socialLinks must be a JSON object' })
    socialLinks!: Record<string, any>;

    @IsOptional()
    @IsString()
    @MaxLength(100, { message: 'Tax ID must be 100 characters or fewer' })
    taxId?: string;
}
