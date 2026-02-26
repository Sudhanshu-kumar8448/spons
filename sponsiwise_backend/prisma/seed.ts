import { PrismaClient, Role, TenantStatus, CompanyType, EventStatus, SponsorshipStatus, ProposalStatus, VerificationStatus, EmailStatus, NotificationSeverity } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:newpassword123@localhost:5432/postgres';
const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Constants
const GLOBAL_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const SALT_ROUNDS = 12;
const PASSWORD = 'password123';

async function hashToken(token: string): Promise<string> {
  return createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Helper to generate future/past dates
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function seed() {
  console.log('🌱 Starting seed...');

  // ========================================
  // 0. SEED TENANTS (from tenants.csv)
  // ========================================
  console.log('🏢 Seeding tenants...');
  
  // Seed the global tenant from tenants.csv
  const globalTenant = await prisma.tenant.upsert({
    where: { id: GLOBAL_TENANT_ID },
    update: {},
    create: {
      id: GLOBAL_TENANT_ID,
      name: 'Global',
      slug: 'global',
      status: TenantStatus.ACTIVE,
    },
  });
  console.log('  ✅ Created/verified global tenant:', globalTenant.name);

  // Clean existing data (except Tenant - already seeded above)
  console.log('🧹 Cleaning existing data...');
  await prisma.notification.deleteMany({});
  await prisma.emailLog.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.sponsorship.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.organizer.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Cleaned all tables');

  // ========================================
  // 1. SEED USERS (19 users)
  // ========================================
  console.log('👥 Seeding users...');

  const hashedPassword = await hashPassword(PASSWORD);

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      tenantId: GLOBAL_TENANT_ID,
      email: 'admin@spons.com',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log('  ✅ Created admin:', admin.email);

  // Create 5 Users
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        email: `user${i}@spons.com`,
        password: hashedPassword,
        role: Role.USER,
        isActive: true,
      },
    });
    users.push(user);
  }
  console.log('  ✅ Created 5 users');

  // Create 3 Managers
  const managers = [];
  for (let i = 1; i <= 3; i++) {
    const manager = await prisma.user.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        email: `manager${i}@spons.com`,
        password: hashedPassword,
        role: Role.MANAGER,
        isActive: true,
      },
    });
    managers.push(manager);
  }
  console.log('  ✅ Created 3 managers');

  // Create 5 Organizers (with organizerId links)
  const organizers = [];
  for (let i = 1; i <= 5; i++) {
    const organizer = await prisma.user.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        email: `organizer${i}@spons.com`,
        password: hashedPassword,
        role: Role.ORGANIZER,
        isActive: true,
      },
    });
    organizers.push(organizer);
  }
  console.log('  ✅ Created 5 organizer users');

  // Create 5 Sponsors (with companyId links later)
  const sponsors = [];
  for (let i = 1; i <= 5; i++) {
    const sponsor = await prisma.user.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        email: `sponsor${i}@spons.com`,
        password: hashedPassword,
        role: Role.SPONSOR,
        isActive: true,
      },
    });
    sponsors.push(sponsor);
  }
  console.log('  ✅ Created 5 sponsor users');

  // ========================================
  // 2. SEED COMPANIES (10 companies)
  // ========================================
  console.log('🏢 Seeding companies...');

  // 5 Sponsor Companies
  const sponsorCompanies = [];
  for (let i = 1; i <= 5; i++) {
    const company = await prisma.company.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        name: `Sponsor Company ${i}`,
        slug: `sponsor-company-${i}`,
        type: CompanyType.SPONSOR,
        website: `https://sponsor${i}.example.com`,
        description: `Leading sponsor company ${i} in the industry`,
        verificationStatus: i <= 3 ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
        isActive: true,
      },
    });
    sponsorCompanies.push(company);
  }
  console.log('  ✅ Created 5 sponsor companies');

  // Link sponsor users to sponsor companies
  for (let i = 0; i < sponsors.length; i++) {
    await prisma.user.update({
      where: { id: sponsors[i].id },
      data: { companyId: sponsorCompanies[i].id },
    });
  }
  console.log('  ✅ Linked sponsor users to companies');

  // 5 Organizer Companies
  const organizerCompanies = [];
  for (let i = 1; i <= 5; i++) {
    const company = await prisma.company.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        name: `Organizer Company ${i}`,
        slug: `organizer-company-${i}`,
        type: CompanyType.ORGANIZER,
        website: `https://organizer${i}.example.com`,
        description: `Event organizer company ${i}`,
        verificationStatus: VerificationStatus.VERIFIED,
        isActive: true,
      },
    });
    organizerCompanies.push(company);
  }
  console.log('  ✅ Created 5 organizer companies');

  // ========================================
  // 3. SEED ORGANIZERS (5 organizers)
  // ========================================
  console.log('🎪 Seeding organizers...');

  const organizerEntities = [];
  for (let i = 1; i <= 5; i++) {
    const organizer = await prisma.organizer.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        name: `Organizer ${i}`,
        description: `Professional event organizer ${i} managing conferences and events`,
        contactEmail: `organizer${i}@spons.com`,
        contactPhone: `+1234567${String(i).padStart(3, '0')}`,
        website: `https://organizer${i}.example.com`,
        isActive: true,
      },
    });
    organizerEntities.push(organizer);
  }
  console.log('  ✅ Created 5 organizers');

  // Link organizer users to organizers
  for (let i = 0; i < organizers.length; i++) {
    await prisma.user.update({
      where: { id: organizers[i].id },
      data: { organizerId: organizerEntities[i].id },
    });
  }
  console.log('  ✅ Linked organizer users to organizers');

  // ========================================
  // 4. SEED EVENTS (15 events - 3 per organizer)
  // ========================================
  console.log('📅 Seeding events...');

  const events = [];
  const baseDate = new Date();

  for (let i = 0; i < organizerEntities.length; i++) {
    const organizer = organizerEntities[i];

    // Event 1: PUBLISHED (Confirmed)
    const event1 = await prisma.event.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        organizerId: organizer.id,
        title: `${organizer.name} Annual Conference 2024`,
        description: `The premier annual conference organized by ${organizer.name}`,
        expectedFootfall: 5000 + (i * 1000),
        startDate: addDays(baseDate, 30 + i * 10),
        endDate: addDays(baseDate, 32 + i * 10),
        status: EventStatus.PUBLISHED,
        website: `https://event${i + 1}.example.com`,
        verificationStatus: VerificationStatus.VERIFIED,
        isActive: true,
      },
    });
    events.push(event1);

    // Create address for event 1
    await prisma.address.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        eventId: event1.id,
        addressLine1: `Convention Center, City ${i + 1}`,
        city: `City ${i + 1}`,
        state: `State ${i + 1}`,
        country: 'USA',
        postalCode: `${10000 + i}`,
      },
    });

    // Event 2: PENDING
    const event2 = await prisma.event.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        organizerId: organizer.id,
        title: `${organizer.name} Tech Summit 2024`,
        description: `Upcoming tech summit by ${organizer.name}`,
        expectedFootfall: 3000 + (i * 500),
        startDate: addDays(baseDate, 60 + i * 15),
        endDate: addDays(baseDate, 62 + i * 15),
        status: EventStatus.PUBLISHED,
        website: `https://event${i + 6}.example.com`,
        verificationStatus: VerificationStatus.PENDING,
        isActive: true,
      },
    });
    events.push(event2);

    // Create address for event 2
    await prisma.address.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        eventId: event2.id,
        addressLine1: `Tech Park, City ${i + 1}`,
        city: `City ${i + 1}`,
        state: `State ${i + 1}`,
        country: 'USA',
        postalCode: `${20000 + i}`,
      },
    });

    // Event 3: DRAFT
    const event3 = await prisma.event.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        organizerId: organizer.id,
        title: `${organizer.name} Workshop Series 2025`,
        description: `Planning phase workshop series by ${organizer.name}`,
        expectedFootfall: 1000,
        startDate: addDays(baseDate, 120 + i * 20),
        endDate: addDays(baseDate, 121 + i * 20),
        status: EventStatus.DRAFT,
        verificationStatus: VerificationStatus.PENDING,
        isActive: true,
      },
    });
    events.push(event3);

    // Create address for event 3
    await prisma.address.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        eventId: event3.id,
        addressLine1: 'TBD',
        city: `City ${i + 1}`,
        state: `State ${i + 1}`,
        country: 'USA',
        postalCode: `${30000 + i}`,
      },
    });
  }
  console.log('  ✅ Created 15 events (3 per organizer)');

  // ========================================
  // 5. SEED SPONSORSHIPS (18 sponsorships)
  // ========================================
  console.log('🤝 Seeding sponsorships...');

  const sponsorships = [];
  const sponsorshipStatuses = [
    SponsorshipStatus.ACTIVE,
    SponsorshipStatus.PENDING,
    SponsorshipStatus.PENDING,
    SponsorshipStatus.ACTIVE,
    SponsorshipStatus.COMPLETED,
    SponsorshipStatus.PAUSED,
  ];
  const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Platinum', 'Gold'];

  // Create sponsorships connecting sponsors to events
  let sponsorshipIndex = 0;
  for (let i = 0; i < events.length; i++) {
    // Create 1-2 sponsorships per event
    const numSponsorships = i % 3 === 0 ? 2 : 1;
    
    for (let j = 0; j < numSponsorships && sponsorshipIndex < 18; j++) {
      const sponsorCompany = sponsorCompanies[sponsorshipIndex % sponsorCompanies.length];
      
      const sponsorship = await prisma.sponsorship.create({
        data: {
          tenantId: GLOBAL_TENANT_ID,
          companyId: sponsorCompany.id,
          eventId: events[i].id,
          status: sponsorshipStatuses[sponsorshipIndex % sponsorshipStatuses.length],
          tier: tiers[sponsorshipIndex % tiers.length],
          notes: `${tiers[sponsorshipIndex % tiers.length]} sponsorship for ${events[i].title}`,
          isActive: true,
        },
      });
      sponsorships.push(sponsorship);
      sponsorshipIndex++;
    }
  }
  console.log('  ✅ Created', sponsorships.length, 'sponsorships');

  // ========================================
  // 6. SEED PROPOSALS (18 proposals - covering all statuses)
  // ========================================
  console.log('📄 Seeding proposals...');

  const proposalStatuses = [
    ProposalStatus.DRAFT,
    ProposalStatus.SUBMITTED,
    ProposalStatus.UNDER_MANAGER_REVIEW,
    ProposalStatus.APPROVED,
    ProposalStatus.REJECTED,
    ProposalStatus.WITHDRAWN,
  ];

  const amounts = [10000, 15000, 20000, 25000, 30000, 5000, 7500, 8000, 12000, 18000];
  const proposalTiers = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Platinum', 'Gold', 'Silver'];

  for (let i = 0; i < sponsorships.length; i++) {
    const sponsorship = sponsorships[i];
    const status = proposalStatuses[i % proposalStatuses.length];
    const submittedAt = status !== ProposalStatus.DRAFT ? addDays(new Date(), -Math.floor(Math.random() * 30)) : null;
    let reviewedAt: Date | null = null;
    if (status === ProposalStatus.APPROVED || status === ProposalStatus.REJECTED) {
      reviewedAt = addDays(new Date(), -Math.floor(Math.random() * 10));
    }

    await prisma.proposal.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        sponsorshipId: sponsorship.id,
        status: status,
        proposedTier: proposalTiers[i % proposalTiers.length],
        proposedAmount: amounts[i % amounts.length],
        message: `We are excited to propose a ${proposalTiers[i % proposalTiers.length]} sponsorship for your event.`,
        notes: status === ProposalStatus.REJECTED ? 'Proposal did not meet requirements' : null,
        submittedAt: submittedAt,
        reviewedAt: reviewedAt,
        isActive: true,
      },
    });
  }
  console.log('  ✅ Created', sponsorships.length, 'proposals (covering all statuses)');

  // ========================================
  // 7. SEED REFRESH TOKENS (Edge cases for all 19 users)
  // ========================================
  console.log('🔐 Seeding refresh tokens with edge cases...');

  const allUsers = [admin, ...users, ...managers, ...organizers, ...sponsors];
  let tokenIndex = 0;

  for (const user of allUsers) {
    // Token 1: Active token (valid)
    const activeToken = `active-token-${user.id}-${tokenIndex++}`;
    const activeTokenHash = await hashToken(activeToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: activeTokenHash,
        deviceInfo: 'Active Session',
        isRevoked: false,
        expiresAt: addDays(new Date(), 7),
      },
    });

    // Token 2: Revoked token (for testing revocation)
    const revokedToken = `revoked-token-${user.id}-${tokenIndex++}`;
    const revokedTokenHash = await hashToken(revokedToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: revokedTokenHash,
        deviceInfo: 'Revoked Session',
        isRevoked: true,
        expiresAt: addDays(new Date(), 7),
      },
    });

    // Token 3: Expired token (for testing expiration)
    const expiredToken = `expired-token-${user.id}-${tokenIndex++}`;
    const expiredTokenHash = await hashToken(expiredToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: expiredTokenHash,
        deviceInfo: 'Expired Session',
        isRevoked: false,
        expiresAt: addDays(new Date(), -5), // Expired 5 days ago
      },
    });

    // Token 4: Rotated token (for testing rotation)
    const rotatedToken = `rotated-token-${user.id}-${tokenIndex++}`;
    const rotatedTokenHash = await hashToken(rotatedToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: rotatedTokenHash,
        deviceInfo: 'Rotated Session',
        isRevoked: true,
        expiresAt: addDays(new Date(), -1),
        rotatedAt: addDays(new Date(), -2),
      },
    });
  }
  console.log('  ✅ Created', allUsers.length * 4, 'refresh tokens (4 per user: active, revoked, expired, rotated)');

  // ========================================
  // 8. SEED NOTIFICATIONS (20 - covering all cases)
  // ========================================
  console.log('🔔 Seeding notifications...');

  const notificationSeverities = [
    NotificationSeverity.INFO,
    NotificationSeverity.SUCCESS,
    NotificationSeverity.WARNING,
    NotificationSeverity.ERROR,
  ];

  const notificationTypes = [
    { title: 'Proposal Accepted', message: 'Your proposal for {event} has been accepted!', severity: NotificationSeverity.SUCCESS, role: 'SPONSOR' },
    { title: 'Proposal Rejected', message: 'Your proposal for {event} was not selected.', severity: NotificationSeverity.WARNING, role: 'SPONSOR' },
    { title: 'New Proposal Received', message: 'You have received a new proposal for {event}.', severity: NotificationSeverity.INFO, role: 'ORGANIZER' },
    { title: 'Event Confirmed', message: 'Your event {event} has been confirmed.', severity: NotificationSeverity.SUCCESS, role: 'ORGANIZER' },
    { title: 'Event Published', message: 'Your event {event} is now live!', severity: NotificationSeverity.SUCCESS, role: 'ORGANIZER' },
    { title: 'Sponsorship Confirmed', message: 'Sponsorship for {event} has been confirmed.', severity: NotificationSeverity.SUCCESS, role: 'ORGANIZER' },
    { title: 'Sponsorship Cancelled', message: 'Sponsorship for {event} has been cancelled.', severity: NotificationSeverity.WARNING, role: 'ORGANIZER' },
    { title: 'New Event Created', message: 'A new event {event} has been created.', severity: NotificationSeverity.INFO, role: 'ADMIN' },
    { title: 'User Registered', message: 'New user {user} has registered.', severity: NotificationSeverity.INFO, role: 'ADMIN' },
    { title: 'Company Verified', message: 'Company {company} has been verified.', severity: NotificationSeverity.SUCCESS, role: 'ADMIN' },
    { title: 'Payment Received', message: 'Payment of {amount} received for {event}.', severity: NotificationSeverity.SUCCESS, role: 'ORGANIZER' },
    { title: 'Payment Failed', message: 'Payment for {event} failed.', severity: NotificationSeverity.ERROR, role: 'ORGANIZER' },
    { title: 'Review Request', message: 'Please review proposal for {event}.', severity: NotificationSeverity.INFO, role: 'MANAGER' },
    { title: 'Approval Required', message: 'Your approval is needed for {event}.', severity: NotificationSeverity.WARNING, role: 'MANAGER' },
    { title: 'Profile Updated', message: 'Your profile has been updated successfully.', severity: NotificationSeverity.SUCCESS, role: 'USER' },
    { title: 'Password Changed', message: 'Your password was changed successfully.', severity: NotificationSeverity.INFO, role: 'USER' },
    { title: 'Email Verification', message: 'Please verify your email address.', severity: NotificationSeverity.WARNING, role: 'USER' },
    { title: 'Account Suspended', message: 'Your account has been suspended.', severity: NotificationSeverity.ERROR, role: 'USER' },
    { title: 'Welcome to SponsiWise', message: 'Thank you for joining SponsiWise!', severity: NotificationSeverity.SUCCESS, role: 'USER' },
    { title: 'Terms Updated', message: 'Terms of service have been updated.', severity: NotificationSeverity.INFO, role: 'USER' },
  ];

  for (let i = 0; i < 20; i++) {
    const notificationType = notificationTypes[i];
    const targetUser = allUsers[i % allUsers.length];

    await prisma.notification.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        userId: targetUser.id,
        title: notificationType.title,
        message: notificationType.message.replace('{event}', `Event ${(i % 15) + 1}`),
        severity: notificationType.severity,
        read: i % 3 === 0, // Some read, some unread
        link: `/notifications/${i + 1}`,
        entityType: 'Notification',
        entityId: `${GLOBAL_TENANT_ID}`,
      },
    });
  }
  console.log('  ✅ Created 20 notifications (covering all types)');

  // ========================================
  // 9. SEED EMAIL LOGS (20 - all types)
  // ========================================
  console.log('📧 Seeding email logs...');

  const emailJobNames = [
    'welcome_email',
    'password_reset',
    'proposal_submitted',
    'proposal_approved',
    'proposal_rejected',
    'event_confirmation',
    'event_reminder',
    'sponsorship_confirmation',
    'sponsorship_cancelled',
    'payment_receipt',
    'payment_failed',
    'account_verification',
    'admin_notification',
    'manager_alert',
    'organizer_update',
    'sponsor_digest',
    'weekly_summary',
    'monthly_report',
    'newsletter',
    'system_alert',
  ];

  for (let i = 0; i < 20; i++) {
    const isFailed = i % 5 === 0; // Some emails failed
    
    await prisma.emailLog.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        recipient: allUsers[i % allUsers.length].email,
        subject: `Email: ${emailJobNames[i]}`,
        jobName: emailJobNames[i],
        entityType: i < 10 ? 'Event' : 'User',
        entityId: events[i % events.length]?.id || allUsers[0].id,
        status: isFailed ? EmailStatus.FAILED : EmailStatus.SENT,
        errorMessage: isFailed ? 'SMTP connection timeout' : null,
      },
    });
  }
  console.log('  ✅ Created 20 email logs (covering all types)');

  // ========================================
  // 10. SEED AUDIT LOGS (20 - all actions)
  // ========================================
  console.log('📝 Seeding audit logs...');

  const auditActions = [
    'user.created',
    'user.updated',
    'user.login',
    'user.logout',
    'password.changed',
    'company.created',
    'company.verified',
    'company.rejected',
    'organizer.created',
    'event.created',
    'event.published',
    'event.cancelled',
    'event.completed',
    'sponsorship.created',
    'sponsorship.updated',
    'proposal.created',
    'proposal.submitted',
    'proposal.approved',
    'proposal.rejected',
    'settings.updated',
  ];

  const entityTypes = ['User', 'User', 'User', 'User', 'User', 'Company', 'Company', 'Company', 'Organizer', 'Event', 'Event', 'Event', 'Event', 'Sponsorship', 'Sponsorship', 'Proposal', 'Proposal', 'Proposal', 'Proposal', 'Settings'];

  for (let i = 0; i < 20; i++) {
    const actorIndex = i % allUsers.length;
    const entityIndex = i % Math.max(events.length, sponsorships.length, allUsers.length);

    await prisma.auditLog.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        actorId: allUsers[actorIndex].id,
        actorRole: allUsers[actorIndex].role,
        action: auditActions[i],
        entityType: entityTypes[i],
        entityId: events[entityIndex]?.id || sponsorships[entityIndex]?.id || allUsers[entityIndex].id,
        metadata: {
          description: `${auditActions[i]} action performed`,
          ipAddress: `192.168.1.${i + 1}`,
          userAgent: 'Mozilla/5.0 (Test Browser)',
        },
      },
    });
  }
  console.log('  ✅ Created 20 audit logs (covering all actions)');

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('  - Users: 19 (1 admin, 5 users, 3 managers, 5 organizers, 5 sponsors)');
  console.log('  - Companies: 10 (5 sponsors, 5 organizers)');
  console.log('  - Organizers: 5');
  console.log('  - Events: 15 (3 per organizer: 1 PUBLISHED, 1 PENDING, 1 DRAFT)');
  console.log('  - Sponsorships:', sponsorships.length);
  console.log('  - Proposals:', sponsorships.length, '(covering all statuses)');
  console.log('  - RefreshTokens:', allUsers.length * 4, '(active, revoked, expired, rotated per user)');
  console.log('  - Notifications: 20');
  console.log('  - EmailLogs: 20');
  console.log('  - AuditLogs: 20');
  console.log('\n🔑 Login credentials:');
  console.log('  Password for all users: password123');
  console.log('\n📧 Sample emails:');
  console.log('  - admin@spons.com');
  console.log('  - user1@spons.com');
  console.log('  - manager1@spons.com');
  console.log('  - organizer1@spons.com');
  console.log('  - sponsor1@spons.com');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

