import { Injectable } from '@nestjs/common';
import type { EmailLog, EmailStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

@Injectable()
export class EmailLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────

  async create(data: Prisma.EmailLogCreateInput): Promise<EmailLog> {
    return this.prisma.emailLog.create({ data });
  }

  // ─── READ ────────────────────────────────────────────────

  async findByTenant(params: {
    tenantId: string;
    skip?: number;
    take?: number;
    status?: EmailStatus;
    jobName?: string;
    search?: string;
  }): Promise<{ data: EmailLog[]; total: number }> {
    const where: Prisma.EmailLogWhereInput = {
      tenantId: params.tenantId,
      ...(params.status !== undefined && { status: params.status }),
      ...(params.jobName !== undefined && { jobName: params.jobName }),
      ...(params.search !== undefined && {
        recipient: { contains: params.search, mode: 'insensitive' as const },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return { data, total };
  }
}
