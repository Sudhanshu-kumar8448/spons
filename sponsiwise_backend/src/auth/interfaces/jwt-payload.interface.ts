import { Role } from '@prisma/client';

/**
 * JWT Access Token Payload Shape.
 * This is the structure signed into the JWT.
 */
export interface JwtPayload {
  sub: string; // userId (UUID)
  role: Role; // USER | SPONSOR | ORGANIZER | ADMIN | SUPER_ADMIN
  tenant_id: string; // tenantId (UUID)
  company_id?: string; // companyId (UUID) — present for SPONSOR users
  organizer_id?: string; // organizerId (UUID) — present for ORGANIZER users
}

/**
 * Decoded JWT payload with standard claims.
 */
export interface JwtPayloadWithClaims extends JwtPayload {
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiration (Unix timestamp)
}
