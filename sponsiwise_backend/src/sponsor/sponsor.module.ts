import { Module } from '@nestjs/common';
import { SponsorController } from './sponsor.controller';
import { SponsorService } from './sponsor.service';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * SponsorModule — authenticated, read-only endpoints for sponsor dashboards.
 *
 * Uses PrismaService directly for custom aggregation queries.
 * CacheModule is @Global so CacheService is available if needed later.
 */
@Module({
  controllers: [SponsorController],
  providers: [SponsorService, PrismaService],
})
export class SponsorModule {}
