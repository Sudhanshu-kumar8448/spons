import { Injectable, ConflictException, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/providers/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import type { JwtPayload } from './interfaces';
import type { JwtConfig } from '../common/config';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import {
  UserRegisteredEvent,
  USER_REGISTERED_EVENT,
  EmailVerificationRequestedEvent,
  EMAIL_VERIFICATION_REQUESTED_EVENT,
  PasswordResetRequestedEvent,
  PASSWORD_RESET_REQUESTED_EVENT,
} from '../common/events';

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
    private readonly eventEmitter: EventEmitter2,
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
        companyId: true,
        organizerId: true,
        isActive: true,
        emailVerified: true,
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

    // Generate email verification token
    const rawVerificationToken = randomBytes(32).toString('hex');
    const hashedVerificationToken = this.hashToken(rawVerificationToken);
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (unverified by default)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        emailVerified: false,
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpiry: verificationExpiry,
        emailVerificationSentCount: 1,
        emailVerificationLastSentAt: new Date(),
        // role defaults to USER in schema
        // isActive defaults to true in schema
      },
    });

    this.logger.log(`User ${user.id} registered`);

    // Emit welcome email event
    this.eventEmitter.emit(
      USER_REGISTERED_EVENT,
      new UserRegisteredEvent({ userId: user.id, email: user.email }),
    );

    // Emit email verification event — triggers verification email with link
    this.eventEmitter.emit(
      EMAIL_VERIFICATION_REQUESTED_EVENT,
      new EmailVerificationRequestedEvent({
        userId: user.id,
        email: user.email,
        verificationToken: rawVerificationToken,
      }),
    );

    // Generate tokens for auto-login (mirrors login flow)
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.excludePassword(user),
    };
  }

  /**
   * Remove sensitive fields from user object for API responses.
   */
  private excludePassword<T extends { password: string }>(user: T): Omit<T, 'password' | 'emailVerificationToken' | 'emailVerificationExpiry' | 'emailVerificationSentCount' | 'emailVerificationLastSentAt' | 'passwordResetToken' | 'passwordResetExpiry'> {
    const {
      password: _pw,
      emailVerificationToken: _evt,
      emailVerificationExpiry: _eve,
      emailVerificationSentCount: _evsc,
      emailVerificationLastSentAt: _evla,
      passwordResetToken: _prt,
      passwordResetExpiry: _pre,
      ...safeUser
    } = user as any;
    return safeUser;
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
   * 
   */
  async generateTokens(user: {
    id: string;
    role: any;
    companyId: string | null;
    organizerId: string | null;
    emailVerified: boolean;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      ...(user.companyId && { company_id: user.companyId }),
      ...(user.organizerId && { organizer_id: user.organizerId }),
      email_verified: user.emailVerified,
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

  // ─── EMAIL VERIFICATION ──────────────────────────────────

  /**
   * Verify a user's email using the token from the email link.
   * Marks emailVerified = true, clears token fields.
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: tokenHash },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    if (user.emailVerificationExpiry && new Date() > user.emailVerificationExpiry) {
      throw new BadRequestException('Verification link has expired. Please request a new one.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        emailVerificationSentCount: 0,
        emailVerificationLastSentAt: null,
      },
    });

    this.logger.log(`Email verified for user ${user.id}`);
    return { message: 'Email verified successfully' };
  }

  /**
   * Resend email verification link for a given user.
   * Enforces:
   *  - 120-second cooldown between sends
   *  - Max 3 resend attempts per 24-hour window
   */
  async resendVerificationEmail(userId: string): Promise<{
    message: string;
    attemptsRemaining: number;
    cooldownSeconds: number;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified', attemptsRemaining: 0, cooldownSeconds: 0 };
    }

    const now = new Date();
    const COOLDOWN_MS = 120 * 1000; // 2 minutes
    const MAX_RESENDS = 3;
    const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

    let currentCount = user.emailVerificationSentCount;
    const lastSentAt = user.emailVerificationLastSentAt;

    // Reset the counter if the 24-hour window has elapsed
    if (lastSentAt && now.getTime() - lastSentAt.getTime() >= WINDOW_MS) {
      currentCount = 0;
    }

    // Check 120-second cooldown
    if (lastSentAt) {
      const elapsedMs = now.getTime() - lastSentAt.getTime();
      if (elapsedMs < COOLDOWN_MS) {
        const remainingSec = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        throw new BadRequestException(
          `Please wait ${remainingSec} seconds before requesting another verification email.`,
        );
      }
    }

    // Check daily resend limit
    if (currentCount >= MAX_RESENDS) {
      throw new BadRequestException(
        'You have reached the maximum number of verification emails for today. Please try again tomorrow.',
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(rawToken);
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newCount = currentCount + 1;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: expiry,
        emailVerificationSentCount: newCount,
        emailVerificationLastSentAt: now,
      },
    });

    this.eventEmitter.emit(
      EMAIL_VERIFICATION_REQUESTED_EVENT,
      new EmailVerificationRequestedEvent({
        userId: user.id,
        email: user.email,
        verificationToken: rawToken,
      }),
    );

    this.logger.log(`Resend verification email #${newCount} for user ${userId}`);

    return {
      message: 'Verification email sent',
      attemptsRemaining: MAX_RESENDS - newCount,
      cooldownSeconds: 120,
    };
  }

  /**
   * Get email verification status for a given user.
   * Used by the verify-email-pending page for polling.
   */
  async getVerificationStatus(userId: string): Promise<{
    emailVerified: boolean;
    maskedEmail: string;
    canResend: boolean;
    cooldownSeconds: number;
    attemptsRemaining: number;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const now = new Date();
    const COOLDOWN_MS = 120 * 1000;
    const MAX_RESENDS = 3;
    const WINDOW_MS = 24 * 60 * 60 * 1000;

    // Mask the email: show first 2 chars + domain
    const [localPart, domain] = user.email.split('@');
    const masked = localPart.length > 2
      ? `${localPart.slice(0, 2)}${'*'.repeat(localPart.length - 2)}@${domain}`
      : `${localPart}@${domain}`;

    if (user.emailVerified) {
      return {
        emailVerified: true,
        maskedEmail: masked,
        canResend: false,
        cooldownSeconds: 0,
        attemptsRemaining: 0,
      };
    }

    let currentCount = user.emailVerificationSentCount;
    const lastSentAt = user.emailVerificationLastSentAt;

    // Reset counter if 24-hour window has elapsed
    if (lastSentAt && now.getTime() - lastSentAt.getTime() >= WINDOW_MS) {
      currentCount = 0;
    }

    // Calculate cooldown remaining
    let cooldownSeconds = 0;
    if (lastSentAt) {
      const elapsedMs = now.getTime() - lastSentAt.getTime();
      if (elapsedMs < COOLDOWN_MS) {
        cooldownSeconds = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
      }
    }

    const attemptsRemaining = Math.max(0, MAX_RESENDS - currentCount);
    const canResend = cooldownSeconds === 0 && attemptsRemaining > 0;

    return {
      emailVerified: false,
      maskedEmail: masked,
      canResend,
      cooldownSeconds,
      attemptsRemaining,
    };
  }

  // ─── FORGOT / RESET PASSWORD ─────────────────────────────

  /**
   * Request a password reset email.
   * Always returns a generic success message to prevent email enumeration.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Generic response regardless of whether user exists (prevents enumeration)
    const genericResponse = { message: 'If that email is registered, a password reset link has been sent.' };

    if (!user || !user.isActive) {
      return genericResponse;
    }

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(rawToken);
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: expiry,
      },
    });

    this.eventEmitter.emit(
      PASSWORD_RESET_REQUESTED_EVENT,
      new PasswordResetRequestedEvent({
        userId: user.id,
        email: user.email,
        resetToken: rawToken,
      }),
    );

    this.logger.log(`Password reset requested for user ${user.id}`);
    return genericResponse;
  }

  /**
   * Reset password using a token from the reset email.
   * Hashes new password, clears reset token, revokes all refresh tokens.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: tokenHash },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    if (user.passwordResetExpiry && new Date() > user.passwordResetExpiry) {
      throw new BadRequestException('Reset link has expired. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });

      // Revoke ALL refresh tokens — forces re-login on all devices
      await tx.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    this.logger.log(`Password reset completed for user ${user.id}`);
    return { message: 'Password has been reset successfully. Please login with your new password.' };
  }
}
