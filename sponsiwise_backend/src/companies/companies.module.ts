import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompanyService } from './company.service';
import { CompanyRepository } from './company.repository';
import { PrismaService } from '../common/providers';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [CompaniesController],
  providers: [CompanyService, CompanyRepository, PrismaService],
  exports: [CompanyService, CompanyRepository],
})
export class CompaniesModule {}
