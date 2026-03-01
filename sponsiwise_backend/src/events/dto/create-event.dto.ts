import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  ValidateNested,
  IsNumber,
  Min,
  IsArray,
  IsNotEmpty,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus, EventCategory, TierType } from '@prisma/client';
import { CreateAddressDto } from './create-tier.dto';

/**
 * Custom validator that allows URLs including localhost
 */
export function IsUrlAllowLocalhost(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUrlAllowLocalhost',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!value || typeof value !== 'string') return true;
          try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
      },
    });
  };
}

/**
 * DTO for creating a new event.
 * organizerId is required — the Organizer that owns this event.
 */
export class CreateEventDto {
  @IsUUID('4', { message: 'organizerId must be a valid UUID' })
  @IsOptional()
  organizerId?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date' })
  @IsOptional()
  endDate?: string;

  @IsNumber({}, { message: 'expectedFootfall must be a number' })
  @Min(0, { message: 'expectedFootfall must be non-negative' })
  @IsOptional()
  expectedFootfall?: number;

  @IsOptional()
  @IsEnum(EventStatus, {
    message: `Status must be one of: ${Object.values(EventStatus).join(', ')}`,
  })
  status?: EventStatus;

  @IsOptional()
  @IsUrlAllowLocalhost({ message: 'Website must be a valid URL' })
  website?: string;

  @IsEnum(EventCategory, {
    message: `Category must be one of: ${Object.values(EventCategory).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Category is required' })
  category!: EventCategory;

  // New fields
  @IsOptional()
  @IsUrlAllowLocalhost({ message: 'pptDeckUrl must be a valid URL' })
  pptDeckUrl?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  // Address (nested object)
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;

  // Tiers array
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTierDtoItem)
  tiers?: CreateTierDtoItem[];
}

/**
 * DTO for individual tier item in the tiers array
 */
export class CreateTierDtoItem {
  @IsEnum([...Object.values(TierType), 'CUSTOM'] as const, { message: 'tierType must be a valid TierType' })
  tierType!: string;

  @IsOptional()
  @IsString()
  customName?: string;

  @IsNumber({}, { message: 'askingPrice must be a number' })
  @Min(0, { message: 'askingPrice must be non-negative' })
  askingPrice!: number;

  @IsOptional()
  @IsNumber({}, { message: 'totalSlots must be a number' })
  @Min(1, { message: 'totalSlots must be at least 1' })
  totalSlots?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsUUID('4')
  id?: string;
}

