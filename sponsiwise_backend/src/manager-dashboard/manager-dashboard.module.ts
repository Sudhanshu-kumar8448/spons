import { Module } from '@nestjs/common';
import { ManagerDashboardController } from './manager-dashboard.controller';
import { ManagerDashboardService } from './manager-dashboard.service';
import { PrismaService } from '../common/providers/prisma.service';

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
 *
 * Uses PrismaService for DB access and EventEmitter2 (global) for domain events.
 */
@Module({
  controllers: [ManagerDashboardController],
  providers: [ManagerDashboardService, PrismaService],
})
export class ManagerDashboardModule {}
