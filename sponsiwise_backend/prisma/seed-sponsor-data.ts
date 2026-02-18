/**
 * seed-sponsor-data.ts — DEV-ONLY seed for sponsor-scoped API testing.
 *
 * Run with:
 *   export $(grep -v '^#' .env | xargs) && npx ts-node prisma/seed-sponsor-data.ts
 *
 * Creates:
 *  - 1 Tenant
 *  - 1 Sponsor User (role=SPONSOR, linked to company)
 *  - 1 Regular User  (role=USER, no company — for security tests)
 *  - 1 Sponsor Company (VERIFIED)
 *  - 1 Organizer
 *  - 3 Events (PUBLISHED+VERIFIED)
 *  - 2 Sponsorships (1 ACTIVE, 1 PENDING)
 *  - 2 Proposals (1 APPROVED, 1 SUBMITTED)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding sponsor test data...');

  // ── Tenant ──────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'sponsor-test-tenant' },
    update: {},
    create: {
      name: 'Sponsor Test Tenant',
      slug: 'sponsor-test-tenant',
      status: 'ACTIVE',
    },
  });
  console.log(`  Tenant: ${tenant.id}`);

  // ── Sponsor Company ─────────────────────────────────────
  const company = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: 'Sponsor Corp',
      slug: 'sponsor-corp',
      type: 'SPONSOR',
      website: 'https://sponsor-corp.example.com',
      description: 'A test sponsor company.',
      logoUrl: 'https://placehold.co/200x200?text=SC',
      verificationStatus: 'VERIFIED',
      isActive: true,
    },
  });
  console.log(`  Company: ${company.id}  slug=sponsor-corp`);

  // ── Sponsor User ────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('sponsor123', 12);
  const sponsorUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      email: 'sponsor@test.com',
      password: hashedPassword,
      role: 'SPONSOR',
      isActive: true,
    },
  });
  console.log(`  Sponsor User: ${sponsorUser.id}  email=sponsor@test.com  pw=sponsor123`);

  // ── Regular User (for security tests) ───────────────────
  const regularUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'regular@test.com',
      password: await bcrypt.hash('regular123', 12),
      role: 'USER',
      isActive: true,
    },
  });
  console.log(`  Regular User: ${regularUser.id}  email=regular@test.com  pw=regular123`);

  // ── Organizer ───────────────────────────────────────────
  const organizer = await prisma.organizer.create({
    data: {
      tenantId: tenant.id,
      name: 'EventOrg Inc',
      description: 'Professional event organizer',
      contactEmail: 'org@test.com',
      logoUrl: 'https://placehold.co/200x200?text=EO',
      isActive: true,
    },
  });
  console.log(`  Organizer: ${organizer.id}`);

  // ── Events ──────────────────────────────────────────────
  const event1 = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      organizerId: organizer.id,
      title: 'Tech Summit 2025',
      description: 'Annual technology summit.',
      location: 'New York, NY',
      venue: 'Javits Center',
      startDate: new Date('2025-10-01T09:00:00Z'),
      endDate: new Date('2025-10-03T18:00:00Z'),
      status: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
      isActive: true,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      organizerId: organizer.id,
      title: 'Cloud Expo 2025',
      description: 'Cloud computing trade show.',
      location: 'London, UK',
      venue: 'ExCeL London',
      startDate: new Date('2025-11-15T10:00:00Z'),
      endDate: new Date('2025-11-17T17:00:00Z'),
      status: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
      isActive: true,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      organizerId: organizer.id,
      title: 'Open Source Fest',
      description: 'Celebrating open source software.',
      location: 'Portland, OR',
      venue: 'Oregon Convention Center',
      startDate: new Date('2025-12-05T09:00:00Z'),
      endDate: new Date('2025-12-07T17:00:00Z'),
      status: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
      isActive: true,
    },
  });
  console.log(`  Events: ${event1.id}, ${event2.id}, ${event3.id}`);

  // ── Sponsorships ────────────────────────────────────────
  const sponsorship1 = await prisma.sponsorship.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      eventId: event1.id,
      status: 'ACTIVE',
      tier: 'Gold',
      isActive: true,
    },
  });

  const sponsorship2 = await prisma.sponsorship.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      eventId: event2.id,
      status: 'PENDING',
      tier: 'Silver',
      isActive: true,
    },
  });
  console.log(`  Sponsorships: ${sponsorship1.id} (ACTIVE/Gold), ${sponsorship2.id} (PENDING/Silver)`);

  // ── Proposals ───────────────────────────────────────────
  const proposal1 = await prisma.proposal.create({
    data: {
      tenantId: tenant.id,
      sponsorshipId: sponsorship1.id,
      status: 'APPROVED',
      proposedTier: 'Gold',
      proposedAmount: 50000,
      message: 'We would like to sponsor this event as a Gold partner.',
      submittedAt: new Date('2025-08-01T10:00:00Z'),
      reviewedAt: new Date('2025-08-05T14:00:00Z'),
      isActive: true,
    },
  });

  const proposal2 = await prisma.proposal.create({
    data: {
      tenantId: tenant.id,
      sponsorshipId: sponsorship2.id,
      status: 'SUBMITTED',
      proposedTier: 'Silver',
      proposedAmount: 25000,
      message: 'Interested in Silver sponsorship for Cloud Expo.',
      submittedAt: new Date('2025-09-01T10:00:00Z'),
      isActive: true,
    },
  });
  console.log(`  Proposals: ${proposal1.id} (APPROVED/$50k), ${proposal2.id} (SUBMITTED/$25k)`);

  console.log('\n✅ Sponsor seed complete!');
  console.log('   Login: POST /auth/login {"email":"sponsor@test.com","password":"sponsor123"}');
  console.log('   Then:  GET /sponsor/dashboard/stats');
  console.log('         GET /sponsor/events');
  console.log('         GET /sponsor/proposals');
  console.log('         GET /sponsor/sponsorships');
  console.log('\n   Security test user: email=regular@test.com pw=regular123 (role=USER)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
