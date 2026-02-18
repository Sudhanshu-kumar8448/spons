import { Module, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EmailProcessor, NotificationProcessor } from './processors';
import { EmailService } from './services/email.service';
import { PrismaService } from '../common/providers';
import { EmailLogsModule } from '../email-logs/email-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * WorkerModule — bootstraps BullMQ workers alongside the NestJS app.
 *
 * Hosts:
 *  - EmailProcessor   — processes the `email` queue
 *  - NotificationProcessor — processes the `notifications` queue
 *  - EmailService      — SMTP email sender via Nodemailer (injected into EmailProcessor)
 *  - PrismaService     — DB access for resolving recipient emails
 *
 * Imports EmailLogsModule so EmailService can inject EmailLogsService.
 *
 * Workers start automatically when the NestJS app boots.
 * Each processor extends WorkerHost and is picked up by @nestjs/bullmq.
 */
@Module({
  imports: [EmailLogsModule, NotificationsModule],
  providers: [PrismaService, EmailService, EmailProcessor, NotificationProcessor],
})
export class WorkerModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkerModule.name);

  onApplicationBootstrap() {
    this.logger.log(
      'WorkerModule bootstrapped — processors: EmailProcessor, NotificationProcessor',
    );
  }
}
