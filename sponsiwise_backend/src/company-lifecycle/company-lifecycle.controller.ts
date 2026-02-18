import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { CompanyLifecycleService } from './company-lifecycle.service';

/**
 * CompanyLifecycleController — company lifecycle dashboard for managers.
 *
 * Provides:
 *  - GET /manager/companies/:id/lifecycle
 *
 * Secured: AuthGuard + RoleGuard(MANAGER)
 * Tenant-scoped via CurrentUser().tenant_id
 */
@Controller('manager/companies')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.MANAGER)
export class CompanyLifecycleController {
  constructor(private readonly lifecycleService: CompanyLifecycleService) {}

  /**
   * GET /manager/companies/:id/lifecycle
   *
   * Returns full lifecycle view of a company:
   * company info, stats, progress, and chronological timeline.
   */
  @Get(':id/lifecycle')
  async getCompanyLifecycle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.lifecycleService.getCompanyLifecycle(user.tenant_id, id);
  }
}
