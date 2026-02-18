import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Metadata key for roles-based access control.
 * Used by RoleGuard to read the allowed roles for a route.
 */
export const ROLES_KEY = 'roles';

/**
 * @Roles decorator — attach required roles to a route handler.
 *
 * Usage:
 *   @Roles(Role.ADMIN, Role.SUPER_ADMIN)
 *   @Get('admin-only')
 *   getAdminData() { ... }
 *
 * If no roles are set, RoleGuard will allow any authenticated user.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
