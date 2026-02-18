import { Module } from '@nestjs/common';
import { EmailLogsController } from './email-logs.controller';
import { EmailLogsService } from './email-logs.service';
import { EmailLogsRepository } from './email-logs.repository';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * EmailLogsModule — email delivery tracking.
 *
 * Provides:
 *  - EmailLogsService  — log + query email delivery records
 *  - EmailLogsRepository — Prisma data-access layer
 *  - GET /manager/email-logs — manager endpoint
 *
 * Exports EmailLogsService so WorkerModule can inject it into EmailService.
 */
@Module({
  controllers: [EmailLogsController],
  providers: [EmailLogsService, EmailLogsRepository, PrismaService],
  exports: [EmailLogsService],
})
export class EmailLogsModule {}
