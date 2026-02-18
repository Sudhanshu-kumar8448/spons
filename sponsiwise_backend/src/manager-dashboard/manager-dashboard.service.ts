import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';
import {
  CompanyVerifiedEvent,
  CompanyRejectedEvent,
  EventVerifiedEvent,
  EventRejectedEvent,
  COMPANY_VERIFIED_EVENT,
  COMPANY_REJECTED_EVENT,
  EVENT_VERIFIED_EVENT,
  EVENT_REJECTED_EVENT,
} from '../common/events';
import type {
  ManagerCompaniesQueryDto,
  ManagerEventsQueryDto,
  ManagerActivityQueryDto,
  VerifyEntityDto,
} from './dto';

/**
 * ManagerDashboardService — read + write layer for manager-scoped data.
 *
 * Every method requires tenantId (resolved from JWT, never from request).
 * All queries are tenant-scoped.
 */
@Injectable()
export class ManagerDashboardService {
  private readonly logger = new Logger(ManagerDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  // ─── Dashboard Stats ─────────────────────────────────────

  /**
   * GET /manager/dashboard/stats
   *
   * Returns verification queue counts and basic platform stats.
   * Response matches frontend ManagerDashboardStats interface:
   *   companies_pending, companies_verified, events_pending, events_verified,
   *   total_users, recent_registrations
   */
  async getDashboardStats(tenantId: string) {
    const [
      companiesPending,
      companiesVerified,
      eventsPending,
      eventsVerified,
      totalUsers,
      recentRegistrations,
    ] = await Promise.all([
      this.prisma.company.count({
        where: { tenantId, verificationStatus: VerificationStatus.PENDING },
      }),
      this.prisma.company.count({
        where: { tenantId, verificationStatus: VerificationStatus.VERIFIED },
      }),
      this.prisma.event.count({
        where: { tenantId, verificationStatus: VerificationStatus.PENDING },
      }),
      this.prisma.event.count({
        where: { tenantId, verificationStatus: VerificationStatus.VERIFIED },
      }),
      this.prisma.user.count({
        where: { tenantId, isActive: true },
      }),
      // Users registered in the last 7 days
      this.prisma.user.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      companies_pending: companiesPending,
      companies_verified: companiesVerified,
      events_pending: eventsPending,
      events_verified: eventsVerified,
      total_users: totalUsers,
      recent_registrations: recentRegistrations,
    };
  }

  // ─── Companies Verification Queue ────────────────────────

  /**
   * GET /manager/companies
   *
   * Returns paginated companies in the manager's tenant.
   * Default filter: verificationStatus = PENDING.
   * Matches frontend VerifiableCompaniesResponse shape.
   */
  async getCompanies(tenantId: string, query: ManagerCompaniesQueryDto) {
    const { page, page_size, verification_status, search } = query;
    const skip = (page - 1) * page_size;

    // When verification_status is empty/"all" → return all. Otherwise filter by status.
    const statusFilter = verification_status
      ? (verification_status.toUpperCase() as VerificationStatus)
      : undefined;

    const where: any = {
      tenantId,
      ...(statusFilter && { verificationStatus: statusFilter }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          website: true,
          description: true,
          logoUrl: true,
          verificationStatus: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data: data.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug || c.id,
        email: '', // Company model has no direct email field
        phone: null,
        website: c.website || null,
        logo_url: c.logoUrl || null,
        industry: c.type || null,
        description: c.description || null,
        verification_status: c.verificationStatus.toLowerCase(),
        verification_notes: null,
        verified_at: null,
        owner: {
          id: '',
          email: '',
          name: c.name,
        },
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
      })),
      total,
      page,
      page_size,
    };
  }

  // ─── Company Detail ─────────────────────────────────────

  /**
   * GET /manager/companies/:id
   *
   * Returns single company detail, tenant-scoped.
   */
  async getCompanyById(tenantId: string, companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        website: true,
        description: true,
        logoUrl: true,
        verificationStatus: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: { id: true, email: true },
          take: 1,
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }

    const owner = company.users[0] || { id: '', email: '' };

