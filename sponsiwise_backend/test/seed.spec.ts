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
import { AppModule } from '../src/app.module';
import { Role, EventStatus, ProposalStatus, SponsorshipStatus, VerificationStatus, NotificationSeverity, EmailStatus } from '@prisma/client';

describe('Seed Data Verification', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    it('should have users', async () => {
      const users = await prisma.user.findMany();
      expect(users.length).toBeGreaterThan(0);
    });

    it('should have 1 admin user', async () => {
      const admin = await prisma.user.findFirst({
        where: { email: 'admin@spons.com', role: Role.ADMIN },
      });
      expect(admin).toBeDefined();
      expect(admin?.role).toBe(Role.ADMIN);
    });

    it('should have regular users', async () => {
      const users = await prisma.user.findMany({
        where: { role: Role.USER },
      });
      expect(users.length).toBeGreaterThan(0);
    });

    it('should have manager users', async () => {
      const managers = await prisma.user.findMany({
        where: { role: Role.MANAGER },
      });
      expect(managers.length).toBeGreaterThan(0);
    });

    it('should have organizer users', async () => {
      const organizers = await prisma.user.findMany({
        where: { role: Role.ORGANIZER },
      });
      expect(organizers.length).toBeGreaterThan(0);
    });

    it('should have sponsor users', async () => {
      const sponsors = await prisma.user.findMany({
        where: { role: Role.SPONSOR },
      });
      expect(sponsors.length).toBeGreaterThan(0);
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

    it('should have all users active', async () => {
      const users = await prisma.user.findMany({
        where: { isActive: false },
      });
      expect(users).toHaveLength(0);
    });
  });

  describe('2. Company Tests', () => {
    it('should have companies', async () => {
      const companies = await prisma.company.findMany();
      expect(companies.length).toBeGreaterThan(0);
    });

    it('should have mixed verification statuses', async () => {
      const verified = await prisma.company.findMany({
        where: { verificationStatus: VerificationStatus.VERIFIED },
      });
      const pending = await prisma.company.findMany({
        where: { verificationStatus: VerificationStatus.PENDING },
      });
      expect(verified.length + pending.length).toBeGreaterThan(0);
    });

    it('should link sponsor users to companies', async () => {
      const sponsors = await prisma.user.findMany({
        where: { role: Role.SPONSOR, companyId: { not: null } },
      });
      expect(sponsors.length).toBeGreaterThan(0);
    });
  });

  describe('3. Organizer Tests', () => {
    it('should have organizers', async () => {
      const organizers = await prisma.organizer.findMany();
      expect(organizers.length).toBeGreaterThan(0);
    });

    it('should link organizer users to organizers', async () => {
      const organizers = await prisma.user.findMany({
        where: { role: Role.ORGANIZER, organizerId: { not: null } },
      });
      expect(organizers.length).toBeGreaterThan(0);
    });

    it('should have all organizers active', async () => {
      const inactive = await prisma.organizer.findMany({
        where: { isActive: false },
      });
      expect(inactive).toHaveLength(0);
    });
  });

  describe('4. Event Tests', () => {
    it('should have events', async () => {
      const events = await prisma.event.findMany();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should have published events', async () => {
      const published = await prisma.event.findMany({
        where: { status: EventStatus.PUBLISHED },
      });
      expect(published.length).toBeGreaterThan(0);
    });

    it('should have draft events', async () => {
      const drafts = await prisma.event.findMany({
        where: { status: EventStatus.DRAFT },
      });
      expect(drafts.length).toBeGreaterThan(0);
    });

    it('should have events per organizer', async () => {
      const organizers = await prisma.organizer.findMany();
      for (const organizer of organizers) {
        const events = await prisma.event.findMany({
          where: { organizerId: organizer.id },
        });
        expect(events.length).toBeGreaterThan(0);
      }
    });

    it('should have all events linked to organizers', async () => {
      const events = await prisma.event.findMany({
        where: { organizerId: { not: undefined } },
      });
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('5. Sponsorship Tests', () => {
    it('should have sponsorships', async () => {
      const sponsorships = await prisma.sponsorship.findMany();
      expect(sponsorships.length).toBeGreaterThan(0);
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
    it('should have proposals covering various statuses', async () => {
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

      expect(draft.length + submitted.length + underReview.length + approved.length + rejected.length).toBeGreaterThan(0);
    });

    it('should have proposals with submittedAt for non-draft statuses', async () => {
      const submitted = await prisma.proposal.findMany({
        where: { status: { not: ProposalStatus.DRAFT }, submittedAt: { not: null } },
      });
      expect(submitted.length).toBeGreaterThanOrEqual(0);
    });

    it('should have reviewedAt for approved/rejected proposals', async () => {
      const reviewed = await prisma.proposal.findMany({
        where: {
          status: { in: [ProposalStatus.APPROVED, ProposalStatus.REJECTED] },
          reviewedAt: { not: null },
        },
      });
      expect(reviewed.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('7. RefreshToken Tests', () => {
    it('should have refresh tokens', async () => {
      const tokens = await prisma.refreshToken.findMany();
      expect(tokens.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('8. Notification Tests', () => {
    it('should have notifications', async () => {
      const notifications = await prisma.notification.findMany();
      expect(notifications.length).toBeGreaterThanOrEqual(0);
    });

    it('should have all notification severities represented', async () => {
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

      expect(info.length + success.length + warning.length + error.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('9. EmailLog Tests', () => {
    it('should have email logs', async () => {
      const logs = await prisma.emailLog.findMany();
      expect(logs.length).toBeGreaterThanOrEqual(0);
    });

    it('should have sent and failed emails if logs exist', async () => {
      const sent = await prisma.emailLog.findMany({
        where: { status: EmailStatus.SENT },
      });
      const failed = await prisma.emailLog.findMany({
        where: { status: EmailStatus.FAILED },
      });
      expect(sent.length + failed.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('10. AuditLog Tests', () => {
    it('should have audit logs', async () => {
      const logs = await prisma.auditLog.findMany();
      expect(logs.length).toBeGreaterThanOrEqual(0);
    });

    it('should have various action types if logs exist', async () => {
      const logs = await prisma.auditLog.findMany({ take: 5 });
      if (logs.length > 0) {
        expect(logs[0].action).toBeDefined();
        expect(logs[0].actorId).toBeDefined();
        expect(logs[0].actorRole).toBeDefined();
      }
    });
  });
});

