import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import type { Sponsorship } from '@prisma/client';
import { SponsorshipRepository } from './sponsorship.repository';
import { CompanyRepository } from '../companies/company.repository';
import { EventRepository } from '../events/event.repository';
import { CreateSponsorshipDto, UpdateSponsorshipDto, ListSponsorshipsQueryDto } from './dto';

/**
 * SponsorshipService — business logic for sponsorship management.
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
   * Create a new sponsorship linking a Company to an Event.
   */
  async create(dto: CreateSponsorshipDto): Promise<Sponsorship> {
    // 1. Validate company and event exist
    await this.validateCompanyAndEvent(dto.companyId, dto.eventId);

    // 2. Check for duplicate sponsorship
    const existing = await this.sponsorshipRepository.findByCompanyAndEvent(
      dto.companyId,
      dto.eventId,
    );
    if (existing) {
      throw new ConflictException('A sponsorship already exists for this company–event pair');
    }

    const sponsorship = await this.sponsorshipRepository.create({
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.tier !== undefined && { tier: dto.tier }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      company: { connect: { id: dto.companyId } },
      event: { connect: { id: dto.eventId } },
    });

    this.logger.log(
      `Sponsorship ${sponsorship.id} created: company ${dto.companyId} → event ${dto.eventId}`,
    );
    return sponsorship;
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get a single sponsorship by ID.
   */
  async findById(sponsorshipId: string): Promise<Sponsorship> {
    const sponsorship = await this.sponsorshipRepository.findById(sponsorshipId);

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    return sponsorship;
  }

  /**
   * List sponsorships with optional filters.
   */
  async findAll(
    query: ListSponsorshipsQueryDto,
  ): Promise<{
    data: Sponsorship[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const result = await this.sponsorshipRepository.findAll({
      skip,
      take: limit,
      status: query.status,
      companyId: query.companyId,
      eventId: query.eventId,
      isActive: query.isActive,
    });

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a sponsorship.
   * companyId and eventId are immutable after creation.
   */
  async update(
    sponsorshipId: string,
    dto: UpdateSponsorshipDto,
  ): Promise<Sponsorship> {
    await this.findById(sponsorshipId);

    const data = {
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.tier !== undefined && { tier: dto.tier }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    const sponsorship = await this.sponsorshipRepository.updateById(sponsorshipId, data);

    this.logger.log(`Sponsorship ${sponsorshipId} updated`);
    return sponsorship;
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────

  /**
   * Validate that both Company and Event exist.
   */
  private async validateCompanyAndEvent(companyId: string, eventId: string) {
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

    return { company, event };
  }
}
