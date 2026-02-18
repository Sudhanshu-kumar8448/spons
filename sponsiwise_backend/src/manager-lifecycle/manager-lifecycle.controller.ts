import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { ManagerLifecycleService } from './manager-lifecycle.service';

/**
 * ManagerLifecycleController — read-only lifecycle view for manager event dashboard.
 *
 * All routes:
 *  - Require valid JWT (AuthGuard)
 *  - Require MANAGER role (RoleGuard + @Roles)
 *  - Tenant scoping from JWT (tenant_id)
 *  - Strictly read-only — no mutations
 */
@Controller('manager/events')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.MANAGER)
export class ManagerLifecycleController {
  constructor(private readonly lifecycleService: ManagerLifecycleService) {}

  /**
   * GET /manager/events/:id/lifecycle
   *
   * Returns full lifecycle view of an event including:
   *  - Event metadata + organizer
   *  - All proposals
   *  - Progress bar data (completed/total/percentage)
   *  - Chronological timeline of all actions, emails, verifications
   */
  @Get(':id/lifecycle')
  async getEventLifecycle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.lifecycleService.getEventLifecycle(user.tenant_id, id);
  }
}
