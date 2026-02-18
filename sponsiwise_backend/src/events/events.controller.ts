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
import { EventService } from './event.service';
import { CreateEventDto, UpdateEventDto, ListEventsQueryDto } from './dto';

/**
 * EventsController — HTTP layer for event management.
 *
 * RBAC rules:
 *  - POST   /events          → ADMIN (own tenant) / SUPER_ADMIN (any tenant)
 *  - GET    /events          → USER, ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - GET    /events/:id      → USER, ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - PATCH  /events/:id      → ADMIN (own tenant) / SUPER_ADMIN (all)
 *
 * Tenant isolation is enforced at the service layer:
 *  - USER / ADMIN operations are scoped to callerTenantId (from JWT)
 *  - SUPER_ADMIN bypasses tenant scoping
 *
 * Organizer ownership is enforced at the service layer:
 *  - Event creation requires a valid organizerId within the caller's tenant
 *  - tenantId is derived from the Organizer, never from the request body
 */
@Controller('events')
export class EventsController {
  constructor(private readonly eventService: EventService) { }

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * POST /events
   * Create a new event under an Organizer.
   * Body must include organizerId; tenantId is derived from the Organizer.
   */
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayloadWithClaims) {
    return this.eventService.create(dto, user.role, user.tenant_id);
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /events
   * List events with optional filters (status, organizerId, isActive).
   * - USER / ADMIN: own tenant only
   * - SUPER_ADMIN:  all tenants
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListEventsQueryDto, @CurrentUser() user: JwtPayloadWithClaims) {
    return this.eventService.findAll(query, user.role, user.tenant_id);
  }

  /**
   * GET /events/:id
   * Get a single event by ID.
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
    return this.eventService.findById(id, user.role, user.tenant_id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /events/:id
   * Update event details.
   * - ADMIN:       within own tenant
   * - SUPER_ADMIN: any tenant
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.eventService.update(id, dto, user.role, user.tenant_id);
  }

  // ─── DELETE ──────────────────────────────────────────────

  /**
   * DELETE /events/:id
   * Soft delete an event.
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
    return this.eventService.remove(id, user.role, user.tenant_id);
  }
}
