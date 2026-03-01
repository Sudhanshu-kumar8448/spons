import {
    IsString,
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
    IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EventStatus, EventCategory, TierType } from '@prisma/client';

export class AddressUpdateDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    addressLine1?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    addressLine2?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    state?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    postalCode?: string;
}

/**
 * Extended TierType enum including CUSTOM
 */
export const ExtendedTierType = {
  ...TierType,
  CUSTOM: 'CUSTOM' as const,
};

export class SponsorshipTierUpdateDto {
    @IsOptional()
    @IsString()
    id?: string;

    @IsOptional()
    @IsEnum(ExtendedTierType, { message: 'Invalid tier type' })
    tierType?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    customName?: string;

    @IsOptional()
    @IsNumber({}, { message: 'Asking price must be a number' })
    @Min(0, { message: 'Asking price must be non-negative' })
    askingPrice?: number;

    @IsOptional()
    @IsInt({ message: 'Total slots must be an integer' })
    @Min(1, { message: 'Total slots must be at least 1' })
    @Max(100, { message: 'Total slots cannot exceed 100' })
    totalSlots?: number;

    @IsOptional()
    @IsArray({ message: 'Benefits must be an array' })
    @IsString({ each: true, message: 'Each benefit must be a string' })
    benefits?: string[];

    @IsOptional()
    @IsBoolean()
    isLocked?: boolean;
}

export class UpdateManagerEventDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Transform(({ value }) => parseInt(value, 10))
    expectedFootfall?: number;

    @IsOptional()
    @IsUrl()
    @MaxLength(500)
    website?: string;

    @IsOptional()
    @IsEnum(EventCategory, {
        message: `Category must be one of: ${Object.values(EventCategory).join(', ')}`,
    })
    category?: EventCategory;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    contactPhone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    contactEmail?: string;

    @IsOptional()
    @IsUrl()
    @MaxLength(500)
    pptDeckUrl?: string;

    @IsOptional()
    @IsEnum(EventStatus)
    status?: EventStatus;

    @IsOptional()
    @ValidateNested()
    @Type(() => AddressUpdateDto)
    address?: AddressUpdateDto;

    @IsOptional()
    @ValidateNested({ each: true })
    @IsArray()
    @Type(() => SponsorshipTierUpdateDto)
    tiers?: SponsorshipTierUpdateDto[];
}
