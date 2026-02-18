import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUrl,
    IsDateString,
    MaxLength,
    IsInt,
    Min,
} from 'class-validator';

/**
 * DTO for creating a new event from the Organizer dashboard.
 *
 * organizerId is derived from the JWT `organizer_id` claim — never from the body.
 * tenantId is derived from the Organizer's tenantId — never from the body.
 */
export class CreateOrganizerEventDto {
    @IsString()
    @IsNotEmpty({ message: 'Event title is required' })
    @MaxLength(255, { message: 'Title must be 255 characters or fewer' })
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500, { message: 'Location must be 500 characters or fewer' })
    location?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Venue must be 255 characters or fewer' })
    venue?: string;

    @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date' })
    startDate!: string;

    @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date' })
    endDate!: string;

    @IsInt({ message: 'expectedFootfall must be an integer' })
    @Min(0, { message: 'expectedFootfall must be non-negative' })
    expectedFootfall!: number;

    @IsOptional()
    @IsUrl({}, { message: 'Website must be a valid URL' })
    @MaxLength(500, { message: 'Website must be 500 characters or fewer' })
    website?: string;

    @IsOptional()
    @IsUrl({}, { message: 'Logo URL must be a valid URL' })
    @MaxLength(500, { message: 'Logo URL must be 500 characters or fewer' })
    logoUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100, { message: 'Category must be 100 characters or fewer' })
    category?: string;
}
