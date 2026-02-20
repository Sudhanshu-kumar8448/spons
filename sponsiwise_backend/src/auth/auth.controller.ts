import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto';
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
   */
  @Get('me')
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
    // Always use 'none' in production when frontend and backend are on different domains
    // This is needed because the frontend (www.sponsiwise.app) and backend (sponsiwise.onrender.com) are on different domains
    // We assume production if NOT running on localhost
    const isProduction = this.isProduction() || !this.isLocalhost();
    const sameSite = isProduction ? 'none' : 'lax';

    const cookieOptions: any = {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    };

    // For production (cross-subdomain), set domain to share cookies across subdomains
    if (isProduction) {
      cookieOptions.domain = '.sponsiwise.app';
    } else {
      cookieOptions.domain = 'localhost';
    }

    console.log('[AUTH] Setting access_token cookie:', { isProduction, sameSite, secure: isProduction, domain: cookieOptions.domain });
    
    res.cookie('access_token', accessToken, cookieOptions);
  }

  /**
   * Set refresh token as HTTP-only cookie.
   * path: '/auth' — sent to both /auth/refresh and /auth/logout,
   * minimizing exposure on every request.
   * domain: '.sponsiwise.app' — works across subdomains
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    // Always use 'none' in production when frontend and backend are on different domains
    // We assume production if NOT running on localhost
    const isProduction = this.isProduction() || !this.isLocalhost();
    const sameSite = isProduction ? 'none' : 'lax';
    const jwtConfig = this.configService.get<JwtConfig>('jwt');
    const refreshExpiresIn = jwtConfig?.refreshExpiresIn || '7d';

    const cookieOptions: any = {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      maxAge: this.parseDurationMs(refreshExpiresIn),
      path: '/auth',
    };

    // For production (cross-subdomain), set domain to share cookies across subdomains
    if (isProduction) {
      cookieOptions.domain = '.sponsiwise.app';
    } else {
      cookieOptions.domain = 'localhost';
    }

    console.log('[AUTH] Setting refresh_token cookie:', { isProduction, sameSite, secure: isProduction, domain: cookieOptions.domain });

    res.cookie('refresh_token', refreshToken, cookieOptions);
  }

  private isProduction(): boolean {
    // Check multiple ways to determine if we're in production
    const appConfig = this.configService.get<AppConfig>('app');
    const nodeEnv = appConfig?.nodeEnv || process.env.NODE_ENV;
    
    // Also check if we're deployed on known production domains
    const isOnRender = process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL !== undefined;
    const isOnVercel = process.env.VERCEL === '1';
    
    return nodeEnv === 'production' || isOnRender || isOnVercel;
  }

  private isLocalhost(): boolean {
    const host = process.env.HOST || process.env.HOSTNAME || '';
    return host.includes('localhost') || host.includes('127.0.0.1') || process.env.NODE_ENV === 'development';
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
    const isProduction = this.isProduction() || !this.isLocalhost();
    const sameSite = isProduction ? 'none' : 'lax';
    const domain = isProduction ? '.sponsiwise.app' : 'localhost';

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/',
      domain,
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/auth',
      domain,
    });

    return { message: 'Logged out successfully' };
  }
}
