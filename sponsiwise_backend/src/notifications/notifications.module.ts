import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * NotificationsModule — in-app notification system.
 *
 * Endpoints:
 *  - GET   /notifications           → paginated list for current user
 *  - GET   /notifications/:id       → single notification
 *  - PATCH /notifications/:id/read  → mark as read
 *
 * NotificationsService is exported so it can be injected in the
 * WorkerModule by the NotificationProcessor.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PrismaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
