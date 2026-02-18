import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventService } from './event.service';
import { EventRepository } from './event.repository';
import { OrganizerRepository } from '../organizers/organizer.repository';
import { PrismaService } from '../common/providers';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [EventsController],
  providers: [EventService, EventRepository, OrganizerRepository, PrismaService],
  exports: [EventService, EventRepository],
})
export class EventsModule {}
