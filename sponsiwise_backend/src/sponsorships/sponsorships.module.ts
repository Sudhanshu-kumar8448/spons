import { Module } from '@nestjs/common';
import { SponsorshipsController } from './sponsorships.controller';
import { SponsorshipService } from './sponsorship.service';
import { SponsorshipRepository } from './sponsorship.repository';
import { CompanyRepository } from '../companies/company.repository';
import { EventRepository } from '../events/event.repository';
import { PrismaService } from '../common/providers';

@Module({
  controllers: [SponsorshipsController],
  providers: [
    SponsorshipService,
    SponsorshipRepository,
    CompanyRepository,
    EventRepository,
    PrismaService,
  ],
  exports: [SponsorshipService, SponsorshipRepository],
})
export class SponsorshipsModule {}
