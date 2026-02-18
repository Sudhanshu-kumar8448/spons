import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import type { Sponsorship } from '@prisma/client';
import { Role } from '@prisma/client';
import { SponsorshipRepository } from './sponsorship.repository';
import { CompanyRepository } from '../companies/company.repository';
import { EventRepository } from '../events/event.repository';
import { CreateSponsorshipDto, UpdateSponsorshipDto, ListSponsorshipsQueryDto } from './dto';

/**
 * SponsorshipService — business logic for sponsorship management.
 *
 * Rules:
 *  - Sponsorship links exactly one Company to exactly one Event
 *  - Company and Event MUST belong to the same tenant
 *  - tenantId is derived from Company/Event, never trusted from request
 *  - Duplicate company–event pair is rejected (unique constraint)
 *  - ADMIN can create / update / list sponsorships within their own tenant
 *  - USER  can only view sponsorships within their own tenant
 *  - SUPER_ADMIN can view / manage all sponsorships across all tenants
 *  - No cross-tenant sponsorships
 */
@Injectable()
export class SponsorshipService {
  private readonly logger = new Logger(SponsorshipService.name);

  constructor(
    private readonly sponsorshipRepository: SponsorshipRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly eventRepository: EventRepository,
  ) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new sponsorship.
   * - ADMIN: company & event must be within their own tenant
   * - SUPER_ADMIN: company & event must share the same tenant
   *
   * tenantId is always derived from the validated Company/Event.
   */
  async create(
    dto: CreateSponsorshipDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<Sponsorship> {
    // 1. Validate company and event, enforce same-tenant rule
    const { company, event } = await this.validateCompanyAndEvent(
      dto.companyId,
      dto.eventId,
      callerRole,
      callerTenantId,
    );

    // 2. Check for duplicate sponsorship
    const existing = await this.sponsorshipRepository.findByCompanyAndEvent(
      dto.companyId,
      dto.eventId,
    );
    if (existing) {
      throw new ConflictException('A sponsorship already exists for this company–event pair');
    }

    // 3. Derive tenantId from the company (guaranteed same as event)
    const tenantId = company.tenantId;

    const sponsorship = await this.sponsorshipRepository.create({
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.tier !== undefined && { tier: dto.tier }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      tenant: { connect: { id: tenantId } },
      company: { connect: { id: dto.companyId } },
      event: { connect: { id: dto.eventId } },
    });

    this.logger.log(
      `Sponsorship ${sponsorship.id} created: company ${dto.companyId} → event ${dto.eventId} in tenant ${tenantId}`,
    );
    return sponsorship;
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get a single sponsorship by ID.
   * - USER / ADMIN: must be within their own tenant
   * - SUPER_ADMIN: any tenant
   */
  async findById(
    sponsorshipId: string,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<Sponsorship> {
    let sponsorship: Sponsorship | null;

    if (callerRole === Role.SUPER_ADMIN) {
      sponsorship = await this.sponsorshipRepository.findById(sponsorshipId);
    } else {
      sponsorship = await this.sponsorshipRepository.findByIdAndTenant(
        sponsorshipId,
        callerTenantId,
      );
    }

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    return sponsorship;
  }

  /**
   * List sponsorships.
   * - USER / ADMIN: scoped to their own tenant
   * - SUPER_ADMIN: across all tenants
   */
  async findAll(
    query: ListSponsorshipsQueryDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<{
    data: Sponsorship[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    let result: { data: Sponsorship[]; total: number };

    if (callerRole === Role.SUPER_ADMIN) {
      result = await this.sponsorshipRepository.findAll({
        skip,
        take: limit,
        status: query.status,
        companyId: query.companyId,
        eventId: query.eventId,
        isActive: query.isActive,
      });
    } else {
      result = await this.sponsorshipRepository.findByTenant({
        tenantId: callerTenantId,
        skip,
        take: limit,
        status: query.status,
        companyId: query.companyId,
        eventId: query.eventId,
        isActive: query.isActive,
      });
    }

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a sponsorship.
   * - ADMIN: within their own tenant
   * - SUPER_ADMIN: any tenant
   *
   * companyId, eventId, and tenantId are immutable after creation.
   */
  async update(
    sponsorshipId: string,
    dto: UpdateSponsorshipDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<Sponsorship> {
    // Ensure the sponsorship exists and is within the caller's tenant
    await this.findById(sponsorshipId, callerRole, callerTenantId);

    const data = {
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.tier !== undefined && { tier: dto.tier }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    let sponsorship: Sponsorship;

    if (callerRole === Role.SUPER_ADMIN) {
      sponsorship = await this.sponsorshipRepository.updateById(sponsorshipId, data);
    } else {
      sponsorship = await this.sponsorshipRepository.updateByIdAndTenant(
        sponsorshipId,
        callerTenantId,
        data,
      );
    }

    this.logger.log(
      `Sponsorship ${sponsorshipId} updated by ${callerRole} (tenant: ${callerTenantId})`,
    );
    return sponsorship;
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────

  /**
   * Validate that both Company and Event exist AND belong to the same tenant.
   * For non-SUPER_ADMIN callers, both must also belong to the caller's tenant.
   *
   * Throws NotFoundException if company or event doesn't exist.
   * Throws ForbiddenException if cross-tenant access or tenant mismatch.
   */
  private async validateCompanyAndEvent(
    companyId: string,
    eventId: string,
    callerRole: Role,
    callerTenantId: string,
  ) {
    // Fetch both entities in parallel
    const [company, event] = await Promise.all([
      this.companyRepository.findById(companyId),
      this.eventRepository.findById(eventId),
    ]);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Company and Event MUST share the same tenant
    if (company.tenantId !== event.tenantId) {
      throw new ForbiddenException('Company and Event must belong to the same tenant');
    }

    // For non-super-admins, the entities must be in the caller's tenant
    if (callerRole !== Role.SUPER_ADMIN) {
      if (company.tenantId !== callerTenantId) {
        throw new ForbiddenException('Cannot create sponsorships for entities outside your tenant');
      }
    }

    return { company, event };
  }
}
