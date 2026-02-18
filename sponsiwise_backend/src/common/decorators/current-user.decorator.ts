import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayloadWithClaims } from '../../auth/interfaces';

/**
 * @CurrentUser parameter decorator — extract the decoded JWT payload
 * from the request object.
 *
 * Requires AuthGuard to have executed first (it attaches `req.user`).
 *
 * Usage:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: JwtPayloadWithClaims) { ... }
 *
 *   @Get('profile')
 *   getUserId(@CurrentUser('sub') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayloadWithClaims | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayloadWithClaims | undefined;

    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
