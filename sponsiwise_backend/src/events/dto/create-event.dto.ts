import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsUrl,
  IsDateString,
  IsEnum,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { EventStatus } from '@prisma/client';

/**
 * DTO for creating a new event.
 * organizerId is required — the Organizer that owns this event.
 * tenantId is derived from the Organizer's tenantId — never from body.
 */
export class CreateEventDto {
  @IsUUID('4', { message: 'organizerId must be a valid UUID' })
  @IsNotEmpty({ message: 'organizerId is required' })
  organizerId!: string;

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
  @IsEnum(EventStatus, {
    message: `Status must be one of: ${Object.values(EventStatus).join(', ')}`,
  })
  status?: EventStatus;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(500, { message: 'Website must be 500 characters or fewer' })
  website?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  @MaxLength(500, { message: 'Logo URL must be 500 characters or fewer' })
  logoUrl?: string;
}
