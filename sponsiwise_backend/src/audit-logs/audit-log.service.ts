import { Injectable, Logger } from '@nestjs/common';
import type { AuditLog, Prisma } from '@prisma/client';
import { AuditLogRepository } from './audit-log.repository';

/**
 * Payload accepted by AuditLogService.log().
 *
 * Every field is explicit — no magic inference.
 * The caller (service layer) is responsible for providing all values.
 */
export interface AuditLogEntry {
  /** Tenant the action belongs to */
  tenantId: string;
  /** User who performed the action */
  actorId: string;
  /** Role of the actor at the time of action */
  actorRole: string;
  /** Dot-notation action name, e.g. "proposal.created" */
  action: string;
  /** Entity type being acted upon, e.g. "Proposal" */
  entityType: string;
  /** ID of the affected entity */
  entityId: string;
  /** Optional JSON metadata (old/new values, context, etc.) */
  metadata?: Prisma.InputJsonValue;
}

/**
 * AuditLogService — append-only logging of system actions.
 *
 * Design principles:
 *  - Fire-and-forget: logging failures never break business flows
 *  - No business logic: the service only writes data
 *  - Immutable: no update or delete operations
 *  - Tenant-scoped: every entry belongs to a tenant
 *
 * Usage:
 *   Inject AuditLogService into any domain service, then call `.log()`.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Append an audit log entry. Errors are caught and logged — they never
   * propagate to the caller so business logic is never disrupted.
   */
  async log(entry: AuditLogEntry): Promise<AuditLog | null> {
    try {
      const auditLog = await this.auditLogRepository.create({
        tenant: { connect: { id: entry.tenantId } },
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ?? undefined,
      });

      return auditLog;
    } catch (error) {
      // Never let audit logging break the calling service
      this.logger.error(
        `Failed to write audit log: ${entry.action} on ${entry.entityType}:${entry.entityId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  /**
   * Query audit logs for a tenant with optional filters.
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
    return this.auditLogRepository.findByTenant(params);
  }

  /**
   * Get the full audit history of a single entity.
   */
  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.findByEntity(entityType, entityId);
  }
}
