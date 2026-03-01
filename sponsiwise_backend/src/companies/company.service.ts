import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { Company } from '@prisma/client';
import { Role } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CompanyRepository } from './company.repository';
import { AuditLogService } from '../audit-logs/audit-log.service';
import {
  CompanyVerifiedEvent,
  COMPANY_VERIFIED_EVENT,
  CompanyRejectedEvent,
  COMPANY_REJECTED_EVENT,
} from '../common/events';
import { CreateCompanyDto, UpdateCompanyDto, ListCompaniesQueryDto } from './dto';

/**
 * CompanyService — business logic for company management.
 */
@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new company.
   */
  async create(dto: CreateCompanyDto): Promise<Company> {
    const company = await this.companyRepository.create({
      name: dto.name,
      type: dto.type,
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.strategicIntent !== undefined && { strategicIntent: dto.strategicIntent }),
    });

    this.logger.log(`Company ${company.id} created`);
    return company;
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get a single company by ID.
   */
  async findById(companyId: string): Promise<Company> {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  /**
   * List companies with optional filters.
   */
  async findAll(
    query: ListCompaniesQueryDto,
  ): Promise<{
    data: Company[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const result = await this.companyRepository.findAll({
      skip,
      take: limit,
      type: query.type,
      isActive: query.isActive,
    });

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a company.
   */
  async update(companyId: string, dto: UpdateCompanyDto): Promise<Company> {
    await this.findById(companyId);

    const data = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.strategicIntent !== undefined && { strategicIntent: dto.strategicIntent }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    const company = await this.companyRepository.updateById(companyId, data);

    this.logger.log(`Company ${companyId} updated`);
    return company;
  }

  // ─── VERIFICATION ────────────────────────────────────────

  /**
   * Verify a company.
   * Sets the company as active and emits a CompanyVerifiedEvent.
   */
  async verify(
    companyId: string,
    reviewerId: string,
    reviewerRole: Role,
    reviewerNotes?: string,
  ): Promise<Company> {
    await this.findById(companyId);

    const company = await this.companyRepository.updateById(companyId, {
      isActive: true,
      verificationStatus: 'VERIFIED' as any,
      approvedBy: { connect: { id: reviewerId } },
      approvedAt: new Date(),
    });

    this.logger.log(`Company ${companyId} verified by ${reviewerRole}:${reviewerId}`);

    this.auditLogService.log({
      actorId: reviewerId,
      actorRole: reviewerRole,
      action: 'company.verified',
      entityType: 'Company',
      entityId: companyId,
      metadata: {
        decision: 'VERIFIED',
        reviewerNotes: reviewerNotes ?? null,
      },
    });

    this.eventEmitter.emit(
      COMPANY_VERIFIED_EVENT,
      new CompanyVerifiedEvent({
        entityId: companyId,
        reviewerId,
        reviewerRole,
        reviewerNotes,
      }),
    );

    return company;
  }

  /**
   * Reject a company.
   * Deactivates the company and emits a CompanyRejectedEvent.
   */
  async reject(
    companyId: string,
    reviewerId: string,
    reviewerRole: Role,
    reviewerNotes?: string,
  ): Promise<Company> {
    await this.findById(companyId);

    const company = await this.companyRepository.updateById(companyId, {
      isActive: false,
      verificationStatus: 'REJECTED' as any,
      rejectionReason: reviewerNotes ?? null,
      approvedBy: { connect: { id: reviewerId } },
      approvedAt: new Date(),
    });

    this.logger.log(`Company ${companyId} rejected by ${reviewerRole}:${reviewerId}`);

    this.auditLogService.log({
      actorId: reviewerId,
      actorRole: reviewerRole,
      action: 'company.rejected',
      entityType: 'Company',
      entityId: companyId,
      metadata: {
        decision: 'REJECTED',
        reviewerNotes: reviewerNotes ?? null,
      },
    });

    this.eventEmitter.emit(
      COMPANY_REJECTED_EVENT,
      new CompanyRejectedEvent({
        entityId: companyId,
        reviewerId,
        reviewerRole,
        reviewerNotes,
      }),
    );

    return company;
  }
}
