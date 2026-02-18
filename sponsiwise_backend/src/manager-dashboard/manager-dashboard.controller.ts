import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { ManagerDashboardService } from './manager-dashboard.service';
import {
  ManagerCompaniesQueryDto,
  ManagerEventsQueryDto,
  ManagerActivityQueryDto,
  VerifyEntityDto,
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
 *
 * Write endpoints:
 *  - POST /manager/companies/:id/verify
 *  - POST /manager/events/:id/verify
 *
 * All endpoints require MANAGER role and scope to the caller's tenant.
 */
@Controller('manager')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.MANAGER)
export class ManagerDashboardController {
  constructor(private readonly service: ManagerDashboardService) {}

  // ─── Dashboard Stats ─────────────────────────────────────

  @Get('dashboard/stats')
  async getDashboardStats(@CurrentUser() user: JwtPayloadWithClaims) {
    return this.service.getDashboardStats(user.tenant_id);
  }

  // ─── Companies ───────────────────────────────────────────

  @Get('companies')
  async getCompanies(
    @Query() query: ManagerCompaniesQueryDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.getCompanies(user.tenant_id, query);
  }

  @Get('companies/:id')
  async getCompanyById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.getCompanyById(user.tenant_id, id);
  }

  @Post('companies/:id/verify')
  async verifyCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyEntityDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.verifyCompany(user.tenant_id, id, dto, user.sub, user.role);
  }

  // ─── Events ──────────────────────────────────────────────

  @Get('events')
  async getEvents(
    @Query() query: ManagerEventsQueryDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.getEvents(user.tenant_id, query);
  }

  @Get('events/:id')
  async getEventById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.getEventById(user.tenant_id, id);
  }

  @Post('events/:id/verify')
  async verifyEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyEntityDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.verifyEvent(user.tenant_id, id, dto, user.sub, user.role);
  }

  // ─── Activity Log ────────────────────────────────────────

  @Get('activity')
  async getActivity(
    @Query() query: ManagerActivityQueryDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.getActivity(user.tenant_id, query);
  }
}
