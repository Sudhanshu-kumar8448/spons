import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { AuditLogService } from './audit-log.service';

// ── Query DTO ──────────────────────────────────────────────────────

class AuditLogsQueryDto {
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
    @IsString()
    entityType?: string;

    @IsOptional()
    @IsString()
    action?: string;
}

// ── Controller ─────────────────────────────────────────────────────

/**
 * AuditLogsController — read-only access to audit log entries.
 *
 * Endpoints:
 *  - GET /audit-logs            → paginated, tenant-scoped, filterable
 *  - GET /audit-logs/entity/:entityType/:entityId → entity history
 *
 * Accessible by MANAGER, ADMIN, and SUPER_ADMIN roles.
 */
@Controller('audit-logs')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
export class AuditLogsController {
    constructor(private readonly auditLogService: AuditLogService) { }

    /**
     * GET /audit-logs
     *
     * Returns paginated audit logs scoped to the requesting user's tenant.
     * Supports optional filtering by entityType and action.
     */
    @Get()
    async findAll(
        @Query() query: AuditLogsQueryDto,
        @CurrentUser() user: JwtPayloadWithClaims,
    ) {
        const { data, total } = await this.auditLogService.findByTenant({
            tenantId: user.tenant_id,
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
            entityType: query.entityType,
            action: query.action,
        });

        return {
            data,
            total,
            page: query.page,
            pageSize: query.pageSize,
        };
    }

    /**
     * GET /audit-logs/entity/:entityType/:entityId
     *
     * Returns the full audit history for a specific entity.
     * Useful for showing a timeline on entity detail pages.
     */
    @Get('entity/:entityType/:entityId')
    async getEntityHistory(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
    ) {
        return this.auditLogService.getEntityHistory(entityType, entityId);
    }
}
