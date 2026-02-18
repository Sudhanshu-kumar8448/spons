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
 *
 * Rules:
 *  - A company belongs to exactly one tenant (tenantId immutable)
 *  - ADMIN can create / update companies within their own tenant
 *  - USER  can view companies within their own tenant
 *  - SUPER_ADMIN can view / manage all companies across all tenants
 *  - No cross-tenant access for non-super-admins
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
   * - ADMIN: company is created within their own tenant
   * - SUPER_ADMIN: may specify any tenantId (falls back to callerTenantId)
   */
  async create(
    dto: CreateCompanyDto,
    callerRole: Role,
    callerTenantId: string,
    tenantIdOverride?: string,
  ): Promise<Company> {
    // ADMIN always creates in their own tenant.
    // SUPER_ADMIN can optionally target a different tenant.
    const tenantId =
      callerRole === Role.SUPER_ADMIN && tenantIdOverride ? tenantIdOverride : callerTenantId;

    const company = await this.companyRepository.create({
      name: dto.name,
      type: dto.type,
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      tenant: { connect: { id: tenantId } },
    });

    this.logger.log(`Company ${company.id} created by ${callerRole} in tenant ${tenantId}`);
    return company;
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get a single company by ID.
   * - USER / ADMIN: must be within their own tenant
   * - SUPER_ADMIN: any tenant
   */
  async findById(companyId: string, callerRole: Role, callerTenantId: string): Promise<Company> {
    let company: Company | null;

    if (callerRole === Role.SUPER_ADMIN) {
      company = await this.companyRepository.findById(companyId);
    } else {
      company = await this.companyRepository.findByIdAndTenant(companyId, callerTenantId);
    }

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  /**
   * List companies.
   * - USER / ADMIN: scoped to their own tenant
   * - SUPER_ADMIN: across all tenants
   */
  async findAll(
    query: ListCompaniesQueryDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<{
    data: Company[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    let result: { data: Company[]; total: number };

    if (callerRole === Role.SUPER_ADMIN) {
      result = await this.companyRepository.findAll({
        skip,
        take: limit,
        type: query.type,
        isActive: query.isActive,
      });
    } else {
      result = await this.companyRepository.findByTenant({
        tenantId: callerTenantId,
        skip,
        take: limit,
        type: query.type,
        isActive: query.isActive,
      });
    }

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a company.
   * - ADMIN: within their own tenant
   * - SUPER_ADMIN: any tenant
   */
  async update(
    companyId: string,
    dto: UpdateCompanyDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<Company> {
    // Ensure target company exists (and is within tenant for non-super-admins)
    await this.findById(companyId, callerRole, callerTenantId);

    const data = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    let company: Company;

    if (callerRole === Role.SUPER_ADMIN) {
      company = await this.companyRepository.updateById(companyId, data);
    } else {
      company = await this.companyRepository.updateByIdAndTenant(companyId, callerTenantId, data);
    }

    this.logger.log(`Company ${companyId} updated by ${callerRole} (tenant: ${callerTenantId})`);
    return company;
  }

  // ─── VERIFICATION ────────────────────────────────────────

  /**
   * Verify a company.
   * - ADMIN: within their own tenant
   * - SUPER_ADMIN: any tenant
   *
   * Sets the company as active and emits a CompanyVerifiedEvent.
   */
  async verify(
    companyId: string,
    reviewerId: string,
    reviewerRole: Role,
    reviewerTenantId: string,
    reviewerNotes?: string,
  ): Promise<Company> {
    const existing = await this.findById(companyId, reviewerRole, reviewerTenantId);

    const company =
      reviewerRole === Role.SUPER_ADMIN
        ? await this.companyRepository.updateById(companyId, { isActive: true })
        : await this.companyRepository.updateByIdAndTenant(companyId, reviewerTenantId, {
            isActive: true,
          });

    this.logger.log(
      `Company ${companyId} verified by ${reviewerRole}:${reviewerId} (tenant: ${existing.tenantId})`,
    );

    // Audit log — immutable record of the decision
    this.auditLogService.log({
      tenantId: existing.tenantId,
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

    // Domain event — after DB write, before return
    this.eventEmitter.emit(
      COMPANY_VERIFIED_EVENT,
      new CompanyVerifiedEvent({
        entityId: companyId,
        tenantId: existing.tenantId,
        reviewerId,
        reviewerRole,
        reviewerNotes,
      }),
    );

    return company;
  }

  /**
   * Reject a company.
   * - ADMIN: within their own tenant
   * - SUPER_ADMIN: any tenant
   *
   * Deactivates the company and emits a CompanyRejectedEvent.
   */
  async reject(
    companyId: string,
    reviewerId: string,
    reviewerRole: Role,
    reviewerTenantId: string,
    reviewerNotes?: string,
  ): Promise<Company> {
    const existing = await this.findById(companyId, reviewerRole, reviewerTenantId);

    const company =
      reviewerRole === Role.SUPER_ADMIN
        ? await this.companyRepository.updateById(companyId, { isActive: false })
        : await this.companyRepository.updateByIdAndTenant(companyId, reviewerTenantId, {
            isActive: false,
          });

    this.logger.log(
      `Company ${companyId} rejected by ${reviewerRole}:${reviewerId} (tenant: ${existing.tenantId})`,
    );

    // Audit log — immutable record of the decision
    this.auditLogService.log({
      tenantId: existing.tenantId,
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

    // Domain event — after DB write, before return
    this.eventEmitter.emit(
      COMPANY_REJECTED_EVENT,
      new CompanyRejectedEvent({
        entityId: companyId,
        tenantId: existing.tenantId,
        reviewerId,
        reviewerRole,
        reviewerNotes,
      }),
    );

    return company;
  }
}
