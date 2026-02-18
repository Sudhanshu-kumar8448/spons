import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { OrganizerService } from './organizer.service';
import { CreateOrganizerDto, UpdateOrganizerDto, ListOrganizersQueryDto } from './dto';

/**
 * OrganizersController — HTTP layer for organizer management.
 *
 * RBAC rules:
 *  - POST   /organizers          → ADMIN (own tenant) / SUPER_ADMIN (any tenant)
 *  - GET    /organizers          → USER, ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - GET    /organizers/:id      → USER, ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - PATCH  /organizers/:id      → ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - DELETE /organizers/:id      → ADMIN (own tenant) / SUPER_ADMIN (all)
 *
 * Tenant isolation is enforced at the service layer:
 *  - USER / ADMIN operations are scoped to callerTenantId (from JWT)
 *  - SUPER_ADMIN bypasses tenant scoping
 */
@Controller('organizers')
export class OrganizersController {
  constructor(private readonly organizerService: OrganizerService) { }

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * POST /organizers
   * Create a new organizer within the caller's tenant.
   * SUPER_ADMIN may pass ?tenantId= to target another tenant.
   */
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(
    @Body() dto: CreateOrganizerDto,
    @CurrentUser() user: JwtPayloadWithClaims,
    @Query('tenantId') tenantIdOverride?: string,
  ) {
    return this.organizerService.create(dto, user.role, user.tenant_id, tenantIdOverride);
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /organizers
   * List organizers with optional filters.
   * - USER / ADMIN: own tenant only
   * - SUPER_ADMIN:  all tenants
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListOrganizersQueryDto, @CurrentUser() user: JwtPayloadWithClaims) {
    return this.organizerService.findAll(query, user.role, user.tenant_id);
  }

  /**
   * GET /organizers/:id
   * Get a single organizer by ID.
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
    return this.organizerService.findById(id, user.role, user.tenant_id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /organizers/:id
   * Update organizer details.
   * - ADMIN:       within own tenant
   * - SUPER_ADMIN: any tenant
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizerDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.organizerService.update(id, dto, user.role, user.tenant_id);
  }

  // ─── DELETE ──────────────────────────────────────────────

  /**
   * DELETE /organizers/:id
   * Soft delete an organizer.
   * - ADMIN:       within own tenant
   * - SUPER_ADMIN: any tenant
   */
  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.organizerService.remove(id, user.role, user.tenant_id);
  }
}
