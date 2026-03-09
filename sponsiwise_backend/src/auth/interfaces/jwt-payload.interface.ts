import { Role } from '@prisma/client';

/**
 * JWT Access Token Payload Shape.
 * This is the structure signed into the JWT.
 */
export interface JwtPayload {
  sub: string; // userId (UUID)
  role: Role; // USER | SPONSOR | ORGANIZER | MANAGER | ADMIN | SUPER_ADMIN
  company_id?: string; // companyId (UUID) — present for SPONSOR users
  organizer_id?: string; // organizerId (UUID) — present for ORGANIZER users
  email_verified?: boolean; // true once user verifies their email
}

/**
 * Decoded JWT payload with standard claims.
 */
export interface JwtPayloadWithClaims extends JwtPayload {
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiration (Unix timestamp)
}
