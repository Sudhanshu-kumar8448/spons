import {
  Controller,
  Get,
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
import { UserService } from './user.service';
import { UpdateUserDto, ListUsersQueryDto } from './dto';

/**
 * UsersController — HTTP layer for user management.
 *
 * RBAC rules:
 *  - GET    /users/me          → any authenticated user (own profile)
 *  - GET    /users             → ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - GET    /users/:id         → ADMIN (own tenant) / SUPER_ADMIN (all)
 *  - PATCH  /users/:id         → ADMIN (own tenant) / SUPER_ADMIN (all)
 *
 * Tenant isolation is enforced at the service layer:
 *  - ADMIN operations are scoped to callerTenantId (from JWT)
 *  - SUPER_ADMIN bypasses tenant scoping
 */
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /users/me
   * Any authenticated user can view their own profile.
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: JwtPayloadWithClaims) {
    return this.userService.getMe(user.sub);
  }

  /**
   * GET /users
   * List users with optional filters.
   * - ADMIN:       own tenant only
   * - SUPER_ADMIN: all tenants
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListUsersQueryDto, @CurrentUser() user: JwtPayloadWithClaims) {
    return this.userService.findAll(query, user.role, user.tenant_id);
  }

  /**
   * GET /users/:id
   * Get a single user by ID.
   * - ADMIN:       only within their tenant
   * - SUPER_ADMIN: any tenant
   */
  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.userService.findById(id, user.role, user.tenant_id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /users/:id
   * Update a user's role or isActive status.
   * - ADMIN:       within own tenant, cannot set SUPER_ADMIN
   * - SUPER_ADMIN: any tenant, any role
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.userService.update(id, dto, user.role, user.tenant_id);
  }
}
