import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { OrganizerDashboardService } from './organizer-dashboard.service';
import { OrganizerEventsQueryDto, OrganizerProposalsQueryDto, ReviewProposalDto, CreateOrganizerEventDto } from './dto';

/**
 * OrganizerDashboardController — authenticated endpoints for the Organizer dashboard.
 *
 * All routes:
 *  - Require valid JWT (AuthGuard)
 *  - Require ORGANIZER role (RoleGuard + @Roles)
 *  - Resolve organizer from JWT organizer_id (NEVER from query/body)
 *  - Scoped to the organizer's tenant + organizer entity
 */
@Controller('organizer')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.ORGANIZER)
export class OrganizerDashboardController {
  constructor(private readonly organizerDashboardService: OrganizerDashboardService) { }

  /**
   * GET /organizer/dashboard/stats
   *
   * Returns aggregate stats for the organizer dashboard overview.
   */
  @Get('dashboard/stats')
  async getDashboardStats(@CurrentUser() user: JwtPayloadWithClaims) {
    return this.organizerDashboardService.getDashboardStats(user.tenant_id, user.organizer_id);
  }

  /**
   * POST /organizer/events
   *
   * Creates a new event owned by this organizer.
   * organizerId is derived from the JWT — never from the request body.
   * The event is created in DRAFT status with PENDING verification.
   */
  @Post('events')
  async createEvent(
    @Body() dto: CreateOrganizerEventDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.organizerDashboardService.createEvent(user.tenant_id, user.organizer_id, dto);
  }

  /**
   * GET /organizer/events
   *
   * Returns paginated list of events owned by this organizer.
   */
  @Get('events')
  async getEvents(
    @Query() query: OrganizerEventsQueryDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.organizerDashboardService.getEvents(user.tenant_id, user.organizer_id, query);
  }

  /**
   * GET /organizer/events/:id
   *
   * Returns a single event owned by this organizer.
   */
  @Get('events/:id')
  async getEventById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.organizerDashboardService.getEventById(id, user.tenant_id, user.organizer_id);
  }

  /**
   * GET /organizer/proposals
   *
   * Returns paginated proposals for events owned by this organizer.
   */
  @Get('proposals')
  async getProposals(
    @Query() query: OrganizerProposalsQueryDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.organizerDashboardService.getProposals(user.tenant_id, user.organizer_id, query);
  }

  /**
   * GET /organizer/proposals/:id
   *
   * Returns a single proposal for an event owned by this organizer.
   */
  @Get('proposals/:id')
  async getProposalById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.organizerDashboardService.getProposalById(id, user.tenant_id, user.organizer_id);
  }

  /**
   * POST /organizer/proposals/:id/review
   *
   * Allows the organizer to approve or reject a proposal on their events.
   */
  @Post('proposals/:id/review')
  async reviewProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewProposalDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.organizerDashboardService.reviewProposal(
      id,
      dto,
      user.tenant_id,
      user.organizer_id,
      user.sub,
    );
  }
}
