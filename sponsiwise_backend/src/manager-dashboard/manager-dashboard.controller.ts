import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role, TierType } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { ManagerDashboardService } from './manager-dashboard.service';
import {
  ManagerCompaniesQueryDto,
  ManagerEventsQueryDto,
  ManagerActivityQueryDto,
  ManagerProposalsQueryDto,
  VerifyEntityDto,
  UpdateEventTierDto,
  CreateEventTierDto,
  UpdateManagerEventDto,
  UpdateManagerProposalDto,
} from './dto';

/**
 * ManagerDashboardController — manager-scoped endpoints.
 *
 * Read endpoints:
 *  - GET  /manager/dashboard/stats
 *  - GET  /manager/companies
 *  - GET  /manager/companies/:id
 *  - GET  /manager/events
 *  - GET  /manager/events/:id
 *  - GET  /manager/activity
 *  - GET  /manager/proposals
 *  - GET  /manager/proposals/:id
 *
 * Write endpoints:
 *  - POST /manager/companies/:id/verify
 *  - POST /manager/events/:id/verify
 *  - PATCH /manager/proposals/:id
 *
 * All endpoints require MANAGER role.
 */
@Controller('manager')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.MANAGER)
export class ManagerDashboardController {
  constructor(private readonly service: ManagerDashboardService) { }

  // ─── Dashboard Stats ─────────────────────────────────────

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.service.getDashboardStats();
  }

  // ─── Companies ───────────────────────────────────────────

  @Get('companies')
  async getCompanies(@Query() query: ManagerCompaniesQueryDto) {
    return this.service.getCompanies(query);
  }

  @Get('companies/:id')
  async getCompanyById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCompanyById(id);
  }

  @Post('companies/:id/verify')
  async verifyCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyEntityDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.verifyCompany(id, dto, user.sub, user.role);
  }

  // ─── Events ──────────────────────────────────────────────

  @Get('events')
  async getEvents(@Query() query: ManagerEventsQueryDto) {
    return this.service.getEvents(query);
  }

  @Get('events/:id')
  async getEventById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getEventById(id);
  }

  @Patch('events/:id')
  async updateEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateManagerEventDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.updateEvent(id, dto, user.sub, user.role);
  }

  @Post('events/:id/verify')
  async verifyEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyEntityDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.verifyEvent(id, dto, user.sub, user.role);
  }

  // ─── Tier Management ─────────────────────────────────────

  @Post('events/:eventId/tiers')
  async createTier(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateEventTierDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.createTier(eventId, dto, user.sub, user.role);
  }

  @Put('events/:eventId/tiers/:tierId')
  async updateTier(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Body() dto: UpdateEventTierDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.updateTier(eventId, tierId, dto, user.sub, user.role);
  }

  // ─── Activity Log ────────────────────────────────────────

  @Get('activity')
  async getActivity(@Query() query: ManagerActivityQueryDto) {
    return this.service.getActivity(query);
  }

  // ─── Proposals ───────────────────────────────────────────

  @Get('proposals')
  async getProposals(@Query() query: ManagerProposalsQueryDto) {
    return this.service.getProposals(query);
  }

  @Get('proposals/:id')
  async getProposalById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getProposalById(id);
  }

  @Patch('proposals/:id')
  async updateProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateManagerProposalDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.updateProposal(id, dto, user.sub, user.role);
  }
}
