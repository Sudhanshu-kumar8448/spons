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
import { EventCategory, GenderType, AgeBracket, IncomeBracket ,EventEdition } from '@prisma/client';

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

// ================================
// Audience Profile DTOs
// ================================

export class AudienceGenderDto {
    @IsEnum(GenderType, { message: 'Invalid gender type' })
    gender!: GenderType;

    @IsNumber({}, { message: 'Percentage must be a number' })
    @Min(0)
    @Max(100)
    percentage!: number;
}

export class AudienceAgeGroupDto {
    @IsEnum(AgeBracket, { message: 'Invalid age bracket' })
    bracket!: AgeBracket;

    @IsNumber({}, { message: 'Percentage must be a number' })
    @Min(0)
    @Max(100)
    percentage!: number;
}

export class AudienceIncomeGroupDto {
    @IsEnum(IncomeBracket, { message: 'Invalid income bracket' })
    bracket!: IncomeBracket;

    @IsNumber({}, { message: 'Percentage must be a number' })
    @Min(0)
    @Max(100)
    percentage!: number;
}

export class AudienceRegionDistributionDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    stateOrUT!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    country!: string;

    @IsNumber({}, { message: 'Percentage must be a number' })
    @Min(0)
    @Max(100)
    percentage!: number;
}

export class EventAudienceProfileDto {

    @IsOptional()
    @ValidateNested({ each: true })
    @IsArray()
    @Type(() => AudienceGenderDto)
    genders?: AudienceGenderDto[];

    @IsOptional()
    @ValidateNested({ each: true })
    @IsArray()
    @Type(() => AudienceAgeGroupDto)
    ages?: AudienceAgeGroupDto[];

    @IsOptional()
    @ValidateNested({ each: true })
    @IsArray()
    @Type(() => AudienceIncomeGroupDto)
    incomes?: AudienceIncomeGroupDto[];

    @IsOptional()
    @ValidateNested({ each: true })
    @IsArray()
    @Type(() => AudienceRegionDistributionDto)
    regions?: AudienceRegionDistributionDto[];
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

    @IsEnum(EventCategory, {
        message: `Category must be one of: ${Object.values(EventCategory).join(', ')}`,
    })
    category!: EventCategory;

    @IsEnum(EventEdition, {
        message: `Category must be one of : ${Object.values(EventEdition).join(', ')}`
    })
    edition!: EventEdition;

    // PPT Deck URL (uploaded separately or provided as URL)
    @IsOptional()
    // @IsUrl({}, { message: 'PPT Deck URL must be a valid URL' })
    //production me on karna hai
    @MaxLength(500, { message: 'PPT Deck URL must be 500 characters or fewer' })
    pptDeckUrl?: string;

    @IsOptional()
    @IsUrl({}, { message: 'Website must be a valid URL' })
    @MaxLength(500, { message: 'Website must be 500 characters or fewer' })
    website?: string;

    // Organizer Contact Details
    @IsOptional()
    @IsString()
    @MaxLength(50, { message: 'Contact phone must be 50 characters or fewer' })
    contactPhone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Contact email must be 255 characters or fewer' })
    contactEmail?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;

    @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date' })
    startDate!: string;

    @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date' })
    endDate!: string;

    @IsInt({ message: 'expectedFootfall must be an integer' })
    @Min(0, { message: 'expectedFootfall must be non-negative' })
    @Transform(({ value }) => parseInt(value, 10))
    expectedFootfall!: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => EventAudienceProfileDto)
    audienceProfile?: EventAudienceProfileDto;

    @IsOptional()
    @ValidateNested({ each: true })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one sponsorship tier is required' })
    @Type(() => SponsorshipTierDto)
    tiers?: SponsorshipTierDto[];
}


