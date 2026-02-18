import { Module } from '@nestjs/common';
import { OrganizerDashboardController } from './organizer-dashboard.controller';
import { OrganizerDashboardService } from './organizer-dashboard.service';
import { PrismaService } from '../common/providers/prisma.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

/**
 * OrganizerDashboardModule — authenticated, organizer-scoped endpoints.
 *
 * Provides:
 *  - GET /organizer/dashboard/stats
 *  - GET /organizer/events
 *  - GET /organizer/proposals
 *  - POST /organizer/proposals/:id/review
 *
 * Uses PrismaService directly for custom aggregation queries.
 * AuditLogsModule is imported for audit logging on review actions.
 * CacheModule is @Global so CacheService is available.
 */
@Module({
  imports: [AuditLogsModule],
  controllers: [OrganizerDashboardController],
  providers: [OrganizerDashboardService, PrismaService],
})
export class OrganizerDashboardModule {}
