import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import type { JwtPayloadWithClaims } from '../../auth/interfaces';
import { ROLES_KEY } from '../decorators';

/**
 * RoleGuard — enforces role-based access control.
 *
 * Reads required roles from the @Roles() decorator metadata.
 * Compares them against `req.user.role` (set by AuthGuard).
 *
 * Execution order: AuthGuard → ② RoleGuard → TenantGuard
 *
 * Behaviour:
 *  - If no @Roles() decorator is present → allow (no role restriction)
 *  - If @Roles() is present → user.role must be in the list
 *
 * Throws:
 *  - 403 if user role is not in the required list
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → no role restriction
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayloadWithClaims | undefined;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have the required role to access this resource');
    }

    return true;
  }
}
