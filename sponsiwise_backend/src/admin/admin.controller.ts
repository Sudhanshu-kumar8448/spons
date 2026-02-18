import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { AdminService } from './admin.service';
import { AdminUsersQueryDto, UpdateRoleDto, UpdateStatusDto } from './dto';

/**
 * AdminController — admin-scoped APIs.
 *
 * All routes:
 *  - Require valid JWT (AuthGuard)
 *  - Require ADMIN or SUPER_ADMIN role (RoleGuard + @Roles)
 *  - ADMIN → tenant-scoped via JWT tenant_id
 *  - SUPER_ADMIN → cross-tenant
 */
@Controller('admin')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── GET /admin/dashboard/stats ──────────────────────────────────────

  @Get('dashboard/stats')
  async getDashboardStats(@CurrentUser() user: JwtPayloadWithClaims) {
    return this.adminService.getDashboardStats(user.role, user.tenant_id);
  }

  // ── GET /admin/users ────────────────────────────────────────────────

  @Get('users')
  async getUsers(@Query() query: AdminUsersQueryDto, @CurrentUser() user: JwtPayloadWithClaims) {
    return this.adminService.getUsers(user.role, user.tenant_id, query);
  }

  // ── GET /admin/users/:id ────────────────────────────────────────────

  @Get('users/:id')
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.adminService.getUserById(user.role, user.tenant_id, id);
  }

  // ── PATCH /admin/users/:id/role ─────────────────────────────────────

  @Patch('users/:id/role')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.adminService.updateRole(user.sub, user.role, user.tenant_id, id, dto.role);
  }

  // ── PATCH /admin/users/:id/status ───────────────────────────────────

  @Patch('users/:id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.adminService.updateStatus(user.sub, user.role, user.tenant_id, id, dto.status);
  }
}
