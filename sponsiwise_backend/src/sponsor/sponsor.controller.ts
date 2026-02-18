import { Controller, Get, Post, Param, Query, Body, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { SponsorService } from './sponsor.service';
import {
  SponsorEventsQueryDto,
  SponsorProposalsQueryDto,
  SponsorSponsorshipsQueryDto,
  CreateProposalDto,
} from './dto';

/**
 * SponsorController — endpoints for the Sponsor dashboard.
 *
 * All routes:
 *  - Require valid JWT (AuthGuard)
 *  - Require SPONSOR role (RoleGuard + @Roles)
 *  - Resolve company from JWT company_id (NEVER from query/body)
 *  - Scoped to the sponsor's tenant + company
 */
@Controller('sponsor')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.SPONSOR)
export class SponsorController {
  constructor(private readonly sponsorService: SponsorService) { }

  /**
   * GET /sponsor/dashboard/stats
   */
  @Get('dashboard/stats')
  async getDashboardStats(@CurrentUser() user: JwtPayloadWithClaims) {
    return this.sponsorService.getDashboardStats(user.tenant_id, user.company_id);
  }

  /**
   * GET /sponsor/events
   */
  @Get('events')
  async getEvents(
    @Query() query: SponsorEventsQueryDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.sponsorService.getEvents(user.tenant_id, user.company_id, query);
  }

  /**
   * GET /sponsor/events/:id
   */
  @Get('events/:id')
  async getEventById(
    @Param('id', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.sponsorService.getEventById(user.tenant_id, user.company_id, eventId);
  }

  /**
   * GET /sponsor/proposals
   */
  @Get('proposals')
  async getProposals(
    @Query() query: SponsorProposalsQueryDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.sponsorService.getProposals(user.tenant_id, user.company_id, query);
  }

  /**
   * GET /sponsor/proposals/:id
   */
  @Get('proposals/:id')
  async getProposalById(
    @Param('id', ParseUUIDPipe) proposalId: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.sponsorService.getProposalById(user.tenant_id, user.company_id, proposalId);
  }

  /**
   * POST /sponsor/proposals
   */
  @Post('proposals')
  @HttpCode(HttpStatus.CREATED)
  async createProposal(
    @Body() dto: CreateProposalDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.sponsorService.createProposal(user.tenant_id, user.company_id, dto);
  }

  /**
   * POST /sponsor/proposals/:id/withdraw
   */
  @Post('proposals/:id/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdrawProposal(
    @Param('id', ParseUUIDPipe) proposalId: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.sponsorService.withdrawProposal(user.tenant_id, user.company_id, proposalId);
  }

  /**
   * GET /sponsor/sponsorships
   */
  @Get('sponsorships')
  async getSponsorships(
    @Query() query: SponsorSponsorshipsQueryDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.sponsorService.getSponsorships(user.tenant_id, user.company_id, query);
  }
}

