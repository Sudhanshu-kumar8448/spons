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
import { CompanyService } from './company.service';
import { CreateCompanyDto, UpdateCompanyDto, ListCompaniesQueryDto } from './dto';

/**
 * CompaniesController — HTTP layer for company management.
 *
 * RBAC rules:
 *  - POST   /companies          → ADMIN (own tenant) / SUPER_ADMIN (any tenant)
 *  - GET    /companies          → USER, ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - GET    /companies/:id      → USER, ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - PATCH  /companies/:id      → ADMIN (own tenant) / SUPER_ADMIN (all)
 *
 * Tenant isolation is enforced at the service layer:
 *  - USER / ADMIN operations are scoped to callerTenantId (from JWT)
 *  - SUPER_ADMIN bypasses tenant scoping
 */
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companyService: CompanyService) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * POST /companies
   * Create a new company within the caller's tenant.
   * SUPER_ADMIN may pass ?tenantId= to target another tenant.
   */
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: JwtPayloadWithClaims,
    @Query('tenantId') tenantIdOverride?: string,
  ) {
    return this.companyService.create(dto, user.role, user.tenant_id, tenantIdOverride);
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /companies
   * List companies with optional filters.
   * - USER / ADMIN: own tenant only
   * - SUPER_ADMIN:  all tenants
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListCompaniesQueryDto, @CurrentUser() user: JwtPayloadWithClaims) {
    return this.companyService.findAll(query, user.role, user.tenant_id);
  }

  /**
   * GET /companies/:id
   * Get a single company by ID.
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
    return this.companyService.findById(id, user.role, user.tenant_id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /companies/:id
   * Update company details.
   * - ADMIN:       within own tenant
   * - SUPER_ADMIN: any tenant
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.companyService.update(id, dto, user.role, user.tenant_id);
  }
}
