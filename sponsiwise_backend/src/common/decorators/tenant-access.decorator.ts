import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for tenant field configuration.
 * Used by TenantGuard to know where to find the tenant identifier in the request.
 */
export const TENANT_KEY = 'tenant_key';

/**
 * Sources where the tenant identifier can be found in the request.
 */
export type TenantSource = 'param' | 'body' | 'query';

/**
 * Configuration for the @TenantAccess decorator.
 */
export interface TenantAccessOptions {
  /** Where to read the tenant identifier from. Default: 'param' */
  source?: TenantSource;
  /** The field name to read. Default: 'tenantId' */
  field?: string;
}

/**
 * @TenantAccess decorator — configure tenant isolation for a route handler.
 *
 * Tells TenantGuard where to find the tenant identifier in the request
 * and which field name to look for.
 *
 * Usage:
 *   @TenantAccess({ source: 'param', field: 'tenantId' })
 *   @Get(':tenantId/resources')
 *   getResources() { ... }
 *
 *   @TenantAccess({ source: 'body', field: 'tenantId' })
 *   @Post('resource')
 *   createResource() { ... }
 *
 *   @TenantAccess({ source: 'query', field: 'tenant_id' })
 *   @Get('search')
 *   search() { ... }
 *
 * Defaults to { source: 'param', field: 'tenantId' } if called without args.
 */
export const TenantAccess = (options?: TenantAccessOptions) =>
  SetMetadata(TENANT_KEY, {
    source: options?.source ?? 'param',
    field: options?.field ?? 'tenantId',
  });
