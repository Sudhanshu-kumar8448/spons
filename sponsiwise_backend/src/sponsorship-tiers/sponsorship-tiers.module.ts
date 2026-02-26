import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SponsorshipTierController } from './sponsorship-tiers.controller';
import { SponsorshipTierService } from './sponsorship-tier.service';
import { SponsorshipTierRepository } from './sponsorship-tier.repository';
import { EventRepository } from '../events/event.repository';
import { PrismaService, CacheService, S3Service } from '../common/providers';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule, EventEmitterModule],
  controllers: [SponsorshipTierController],
  providers: [
    SponsorshipTierService,
    SponsorshipTierRepository,
    EventRepository,
    PrismaService,
    CacheService,
    S3Service,
  ],
  exports: [SponsorshipTierService, SponsorshipTierRepository, S3Service],
})
export class SponsorshipTiersModule {}

