export interface AuditLogEntry {
    id: string;
    tenantId: string;
    actorId: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface AuditLogsResponse {
    data: AuditLogEntry[];
    total: number;
    page: number;
    pageSize: number;
}
