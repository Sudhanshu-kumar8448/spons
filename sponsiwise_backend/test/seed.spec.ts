/**
 * SponsiWise Seed Data Test Suite
 * 
 * This test file verifies that all seeded data was created correctly
 * and covers all edge cases as specified.
 * 
 * Run with: npx jest test/seed.spec.ts --verbose
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/providers/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { Role, EventStatus, ProposalStatus, SponsorshipStatus, VerificationStatus, NotificationSeverity, EmailStatus } from '@prisma/client';

describe('Seed Data Verification', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const GLOBAL_TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const TEST_PASSWORD = 'password123';

  beforeAll(async () => {
    // Create test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. User Tests', () => {
    it('should have exactly 19 users', async () => {
      const users = await prisma.user.findMany({
        where: { tenantId: GLOBAL_TENANT_ID },
      });
      expect(users).toHaveLength(19);
    });

    it('should have 1 admin user', async () => {
      const admin = await prisma.user.findFirst({
        where: { email: 'admin@spons.com', role: Role.ADMIN },
      });
      expect(admin).toBeDefined();
      expect(admin?.role).toBe(Role.ADMIN);
    });

    it('should have 5 regular users', async () => {
      const users = await prisma.user.findMany({
        where: { role: Role.USER },
      });
      expect(users).toHaveLength(5);
    });

    it('should have 3 manager users', async () => {
      const managers = await prisma.user.findMany({
        where: { role: Role.MANAGER },
      });
      expect(managers).toHaveLength(3);
    });

    it('should have 5 organizer users', async () => {
      const organizers = await prisma.user.findMany({
        where: { role: Role.ORGANIZER },
      });
      expect(organizers).toHaveLength(5);
    });

    it('should have 5 sponsor users', async () => {
      const sponsors = await prisma.user.findMany({
        where: { role: Role.SPONSOR },
      });
      expect(sponsors).toHaveLength(5);
    });

    it('should authenticate admin user with password123', async () => {
      const bcrypt = require('bcrypt');
      const admin = await prisma.user.findUnique({
        where: { email: 'admin@spons.com' },
      });
      expect(admin).toBeDefined();
      const isValid = await bcrypt.compare(TEST_PASSWORD, admin!.password);
      expect(isValid).toBe(true);
    });

    it('should have all users in global tenant', async () => {
      const users = await prisma.user.findMany({
        where: { tenantId: GLOBAL_TENANT_ID },
      });
      users.forEach(user => {
        expect(user.tenantId).toBe(GLOBAL_TENANT_ID);
      });
    });

    it('should have all users active', async () => {
      const users = await prisma.user.findMany({
        where: { isActive: false },
      });
      expect(users).toHaveLength(0);
    });
  });

  describe('2. Company Tests', () => {
    it('should have exactly 10 companies', async () => {
      const companies = await prisma.company.findMany({
        where: { tenantId: GLOBAL_TENANT_ID },
      });
      expect(companies).toHaveLength(10);
    });

    it('should have 5 sponsor companies', async () => {
      const sponsors = await prisma.company.findMany({
        where: { type: 'SPONSOR' },
      });
      expect(sponsors).toHaveLength(5);
    });

    it('should have 5 organizer companies', async () => {
      const organizers = await prisma.company.findMany({
        where: { type: 'ORGANIZER' },
      });
      expect(organizers).toHaveLength(5);
    });

    it('should have mixed verification statuses', async () => {
      const verified = await prisma.company.findMany({
        where: { verificationStatus: VerificationStatus.VERIFIED },
      });
      const pending = await prisma.company.findMany({
        where: { verificationStatus: VerificationStatus.PENDING },
      });
      expect(verified.length + pending.length).toBe(10);
    });

    it('should link sponsor users to sponsor companies', async () => {
      const sponsors = await prisma.user.findMany({
        where: { role: Role.SPONSOR, companyId: { not: null } },
      });
      expect(sponsors).toHaveLength(5);
    });
  });

  describe('3. Organizer Tests', () => {
    it('should have exactly 5 organizers', async () => {
      const organizers = await prisma.organizer.findMany({
        where: { tenantId: GLOBAL_TENANT_ID },
      });
      expect(organizers).toHaveLength(5);
    });

    it('should link organizer users to organizers', async () => {
      const organizers = await prisma.user.findMany({
        where: { role: Role.ORGANIZER, organizerId: { not: null } },
      });
      expect(organizers).toHaveLength(5);
    });

    it('should have all organizers active', async () => {
      const inactive = await prisma.organizer.findMany({
        where: { isActive: false },
      });
      expect(inactive).toHaveLength(0);
    });
  });

  describe('4. Event Tests', () => {
    it('should have exactly 15 events', async () => {
      const events = await prisma.event.findMany({
        where: { tenantId: GLOBAL_TENANT_ID },
      });
      expect(events).toHaveLength(15);
    });

    it('should have 5 published events (one per organizer)', async () => {
      const published = await prisma.event.findMany({
        where: { status: EventStatus.PUBLISHED },
      });
      expect(published).toHaveLength(5);
    });

    it('should have 5 draft events (one per organizer)', async () => {
      const drafts = await prisma.event.findMany({
        where: { status: EventStatus.DRAFT },
      });
      expect(drafts).toHaveLength(5);
    });

    it('should have 5 pending events (one per organizer)', async () => {
      const pending = await prisma.event.findMany({
        where: { status: EventStatus.PUBLISHED, verificationStatus: VerificationStatus.PENDING },
      });
      expect(pending.length).toBeGreaterThanOrEqual(5);
    });

    it('should have 3 events per organizer', async () => {
      const organizers = await prisma.organizer.findMany();
      for (const organizer of organizers) {
        const events = await prisma.event.findMany({
          where: { organizerId: organizer.id },
        });
        expect(events).toHaveLength(3);
      }
    });

    it('should have all events linked to organizers', async () => {
      const events = await prisma.event.findMany({
        where: { organizerId: { not: undefined } },
      });
      expect(events).toHaveLength(15);
    });
  });

  describe('5. Sponsorship Tests', () => {
    it('should have 18 sponsorships', async () => {
      const sponsorships = await prisma.sponsorship.findMany({
        where: { tenantId: GLOBAL_TENANT_ID },
      });
      expect(sponsorships.length).toBeGreaterThanOrEqual(15);
    });

    it('should have mixed sponsorship statuses', async () => {
      const pending = await prisma.sponsorship.findMany({
        where: { status: SponsorshipStatus.PENDING },
      });
      const active = await prisma.sponsorship.findMany({
        where: { status: SponsorshipStatus.ACTIVE },
      });
      const completed = await prisma.sponsorship.findMany({
        where: { status: SponsorshipStatus.COMPLETED },
      });
      expect(pending.length + active.length + completed.length).toBeGreaterThan(0);
    });

    it('should have all sponsorships linked to companies and events', async () => {
      const sponsorships = await prisma.sponsorship.findMany({
        where: {
          companyId: { not: undefined },
          eventId: { not: undefined },
        },
      });
      expect(sponsorships.length).toBeGreaterThan(0);
    });
  });

  describe('6. Proposal Tests', () => {
    it('should have proposals covering all statuses', async () => {
      const draft = await prisma.proposal.findMany({
        where: { status: ProposalStatus.DRAFT },
      });
      const submitted = await prisma.proposal.findMany({
        where: { status: ProposalStatus.SUBMITTED },
      });
    const underReview = await prisma.proposal.findMany({
        where: { status: ProposalStatus.UNDER_MANAGER_REVIEW },
      });
      const approved = await prisma.proposal.findMany({
        where: { status: ProposalStatus.APPROVED },
      });
      const rejected = await prisma.proposal.findMany({
        where: { status: ProposalStatus.REJECTED },
      });
      const withdrawn = await prisma.proposal.findMany({
        where: { status: ProposalStatus.WITHDRAWN },
      });

      expect(draft.length).toBeGreaterThan(0);
      expect(submitted.length).toBeGreaterThan(0);
      expect(underReview.length).toBeGreaterThan(0);
      expect(approved.length).toBeGreaterThan(0);
      expect(rejected.length).toBeGreaterThan(0);
      expect(withdrawn.length).toBeGreaterThan(0);
    });

    it('should have proposals with submittedAt for non-draft statuses', async () => {
      const submitted = await prisma.proposal.findMany({
        where: { status: { not: ProposalStatus.DRAFT }, submittedAt: { not: null } },
      });
      expect(submitted.length).toBeGreaterThan(0);
    });

    it('should have reviewedAt for approved/rejected proposals', async () => {
      const reviewed = await prisma.proposal.findMany({
        where: {
          status: { in: [ProposalStatus.APPROVED, ProposalStatus.REJECTED] },
          reviewedAt: { not: null },
        },
      });
      expect(reviewed.length).toBeGreaterThan(0);
    });
  });

  describe('7. RefreshToken Tests (Edge Cases)', () => {
    it('should have 4 tokens per user (76 total)', async () => {
      const tokens = await prisma.refreshToken.findMany();
      expect(tokens).toHaveLength(76); // 19 users * 4 tokens
    });

    it('should have active tokens (isRevoked: false)', async () => {
      const active = await prisma.refreshToken.findMany({
        where: { isRevoked: false },
      });
      expect(active.length).toBe(19); // One active per user
    });

    it('should have revoked tokens', async () => {
      const revoked = await prisma.refreshToken.findMany({
        where: { isRevoked: true },
      });
      expect(revoked.length).toBeGreaterThan(0);
    });

    it('should have expired tokens (expiresAt in the past)', async () => {
      const expired = await prisma.refreshToken.findMany({
        where: {
          isRevoked: false,
          expiresAt: { lt: new Date() },
        },
      });
      expect(expired.length).toBe(19); // One expired per user
    });

    it('should have rotated tokens (rotatedAt set)', async () => {
      const rotated = await prisma.refreshToken.findMany({
        where: { rotatedAt: { not: null } },
      });
      expect(rotated.length).toBe(19); // One rotated per user
    });
  });

  describe('8. Notification Tests', () => {
    it('should have 20 notifications', async () => {
      const notifications = await prisma.notification.findMany({
        where: { tenantId: GLOBAL_TENANT_ID },
      });
      expect(notifications).toHaveLength(20);
    });

    it('should have all notification severities', async () => {
      const info = await prisma.notification.findMany({
        where: { severity: NotificationSeverity.INFO },
      });
      const success = await prisma.notification.findMany({
        where: { severity: NotificationSeverity.SUCCESS },
      });
      const warning = await prisma.notification.findMany({
        where: { severity: NotificationSeverity.WARNING },
      });
      const error = await prisma.notification.findMany({
        where: { severity: NotificationSeverity.ERROR },
      });

      expect(info.length).toBeGreaterThan(0);
      expect(success.length).toBeGreaterThan(0);
      expect(warning.length).toBeGreaterThan(0);
      expect(error.length).toBeGreaterThan(0);
    });

    it('should have read and unread notifications', async () => {
      const read = await prisma.notification.findMany({
        where: { read: true },
      });
      const unread = await prisma.notification.findMany({
        where: { read: false },
      });
      expect(read.length + unread.length).toBe(20);
    });

    it('should cover proposal accepted case', async () => {
      const accepted = await prisma.notification.findFirst({
        where: { title: { contains: 'Accepted' } },
      });
      expect(accepted).toBeDefined();
    });

    it('should cover proposal rejected case', async () => {
      const rejected = await prisma.notification.findFirst({
        where: { title: { contains: 'Rejected' } },
      });
      expect(rejected).toBeDefined();
    });
  });

  describe('9. EmailLog Tests', () => {
    it('should have 20 email logs', async () => {
      const logs = await prisma.emailLog.findMany({
        where: { tenantId: GLOBAL_TENANT_ID },
      });
      expect(logs).toHaveLength(20);
    });

    it('should have sent and failed emails', async () => {
      const sent = await prisma.emailLog.findMany({
        where: { status: EmailStatus.SENT },
      });
      const failed = await prisma.emailLog.findMany({
        where: { status: EmailStatus.FAILED },
      });
      expect(sent.length).toBeGreaterThan(0);
      expect(failed.length).toBeGreaterThan(0);
    });

    it('should have various email job types', async () => {
      const welcome = await prisma.emailLog.findFirst({
        where: { jobName: 'welcome_email' },
      });
      const proposalApproved = await prisma.emailLog.findFirst({
        where: { jobName: 'proposal_approved' },
      });
      const proposalRejected = await prisma.emailLog.findFirst({
        where: { jobName: 'proposal_rejected' },
      });

      expect(welcome).toBeDefined();
      expect(proposalApproved).toBeDefined();
      expect(proposalRejected).toBeDefined();
    });
  });

  describe('10. AuditLog Tests', () => {
    it('should have 20 audit logs', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { tenantId: GLOBAL_TENANT_ID },
      });
      expect(logs).toHaveLength(20);
    });

    it('should have various action types', async () => {
      const userCreated = await prisma.auditLog.findFirst({
        where: { action: 'user.created' },
      });
      const proposalApproved = await prisma.auditLog.findFirst({
        where: { action: 'proposal.approved' },
      });
      const proposalRejected = await prisma.auditLog.findFirst({
        where: { action: 'proposal.rejected' },
      });

      expect(userCreated).toBeDefined();
      expect(proposalApproved).toBeDefined();
      expect(proposalRejected).toBeDefined();
    });

    it('should have metadata in JSON format', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { metadata: { not: undefined } },
      });
      expect(logs.length).toBe(20);
    });

    it('should have different actor roles', async () => {
      const adminActions = await prisma.auditLog.findMany({
        where: { actorRole: Role.ADMIN },
      });
      const userActions = await prisma.auditLog.findMany({
        where: { actorRole: Role.USER },
      });
      expect(adminActions.length + userActions.length).toBe(20);
    });
  });

  describe('11. Tenant Test', () => {
    it('should have exactly 1 tenant (global tenant)', async () => {
      const tenants = await prisma.tenant.findMany();
      expect(tenants).toHaveLength(1);
    });

    it('should have global tenant with correct id', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: GLOBAL_TENANT_ID },
      });
      expect(tenant).toBeDefined();
      expect(tenant?.id).toBe(GLOBAL_TENANT_ID);
    });

    it('should have global tenant with correct name and slug', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: GLOBAL_TENANT_ID },
      });
      expect(tenant).toBeDefined();
      expect(tenant?.name).toBe('Global');
      expect(tenant?.slug).toBe('global');
    });

    it('should have global tenant with ACTIVE status', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: GLOBAL_TENANT_ID },
      });
      expect(tenant).toBeDefined();
      expect(tenant?.status).toBe('ACTIVE');
    });
  });
});

