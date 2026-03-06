import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DeliverablesController } from './deliverables.controller';
import { DeliverableService } from './deliverable.service';
import { DeliverableRepository } from './deliverable.repository';
import { SponsorshipTierRepository } from '../sponsorship-tiers/sponsorship-tier.repository';
import { PrismaService } from '../common/providers';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditLogsModule, NotificationsModule, EventEmitterModule],
  controllers: [DeliverablesController],
  providers: [
    DeliverableService,
    DeliverableRepository,
    SponsorshipTierRepository,
    PrismaService,
  ],
  exports: [DeliverableService, DeliverableRepository],
})
export class DeliverablesModule {}
