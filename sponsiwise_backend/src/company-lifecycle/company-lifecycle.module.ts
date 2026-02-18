import { Module } from '@nestjs/common';
import { CompanyLifecycleController } from './company-lifecycle.controller';
import { CompanyLifecycleService } from './company-lifecycle.service';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * CompanyLifecycleModule — company lifecycle dashboard for managers.
 *
 * Provides:
 *  - GET /manager/companies/:id/lifecycle
 *
 * Uses PrismaService directly for cross-entity aggregation queries.
 */
@Module({
  controllers: [CompanyLifecycleController],
  providers: [CompanyLifecycleService, PrismaService],
})
export class CompanyLifecycleModule {}
