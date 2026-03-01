import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { Organizer } from '@prisma/client';
import { OrganizerRepository } from './organizer.repository';
import { CreateOrganizerDto, UpdateOrganizerDto, ListOrganizersQueryDto } from './dto';

/**
 * OrganizerService — business logic for organizer management.
 */
@Injectable()
export class OrganizerService {
  private readonly logger = new Logger(OrganizerService.name);

  constructor(private readonly organizerRepository: OrganizerRepository) { }

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new organizer.
   */
  async create(dto: CreateOrganizerDto): Promise<Organizer> {
    const organizer = await this.organizerRepository.create({
      name: dto.name,
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.contactPhone !== undefined && {
        contactPhone: dto.contactPhone,
      }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.pastRecords !== undefined && { pastRecords: dto.pastRecords }),
      ...(dto.socialLinks !== undefined && { socialLinks: dto.socialLinks }),
      ...(dto.taxId !== undefined && { taxId: dto.taxId }),
    });

    this.logger.log(`Organizer ${organizer.id} created`);
    return organizer;
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get a single organizer by ID.
   */
  async findById(organizerId: string): Promise<Organizer> {
    const organizer = await this.organizerRepository.findById(organizerId);

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    return organizer;
  }

  /**
   * List organizers with optional filters.
   */
  async findAll(
    query: ListOrganizersQueryDto,
  ): Promise<{
    data: Organizer[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const result = await this.organizerRepository.findAll({
      skip,
      take: limit,
      isActive: query.isActive,
    });

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update an organizer.
   */
  async update(
    organizerId: string,
    dto: UpdateOrganizerDto,
  ): Promise<Organizer> {
    await this.findById(organizerId);

    const data = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.contactPhone !== undefined && {
        contactPhone: dto.contactPhone,
      }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.pastRecords !== undefined && { pastRecords: dto.pastRecords }),
      ...(dto.socialLinks !== undefined && { socialLinks: dto.socialLinks }),
      ...(dto.taxId !== undefined && { taxId: dto.taxId }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    const organizer = await this.organizerRepository.updateById(organizerId, data);

    this.logger.log(`Organizer ${organizerId} updated`);
    return organizer;
  }

  // ─── DELETE (Soft) ───────────────────────────────────────

  /**
   * Soft delete an organizer.
   */
  async remove(organizerId: string): Promise<Organizer> {
    await this.findById(organizerId);

    const organizer = await this.organizerRepository.updateById(organizerId, { isActive: false });

    this.logger.log(`Organizer ${organizerId} soft-deleted`);

    return organizer;
  }
}
