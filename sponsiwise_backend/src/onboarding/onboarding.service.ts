import {
    Injectable,
    ConflictException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Role, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';
import { CreateSponsorDto, CreateOrganizerDto } from './dto';
import type { JwtPayloadWithClaims } from '../auth/interfaces';

import { AuthService } from '../auth/auth.service';

/**
 * Free / personal email provider domains.
 * Users with these email domains must go through manager verification.
 * Users with corporate / company domains (anything NOT in this list)
 * are auto-verified on registration.
 */
const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com',
    'yahoo.com',
    'yahoo.co.in',
    'yahoo.in',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'aol.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'mail.com',
    'protonmail.com',
    'proton.me',
    'zoho.com',
    'zohomail.in',
    'yandex.com',
    'gmx.com',
    'gmx.net',
    'rediffmail.com',
    'fastmail.com',
    'tutanota.com',
    'skype.com',
    'msn.com',
    'inbox.com',
    'mail.ru',
    'cock.li',
    'guerrillamail.com',
    'tempmail.com',
    'throwaway.email',
]);

/**
 * Returns true if the email belongs to a free / personal provider.
 * Corporate emails (e.g. @nike.com) return false.
 */
function isFreeEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return !domain || FREE_EMAIL_DOMAINS.has(domain);
}

/**
 * OnboardingService — handles new user onboarding flows.
 *
 * Sponsor flow:
 *   1. Validate user has USER role, no existing company
 *   2. Create Company
 *   3. Link user → company
 *   4. If corporate email → auto-verify (VERIFIED) + upgrade to SPONSOR + return tokens
 *      If free email → keep PENDING + notify managers → wait for manager approval
 *   5. Create AuditLog + (optionally) Notification for managers
 *
 * Organizer flow:
 *   1. Validate user has USER role, no existing organizer
 *   2. Create Organizer record
 *   3. Link user → organizer, upgrade role to ORGANIZER
 *   4. Create AuditLog
 *   5. Immediate access (no manager approval)
 */
