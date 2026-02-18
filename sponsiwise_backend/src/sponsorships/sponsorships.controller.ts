import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { SponsorshipService } from './sponsorship.service';
import { CreateSponsorshipDto, UpdateSponsorshipDto, ListSponsorshipsQueryDto } from './dto';

/**
 * SponsorshipsController — HTTP layer for sponsorship management.
 *
 * RBAC rules:
 *  - POST   /sponsorships          → ADMIN (own tenant) / SUPER_ADMIN (any)
 *  - GET    /sponsorships          → USER, ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - GET    /sponsorships/:id      → USER, ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - PATCH  /sponsorships/:id      → ADMIN (own tenant) / SUPER_ADMIN (all)
 *
 * Tenant isolation & same-tenant validation enforced at the service layer:
 *  - Company and Event must belong to the same tenant
 *  - tenantId is derived from the Company/Event, never from the request
 *  - USER / ADMIN operations are scoped to callerTenantId (from JWT)
 *  - SUPER_ADMIN bypasses tenant scoping
 */
@Controller('sponsorships')
export class SponsorshipsController {
  constructor(private readonly sponsorshipService: SponsorshipService) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * POST /sponsorships
   * Create a new sponsorship linking a Company to an Event.
   * Body must include companyId and eventId; tenantId is derived in service.
   */
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() dto: CreateSponsorshipDto, @CurrentUser() user: JwtPayloadWithClaims) {
    return this.sponsorshipService.create(dto, user.role, user.tenant_id);
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /sponsorships
   * List sponsorships with optional filters (status, companyId, eventId, isActive).
   * - USER / ADMIN: own tenant only
   * - SUPER_ADMIN:  all tenants
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(
    @Query() query: ListSponsorshipsQueryDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.sponsorshipService.findAll(query, user.role, user.tenant_id);
  }

  /**
   * GET /sponsorships/:id
   * Get a single sponsorship by ID.
   * - USER / ADMIN: only within their tenant
   * - SUPER_ADMIN:  any tenant
   */
  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.sponsorshipService.findById(id, user.role, user.tenant_id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /sponsorships/:id
   * Update sponsorship details (status, tier, notes, isActive).
   * companyId, eventId, tenantId are immutable.
   * - ADMIN:       within own tenant
   * - SUPER_ADMIN: any tenant
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSponsorshipDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.sponsorshipService.update(id, dto, user.role, user.tenant_id);
  }
}
