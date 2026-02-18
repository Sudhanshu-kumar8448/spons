import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { EmailLogsService } from './email-logs.service';

// ── Query DTO ──────────────────────────────────────────────────────

class EmailLogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @IsOptional()
  @IsIn(['SENT', 'FAILED'], { message: 'status must be SENT or FAILED' })
  status?: 'SENT' | 'FAILED';

  @IsOptional()
  @IsString()
  jobName?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

// ── Controller ─────────────────────────────────────────────────────

/**
 * GET /manager/email-logs
 *
 * Manager-only, tenant-scoped email delivery log.
 */
@Controller('manager')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
export class EmailLogsController {
  constructor(private readonly emailLogsService: EmailLogsService) { }

  @Get('email-logs')
  async getEmailLogs(@Query() query: EmailLogsQueryDto, @CurrentUser() user: JwtPayloadWithClaims) {
    return this.emailLogsService.findByTenant({
      tenantId: user.tenant_id,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      jobName: query.jobName,
      search: query.search,
    });
  }
}
