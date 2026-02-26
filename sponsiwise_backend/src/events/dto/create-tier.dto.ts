import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsArray,
  ValidateIf,
  IsUUID,
} from 'class-validator';
import { TierType } from '@prisma/client';

/**
 * Extended TierType enum including CUSTOM for frontend flexibility.
 */
export const ExtendedTierType = {
  ...TierType,
  CUSTOM: 'CUSTOM' as const,
};

export type ExtendedTierType = TierType | 'CUSTOM';

/**
 * DTO for creating a sponsorship tier.
 * - customName is required when tierType === TierType.CUSTOM
 * - benefits is optional array of strings
 */
export class CreateTierDto {
  @IsEnum(ExtendedTierType, { message: 'tierType must be a valid TierType' })
  tierType!: ExtendedTierType;

  @ValidateIf((o) => o.tierType === 'CUSTOM')
  @IsString({ message: 'customName must be a string' })
  @IsOptional()
  customName?: string;

  @IsNumber({}, { message: 'askingPrice must be a number' })
  @Min(0, { message: 'askingPrice must be non-negative' })
  askingPrice!: number;

  @IsOptional()
  @IsNumber({}, { message: 'totalSlots must be a number' })
  @Min(1, { message: 'totalSlots must be at least 1' })
  totalSlots?: number;

  @IsOptional()
  @IsArray({ message: 'benefits must be an array' })
  @IsString({ each: true, message: 'each benefit must be a string' })
  benefits?: string[];

  @IsOptional()
  @IsUUID('4', { message: 'id must be a valid UUID' })
  id?: string;
}

/**
 * DTO for address within CreateEventDto.
 */
export class CreateAddressDto {
  @IsString({ message: 'addressLine1 must be a string' })
  addressLine1!: string;

  @IsOptional()
  @IsString({ message: 'addressLine2 must be a string' })
  addressLine2?: string;

  @IsString({ message: 'city must be a string' })
  city!: string;

  @IsString({ message: 'state must be a string' })
  state!: string;

  @IsString({ message: 'country must be a string' })
  country!: string;

  @IsString({ message: 'postalCode must be a string' })
  postalCode!: string;
}

