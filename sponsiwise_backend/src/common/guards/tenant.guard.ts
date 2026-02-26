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
import { GLOBAL_TENANT_ID } from '../constants/global-tenant.constants';

/**
 * TenantGuard — enforces tenant isolation.
 * 
 * AFTER SOFT-DISABLE MULTI-TENANCY:
 * - This guard now automatically attaches GLOBAL_TENANT_ID to the request
 * - Tenant validation is bypassed - all users work within the global tenant
 * - Authentication logic is preserved
 * - For future re-enablement: revert to original implementation
 *
 * Execution order: AuthGuard → RoleGuard → ③ TenantGuard
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayloadWithClaims | undefined;

    // Attach GLOBAL_TENANT_ID to user for consistent internal usage
    // This ensures all services use the global tenant
    if (user) {
      (user as any).tenant_id = GLOBAL_TENANT_ID;
    }

    // Check for @TenantAccess() decorator (legacy - for future use)
    const tenantOptions = this.reflector.getAllAndOverride<TenantAccessOptions | undefined>(
      TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @TenantAccess() decorator → no tenant restriction (always true now)
    if (!tenantOptions) {
      return true;
    }

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // SUPER_ADMIN bypasses tenant checks (legacy - kept for compatibility)
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Tenant validation is now always passed - using GLOBAL_TENANT_ID
    const { source = 'param', field = 'tenantId' } = tenantOptions;
    const requestTenantId = this.extractTenantId(request, source, field);

    if (!requestTenantId) {
      this.logger.warn(`Tenant identifier "${field}" not found in request ${source}`);
      throw new ForbiddenException('Tenant identifier missing from request');
    }

    if (requestTenantId !== GLOBAL_TENANT_ID) {
      this.logger.warn(
        `Tenant mismatch: Request=${requestTenantId}, Global=${GLOBAL_TENANT_ID}`,
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
