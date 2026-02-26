import { IsEnum, IsNumber, IsOptional, IsInt, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum TierType {
  TITLE = 'TITLE',
  PLATINUM = 'PLATINUM',
  PRESENTING = 'PRESENTING',
  POWERED_BY = 'POWERED_BY',
  GOLD = 'GOLD',
  SILVER = 'SILVER',
}

export class CreateSponsorshipTierDto {
  @IsEnum(TierType)
  tierType!: TierType;

  @IsNumber()
  @Min(0)
  askingPrice!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  totalSlots?: number;
}

export class UpdateSponsorshipTierDto {
  @IsEnum(TierType)
  @IsOptional()
  tierType?: TierType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  askingPrice?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  totalSlots?: number;

  @IsOptional()
  isLocked?: boolean;
}

export class CreateTiersBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSponsorshipTierDto)
  tiers!: CreateSponsorshipTierDto[];
}

export class UpdateTiersLockDto {
  @IsArray()
  tierIds!: string[];

  @IsOptional()
  isLocked?: boolean;
}