@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly authService: AuthService,
    ) { }

    // ─── SPONSOR ONBOARDING ──────────────────────────────────

    async registerSponsor(dto: CreateSponsorDto, user: JwtPayloadWithClaims) {
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.sub },
            select: { id: true, email: true, role: true, companyId: true, organizerId: true },
        });

        if (!dbUser) {
            throw new ForbiddenException('User not found');
        }

        if (dbUser.role !== Role.USER) {
            throw new ConflictException('You already have a role assigned. Only new users can onboard.');
        }

        if (dbUser.companyId) {
            throw new ConflictException('You already have a company registration. Check your pending status.');
        }

        if (dbUser.organizerId) {
            throw new ConflictException('You are already registered as an organizer.');
        }

        // Generate unique slug from company name
        const baseSlug = dto.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        let slug = baseSlug;
        let counter = 0;
        while (await this.prisma.company.findUnique({ where: { slug } })) {
            counter++;
            slug = `${baseSlug}-${counter}`;
        }

        // Determine if the user has a corporate email → auto-verify
        const corporateEmail = !isFreeEmail(dbUser.email);
        const initialStatus = corporateEmail
            ? VerificationStatus.VERIFIED
            : VerificationStatus.PENDING;

        // Create company + link user in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
                data: {
                    name: dto.name,
                    slug,
                    type: dto.type,
                    website: dto.website || null,
                    strategicIntent: dto.strategicIntent || null,
                    verificationStatus: initialStatus,
                    // If auto-verified, stamp approval metadata
                    ...(corporateEmail && {
                        approvedAt: new Date(),
                    }),
                },
            });

            // If corporate email → upgrade role to SPONSOR immediately
            const updatedUser = await tx.user.update({
                where: { id: user.sub },
                data: {
                    companyId: company.id,
                    ...(corporateEmail && { role: Role.SPONSOR }),
                },
            });

            await tx.auditLog.create({
                data: {
                    actorId: user.sub,
                    actorRole: user.role,
                    action: 'company.created',
                    entityType: 'Company',
                    entityId: company.id,
                    metadata: {
                        companyName: dto.name,
                        slug,
                        source: 'onboarding',
                        autoVerified: corporateEmail,
                        emailDomain: dbUser.email.split('@')[1],
                    },
                },
            });

            // Notify managers only for free-email registrations (needs review)
            if (!corporateEmail) {
                const managers = await tx.user.findMany({
                    where: { role: Role.MANAGER },
                    select: { id: true },
                });

                if (managers.length > 0) {
                    await tx.notification.createMany({
                        data: managers.map((m) => ({
                            userId: m.id,
                            title: 'New Sponsor Registration',
                            message: `A new sponsor company "${dto.name}" has been registered and is awaiting verification.`,
                            severity: 'INFO' as const,
                            link: `/dashboard/companies`,
                            entityType: 'Company',
                            entityId: company.id,
                        })),
                    });
                }
            }

            return { company, updatedUser };
        });

        this.logger.log(
            `Sponsor company "${result.company.name}" (${result.company.id}) created by user ${user.sub}` +
            (corporateEmail ? ' — auto-verified (corporate email)' : ' — pending manager review'),
        );

        // If auto-verified, generate new tokens with SPONSOR role so frontend picks it up
        if (corporateEmail) {
            const tokens = await this.authService.generateTokens(result.updatedUser);
            return {
                message: 'Your corporate email has been verified automatically. Welcome aboard!',
                autoVerified: true,
                company: {
                    id: result.company.id,
                    name: result.company.name,
                    slug: result.company.slug,
                    verificationStatus: result.company.verificationStatus,
                },
                tokens,
            };
        }

        return {
            message: 'Sponsor registration submitted successfully. Awaiting manager approval.',
            autoVerified: false,
            company: {
                id: result.company.id,
                name: result.company.name,
                slug: result.company.slug,
                verificationStatus: result.company.verificationStatus,
            },
        };
    }

    // ─── ORGANIZER ONBOARDING ────────────────────────────────

    async registerOrganizer(dto: CreateOrganizerDto, user: JwtPayloadWithClaims) {
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.sub },
            select: { role: true, companyId: true, organizerId: true },
        });

        if (!dbUser) {
            throw new ForbiddenException('User not found');
        }

        if (dbUser.role !== Role.USER) {
            throw new ConflictException('You already have a role assigned. Only new users can onboard.');
        }

        if (dbUser.organizerId) {
            throw new ConflictException('You are already registered as an organizer.');
        }

        if (dbUser.companyId) {
            throw new ConflictException('You already have a company registration.');
        }

        // Check for duplicate organizer name
        const existingOrg = await this.prisma.organizer.findFirst({
            where: { name: dto.name },
        });
        if (existingOrg) {
            throw new ConflictException('An organizer with this name already exists.');
        }

        // Create organizer + upgrade role in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const organizer = await tx.organizer.create({
                data: {
                    name: dto.name,
                    type: dto.type,
                    contactPhone: dto.contactPhone,
                    website: dto.website ?? null,
                    pastRecords: dto.pastRecords,
                    socialLinks: dto.socialLinks,
                    taxId: dto.taxId ?? null,
                },
            });

            const updatedUser = await tx.user.update({
                where: { id: user.sub },
                data: {
                    organizerId: organizer.id,
                    role: Role.ORGANIZER,
                },
            });

            await tx.auditLog.create({
                data: {
                    actorId: user.sub,
                    actorRole: user.role,
                    action: 'organizer.created',
                    entityType: 'Organizer',
                    entityId: organizer.id,
                    metadata: {
                        organizerName: dto.name,
                        source: 'onboarding',
                    },
                },
            });

            return { organizer, updatedUser };
        });

        this.logger.log(
            `Organizer "${result.organizer.name}" (${result.organizer.id}) created by user ${user.sub}. Role upgraded to ORGANIZER.`,
        );

        // Generate new tokens with updated role
        const { accessToken, refreshToken } = await this.authService.generateTokens(result.updatedUser);

        return {
            message: 'Organizer registration successful. You now have organizer access.',
            organizer: {
                id: result.organizer.id,
                name: result.organizer.name,
            },
            tokens: { accessToken, refreshToken },
        };
    }
}
