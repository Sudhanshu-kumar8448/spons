/**
 * seed-public-data.ts — Inserts test data for public API verification.
 *
 * Run with:  npx ts-node prisma/seed-public-data.ts
 *
 * Creates:
 *  - 1 Tenant
 *  - 1 Organizer (active)
 *  - 2 Companies (1 VERIFIED sponsor with slug, 1 PENDING sponsor)
 *  - 3 Events   (2 PUBLISHED+VERIFIED, 1 DRAFT)
 *  - 2 Sponsorships linking verified company → published events
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding public test data...');

  // ── Tenant ──────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'public-test-tenant' },
    update: {},
    create: {
      name: 'Public Test Tenant',
      slug: 'public-test-tenant',
      status: 'ACTIVE',
    },
  });
  console.log(`  Tenant: ${tenant.id}`);

  // ── Organizer ───────────────────────────────────────────
  const organizer = await prisma.organizer.create({
    data: {
      tenantId: tenant.id,
      name: 'TechConf Global',
      description: 'Premier technology conferences worldwide',
      contactEmail: 'hello@techconf.io',
      website: 'https://techconf.io',
      logoUrl: 'https://placehold.co/200x200?text=TCG',
      isActive: true,
    },
  });
  console.log(`  Organizer: ${organizer.id}`);

  // ── Companies ───────────────────────────────────────────
  const verifiedCompany = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: 'Acme Corp',
      slug: 'acme-corp',
      type: 'SPONSOR',
      website: 'https://acme.example.com',
      description: 'Leading sponsor of tech events worldwide.',
      logoUrl: 'https://placehold.co/200x200?text=Acme',
      verificationStatus: 'VERIFIED',
      isActive: true,
    },
  });
  console.log(`  Company (VERIFIED): ${verifiedCompany.id}  slug=acme-corp`);

  const pendingCompany = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: 'Pending Inc',
      slug: 'pending-inc',
      type: 'SPONSOR',
      description: 'Not yet verified — should NOT appear in public API.',
      verificationStatus: 'PENDING',
      isActive: true,
    },
  });
  console.log(`  Company (PENDING): ${pendingCompany.id}  slug=pending-inc`);

  // ── Events ──────────────────────────────────────────────
  const event1 = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      organizerId: organizer.id,
      title: 'DevSummit 2025',
      description: 'Annual developer summit covering web, mobile, and AI.',
      location: 'San Francisco, CA',
      venue: 'Moscone Center',
      startDate: new Date('2025-09-15T09:00:00Z'),
      endDate: new Date('2025-09-17T18:00:00Z'),
      status: 'PUBLISHED',
      website: 'https://devsummit.io',
      logoUrl: 'https://placehold.co/400x200?text=DevSummit',
      verificationStatus: 'VERIFIED',
      isActive: true,
    },
  });
  console.log(`  Event (PUB+VER): ${event1.id}  — DevSummit 2025`);

  const event2 = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      organizerId: organizer.id,
      title: 'AI Expo Europe',
      description: "Europe's largest artificial intelligence trade show.",
      location: 'Berlin, Germany',
      venue: 'Messe Berlin',
      startDate: new Date('2025-11-01T10:00:00Z'),
      endDate: new Date('2025-11-03T17:00:00Z'),
      status: 'PUBLISHED',
      website: 'https://aiexpo.eu',
      logoUrl: 'https://placehold.co/400x200?text=AIExpo',
      verificationStatus: 'VERIFIED',
      isActive: true,
    },
  });
  console.log(`  Event (PUB+VER): ${event2.id}  — AI Expo Europe`);

  const draftEvent = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      organizerId: organizer.id,
      title: 'Secret Draft Event',
      description: 'This event is still in draft — should NOT appear.',
      location: 'Nowhere',
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-01-02T00:00:00Z'),
      status: 'DRAFT',
      verificationStatus: 'PENDING',
      isActive: true,
    },
  });
  console.log(`  Event (DRAFT): ${draftEvent.id}  — Secret Draft Event`);

  // ── Sponsorships ────────────────────────────────────────
  await prisma.sponsorship.createMany({
    data: [
      {
        tenantId: tenant.id,
        companyId: verifiedCompany.id,
        eventId: event1.id,
        status: 'ACTIVE',
        tier: 'Gold',
        isActive: true,
      },
      {
        tenantId: tenant.id,
        companyId: verifiedCompany.id,
        eventId: event2.id,
        status: 'ACTIVE',
        tier: 'Silver',
        isActive: true,
      },
    ],
  });
  console.log('  Sponsorships: 2 created (Acme → DevSummit + AI Expo)');

  console.log('\n✅ Seed complete!  Test slugs:');
  console.log('   GET /events/public');
  console.log('   GET /companies/public/acme-corp');
  console.log('   GET /companies/public/pending-inc   → should 404');
  console.log('   GET /stats/public');
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
