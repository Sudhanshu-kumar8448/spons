import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';
import { PrismaService } from '../common/providers';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogService, AuditLogRepository, PrismaService],
  exports: [AuditLogService],
})
export class AuditLogsModule { }
