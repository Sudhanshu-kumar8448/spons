import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';
import { CacheService } from '../common/providers/cache.service';
import type { PublicEventsQueryDto } from './dto';

// ─── Cache keys & TTLs ──────────────────────────────────────────────────

const CACHE_PREFIX = 'public';
const STATS_TTL = 300; // 5 min
const EVENTS_LIST_TTL = 60; // 1 min
const COMPANY_TTL = 120; // 2 min

/**
 * PublicService — read-only, no-auth data access for public-facing pages.
 *
 * Rules enforced on every query:
 *  • isActive = true
 *  • verificationStatus = VERIFIED
 *  • Events must also have status = PUBLISHED
 *  • tenantId is NEVER exposed in responses
 *  • All methods are safe for CDN / ISR caching
 */
@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) { }

  // ─── GET /events/public ──────────────────────────────────

  async getPublicEvents(query: PublicEventsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 12;
    const skip = (page - 1) * pageSize;

    // Build cache key from stable params
    const cacheKey = `${CACHE_PREFIX}:events:p${page}:s${pageSize}:l${query.location ?? ''}:q${query.search ?? ''}:c${query.category ?? ''}`;
    const cached = await this.cache.get<{ data: unknown[]; total: number }>(cacheKey);
    if (cached) {
      return { data: cached.data, total: cached.total, page, page_size: pageSize };
    }

    // Build where clause — only public-safe events
    const where: Record<string, unknown> = {
      isActive: true,
      status: EventStatus.PUBLISHED,
      verificationStatus: VerificationStatus.VERIFIED,
    };

    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // category is not a schema field — silently ignored if passed (no-op)

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          startDate: true,
          endDate: true,
          logoUrl: true,
          status: true,
          createdAt: true,
          organizer: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    // Map to public response shape (matches frontend PublicEvent type)
    const data = events.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.id, // Use id as slug — no slug column on Event yet
      description: e.description ?? '',
      start_date: e.startDate.toISOString(),
      end_date: e.endDate.toISOString(),
      location: e.location ?? '',
      image_url: e.logoUrl,
      category: '', // Not in schema — empty for now
      status: 'published' as const,
      organizer: {
        id: e.organizer.id,
        name: e.organizer.name,
        logo_url: e.organizer.logoUrl,
      },
      tags: [] as string[], // Not in schema — empty for now
      created_at: e.createdAt.toISOString(),
    }));

    await this.cache.set(cacheKey, { data, total }, EVENTS_LIST_TTL);

    return { data, total, page, page_size: pageSize };
  }

  // ─── GET /events/public/:slug ────────────────────────────

  async getEventBySlug(slug: string) {
    const cacheKey = `${CACHE_PREFIX}:event:${slug}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // slug is currently the event ID
    const event = await this.prisma.event.findFirst({
      where: {
        id: slug,
        isActive: true,
        status: EventStatus.PUBLISHED,
        verificationStatus: VerificationStatus.VERIFIED,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startDate: true,
        endDate: true,
        logoUrl: true,
        status: true,
        createdAt: true,
        organizer: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const result = {
      id: event.id,
      title: event.title,
      slug: event.id,
      description: event.description ?? '',
      start_date: event.startDate.toISOString(),
      end_date: event.endDate.toISOString(),
      location: event.location ?? '',
      image_url: event.logoUrl,
      category: '',
      status: 'published' as const,
      organizer: {
        id: event.organizer.id,
        name: event.organizer.name,
        logo_url: event.organizer.logoUrl,
      },
      tags: [] as string[],
      created_at: event.createdAt.toISOString(),
    };

    await this.cache.set(cacheKey, result, EVENTS_LIST_TTL);
    return result;
  }

  // ─── GET /companies/public/:slug ─────────────────────────

  async getCompanyBySlug(slug: string) {
    const cacheKey = `${CACHE_PREFIX}:company:${slug}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const company = await this.prisma.company.findFirst({
      where: {
        slug,
        isActive: true,
        verificationStatus: VerificationStatus.VERIFIED,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        website: true,
        sponsorships: {
          where: {
            isActive: true,
            event: {
              isActive: true,
              status: EventStatus.PUBLISHED,
              verificationStatus: VerificationStatus.VERIFIED,
            },
          },
          select: {
            event: {
              select: {
                id: true,
                title: true,
                startDate: true,
                location: true,
                logoUrl: true,
              },
            },
          },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Map to frontend PublicCompany shape — no tenantId leaked
    const result = {
      id: company.id,
      name: company.name,
      slug: company.slug,
      description: company.description ?? '',
      logo_url: company.logoUrl,
      website: company.website,
      industry: '', // Not in schema
      location: '', // Not in schema
      founded_year: null as number | null, // Not in schema
      social_links: {} as Record<string, string>,
      sponsored_events: company.sponsorships.map((s) => ({
        id: s.event.id,
        title: s.event.title,
        slug: s.event.id, // Use id as slug
        start_date: s.event.startDate.toISOString(),
        location: s.event.location ?? '',
        image_url: s.event.logoUrl,
      })),
    };

    await this.cache.set(cacheKey, result, COMPANY_TTL);
    return result;
  }

  // ─── GET /stats/public ──────────────────────────────────

  async getStats() {
    const cacheKey = `${CACHE_PREFIX}:stats`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [totalEvents, totalSponsors, totalOrganizers] = await Promise.all([
      this.prisma.event.count({
        where: {
          isActive: true,
          status: EventStatus.PUBLISHED,
          verificationStatus: VerificationStatus.VERIFIED,
        },
      }),
      this.prisma.company.count({
        where: {
          isActive: true,
          verificationStatus: VerificationStatus.VERIFIED,
          type: 'SPONSOR',
        },
      }),
      this.prisma.organizer.count({
        where: { isActive: true },
      }),
    ]);

    const result = {
      total_events: totalEvents,
      total_sponsors: totalSponsors,
      total_organizers: totalOrganizers,
    };

    await this.cache.set(cacheKey, result, STATS_TTL);
    return result;
  }
}
