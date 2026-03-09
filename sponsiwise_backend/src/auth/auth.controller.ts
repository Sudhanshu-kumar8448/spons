import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { AuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from './interfaces';
import type { AppConfig, JwtConfig } from '../common/config';

/**
 * AuthController exposes authentication HTTP endpoints.
 * Responsibilities:
 * - POST /auth/register
 * - POST /auth/login
 * - POST /auth/refresh
 * - POST /auth/logout
 * - GET  /auth/me
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * GET /auth/me
   * Returns the authenticated user's profile from the access_token cookie.
   * Used by the frontend middleware to verify auth state server-side.
   * Throttle skipped — called on every page navigation by Next.js middleware.
   */
  @Get('me')
  @SkipThrottle()
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: JwtPayloadWithClaims) {
    return this.authService.getMe(user.sub);
  }

  /**
   * Register a new user and auto-login.
   * Generates JWT tokens and sets them as HTTP-only cookies,
   * identical to the login flow, so the user is authenticated immediately.
   */
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.register(dto);

    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, refreshToken);

    return {
      message: 'Registration successful',
      user,
    };
  }

  /**
   * GET /auth/verify-email?token=...
   * Verifies user email via the token sent in the verification email.
   */
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new UnauthorizedException('Verification token is required');
    }
    return this.authService.verifyEmail(token);
  }

  /**
   * POST /auth/resend-verification
   * Resends verification email to the authenticated user.
   * Rate-limited: 120s cooldown + max 3 per day (enforced in service).
   */
  @Post('resend-verification')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resendVerification(@CurrentUser() user: JwtPayloadWithClaims) {
    return this.authService.resendVerificationEmail(user.sub);
  }

  /**
   * GET /auth/verification-status
   * Returns the current email verification status for polling.
   * Includes cooldown info and remaining resend attempts.
   * Throttle skipped — lightweight read-only endpoint polled by the pending page.
   */
  @Get('verification-status')
  @SkipThrottle()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async verificationStatus(@CurrentUser() user: JwtPayloadWithClaims) {
    return this.authService.getVerificationStatus(user.sub);
  }

  /**
   * POST /auth/forgot-password
   * Sends a password reset link to the user's email.
   * Always returns a generic success message regardless of whether the email exists.
   */
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * POST /auth/reset-password
   * Resets user password using the token from the reset email.
   */
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  /**
   * Login user and set access + refresh tokens in HTTP-only cookies.
   * Returns user info without tokens in response body.
   */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);

    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, refreshToken);

    return {
      message: 'Login successful',
      user,
    };
  }

  /**
   * Refresh access + refresh tokens.
   * Reads refresh token from HTTP-only cookie.
   * Sets new token pair as HTTP-only cookies.
   * Returns user info without tokens in response body.
   */
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const incomingRefreshToken = req.cookies?.refresh_token;

    if (!incomingRefreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const { accessToken, refreshToken, user } =
      await this.authService.refreshTokens(incomingRefreshToken);

    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, refreshToken);

    return {
      message: 'Tokens refreshed',
      user,
    };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────

  /**
   * Set access token as HTTP-only cookie.
   * path: '/' — available for all routes.
   * domain: '.sponsiwise.app' — works across subdomains (api.sponsiwise.app, sponsiwise.app, www.sponsiwise.app)
   */
  private setAccessTokenCookie(res: Response, accessToken: string): void {
    // Determine if we're in production based on environment and deployment platform
    const isProduction = this.isProduction();
    const isLocalhost = this.isLocalhost();

    // For local development: use lax + no secure (works with HTTP)
    // For production: use none + secure (requires HTTPS)
    const sameSite = isProduction ? 'none' : 'lax';
    const secure = isProduction;

    const cookieOptions: any = {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    };

    // For production (cross-subdomain), set domain to share cookies across subdomains
    // For local development, don't set domain (browser will use current host)
    if (isProduction) {
      cookieOptions.domain = '.sponsiwise.app';
    } else if (!isLocalhost) {
      // For non-localhost non-production (e.g., preview deployments), don't set domain
      cookieOptions.domain = undefined;
    }

    res.cookie('access_token', accessToken, cookieOptions);
  }

  /**
   * Set refresh token as HTTP-only cookie.
   * path: '/auth' — sent to both /auth/refresh and /auth/logout,
   * minimizing exposure on every request.
   * domain: '.sponsiwise.app' — works across subdomains
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    // Determine if we're in production based on environment and deployment platform
    const isProduction = this.isProduction();
    const isLocalhost = this.isLocalhost();

    // For local development: use lax + no secure (works with HTTP)
    // For production: use none + secure (requires HTTPS)
    const sameSite = isProduction ? 'none' : 'lax';
    const secure = isProduction;

    const jwtConfig = this.configService.get<JwtConfig>('jwt');
    const refreshExpiresIn = jwtConfig?.refreshExpiresIn || '7d';

    // In local dev, use path '/' so the cookie is sent through the /api proxy rewrite
    // In production, restrict to '/auth' to minimize cookie exposure
    const cookiePath = isProduction ? '/auth' : '/';

    const cookieOptions: any = {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: this.parseDurationMs(refreshExpiresIn),
      path: cookiePath,
    };

    // For production (cross-subdomain), set domain to share cookies across subdomains
    // For local development, don't set domain (browser will use current host)
    if (isProduction) {
      cookieOptions.domain = '.sponsiwise.app';
    } else if (!isLocalhost) {
      // For non-localhost non-production (e.g., preview deployments), don't set domain
      cookieOptions.domain = undefined;
    }

    res.cookie('refresh_token', refreshToken, cookieOptions);
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private isLocalhost(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  /**
   * Parse duration string (e.g. '7d') to milliseconds.
   */
  private parseDurationMs(duration: string): number {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    return parseInt(match[1], 10) * units[match[2]];
  }

  /**
   * PATCH /auth/change-password
   * Change the authenticated user's password.
   */
  @Patch('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: JwtPayloadWithClaims, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  /**
   * POST /auth/logout
   * Revokes the refresh token in DB and clears both auth cookies.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const incomingRefreshToken = req.cookies?.refresh_token;

    if (incomingRefreshToken) {
      await this.authService.logout(incomingRefreshToken);
    }

    // Clear both cookies regardless
    const isProduction = this.isProduction();
    const isLocalhost = this.isLocalhost();
    const sameSite = isProduction ? 'none' : 'lax';
    const secure = isProduction;

    // Clear access_token cookie
    const accessTokenOptions: any = {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
    };

    if (isProduction) {
      accessTokenOptions.domain = '.sponsiwise.app';
    } else if (!isLocalhost) {
      accessTokenOptions.domain = undefined;
    }

    res.clearCookie('access_token', accessTokenOptions);

    // Clear refresh_token cookie — path must match setRefreshTokenCookie
    const refreshCookiePath = isProduction ? '/auth' : '/';
    const refreshTokenOptions: any = {
      httpOnly: true,
      secure,
      sameSite,
      path: refreshCookiePath,
    };

    if (isProduction) {
      refreshTokenOptions.domain = '.sponsiwise.app';
    } else if (!isLocalhost) {
      refreshTokenOptions.domain = undefined;
    }

    res.clearCookie('refresh_token', refreshTokenOptions);

    return { message: 'Logged out successfully' };
  }
}
