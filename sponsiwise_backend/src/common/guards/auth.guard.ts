import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, TokenExpiredError, verify } from 'jsonwebtoken';
import type { Request } from 'express';
import type { JwtPayloadWithClaims } from '../../auth/interfaces';
import type { JwtConfig } from '../config';

/**
 * AuthGuard — verifies that a valid access_token JWT exists in the
 * HTTP-only cookie and attaches the decoded payload to `req.user`.
 *
 * Execution order: ① AuthGuard → RoleGuard → TenantGuard
 *
 * Throws:
 *  - 401 if no cookie, invalid signature, or expired token
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('Access token not found');
    }

    const jwtConfig = this.configService.get<JwtConfig>('jwt');
    const secret = jwtConfig?.accessSecret;

    if (!secret) {
      this.logger.error('JWT access secret is not configured');
      throw new UnauthorizedException('Authentication configuration error');
    }

    try {
      const payload = verify(token, secret, {
        algorithms: ['HS256'],
      }) as JwtPayloadWithClaims;

      // Attach decoded payload to request for downstream guards / handlers
      request.user = payload;

      return true;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Access token has expired');
      }

      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid access token');
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }
}
