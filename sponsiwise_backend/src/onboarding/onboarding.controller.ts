import {
    Controller,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
    Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { OnboardingService } from './onboarding.service';
import { CreateSponsorDto, CreateOrganizerDto } from './dto';
import type { AppConfig, JwtConfig } from '../common/config';

/**
 * OnboardingController — handles new user onboarding.
 *
 * All routes require a valid JWT (AuthGuard).
 * No role guard — these endpoints are for users with USER role
 * who haven't yet chosen a role (validated in the service layer).
 *
 * Endpoints:
 *  - POST /onboarding/sponsor   → register as a sponsor (pending manager approval)
 *  - POST /onboarding/organizer → register as an organizer (immediate access)
 */
@Controller('onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
    constructor(
        private readonly onboardingService: OnboardingService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * POST /onboarding/sponsor
     * Register the current user as a sponsor.
     * Creates a Company with PENDING verification status.
     */
    @Post('sponsor')
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @HttpCode(HttpStatus.CREATED)
    async registerSponsor(
        @Body() dto: CreateSponsorDto,
        @CurrentUser() user: JwtPayloadWithClaims,
    ) {
        return this.onboardingService.registerSponsor(dto, user);
    }

    /**
     * POST /onboarding/organizer
     * Register the current user as an organizer.
     * Creates an Organizer record and upgrades role immediately.
     */
    @Post('organizer')
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @HttpCode(HttpStatus.CREATED)
    async registerOrganizer(
        @Body() dto: CreateOrganizerDto,
        @CurrentUser() user: JwtPayloadWithClaims,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { tokens, ...result } = await this.onboardingService.registerOrganizer(dto, user);

        // Set new tokens as HTTP-only cookies so the frontend picks up the new role immediately
        this.setAccessTokenCookie(res, tokens.accessToken);
        this.setRefreshTokenCookie(res, tokens.refreshToken);

        return result;
    }

    // ─── PRIVATE HELPERS (duplicated from AuthController for now) ───

    private setAccessTokenCookie(res: Response, accessToken: string): void {
        const isProduction = this.isProduction();

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/',
        });
    }

    private setRefreshTokenCookie(res: Response, refreshToken: string): void {
        const isProduction = this.isProduction();
        const jwtConfig = this.configService.get<JwtConfig>('jwt');
        const refreshExpiresIn = jwtConfig?.refreshExpiresIn || '7d';

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: this.parseDurationMs(refreshExpiresIn),
            path: '/auth',
        });
    }

    private isProduction(): boolean {
        const appConfig = this.configService.get<AppConfig>('app');
        return appConfig?.nodeEnv === 'production';
    }

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
}
