import { Module } from '@nestjs/common';
import { SponsorController } from './sponsor.controller';
import { SponsorService } from './sponsor.service';
import { PrismaService } from '../common/providers/prisma.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

/**
 * SponsorModule — authenticated endpoints for sponsor dashboards.
 *
 * Uses PrismaService directly for custom aggregation queries.
 * CacheModule is @Global so CacheService is available if needed later.
 * AuditLogsModule provides audit logging for proposal submissions.
 */
@Module({
  imports: [AuditLogsModule],
  controllers: [SponsorController],
  providers: [SponsorService, PrismaService],
})
export class SponsorModule {}
