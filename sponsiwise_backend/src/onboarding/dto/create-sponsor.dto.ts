import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUrl,
    IsEnum,
    MaxLength,
} from 'class-validator';
import { CompanyType } from '@prisma/client';

/**
 * DTO for sponsor onboarding.
 * Creates a Company record.
 * ownerId is derived from the JWT — never from the body.
 */
export class CreateSponsorDto {
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
    strategicIntent?: string;
}
