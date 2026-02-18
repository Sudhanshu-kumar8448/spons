import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationSeverity } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

/**
 * NotificationsService — CRUD operations for in-app notifications.
 *
 * All read operations are scoped to the authenticated user + tenant.
 * Create is called by the NotificationProcessor (background job).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Create a new notification record.
   * Called from the NotificationProcessor after a domain event is processed.
   */
  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        title: input.title,
        message: input.message,
        severity: input.severity ?? NotificationSeverity.INFO,
        link: input.link ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });

    this.logger.log(`Notification created: ${notification.id} for user ${input.userId}`);

    return notification;
  }

  /**
   * Paginated list of notifications for a specific user.
   */
  async findAll(
    userId: string,
    tenantId: string,
    params?: { page?: number; pageSize?: number; read?: boolean },
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = { userId, tenantId };
    if (params?.read !== undefined) {
      where.read = params.read;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: data.map((n) => ({
        id: n.id,
        userId: n.userId,
        tenantId: n.tenantId,
        title: n.title,
        message: n.message,
        severity: n.severity.toLowerCase(),
        read: n.read,
        link: n.link,
        entityType: n.entityType,
        entityId: n.entityId,
        createdAt: n.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get a single notification by ID. Must belong to the requesting user.
   */
  async findById(id: string, userId: string, tenantId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, tenantId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return {
      id: notification.id,
      userId: notification.userId,
      tenantId: notification.tenantId,
      title: notification.title,
      message: notification.message,
      severity: notification.severity.toLowerCase(),
      read: notification.read,
      link: notification.link,
      entityType: notification.entityType,
      entityId: notification.entityId,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(id: string, userId: string, tenantId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, tenantId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return {
      id: updated.id,
      read: updated.read,
      readAt: new Date().toISOString(), // Assuming we might add readAt later, but for now just returning predictable response
    };
  }

  /**
   * Mark ALL notifications as read for a user.
   */
  async markAllAsRead(userId: string, tenantId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        tenantId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return {
      count: result.count,
      message: `Marked ${result.count} notifications as read`,
    };
  }
}
