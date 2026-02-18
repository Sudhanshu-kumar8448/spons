import { IsOptional, IsBoolean, IsInt, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProposalStatus } from '@prisma/client';

/**
 * DTO for listing / filtering proposals.
 * All fields are optional query parameters.
 */
export class ListProposalsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(ProposalStatus, {
    message: `Status must be one of: ${Object.values(ProposalStatus).join(', ')}`,
  })
  status?: ProposalStatus;

  @IsOptional()
  @IsUUID('4', { message: 'sponsorshipId must be a valid UUID' })
  sponsorshipId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
