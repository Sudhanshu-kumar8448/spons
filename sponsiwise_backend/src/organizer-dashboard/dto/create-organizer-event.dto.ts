import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUrl,
    IsDateString,
    MaxLength,
    IsInt,
    Min,
    Max,
    ValidateNested,
    IsArray,
    ArrayMinSize,
    IsEnum,
    IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EventCategory } from '@prisma/client';

/**
 * Address DTO for event location
 */
export class AddressDto {
    @IsString()
    @IsNotEmpty({ message: 'Address line 1 is required' })
    @MaxLength(255)
    addressLine1!: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    addressLine2?: string;

    @IsString()
    @IsNotEmpty({ message: 'City is required' })
    @MaxLength(100)
    city!: string;

    @IsString()
    @IsNotEmpty({ message: 'State is required' })
    @MaxLength(100)
    state!: string;

    @IsString()
    @IsNotEmpty({ message: 'Country is required' })
    @MaxLength(100)
    country!: string;

    @IsString()
    @IsNotEmpty({ message: 'Postal code is required' })
    @MaxLength(20)
    postalCode!: string;
}

/**
 * Tier Type enum - includes CUSTOM for custom tiers
 */
export enum TierType {
    TITLE = 'TITLE',
    PLATINUM = 'PLATINUM',
    PRESENTING = 'PRESENTING',
    POWERED_BY = 'POWERED_BY',
    GOLD = 'GOLD',
    SILVER = 'SILVER',
    CUSTOM = 'CUSTOM',
}

/**
 * Sponsorship Tier DTO
 */
export class SponsorshipTierDto {
    @IsEnum(TierType, { message: 'Invalid tier type' })
    tierType!: TierType;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Custom name must be 255 characters or fewer' })
    customName?: string;

    @IsNumber({}, { message: 'Asking price must be a number' })
    @Min(0, { message: 'Asking price must be non-negative' })
    askingPrice!: number;

    @IsOptional()
    @IsInt({ message: 'Total slots must be an integer' })
    @Min(1, { message: 'Total slots must be at least 1' })
    @Max(100, { message: 'Total slots cannot exceed 100' })
    totalSlots?: number = 1;

    @IsOptional()
    @IsArray({ message: 'Benefits must be an array' })
    @IsString({ each: true, message: 'Each benefit must be a string' })
    benefits?: string[];
}

/**
 * DTO for creating a new event from the Organizer dashboard.
 *
 * organizerId is derived from the JWT `organizer_id` claim — never from the body.
 */
export class CreateOrganizerEventDto {
    @IsString()
    @IsNotEmpty({ message: 'Event title is required' })
    @MaxLength(255, { message: 'Title must be 255 characters or fewer' })
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date' })
    startDate!: string;

    @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date' })
    endDate!: string;

    @IsInt({ message: 'expectedFootfall must be an integer' })
    @Min(0, { message: 'expectedFootfall must be non-negative' })
    @Transform(({ value }) => parseInt(value, 10))
    expectedFootfall!: number;

    @IsOptional()
    @IsUrl({}, { message: 'Website must be a valid URL' })
    @MaxLength(500, { message: 'Website must be 500 characters or fewer' })
    website?: string;

    @IsEnum(EventCategory, {
        message: `Category must be one of: ${Object.values(EventCategory).join(', ')}`,
    })
    category!: EventCategory;

    // Organizer Contact Details
    @IsOptional()
    @IsString()
    @MaxLength(50, { message: 'Contact phone must be 50 characters or fewer' })
    contactPhone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Contact email must be 255 characters or fewer' })
    contactEmail?: string;

    // PPT Deck URL (uploaded separately or provided as URL)
    @IsOptional()
    @IsUrl({}, { message: 'PPT Deck URL must be a valid URL' })
    @MaxLength(500, { message: 'PPT Deck URL must be 500 characters or fewer' })
    pptDeckUrl?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;

    @IsOptional()
    @ValidateNested({ each: true })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one sponsorship tier is required' })
    @Type(() => SponsorshipTierDto)
    tiers?: SponsorshipTierDto[];
}
