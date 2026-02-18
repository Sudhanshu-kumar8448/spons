import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/providers/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import type { JwtPayload } from './interfaces';
import type { JwtConfig } from '../common/config';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';

/**
 * AuthService handles all authentication-related business logic.
 * Responsibilities:
 * - User registration and login
 * - JWT token issuance and validation
 * - Refresh token management
 */
@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Get the authenticated user by ID.
   * Used by GET /auth/me to return the current user profile.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        companyId: true,
        organizerId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return user;
  }

  /**
   * Register a new user and auto-login by generating tokens.
   * - Checks for existing email
   * - Hashes password with bcrypt
   * - Generates tenant ID
   * - Creates user with default role USER
   * - Generates JWT access + refresh tokens (auto-login)
   */
  async register(dto: RegisterDto): Promise<{ accessToken: string; refreshToken: string; user: object }> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Generate tenant ID for this user
    const tenantId = randomUUID();

    // Create tenant + user in a transaction to maintain referential integrity
    const user = await this.prisma.$transaction(async (tx) => {
      // Create a personal tenant for the new user
      const emailPrefix = dto.email.toLowerCase().split('@')[0];
      const slug = `${emailPrefix}-${tenantId.slice(0, 8)}`;

      await tx.tenant.create({
        data: {
          id: tenantId,
          name: `${emailPrefix}'s Organization`,
          slug,
        },
      });

      // Create user within the new tenant
      return tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          password: hashedPassword,
          tenantId,
          // role defaults to USER in schema
          // isActive defaults to true in schema
        },
      });
    });

    // Generate tokens for auto-login (mirrors login flow)
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.excludePassword(user),
    };
  }

  /**
   * Remove password from user object for safe responses.
   */
  private excludePassword<T extends { password: string }>(user: T): Omit<T, 'password'> {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Login user and return access token.
   * - Validates email exists
   * - Checks user is active
   * - Verifies password with bcrypt
   * - Returns JWT access token
   */
  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: object }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      // Generic message to prevent email enumeration
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if tenant is active
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { status: true },
    });

    if (!tenant || tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.DEACTIVATED) {
      throw new ForbiddenException('Your organization account is suspended or deactivated. Please contact support.');
    }

    // Generate tokens using shared method
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.excludePassword(user),
    };
  }

  /**
   * Refresh token rotation.
   * - Verifies incoming refresh token signature
   * - Looks up hashed token in DB
   * - Detects token reuse (revoked token reused → revoke ALL)
   * - Rotates: revoke old, issue new pair
   */
  async refreshTokens(incomingRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: object;
  }> {
    // 1. Verify the refresh token JWT signature and decode
    const jwtConfig = this.configService.get<JwtConfig>('jwt');

    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify<JwtPayload>(incomingRefreshToken, {
        secret: jwtConfig?.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Hash the incoming token and look it up in DB
    const tokenHash = this.hashToken(incomingRefreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    // 3. Token not found in DB
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not recognized');
    }

    // 4. Token reuse detection: if already revoked, it's a stolen token replay
    if (storedToken.isRevoked) {
      this.logger.warn(
        `Refresh token reuse detected for user ${storedToken.userId}. Revoking all tokens.`,
      );
      // Revoke ALL refresh tokens for this user (security breach)
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token reuse detected. All sessions revoked.');
    }

    // 5. Check if token is expired (belt + suspenders — JWT verify already checks this)
    if (new Date() > storedToken.expiresAt) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // 6. Look up user to ensure still active
    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    // Check if tenant is still active
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { status: true },
    });

    if (!tenant || tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.DEACTIVATED) {
      throw new ForbiddenException('Your organization account is suspended or deactivated.');
    }

    // 7. Rotate: revoke the old token and mark rotatedAt
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        isRevoked: true,
        rotatedAt: new Date(),
      },
    });

    // 8. Issue new token pair (must include ALL claims, same as login)
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.excludePassword(user),
    };
  }

  /**
   * Generates a new pair of access and refresh tokens for a user.
   * Publicly accessible for modules that need to refresh auth state (e.g. role upgrades).
   */
  async generateTokens(user: {
    id: string;
    role: any;
    tenantId: string;
    companyId: string | null;
    organizerId: string | null;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tenant_id: user.tenantId,
      ...(user.companyId && { company_id: user.companyId }),
      ...(user.organizerId && { organizer_id: user.organizerId }),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(payload, user.id);

    return { accessToken, refreshToken };
  }

  /**
   * Logout: revoke the given refresh token.
   * If the token is already revoked (potential reuse), revokes ALL user tokens.
   */
  async logout(incomingRefreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(incomingRefreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!storedToken) {
      // Token not found — already invalid, nothing to do
      return { message: 'Logged out successfully' };
    }

    if (storedToken.isRevoked) {
      // Token reuse detected — revoke ALL tokens for this user
      this.logger.warn(
        `Logout with already-revoked token for user ${storedToken.userId}. Revoking all tokens.`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { isRevoked: true },
      });
    } else {
      // Normal logout — revoke this token
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
    }

    return { message: 'Logged out successfully' };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────

  /**
   * Generate a signed refresh token JWT and store its hash in DB.
   */
  private async generateRefreshToken(payload: JwtPayload, userId: string): Promise<string> {
    const jwtConfig = this.configService.get<JwtConfig>('jwt');
    const expiresIn = jwtConfig?.refreshExpiresIn || '7d';

    // Sign refresh token with its own secret
    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConfig?.refreshSecret,
      expiresIn: expiresIn as StringValue,
    });

    // Hash before storing (SHA-256 — fast, non-reversible)
    const tokenHash = this.hashToken(refreshToken);

    // Calculate expiration date from the string (e.g. '7d')
    const expiresAt = this.calculateExpiry(expiresIn);

    // Store hashed token in DB
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return refreshToken;
  }

  /**
   * SHA-256 hash a token string. Used for refresh token storage lookup.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse duration string (e.g. '7d', '24h') to a future Date.
   */
  private calculateExpiry(duration: string): Date {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 7 days
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    return new Date(Date.now() + value * units[unit]);
  }

  /**
   * Change the authenticated user's password.
   * - Verifies current password
   * - Hashes new password with bcrypt
   * - Updates user record
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Use a transaction to update password AND revoke all refresh tokens atomically
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Revoke ALL existing refresh tokens — forces re-login on all devices
      await tx.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    this.logger.log(`Password changed and all refresh tokens revoked for user ${userId}`);

    return { message: 'Password changed successfully. All sessions have been revoked.' };
  }

  // Future: validateUser()
}
