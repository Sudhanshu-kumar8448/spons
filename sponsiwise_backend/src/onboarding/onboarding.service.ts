import {
    Injectable,
    ConflictException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Role, CompanyType, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';
import { CreateSponsorDto, CreateOrganizerDto } from './dto';
import type { JwtPayloadWithClaims } from '../auth/interfaces';

import { AuthService } from '../auth/auth.service';

/**
 * OnboardingService — handles new user onboarding flows.
 *
 * Sponsor flow:
 *   1. Validate user has USER role, no existing company
 *   2. Create Company (type SPONSOR, status PENDING)
 *   3. Link user → company
 *   4. Create AuditLog + Notification for managers
 *   5. Keep role as USER until manager approves
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
        // 1. Validate user is eligible
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

        if (dbUser.companyId) {
            throw new ConflictException('You already have a company registration. Check your pending status.');
        }

        if (dbUser.organizerId) {
            throw new ConflictException('You are already registered as an organizer.');
        }

        // 2. Generate unique slug from company name
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

        // 3. Create company + link user in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
                data: {
                    tenantId: user.tenant_id,
                    name: dto.name,
                    slug,
                    type: CompanyType.SPONSOR,
                    website: dto.website || null,
                    description: dto.description || null,
                    logoUrl: dto.logoUrl || null,
                    verificationStatus: VerificationStatus.PENDING,
                },
            });

            // Link user to company (keep role as USER until approved)
            await tx.user.update({
                where: { id: user.sub },
                data: { companyId: company.id },
            });

            // Create audit log
            await tx.auditLog.create({
                data: {
                    tenantId: user.tenant_id,
                    actorId: user.sub,
                    actorRole: user.role,
                    action: 'company.created',
                    entityType: 'Company',
                    entityId: company.id,
                    metadata: {
                        companyName: dto.name,
                        slug,
                        source: 'onboarding',
                    },
                },
            });

            // Notify all managers in the tenant
            const managers = await tx.user.findMany({
                where: { tenantId: user.tenant_id, role: Role.MANAGER },
                select: { id: true },
            });

            if (managers.length > 0) {
                await tx.notification.createMany({
                    data: managers.map((m) => ({
                        tenantId: user.tenant_id,
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

            return company;
        });

        this.logger.log(
            `Sponsor company "${result.name}" (${result.id}) created by user ${user.sub} in tenant ${user.tenant_id}`,
        );

        return {
            message: 'Sponsor registration submitted successfully. Awaiting manager approval.',
            company: {
                id: result.id,
                name: result.name,
                slug: result.slug,
                verificationStatus: result.verificationStatus,
            },
        };
    }

    // ─── ORGANIZER ONBOARDING ────────────────────────────────

    async registerOrganizer(dto: CreateOrganizerDto, user: JwtPayloadWithClaims) {
        // 1. Validate user is eligible
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

        // 2. Check for duplicate contactEmail
        if (dto.contactEmail) {
            const existing = await this.prisma.organizer.findFirst({
                where: { contactEmail: dto.contactEmail, tenantId: user.tenant_id },
            });
            if (existing) {
                throw new ConflictException('An organizer with this contact email already exists.');
            }
        }

        // 3. Create organizer + upgrade role in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const organizer = await tx.organizer.create({
                data: {
                    tenantId: user.tenant_id,
                    name: dto.name,
                    description: dto.description || null,
                    contactEmail: dto.contactEmail,
                    contactPhone: dto.contactPhone || null,
                    website: dto.website || null,
                    logoUrl: dto.logoUrl || null,
                },
            });

            // Link user to organizer AND upgrade role to ORGANIZER
            const updatedUser = await tx.user.update({
                where: { id: user.sub },
                data: {
                    organizerId: organizer.id,
                    role: Role.ORGANIZER,
                },
            });

            // Create audit log
            await tx.auditLog.create({
                data: {
                    tenantId: user.tenant_id,
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
            `Organizer "${result.organizer.name}" (${result.organizer.id}) created by user ${user.sub} in tenant ${user.tenant_id}. Role upgraded to ORGANIZER.`,
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
