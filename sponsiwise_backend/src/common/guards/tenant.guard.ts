import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import type { JwtPayloadWithClaims } from '../../auth/interfaces';
import { TENANT_KEY } from '../decorators';
import type { TenantAccessOptions } from '../decorators';

/**
 * TenantGuard — enforces tenant isolation.
 *
 * Reads configuration from the @TenantAccess() decorator metadata
 * to know where to find the tenant identifier in the request
 * (route param, body, or query).
 *
 * Compares the request tenant_id against `req.user.tenant_id`
 * (set by AuthGuard).
 *
 * Execution order: AuthGuard → RoleGuard → ③ TenantGuard
 *
 * Behaviour:
 *  - SUPER_ADMIN bypasses tenant checks (cross-tenant access allowed)
 *  - If no @TenantAccess() decorator → skip (no tenant restriction)
 *  - If decorator is present → request tenant must match JWT tenant_id
 *
 * Throws:
 *  - 403 if tenant identifiers do not match
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const tenantOptions = this.reflector.getAllAndOverride<TenantAccessOptions | undefined>(
      TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @TenantAccess() decorator → no tenant restriction
    if (!tenantOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayloadWithClaims | undefined;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // SUPER_ADMIN can access any tenant
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const { source = 'param', field = 'tenantId' } = tenantOptions;
    const requestTenantId = this.extractTenantId(request, source, field);

    if (!requestTenantId) {
      this.logger.warn(`Tenant identifier "${field}" not found in request ${source}`);
      throw new ForbiddenException('Tenant identifier missing from request');
    }

    if (requestTenantId !== user.tenant_id) {
      this.logger.warn(
        `Tenant mismatch: JWT=${user.tenant_id}, request=${requestTenantId} (user=${user.sub})`,
      );
      throw new ForbiddenException('Cross-tenant access is not allowed');
    }

    return true;
  }

  /**
   * Extract the tenant identifier from the configured request source.
   */
  private extractTenantId(request: Request, source: string, field: string): string | undefined {
    switch (source) {
      case 'param': {
        const paramValue = request.params[field];
        return typeof paramValue === 'string' ? paramValue : undefined;
      }
      case 'body': {
        const body = request.body as Record<string, unknown> | undefined;
        const value = body?.[field];
        return typeof value === 'string' ? value : undefined;
      }
      case 'query': {
        const value = request.query[field];
        return typeof value === 'string' ? value : undefined;
      }
      default:
        return undefined;
    }
  }
}
