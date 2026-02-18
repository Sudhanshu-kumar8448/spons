
import { PrismaClient, Role, TenantStatus, CompanyType, EventStatus, SponsorshipStatus, ProposalStatus, VerificationStatus, EmailStatus, NotificationSeverity } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = 'TestPassword123!';

async function main() {
    console.log('🌱 Starting database seed...');

    const HASHED_PASSWORD_DEFAULT = await bcrypt.hash(TEST_PASSWORD, 10);
    console.log(`\n🔑 TEST PASSWORD (all users): ${TEST_PASSWORD}\n`);

    // ============================================
    // ERASE CURRENT DATA (reverse FK order)
    // ============================================
    console.log('--- ERASING EXISTING DATA ---');
    await prisma.auditLog.deleteMany({});
    await prisma.emailLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.sponsorship.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.organizer.deleteMany({});
    await prisma.tenant.deleteMany({});

    // ============================================
    // PHASE 1 — TENANTS
    // ============================================
    console.log('\n--- PHASE 1: TENANTS ---');

    const tenantsData = [
        { name: 'Tech Corp', slug: 'tech-corp', status: TenantStatus.ACTIVE },
        { name: 'Eco World', slug: 'eco-world', status: TenantStatus.ACTIVE },
        { name: 'Old Ent', slug: 'old-ent', status: TenantStatus.SUSPENDED },
        { name: 'Dead Co', slug: 'dead-co', status: TenantStatus.DEACTIVATED },
    ];

    const tenants = [];
    for (const t of tenantsData) {
        const tenant = await prisma.tenant.create({ data: t });
        tenants.push(tenant);
        console.log(`Created Tenant: ${tenant.slug} (${tenant.status})`);
    }

    const activeTenants = tenants.filter(t => t.status === TenantStatus.ACTIVE);
    const suspendedTenant = tenants.find(t => t.status === TenantStatus.SUSPENDED)!;

    // ============================================
    // PHASE 2 — USERS
    // ============================================
    console.log('\n--- PHASE 2: USERS ---');

    const roles = Object.values(Role);
    const users = [];

    for (const tenant of activeTenants) {
        console.log(`Seeding Users for Tenant: ${tenant.slug}`);

        for (const role of roles) {
            const email = `${role.toLowerCase()}.${tenant.slug}@example.com`;
            const user = await prisma.user.create({
                data: {
                    email,
                    password: HASHED_PASSWORD_DEFAULT,
                    role: role,
                    tenantId: tenant.id,
                    isActive: true,
                },
            });
            users.push(user);
        }

        // Inactive User
        await prisma.user.create({
            data: {
                email: `inactive.${tenant.slug}@example.com`,
                password: HASHED_PASSWORD_DEFAULT,
                role: Role.USER,
                tenantId: tenant.id,
                isActive: false,
            }
        });
    }

    // Test user (easy login for QA)
    const testUser = await prisma.user.create({
        data: {
            email: 'test@example.com',
            password: HASHED_PASSWORD_DEFAULT,
            role: Role.ADMIN,
            tenantId: activeTenants[0].id,
            isActive: true,
        }
    });
    users.push(testUser);
    console.log(`Created test user: test@example.com (password: ${TEST_PASSWORD})`);

    // Refresh Tokens (Edge cases for the first user)
    const firstUser = users[0];
    if (firstUser) {
        // Clean up existing tokens for idempotency
        await prisma.refreshToken.deleteMany({ where: { userId: firstUser.id } });

        // Valid token
        await prisma.refreshToken.create({
            data: {
                userId: firstUser.id,
                tokenHash: 'valid-hash-123',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
            }
        });
        // Revoked token
        await prisma.refreshToken.create({
            data: {
                userId: firstUser.id,
                tokenHash: 'revoked-hash-456',
                isRevoked: true,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }
        });
        // Expired token
        await prisma.refreshToken.create({
            data: {
                userId: firstUser.id,
                tokenHash: 'expired-hash-789',
                expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // -1 day
            }
        });
    }

    // Active refresh token for inactive user
    const inactiveUser = await prisma.user.findFirst({ where: { isActive: false } });
    if (inactiveUser) {
        await prisma.refreshToken.deleteMany({ where: { userId: inactiveUser.id } });
        await prisma.refreshToken.create({
            data: {
                userId: inactiveUser.id,
                tokenHash: 'inactive-user-valid-token',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }
        });
    }


    // ============================================
    // PHASE 3 — COMPANIES
    // ============================================
    console.log('\n--- PHASE 3: COMPANIES ---');

    const companies = [];
    // Use the first active tenant for most company data
    const primeTenant = activeTenants[0];

    const companyScenarios = [
        { name: 'Sponsor Inc', type: CompanyType.SPONSOR, status: VerificationStatus.VERIFIED, active: true },
        { name: 'Organizer Ltd', type: CompanyType.ORGANIZER, status: VerificationStatus.VERIFIED, active: true },
        { name: 'Pending Co', type: CompanyType.SPONSOR, status: VerificationStatus.PENDING, active: true },
        { name: 'Rejected Co', type: CompanyType.SPONSOR, status: VerificationStatus.REJECTED, active: true },
        { name: 'Inactive Co', type: CompanyType.SPONSOR, status: VerificationStatus.VERIFIED, active: false },
        { name: 'No Web/Logo', type: CompanyType.SPONSOR, status: VerificationStatus.VERIFIED, active: true, noMeta: true },
    ];

    for (const s of companyScenarios) {
        const slug = s.name.toLowerCase().replace(/ /g, '-');
        // Using FindFirst logic since slug is unique but might conflict if generated differently, 
        // but here we are consistent. Upsert by slug.
        // However, schema says slug is optional? No, checked schema: `slug String? @unique`
        // If slug is unique, we can upsert by it.

        // Fallback if slug is missing (unlikely here)
        if (!slug) continue;

        const company = await prisma.company.create({
            data: {
                tenantId: primeTenant.id,
                name: s.name,
                type: s.type,
                verificationStatus: s.status,
                isActive: s.active,
                slug: slug,
                website: s.noMeta ? null : `https://${s.name.replace(/ /g, '')}.com`,
                logoUrl: s.noMeta ? null : `https://logo.com/${s.name.replace(/ /g, '')}.png`,
            }
        });
        console.log(`Created Company: ${company.name} (${company.verificationStatus})`);
        companies.push(company);

        // Link a user to this company
        const userToLink = users.find(u => u.tenantId === primeTenant.id && !u.companyId && u.role !== Role.SUPER_ADMIN);
        if (userToLink) {
            await prisma.user.update({
                where: { id: userToLink.id },
                data: { companyId: company.id }
            });
        }
    }

    const sponsorCompany = companies.find(c => c.type === CompanyType.SPONSOR && c.isActive && c.verificationStatus === VerificationStatus.VERIFIED)!;


    // ============================================
    // PHASE 4 — ORGANIZERS
    // ============================================
    console.log('\n--- PHASE 4: ORGANIZERS ---');

    const organizers = [];
    const organizerScenarios = [
        { name: 'Main Organizer', active: true },
        { name: 'Inactive Org', active: false },
        { name: 'Empty Org', active: true }, // No events
    ];

    for (const s of organizerScenarios) {
        // Organizer doesn't have a slug, so we can't easily upsert by a unique field other than ID.
        // We will check by name + tenantId to avoid duplicates manually.
        let org = await prisma.organizer.findFirst({
            where: { tenantId: primeTenant.id, name: s.name }
        });

        if (!org) {
            org = await prisma.organizer.create({
                data: {
                    tenantId: primeTenant.id,
                    name: s.name,
                    isActive: s.active,
                    contactEmail: `contact@${s.name.replace(/ /g, '').toLowerCase()}.com`
                }
            });
        }

        organizers.push(org);
        console.log(`Created Organizer: ${org.name}`);

        // Link a user (likely an ORGANIZER role)
        const userToLink = users.find(u => u.tenantId === primeTenant.id && !u.organizerId && u.role === Role.ORGANIZER);
        if (userToLink) {
            await prisma.user.update({
                where: { id: userToLink.id },
                data: { organizerId: org.id }
            });
        }
    }

    const mainOrganizer = organizers.find(o => o.name === 'Main Organizer')!;
    const inactiveOrganizer = organizers.find(o => o.name === 'Inactive Org')!;


    // ============================================
    // PHASE 5 — EVENTS
    // ============================================
    console.log('\n--- PHASE 5: EVENTS ---');

    const events = [];
    const eventScenarios = [
        { title: 'Tech Conf 2025', status: EventStatus.PUBLISHED, verif: VerificationStatus.VERIFIED, footfall: 5000 },
        { title: 'Draft Event', status: EventStatus.DRAFT, verif: VerificationStatus.PENDING, footfall: 0 },
        { title: 'Mega Fest', status: EventStatus.PUBLISHED, verif: VerificationStatus.VERIFIED, footfall: 1000000 },
        { title: 'Small Meetup', status: EventStatus.COMPLETED, verif: VerificationStatus.VERIFIED, footfall: 100 },
        { title: 'Cancelled Event', status: EventStatus.CANCELLED, verif: VerificationStatus.VERIFIED, footfall: 500 },
        { title: 'Rejected Event', status: EventStatus.DRAFT, verif: VerificationStatus.REJECTED, footfall: 50 },
        { title: 'Inactive Org Event', status: EventStatus.PUBLISHED, verif: VerificationStatus.VERIFIED, footfall: 200, org: inactiveOrganizer },
    ];

    for (const s of eventScenarios) {
        // Similarly, Event has no slug. Check by title + organizer.
        const organizerId = s.org ? s.org.id : mainOrganizer.id;
        let event = await prisma.event.findFirst({
            where: { tenantId: primeTenant.id, organizerId, title: s.title }
        });

        if (!event) {
            event = await prisma.event.create({
                data: {
                    tenantId: primeTenant.id,
                    organizerId: organizerId,
                    title: s.title,
                    status: s.status,
                    verificationStatus: s.verif,
                    expectedFootfall: s.footfall,
                    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
                    endDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
                }
            });
        }
        events.push(event);
        console.log(`Created Event: ${event.title} (Footfall: ${event.expectedFootfall})`);
    }

    const mainEvent = events.find(e => e.title === 'Tech Conf 2025')!;
    const inactiveOrgEvent = events.find(e => e.title === 'Inactive Org Event')!;

    // Event under suspended tenant
    // Create suspended organizer first
    let suspendedOrganizer = await prisma.organizer.findFirst({
        where: { tenantId: suspendedTenant.id, name: 'Suspended Org' }
    });

    if (!suspendedOrganizer) {
        suspendedOrganizer = await prisma.organizer.create({
            data: {
                tenantId: suspendedTenant.id,
                name: 'Suspended Org',
            }
        });
    }

    const suspendedEventTitle = 'Suspended Tenant Event';
    let suspendedEvent = await prisma.event.findFirst({
        where: { tenantId: suspendedTenant.id, organizerId: suspendedOrganizer.id, title: suspendedEventTitle }
    });

    if (!suspendedEvent) {
        await prisma.event.create({
            data: {
                tenantId: suspendedTenant.id,
                organizerId: suspendedOrganizer.id,
                title: suspendedEventTitle,
                status: EventStatus.PUBLISHED,
                verificationStatus: VerificationStatus.VERIFIED,
                startDate: new Date(),
                endDate: new Date(),
            }
        });
    }


    // ============================================
    // PHASE 6 — SPONSORSHIPS
    // ============================================
    console.log('\n--- PHASE 6: SPONSORSHIPS ---');

    const sponsorships = [];

    // 1. Valid Active Sponsorship
    const sp1 = await prisma.sponsorship.upsert({
        where: {
            companyId_eventId: {
                companyId: sponsorCompany.id,
                eventId: mainEvent.id
            }
        },
        update: {},
        create: {
            tenantId: primeTenant.id,
            companyId: sponsorCompany.id,
            eventId: mainEvent.id,
            status: SponsorshipStatus.ACTIVE,
            tier: 'Gold',
        }
    });
    sponsorships.push(sp1);

    // 2. Pending Sponsorship
    const sp2 = await prisma.sponsorship.upsert({
        where: {
            companyId_eventId: {
                companyId: companies[3].id, // Rejected Co
                eventId: events[1].id // Draft Event
            }
        },
        update: {},
        create: {
            tenantId: primeTenant.id,
            companyId: companies[3].id,
            eventId: events[1].id,
            status: SponsorshipStatus.PENDING,
        }
    });
    sponsorships.push(sp2);

    // 3. Completed Sponsorship
    await prisma.sponsorship.upsert({
        where: {
            companyId_eventId: {
                companyId: sponsorCompany.id,
                eventId: events[3].id // Small Meetup
            }
        },
        update: {},
        create: {
            tenantId: primeTenant.id,
            companyId: sponsorCompany.id,
            eventId: events[3].id,
            status: SponsorshipStatus.COMPLETED,
        }
    });


    // ============================================
    // PHASE 7 — PROPOSALS
    // ============================================
    console.log('\n--- PHASE 7: PROPOSALS ---');

    // Check if proposals exist for sp1, if not create
    const sp1Proposals = await prisma.proposal.findMany({ where: { sponsorshipId: sp1.id } });
    if (sp1Proposals.length === 0) {
        // Proposal for sp1
        await prisma.proposal.create({
            data: {
                tenantId: primeTenant.id,
                sponsorshipId: sp1.id,
                status: ProposalStatus.APPROVED,
                proposedAmount: 5000.00,
                proposedTier: 'Gold',
                submittedAt: new Date(),
                reviewedAt: new Date(),
            }
        });
        // Rejected Proposal
        await prisma.proposal.create({
            data: {
                tenantId: primeTenant.id,
                sponsorshipId: sp1.id,
                status: ProposalStatus.REJECTED,
                notes: 'Budget too low',
                reviewedAt: new Date(),
            }
        });
    }

    // Check for sp2 proposals
    const sp2Proposals = await prisma.proposal.findMany({ where: { sponsorshipId: sp2.id } });
    if (sp2Proposals.length === 0) {
        // Proposal for sp2 (Draft)
        await prisma.proposal.create({
            data: {
                tenantId: primeTenant.id,
                sponsorshipId: sp2.id,
                status: ProposalStatus.DRAFT,
                proposedAmount: 1000.50, // Decimal test
            }
        });
    }


    // ============================================
    // PHASE 8 — EMAIL LOGS
    // ============================================
    console.log('\n--- PHASE 8: EMAIL LOGS ---');

    // Clean up logs to avoid infinite growth on seed re-runs
    await prisma.emailLog.deleteMany({ where: { tenantId: primeTenant.id } });

    await prisma.emailLog.createMany({
        data: [
            { tenantId: primeTenant.id, recipient: 'test@example.com', subject: 'Welcome', jobName: 'welcome-email', status: EmailStatus.SENT },
            { tenantId: primeTenant.id, recipient: 'fail@example.com', subject: 'Invoice', jobName: 'invoice-email', status: EmailStatus.FAILED, errorMessage: 'SMTP Error' },
            // Stress test 200 logs
            ...Array.from({ length: 200 }).map((_, i) => ({
                tenantId: primeTenant.id,
                recipient: `user${i}@stress.com`,
                subject: `Stress Test ${i}`,
                jobName: 'stress-test',
                status: i % 10 === 0 ? EmailStatus.FAILED : EmailStatus.SENT // 10% fail rate
            }))
        ]
    });


    // ============================================
    // PHASE 9 — NOTIFICATIONS
    // ============================================
    console.log('\n--- PHASE 9: NOTIFICATIONS ---');

    const userForNotif = users[0];
    // Clean up notifications
    await prisma.notification.deleteMany({ where: { userId: userForNotif.id } });

    await prisma.notification.createMany({
        data: [
            { tenantId: primeTenant.id, userId: userForNotif.id, title: 'Info', message: 'Just info', severity: NotificationSeverity.INFO, read: false },
            { tenantId: primeTenant.id, userId: userForNotif.id, title: 'Success', message: 'Great job', severity: NotificationSeverity.SUCCESS, read: true },
            { tenantId: primeTenant.id, userId: userForNotif.id, title: 'Warning', message: 'Watch out', severity: NotificationSeverity.WARNING, read: false },
            { tenantId: primeTenant.id, userId: userForNotif.id, title: 'Error', message: 'Failed', severity: NotificationSeverity.ERROR, read: false },
            // Stress test 150 notifications
            ...Array.from({ length: 150 }).map((_, i) => ({
                tenantId: primeTenant.id,
                userId: userForNotif.id,
                title: `Notif ${i}`,
                message: 'Stress test notification',
                severity: NotificationSeverity.INFO,
                read: Math.random() > 0.5
            }))
        ]
    });


    // ============================================
    // PHASE 10 — AUDIT LOGS
    // ============================================
    console.log('\n--- PHASE 10: AUDIT LOGS ---');

    // Clean up audit logs
    await prisma.auditLog.deleteMany({ where: { tenantId: primeTenant.id } });

    await prisma.auditLog.create({
        data: {
            tenantId: primeTenant.id,
            actorId: userForNotif.id,
            actorRole: Role.ADMIN,
            action: 'event.created',
            entityType: 'Event',
            entityId: mainEvent.id,
            metadata: { title: mainEvent.title, footfall: mainEvent.expectedFootfall }
        }
    });


    // ============================================
    // PHASE 11 — SECURITY EDGE CASES
    // ============================================
    console.log('\n--- PHASE 11: SECURITY EDGE CASES ---');

    // Inactive company with active sponsorship - handled in scenarios above partially, ensuring logic holds
    const inactiveCo = companies.find(c => !c.isActive)!;

    // Edge case: Create sponsorship for inactive company
    // use upsert
    await prisma.sponsorship.upsert({
        where: {
            companyId_eventId: {
                companyId: inactiveCo.id,
                eventId: mainEvent.id
            }
        },
        update: {},
        create: {
            tenantId: primeTenant.id,
            companyId: inactiveCo.id,
            eventId: mainEvent.id,
            status: SponsorshipStatus.ACTIVE, // DB allows this, app logic should probably prevent or flag
            notes: 'Security Edge Case: Active sponsorship for inactive company'
        }
    });

    console.log('\n--- SEED SUMMARY ---');
    console.log(`Tenants: ${await prisma.tenant.count()}`);
    console.log(`Users: ${await prisma.user.count()}`);
    console.log(`Companies: ${await prisma.company.count()}`);
    console.log(`Organizers: ${await prisma.organizer.count()}`);
    console.log(`Events: ${await prisma.event.count()}`);
    console.log(`Sponsorships: ${await prisma.sponsorship.count()}`);
    console.log(`Proposals: ${await prisma.proposal.count()}`);
    console.log(`EmailLogs: ${await prisma.emailLog.count()}`);
    console.log(`Notifications: ${await prisma.notification.count()}`);
    console.log(`AuditLogs: ${await prisma.auditLog.count()}`);
    console.log(`\n🔑 TEST LOGIN: test@example.com / ${TEST_PASSWORD}`);
    console.log('\n✅ Seeding Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
