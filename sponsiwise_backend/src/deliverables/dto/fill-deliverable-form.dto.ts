import {
  IsEnum,
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DeliverableCategory,
  BrandingType,
  DeliverableUnit,
} from '@prisma/client';

/**
 * Row DTO for organizer filling the deliverable form.
 * Organizer can update existing rows or add new rows.
 */
export class FillDeliverableRowDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsEnum(DeliverableCategory)
  category!: DeliverableCategory;

  @IsString()
  @MaxLength(500)
  deliverableName!: string;

  @IsEnum(BrandingType)
  brandingType!: BrandingType;

  @IsInt()
  @Min(0)
  @Max(999999)
  quantity!: number;

  @IsEnum(DeliverableUnit)
  unit!: DeliverableUnit;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  otherUnit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class FillDeliverableFormDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FillDeliverableRowDto)
  rows!: FillDeliverableRowDto[];
}
