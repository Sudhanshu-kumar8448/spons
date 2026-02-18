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
import { ProposalService } from './proposal.service';
import { CreateProposalDto, UpdateProposalDto, ListProposalsQueryDto } from './dto';

/**
 * ProposalsController — HTTP layer for proposal management.
 *
 * RBAC rules:
 *  - POST   /proposals          → ADMIN (own tenant) / SUPER_ADMIN (any)
 *  - GET    /proposals          → USER, ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - GET    /proposals/:id      → USER, ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - PATCH  /proposals/:id      → ADMIN (own tenant) / SUPER_ADMIN (all)
 *
 * Tenant isolation & sponsorship validation enforced at the service layer:
 *  - Sponsorship must exist before creating a proposal
 *  - tenantId is derived from the Sponsorship, never from the request
 *  - USER / ADMIN operations are scoped to callerTenantId (from JWT)
 *  - SUPER_ADMIN bypasses tenant scoping
 *  - Status transitions are validated (DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED)
 */
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalService: ProposalService) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * POST /proposals
   * Create a new proposal for a Sponsorship.
   * Body must include sponsorshipId; tenantId is derived in service.
   */
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() dto: CreateProposalDto, @CurrentUser() user: JwtPayloadWithClaims) {
    return this.proposalService.create(dto, user.role, user.tenant_id);
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /proposals
   * List proposals with optional filters (status, sponsorshipId, isActive).
   * - USER / ADMIN: own tenant only
   * - SUPER_ADMIN:  all tenants
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListProposalsQueryDto, @CurrentUser() user: JwtPayloadWithClaims) {
    return this.proposalService.findAll(query, user.role, user.tenant_id);
  }

  /**
   * GET /proposals/:id
   * Get a single proposal by ID.
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
    return this.proposalService.findById(id, user.role, user.tenant_id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /proposals/:id
   * Update proposal details (status, proposedTier, proposedAmount, message, notes, isActive).
   * sponsorshipId and tenantId are immutable.
   * Status transitions are validated by the service layer.
   * - ADMIN:       within own tenant
   * - SUPER_ADMIN: any tenant
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.proposalService.update(id, dto, user.role, user.tenant_id);
  }
}
