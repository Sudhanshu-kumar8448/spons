import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { Organizer } from '@prisma/client';
import { Role } from '@prisma/client';
import { OrganizerRepository } from './organizer.repository';
import { CreateOrganizerDto, UpdateOrganizerDto, ListOrganizersQueryDto } from './dto';

/**
 * OrganizerService — business logic for organizer management.
 *
 * Rules:
 *  - An organizer belongs to exactly one tenant (tenantId immutable)
 *  - Organizer is a domain entity, NOT a user — no auth logic
 *  - ADMIN can create / update organizers within their own tenant
 *  - USER  can view organizers within their own tenant
 *  - SUPER_ADMIN can view / manage all organizers across all tenants
 *  - No cross-tenant access for non-super-admins
 */
@Injectable()
export class OrganizerService {
  private readonly logger = new Logger(OrganizerService.name);

  constructor(private readonly organizerRepository: OrganizerRepository) { }

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new organizer.
   * - ADMIN: organizer is created within their own tenant
   * - SUPER_ADMIN: may specify any tenantId (falls back to callerTenantId)
   */
  async create(
    dto: CreateOrganizerDto,
    callerRole: Role,
    callerTenantId: string,
    tenantIdOverride?: string,
  ): Promise<Organizer> {
    // ADMIN always creates in their own tenant.
    // SUPER_ADMIN can optionally target a different tenant.
    const tenantId =
      callerRole === Role.SUPER_ADMIN && tenantIdOverride ? tenantIdOverride : callerTenantId;

    const organizer = await this.organizerRepository.create({
      name: dto.name,
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.contactEmail !== undefined && {
        contactEmail: dto.contactEmail,
      }),
      ...(dto.contactPhone !== undefined && {
        contactPhone: dto.contactPhone,
      }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      tenant: { connect: { id: tenantId } },
    });

    this.logger.log(`Organizer ${organizer.id} created by ${callerRole} in tenant ${tenantId}`);
    return organizer;
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get a single organizer by ID.
   * - USER / ADMIN: must be within their own tenant
   * - SUPER_ADMIN: any tenant
   */
  async findById(
    organizerId: string,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<Organizer> {
    let organizer: Organizer | null;

    if (callerRole === Role.SUPER_ADMIN) {
      organizer = await this.organizerRepository.findById(organizerId);
    } else {
      organizer = await this.organizerRepository.findByIdAndTenant(organizerId, callerTenantId);
    }

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    return organizer;
  }

  /**
   * List organizers.
   * - USER / ADMIN: scoped to their own tenant
   * - SUPER_ADMIN: across all tenants
   */
  async findAll(
    query: ListOrganizersQueryDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<{
    data: Organizer[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    let result: { data: Organizer[]; total: number };

    if (callerRole === Role.SUPER_ADMIN) {
      result = await this.organizerRepository.findAll({
        skip,
        take: limit,
        isActive: query.isActive,
      });
    } else {
      result = await this.organizerRepository.findByTenant({
        tenantId: callerTenantId,
        skip,
        take: limit,
        isActive: query.isActive,
      });
    }

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update an organizer.
   * - ADMIN: within their own tenant
   * - SUPER_ADMIN: any tenant
   */
  async update(
    organizerId: string,
    dto: UpdateOrganizerDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<Organizer> {
    // Ensure target organizer exists (and is within tenant for non-super-admins)
    await this.findById(organizerId, callerRole, callerTenantId);

    const data = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.contactEmail !== undefined && {
        contactEmail: dto.contactEmail,
      }),
      ...(dto.contactPhone !== undefined && {
        contactPhone: dto.contactPhone,
      }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    let organizer: Organizer;

    if (callerRole === Role.SUPER_ADMIN) {
      organizer = await this.organizerRepository.updateById(organizerId, data);
    } else {
      organizer = await this.organizerRepository.updateByIdAndTenant(
        organizerId,
        callerTenantId,
        data,
      );
    }

    this.logger.log(
      `Organizer ${organizerId} updated by ${callerRole} (tenant: ${callerTenantId})`,
    );
    return organizer;
  }

  // ─── DELETE (Soft) ───────────────────────────────────────

  /**
   * Soft delete an organizer.
   * - ADMIN: within own tenant
   * - SUPER_ADMIN: any tenant
   */
  async remove(organizerId: string, callerRole: Role, callerTenantId: string): Promise<Organizer> {
    await this.findById(organizerId, callerRole, callerTenantId);

    const organizer =
      callerRole === Role.SUPER_ADMIN
        ? await this.organizerRepository.updateById(organizerId, { isActive: false })
        : await this.organizerRepository.updateByIdAndTenant(organizerId, callerTenantId, {
          isActive: false,
        });

    this.logger.log(
      `Organizer ${organizerId} soft-deleted by ${callerRole} (tenant: ${callerTenantId})`,
    );

    return organizer;
  }
}
