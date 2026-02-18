import { Module } from '@nestjs/common';
import { ProposalsController } from './proposals.controller';
import { ProposalService } from './proposal.service';
import { ProposalRepository } from './proposal.repository';
import { SponsorshipRepository } from '../sponsorships/sponsorship.repository';
import { PrismaService } from '../common/providers';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [ProposalsController],
  providers: [ProposalService, ProposalRepository, SponsorshipRepository, PrismaService],
  exports: [ProposalService, ProposalRepository],
})
export class ProposalsModule {}
