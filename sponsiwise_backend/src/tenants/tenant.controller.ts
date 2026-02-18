import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard, TenantGuard } from '../common/guards';
import { Roles, TenantAccess, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto } from './dto';

/**
 * TenantController — HTTP layer for tenant management.
 *
 * RBAC rules:
 *  - POST   /tenants          → SUPER_ADMIN only
 *  - GET    /tenants          → SUPER_ADMIN only (list all)
 *  - GET    /tenants/:id      → SUPER_ADMIN or tenant member (own tenant)
 *  - PATCH  /tenants/:id      → SUPER_ADMIN only
 *
 * Guard execution order: AuthGuard → RoleGuard → TenantGuard
 */
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * POST /tenants
   * Create a new tenant. SUPER_ADMIN only.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN)
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /tenants
   * List all tenants (paginated). SUPER_ADMIN only.
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN)
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.tenantService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * GET /tenants/:id
   * Get a single tenant by ID.
   * - SUPER_ADMIN can view any tenant
   * - Other roles can only view their own tenant (TenantGuard)
   */
  @Get(':id')
  @UseGuards(AuthGuard, TenantGuard)
  @TenantAccess({ source: 'param', field: 'id' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.findById(id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /tenants/:id
   * Update mutable tenant fields (name, status). SUPER_ADMIN only.
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }
}
