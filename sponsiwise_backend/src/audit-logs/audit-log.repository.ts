import { Injectable } from '@nestjs/common';
import type { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * AuditLogRepository — Prisma data-access layer for the AuditLog entity.
 *
 * Append-only: only create and read operations are exposed.
 * No update or delete methods exist by design.
 */
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE (append-only) ────────────────────────────────

  /**
   * Insert a single audit log entry.
   */
  async create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data });
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Find a single audit log by ID.
   */
  async findById(id: string): Promise<AuditLog | null> {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }

  /**
   * List audit logs for a given tenant, ordered newest-first.
   */
  async findByTenant(params: {
    tenantId: string;
    skip?: number;
    take?: number;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: string;
  }): Promise<{ data: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: params.tenantId,
      ...(params.entityType !== undefined && { entityType: params.entityType }),
      ...(params.entityId !== undefined && { entityId: params.entityId }),
      ...(params.actorId !== undefined && { actorId: params.actorId }),
      ...(params.action !== undefined && { action: params.action }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * List audit logs for a specific entity across time.
   * Useful for showing entity history (e.g. all changes to a Proposal).
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
