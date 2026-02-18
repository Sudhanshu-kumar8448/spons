import { Module } from '@nestjs/common';
import { ManagerLifecycleController } from './manager-lifecycle.controller';
import { ManagerLifecycleService } from './manager-lifecycle.service';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * ManagerLifecycleModule — event lifecycle dashboard for managers.
 *
 * Provides:
 *  - GET /manager/events/:id/lifecycle
 *
 * Note: Company lifecycle (GET /manager/companies/:id/lifecycle)
 * is provided by CompanyLifecycleModule to avoid route duplication.
 *
 * Uses PrismaService directly for cross-entity aggregation queries.
 */
@Module({
  controllers: [ManagerLifecycleController],
  providers: [ManagerLifecycleService, PrismaService],
})
export class ManagerLifecycleModule { }

