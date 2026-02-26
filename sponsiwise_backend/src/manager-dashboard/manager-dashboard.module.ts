import { Module } from '@nestjs/common';
import { ManagerDashboardController } from './manager-dashboard.controller';
import { ManagerDashboardService } from './manager-dashboard.service';
import { PrismaService } from '../common/providers/prisma.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

/**
 * ManagerDashboardModule — authenticated manager-scoped endpoints.
 *
 * Read endpoints:
 *  - GET  /manager/dashboard/stats
 *  - GET  /manager/companies
 *  - GET  /manager/companies/:id
 *  - GET  /manager/events
 *  - GET  /manager/events/:id
 *  - GET  /manager/activity
 *
 * Write endpoints:
 *  - POST /manager/companies/:id/verify
 *  - POST /manager/events/:id/verify
 *  - POST /manager/events/:id/tiers
 *  - PUT  /manager/events/:id/tiers/:tierId
 *
 * Uses PrismaService for DB access and EventEmitter2 (global) for domain events.
 */
@Module({
  controllers: [ManagerDashboardController],
  providers: [ManagerDashboardService, PrismaService],
  imports: [AuditLogsModule],
})
export class ManagerDashboardModule {}
