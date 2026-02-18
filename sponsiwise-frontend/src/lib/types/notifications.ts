export interface Notification {
    id: string;
    tenantId: string;
    userId: string;
    title: string;
    message: string;
    severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    read: boolean;
    link?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    createdAt: string;
}

export interface NotificationsResponse {
    data: Notification[];
    total: number;
    page: number;
    pageSize: number;
}