    return {
      id: company.id,
      name: company.name,
      slug: company.slug || company.id,
      email: owner.email,
      phone: null,
      website: company.website || null,
      logo_url: company.logoUrl || null,
      industry: company.type || null,
      description: company.description || null,
      verification_status: company.verificationStatus.toLowerCase(),
      verification_notes: null,
      verified_at: null,
      owner: {
        id: owner.id,
        email: owner.email,
        name: company.name,
      },
      created_at: company.createdAt.toISOString(),
      updated_at: company.updatedAt.toISOString(),
    };
  }

  // ─── Company Verification Action ────────────────────────

  /**
   * POST /manager/companies/:id/verify
   *
   * Updates a company's verification status and emits domain event.
   */
  async verifyCompany(
    tenantId: string,
    companyId: string,
    dto: VerifyEntityDto,
    reviewerId: string,
    reviewerRole: string,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });

    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }

    if (company.verificationStatus !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        `Company is already ${company.verificationStatus.toLowerCase()}`,
      );
    }

    const newStatus =
      dto.action === 'verify' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: { verificationStatus: newStatus },
    });

    // Upgrade company owner's role from USER → SPONSOR on verification
    if (dto.action === 'verify') {
      const upgradeResult = await this.prisma.user.updateMany({
        where: { companyId: companyId, role: 'USER' },
        data: { role: 'SPONSOR' },
      });

      if (upgradeResult.count > 0) {
        this.logger.log(
          `Upgraded ${upgradeResult.count} user(s) to SPONSOR role for company ${companyId}`,
        );
      }
    }

    // Emit domain event
    if (dto.action === 'verify') {
      this.eventEmitter.emit(
        COMPANY_VERIFIED_EVENT,
        new CompanyVerifiedEvent({
          entityId: companyId,
          tenantId,
          reviewerId,
          reviewerRole,
          reviewerNotes: dto.notes || null,
        }),
      );
    } else {
      this.eventEmitter.emit(
        COMPANY_REJECTED_EVENT,
        new CompanyRejectedEvent({
          entityId: companyId,
          tenantId,
          reviewerId,
          reviewerRole,
          reviewerNotes: dto.notes || null,
        }),
      );
    }

    this.logger.log(`Company ${companyId} ${dto.action}d by ${reviewerId} in tenant ${tenantId}`);

    return {
      id: updated.id,
      name: updated.name,
      verification_status: updated.verificationStatus.toLowerCase(),
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  // ─── Events Verification Queue ───────────────────────────

  /**
   * GET /manager/events
   *
   * Returns paginated events in the manager's tenant.
   * Default filter: verificationStatus = PENDING.
   * Matches frontend VerifiableEventsResponse shape.
   */
  async getEvents(tenantId: string, query: ManagerEventsQueryDto) {
    const { page, page_size, verification_status, search } = query;
    const skip = (page - 1) * page_size;

    const statusFilter = verification_status
      ? (verification_status.toUpperCase() as VerificationStatus)
      : VerificationStatus.PENDING;

    const where: any = {
      tenantId,
      verificationStatus: statusFilter,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          startDate: true,
          endDate: true,
          status: true,
          logoUrl: true,
          verificationStatus: true,
          createdAt: true,
          updatedAt: true,
          organizer: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              logoUrl: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: data.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.id,
        description: e.description || '',
        start_date: e.startDate.toISOString(),
        end_date: e.endDate.toISOString(),
        location: e.location || '',
        image_url: e.logoUrl || null,
        category: '',
        status: e.status.toLowerCase(),
        verification_status: e.verificationStatus.toLowerCase(),
        verification_notes: null,
        verified_at: null,
        organizer: {
          id: e.organizer.id,
          name: e.organizer.name,
          email: e.organizer.contactEmail || '',
          logo_url: e.organizer.logoUrl || null,
        },
        tags: [],
        created_at: e.createdAt.toISOString(),
        updated_at: e.updatedAt.toISOString(),
      })),
      total,
      page,
      page_size,
    };
  }

  // ─── Event Detail ───────────────────────────────────────

  /**
   * GET /manager/events/:id
   *
   * Returns single event detail, tenant-scoped.
   */
  async getEventById(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        venue: true,
        startDate: true,
        endDate: true,
        status: true,
        website: true,
        logoUrl: true,
        verificationStatus: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        organizer: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    return {
      id: event.id,
      title: event.title,
      slug: event.id,
      description: event.description || '',
      start_date: event.startDate.toISOString(),
      end_date: event.endDate.toISOString(),
      location: event.location || '',
      venue: event.venue || '',
      image_url: event.logoUrl || null,
      website: event.website || null,
      category: '',
      status: event.status.toLowerCase(),
      verification_status: event.verificationStatus.toLowerCase(),
      verification_notes: null,
      verified_at: null,
      organizer: {
        id: event.organizer.id,
        name: event.organizer.name,
        email: event.organizer.contactEmail || '',
        logo_url: event.organizer.logoUrl || null,
      },
      tags: [],
      created_at: event.createdAt.toISOString(),
      updated_at: event.updatedAt.toISOString(),
    };
  }

  // ─── Event Verification Action ──────────────────────────

  /**
   * POST /manager/events/:id/verify
   *
   * Updates an event's verification status and emits domain event.
   */
  async verifyEvent(
    tenantId: string,
    eventId: string,
    dto: VerifyEntityDto,
    reviewerId: string,
    reviewerRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    if (event.verificationStatus !== VerificationStatus.PENDING) {
      throw new BadRequestException(`Event is already ${event.verificationStatus.toLowerCase()}`);
    }

    const newStatus =
      dto.action === 'verify' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { verificationStatus: newStatus },
    });

    // Emit domain event
    if (dto.action === 'verify') {
      this.eventEmitter.emit(
        EVENT_VERIFIED_EVENT,
        new EventVerifiedEvent({
          entityId: eventId,
          tenantId,
          reviewerId,
          reviewerRole,
          reviewerNotes: dto.notes || null,
        }),
      );
    } else {
      this.eventEmitter.emit(
        EVENT_REJECTED_EVENT,
        new EventRejectedEvent({
          entityId: eventId,
          tenantId,
          reviewerId,
          reviewerRole,
          reviewerNotes: dto.notes || null,
        }),
      );
    }

    this.logger.log(`Event ${eventId} ${dto.action}d by ${reviewerId} in tenant ${tenantId}`);

    return {
      id: updated.id,
      title: updated.title,
      verification_status: updated.verificationStatus.toLowerCase(),
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  // ─── Activity Log ────────────────────────────────────────

  /**
   * GET /manager/activity
   *
   * Returns paginated audit log entries for the manager's tenant.
   * Read-only — no write capability. Matches frontend ActivityLogResponse shape.
   */
  async getActivity(tenantId: string, query: ManagerActivityQueryDto) {
    const { page, page_size, type } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
      tenantId,
      ...(type && { entityType: type }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map((log) => ({
        id: log.id,
        type: log.entityType,
        action: log.action,
        description: `${log.action} on ${log.entityType}`,
        actor: {
          id: log.actorId,
          email: '',
          name: '',
          role: log.actorRole,
        },
        entity_type: log.entityType,
        entity_id: log.entityId,
        metadata: log.metadata as Record<string, unknown> | null,
        created_at: log.createdAt.toISOString(),
      })),
      total,
      page,
      page_size,
    };
  }
}
