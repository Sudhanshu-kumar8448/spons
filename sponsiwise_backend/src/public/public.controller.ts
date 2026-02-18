import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicEventsQueryDto } from './dto';

/**
 * PublicController — unauthenticated, read-only endpoints for public pages.
 *
 * NO AuthGuard, NO RoleGuard, NO cookies.
 * All methods return cache-friendly, tenant-safe responses.
 */
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) { }

  /**
   * GET /public/events
   *
   * Returns paginated list of public events.
   * Only events that are ACTIVE + PUBLISHED + VERIFIED.
   * Supports optional search, location, and category filters.
   */
  @Get('events')
  async getPublicEvents(@Query() query: PublicEventsQueryDto) {
    return this.publicService.getPublicEvents(query);
  }

  /**
   * GET /public/companies/:slug
   *
   * Returns a single company profile by slug.
   * Only if the company is ACTIVE + VERIFIED.
   * Includes list of associated public events via sponsorships.
   * Returns 404 if slug not found or company not public.
   */
  @Get('companies/:slug')
  async getCompanyBySlug(@Param('slug') slug: string) {
    return this.publicService.getCompanyBySlug(slug);
  }

  /**
   * GET /public/stats
   *
   * Returns platform-wide aggregate stats for the landing page.
   * Only counts ACTIVE + VERIFIED entities.
   * Cached for 5 minutes.
   */
  @Get('stats')
  async getStats() {
    return this.publicService.getStats();
  }

  /**
   * GET /public/events/:slug
   *
   * Returns a single public event by slug (currently event ID).
   * Only if the event is ACTIVE + PUBLISHED + VERIFIED.
   * Returns 404 if not found or not public.
   */
  @Get('events/:slug')
  async getPublicEventBySlug(@Param('slug') slug: string) {
    return this.publicService.getEventBySlug(slug);
  }
}
