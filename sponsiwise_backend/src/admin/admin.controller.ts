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
 */
@Controller('admin')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── GET /admin/dashboard/stats ──────────────────────────────────────

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── GET /admin/users ────────────────────────────────────────────────

  @Get('users')
  async getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  // ── GET /admin/users/:id ────────────────────────────────────────────

  @Get('users/:id')
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  // ── PATCH /admin/users/:id/role ─────────────────────────────────────

  @Patch('users/:id/role')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.adminService.updateRole(user.sub, user.role, id, dto.role);
  }

  // ── PATCH /admin/users/:id/status ───────────────────────────────────

  @Patch('users/:id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.adminService.updateStatus(user.sub, user.role, id, dto.status);
  }
}
