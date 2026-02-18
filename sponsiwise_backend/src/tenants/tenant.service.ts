import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import type { Tenant } from '@prisma/client';
import { TenantRepository } from './tenant.repository';
import { CreateTenantDto, UpdateTenantDto } from './dto';

/**
 * TenantService — business logic for tenant management.
 *
 * Rules:
 *  - Only SUPER_ADMIN can create tenants (enforced at controller via guards)
 *  - Tenants are immutable after creation except for name and status
 *  - No deletion (soft-delete planned for the future)
 */
@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly tenantRepository: TenantRepository) {}

  /**
   * Create a new tenant.
   * Ensures slug uniqueness.
   */
  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepository.findBySlug(dto.slug);

    if (existing) {
      throw new ConflictException(`Tenant with slug "${dto.slug}" already exists`);
    }

    const tenant = await this.tenantRepository.create({
      name: dto.name,
      slug: dto.slug,
    });

    this.logger.log(`Tenant created: ${tenant.id} (${tenant.slug})`);
    return tenant;
  }

  /**
   * Get a tenant by ID.
   */
  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    return tenant;
  }

  /**
   * Get a tenant by its unique slug.
   */
  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findBySlug(slug);

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }

    return tenant;
  }

  /**
   * List all tenants with pagination.
   */
  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{
    data: Tenant[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const { data, total } = await this.tenantRepository.findAll({
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Update mutable tenant fields (name, status).
   * Slug and ID are immutable.
   */
  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    // Ensure tenant exists
    await this.findById(id);

    const tenant = await this.tenantRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.status !== undefined && { status: dto.status }),
    });

    this.logger.log(`Tenant updated: ${tenant.id}`);
    return tenant;
  }
}
