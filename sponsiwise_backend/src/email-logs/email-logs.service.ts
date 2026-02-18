import { Injectable, Logger } from '@nestjs/common';
import type { EmailLog, EmailStatus } from '@prisma/client';
import { EmailLogsRepository } from './email-logs.repository';

/**
 * Payload for creating an email log entry.
 */
export interface CreateEmailLogEntry {
  tenantId: string;
  recipient: string;
  subject: string;
  jobName: string;
  entityType?: string;
  entityId?: string;
  status: EmailStatus;
  errorMessage?: string;
}

@Injectable()
export class EmailLogsService {
  private readonly logger = new Logger(EmailLogsService.name);

  constructor(private readonly emailLogsRepository: EmailLogsRepository) {}

  /**
   * Persist an email log entry. Errors are caught and logged — they never
   * propagate to the caller so email sending is never disrupted.
   */
  async log(entry: CreateEmailLogEntry): Promise<EmailLog | null> {
    try {
      return await this.emailLogsRepository.create({
        tenant: { connect: { id: entry.tenantId } },
        recipient: entry.recipient,
        subject: entry.subject,
        jobName: entry.jobName,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        status: entry.status,
        errorMessage: entry.errorMessage ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write email log: ${entry.jobName} to ${entry.recipient}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  /**
   * Query email logs for a tenant with optional filters (manager endpoint).
   */
  async findByTenant(params: {
    tenantId: string;
    page: number;
    pageSize: number;
    status?: EmailStatus;
    jobName?: string;
    search?: string;
  }): Promise<{ data: EmailLog[]; total: number; page: number; pageSize: number }> {
    const { data, total } = await this.emailLogsRepository.findByTenant({
      tenantId: params.tenantId,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      status: params.status,
      jobName: params.jobName,
      search: params.search,
    });

    return { data, total, page: params.page, pageSize: params.pageSize };
  }
}
