import { Role } from '@prisma/client';

/**
 * JWT Access Token Payload Shape.
 * This is the structure signed into the JWT.
 * 
 * IMPORTANT: After soft-disable multi-tenancy, tenant_id is no longer
 * included in the JWT. The GLOBAL_TENANT_ID is used internally.
 */
export interface JwtPayload {
  sub: string; // userId (UUID)
  role: Role; // USER | SPONSOR | ORGANIZER | ADMIN | SUPER_ADMIN
  // tenant_id removed - using GLOBAL_TENANT_ID internally
  company_id?: string; // companyId (UUID) — present for SPONSOR users
  organizer_id?: string; // organizerId (UUID) — present for ORGANIZER users
}

/**
 * Decoded JWT payload with standard claims.
 * 
 * IMPORTANT: tenant_id is ALWAYS available - it is added by TenantGuard at runtime.
 * The TenantGuard attaches GLOBAL_TENANT_ID to the request after authentication.
 */
export interface JwtPayloadWithClaims extends JwtPayload {
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiration (Unix timestamp)
  // Always present - added by TenantGuard at runtime
  tenant_id: string;
}
