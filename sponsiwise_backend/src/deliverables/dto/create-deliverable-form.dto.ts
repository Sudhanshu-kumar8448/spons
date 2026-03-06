import {
  IsEnum,
  IsString,
  IsInt,
  IsOptional,
  IsArray,
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

export class DeliverableRowDto {
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

export class CreateDeliverableFormDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliverableRowDto)
  rows!: DeliverableRowDto[];
}
