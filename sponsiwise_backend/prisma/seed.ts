import 'dotenv/config';
import {
  AgeBracket,
  BrandingType,
  CompanyType,
  DeliverableCategory,
  DeliverableFormStatus,
  DeliverableUnit,
  EmailStatus,
  EventCategory,
  EventEdition,
  EventStatus,
  GenderType,
  IncomeBracket,
  NotificationSeverity,
  OrganizerApprovalStatus,
  OrganizerType,
  Prisma,
  PrismaClient,
  ProposalStatus,
  Role,
  SponsorshipStatus,
  TierType,
  VerificationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed script.');
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;
const PASSWORD = 'password123';
const now = new Date();

function daysFromNow(days: number, hour = 10): Date {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function daysAgo(days: number, hour = 10): Date {
  return daysFromNow(-days, hour);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/_/g, '-');
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');

  await prisma.$transaction([
    prisma.proposalMessage.deleteMany(),
    prisma.tierDeliverableRow.deleteMany(),
    prisma.tierDeliverableForm.deleteMany(),
    prisma.deliverableTemplate.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.audienceGender.deleteMany(),
    prisma.audienceAgeGroup.deleteMany(),
    prisma.audienceIncomeGroup.deleteMany(),
    prisma.audienceRegionDistribution.deleteMany(),
    prisma.eventAudienceProfile.deleteMany(),
    prisma.proposal.deleteMany(),
    prisma.sponsorship.deleteMany(),
    prisma.sponsorshipTier.deleteMany(),
    prisma.address.deleteMany(),
    prisma.event.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.emailLog.deleteMany(),
    prisma.user.deleteMany(),
    prisma.company.deleteMany(),
    prisma.organizer.deleteMany(),
  ]);
}

async function main() {
  console.log('🌱 Starting comprehensive seed...');
  await clearDatabase();

  // Hash password once
  const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const seedAuthTokens = {
    standaloneVerification: 'seed-verify-standalone-user',
    manager3Reset: 'seed-reset-manager3',
  } as const;

  const createUser = (input: {
    email: string;
    role: Role;
    isActive?: boolean;
    companyId?: string;
    organizerId?: string;
    emailVerified?: boolean;
    emailVerificationToken?: string | null;
    emailVerificationExpiry?: Date | null;
    emailVerificationSentCount?: number;
    emailVerificationLastSentAt?: Date | null;
    passwordResetToken?: string | null;
    passwordResetExpiry?: Date | null;
  }) =>
    prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        role: input.role,
        isActive: input.isActive ?? true,
        companyId: input.companyId,
        organizerId: input.organizerId,
        emailVerified: input.emailVerified ?? true,
        emailVerificationToken: input.emailVerificationToken ?? null,
        emailVerificationExpiry: input.emailVerificationExpiry ?? null,
        emailVerificationSentCount: input.emailVerificationSentCount ?? 0,
        emailVerificationLastSentAt: input.emailVerificationLastSentAt ?? null,
        passwordResetToken: input.passwordResetToken ?? null,
        passwordResetExpiry: input.passwordResetExpiry ?? null,
      },
    });

  // ============================================
  // USERS: ROLE COVERAGE + BASE ACTORS
  // ============================================
  console.log('Creating base users...');

  const superAdmin = await createUser({
    email: 'superadmin@spons.com',
    role: Role.SUPER_ADMIN,
  });
  const admin = await createUser({
    email: 'admin@spons.com',
    role: Role.ADMIN,
  });
  const manager1 = await createUser({
    email: 'manager1@spons.com',
    role: Role.MANAGER,
  });
  const manager2 = await createUser({
    email: 'manager2@spons.com',
    role: Role.MANAGER,
  });
  const manager3 = await createUser({
    email: 'manager3@spons.com',
    role: Role.MANAGER,
    passwordResetToken: sha256(seedAuthTokens.manager3Reset),
    passwordResetExpiry: daysFromNow(1, 11),
  });
  const standaloneUser = await createUser({
    email: 'user1@spons.com',
    role: Role.USER,
    emailVerified: false,
    emailVerificationToken: sha256(seedAuthTokens.standaloneVerification),
    emailVerificationExpiry: daysFromNow(1, 12),
    emailVerificationSentCount: 1,
    emailVerificationLastSentAt: daysAgo(0, 9),
  });

  const usersByKey: Record<string, { id: string; email: string }> = {
    superAdmin: { id: superAdmin.id, email: superAdmin.email },
    admin: { id: admin.id, email: admin.email },
    manager1: { id: manager1.id, email: manager1.email },
    manager2: { id: manager2.id, email: manager2.email },
    manager3: { id: manager3.id, email: manager3.email },
    standaloneUser: { id: standaloneUser.id, email: standaloneUser.email },
  };

  // ============================================
  // ORGANIZERS + ORGANIZER USERS (ALL OrganizerType)
  // ============================================
  console.log('Creating organizers and organizer users...');

  const organizerSeeds: Array<{
    key: string;
    userEmail: string;
    userIsActive?: boolean;
    name: string;
    type: OrganizerType;
    pastRecords?: string | null;
    website?: string | null;
    contactPhone?: string | null;
    taxId?: string | null;
    socialLinks?: Record<string, string> | null;
    isActive?: boolean;
  }> = [
    {
      key: 'individual',
      userEmail: 'organizer.individual@spons.com',
      name: 'Organizer Individual',
      type: OrganizerType.INDIVIDUAL,
      pastRecords: 'Runs founder-led startup meetups for 6 years.',
      website: 'https://organizer-individual.example.com',
      contactPhone: '+91-555-100-0001',
      taxId: 'IND-7788',
      socialLinks: {
        linkedin: 'https://linkedin.com/company/organizer-individual',
        twitter: 'https://x.com/organizer_individual',
      },
    },
    {
      key: 'company',
      userEmail: 'organizer.company@spons.com',
      name: 'Organizer Company',
      type: OrganizerType.COMPANY,
      pastRecords: 'Enterprise expo organizer with 50+ B2B events.',
      website: 'https://organizer-company.example.com',
      contactPhone: '+91-555-100-0002',
      socialLinks: { linkedin: 'https://linkedin.com/company/organizer-company' },
    },
    {
      key: 'nonProfit',
      userEmail: 'organizer.nonprofit@spons.com',
      name: 'Organizer Non Profit',
      type: OrganizerType.NON_PROFIT,
      pastRecords: 'Community-focused events for underserved groups.',
      website: 'https://organizer-nonprofit.example.org',
      contactPhone: '+91-555-100-0003',
      taxId: 'NPO-5566',
    },
    {
      key: 'government',
      userEmail: 'organizer.government@spons.com',
      name: 'Organizer Government',
      type: OrganizerType.GOVERNMENT,
      pastRecords: 'Public programs and city events.',
      contactPhone: '+91-555-100-0004',
      website: null,
    },
    {
      key: 'education',
      userEmail: 'organizer.education@spons.com',
      name: 'Organizer Educational',
      type: OrganizerType.EDUCATIONAL_INSTITUTION,
      pastRecords: 'Inter-college fests and academic conclaves.',
      website: 'https://organizer-education.example.edu',
      contactPhone: '+91-555-100-0005',
      taxId: 'EDU-9911',
    },
    {
      key: 'club',
      userEmail: 'organizer.club@spons.com',
      name: 'Organizer Club Society',
      type: OrganizerType.CLUB,
      pastRecords: 'Local city clubs and social chapters.',
      website: null,
      contactPhone: '+91-555-100-0006',
      socialLinks: { instagram: 'https://instagram.com/organizer.club' },
    },
    {
      key: 'other',
      userEmail: 'organizer.other@spons.com',
      name: 'Organizer Other',
      type: OrganizerType.OTHER,
      pastRecords: null,
      website: 'https://organizer-other.example.com',
      contactPhone: null,
      socialLinks: null,
      isActive: true,
    },
  ];

  const organizersByKey: Record<string, { id: string }> = {};
  const organizerUsersByKey: Record<string, { id: string; email: string }> = {};

  for (const seed of organizerSeeds) {
    const organizer = await prisma.organizer.create({
      data: {
        name: seed.name,
        type: seed.type,
        pastRecords: seed.pastRecords ?? null,
        website: seed.website ?? null,
        contactPhone: seed.contactPhone ?? null,
        taxId: seed.taxId ?? null,
        socialLinks:
          seed.socialLinks === null
            ? Prisma.JsonNull
            : seed.socialLinks ?? undefined,
        isActive: seed.isActive ?? true,
      },
    });

    const organizerUser = await createUser({
      email: seed.userEmail,
      role: Role.ORGANIZER,
      organizerId: organizer.id,
      isActive: seed.userIsActive ?? true,
    });

    organizersByKey[seed.key] = { id: organizer.id };
    organizerUsersByKey[seed.key] = {
      id: organizerUser.id,
      email: organizerUser.email,
    };
  }

  // ============================================
  // COMPANIES + OWNER USERS (ALL CompanyType + verification edges)
  // ============================================
  console.log('Creating companies and sponsor owners...');

  const allCompanyTypes: CompanyType[] = [
    CompanyType.TECHNOLOGY,
    CompanyType.FINANCE,
    CompanyType.FMCG,
    CompanyType.HEALTHCARE_PHARMA,
    CompanyType.RETAIL_ECOMMERCE,
    CompanyType.MANUFACTURING_INDUSTRIAL,
    CompanyType.MEDIA_ENTERTAINMENT,
    CompanyType.EDUCATION,
    CompanyType.ENERGY_UTILITIES,
    CompanyType.REAL_ESTATE_CONSTRUCTION,
    CompanyType.LOGISTICS_TRANSPORTATION,
    CompanyType.TELECOM,
    CompanyType.OTHER,
  ];

  const statusPattern: VerificationStatus[] = [
    VerificationStatus.PENDING,
    VerificationStatus.VERIFIED,
    VerificationStatus.REJECTED,
  ];

  const companiesByType: Partial<Record<CompanyType, { id: string }>> = {};
  const sponsorUsersByType: Partial<Record<CompanyType, { id: string; email: string }>> = {};

  for (const [index, type] of allCompanyTypes.entries()) {
    const verificationStatus = statusPattern[index % statusPattern.length];
    const companySlug = index === 2 ? null : `${slugify(type)}-sponsor-${index + 1}`;

    const company = await prisma.company.create({
      data: {
        name: `${type.replace(/_/g, ' ')} Sponsor ${index + 1}`,
        slug: companySlug,
        type,
        website:
          index % 4 === 0
            ? null
            : `https://${slugify(type)}-sponsor-${index + 1}.example.com`,
        strategicIntent:
          index % 5 === 0
            ? null
            : `Increase brand reach in ${type.replace(/_/g, ' ').toLowerCase()} audiences.`,
        verificationStatus,
        isActive: index !== allCompanyTypes.length - 1,
        approvedById:
          verificationStatus === VerificationStatus.PENDING
            ? null
            : verificationStatus === VerificationStatus.VERIFIED
              ? usersByKey.manager1.id
              : usersByKey.manager2.id,
        approvedAt:
          verificationStatus === VerificationStatus.PENDING
            ? null
            : daysAgo(28 - index),
        rejectionReason:
          verificationStatus === VerificationStatus.REJECTED
            ? 'Compliance documents are incomplete.'
            : null,
      },
    });

    const ownerUser = await createUser({
      email: `sponsor${index + 1}@spons.com`,
      role:
        verificationStatus === VerificationStatus.VERIFIED
          ? Role.SPONSOR
          : Role.USER,
      companyId: company.id,
      isActive: true,
    });

    companiesByType[type] = { id: company.id };
    sponsorUsersByType[type] = { id: ownerUser.id, email: ownerUser.email };
  }

  // ============================================
  // EVENTS (ALL EventCategory + all EventStatus + all VerificationStatus)
  // ============================================
  console.log('Creating events...');

  const eventSeeds: Array<{
    key: string;
    organizerKey: string;
    title: string;
    description?: string | null;
    expectedFootfall: number;
    startDate: Date;
    endDate: Date;
    status: EventStatus;
    verificationStatus: VerificationStatus;
    category: EventCategory;
    edition: EventEdition;
    website?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    pptDeckUrl?: string | null;
    approvedById?: string | null;
    approvedAt?: Date | null;
    rejectionReason?: string | null;
    isActive?: boolean;
  }> = [
    {
      key: 'tech-summit',
      organizerKey: 'individual',
      title: 'Global Tech Summit 2026',
      description: 'Flagship conference for AI, cloud, and developer tools.',
      expectedFootfall: 15000,
      startDate: daysFromNow(35),
      endDate: daysFromNow(37),
      status: EventStatus.PUBLISHED,
      verificationStatus: VerificationStatus.VERIFIED,
      category: EventCategory.TECHNOLOGY,
      edition: EventEdition.FIFTH,
      website: 'https://global-tech-summit.example.com',
      contactPhone: '+91-555-210-0001',
      contactEmail: 'contact@global-tech-summit.example.com',
      pptDeckUrl: 'https://assets.example.com/decks/tech-summit.pdf',
      approvedById: usersByKey.manager1.id,
      approvedAt: daysAgo(4),
    },
    {
      key: 'music-fest',
      organizerKey: 'company',
      title: 'Neon Nights Music Fest',
      description: null,
      expectedFootfall: 22000,
      startDate: daysFromNow(50),
      endDate: daysFromNow(52),
      status: EventStatus.DRAFT,
      verificationStatus: VerificationStatus.PENDING,
      category: EventCategory.MUSIC_ENTERTAINMENT,
      edition: EventEdition.INAUGURAL,
      website: null,
      contactPhone: '+91-555-210-0002',
      contactEmail: null,
      pptDeckUrl: null,
    },
    {
      key: 'business-expo',
      organizerKey: 'nonProfit',
      title: 'SME Growth Business Expo',
      description: 'Networking and sponsorship opportunities for SMB brands.',
      expectedFootfall: 9000,
      startDate: daysFromNow(18),
      endDate: daysFromNow(19),
      status: EventStatus.UNDER_MANAGER_REVIEW,
      verificationStatus: VerificationStatus.PENDING,
      category: EventCategory.BUSINESS,
      edition: EventEdition.THIRD,
      website: 'https://sme-growth-expo.example.com',
      contactPhone: '+91-555-210-0003',
      contactEmail: 'ops@sme-growth-expo.example.com',
      pptDeckUrl: 'https://assets.example.com/decks/sme-growth.pdf',
    },
    {
      key: 'education-fair',
      organizerKey: 'education',
      title: 'Future of Learning Fair',
      description: 'Workshops, bootcamps, and education financing sessions.',
      expectedFootfall: 11000,
      startDate: daysFromNow(42),
      endDate: daysFromNow(44),
      status: EventStatus.VERIFIED,
      verificationStatus: VerificationStatus.VERIFIED,
      category: EventCategory.EDUCATION,
      edition: EventEdition.SECOND,
      website: 'https://future-learning-fair.example.edu',
      contactPhone: '+91-555-210-0004',
      contactEmail: 'hello@future-learning-fair.example.edu',
      approvedById: usersByKey.manager1.id,
      approvedAt: daysAgo(3),
    },
    {
      key: 'sports-cup',
      organizerKey: 'government',
      title: 'City Sports Championship',
      description: 'Inter-city sports and fitness campaign.',
      expectedFootfall: 30000,
      startDate: daysFromNow(75),
      endDate: daysFromNow(79),
      status: EventStatus.REJECTED,
      verificationStatus: VerificationStatus.REJECTED,
      category: EventCategory.SPORTS,
      edition: EventEdition.TENTH,
      website: 'https://city-sports.example.gov',
      approvedById: usersByKey.manager2.id,
      approvedAt: daysAgo(2),
      rejectionReason: 'Missing mandatory permits for stadium booking.',
    },
    {
      key: 'cultural-carnival',
      organizerKey: 'club',
      title: 'Heritage Cultural Carnival',
      description: 'Regional food, dance, and arts celebration.',
      expectedFootfall: 16000,
      startDate: daysFromNow(60),
      endDate: daysFromNow(61),
      status: EventStatus.CANCELLED,
      verificationStatus: VerificationStatus.VERIFIED,
      category: EventCategory.CULTURAL,
      edition: EventEdition.BI_ANNUAL,
      website: 'https://heritage-carnival.example.com',
      contactPhone: '+91-555-210-0006',
      approvedById: usersByKey.manager1.id,
      approvedAt: daysAgo(5),
    },
    {
      key: 'art-show',
      organizerKey: 'other',
      title: 'Urban Art & Creative Show',
      description: 'Street art, installations, and gallery pop-ups.',
      expectedFootfall: 7000,
      startDate: daysAgo(24),
      endDate: daysAgo(23),
      status: EventStatus.COMPLETED,
      verificationStatus: VerificationStatus.VERIFIED,
      category: EventCategory.ART_CREATIVE,
      edition: EventEdition.FOURTH,
      website: 'https://urban-art-show.example.com',
      approvedById: usersByKey.manager1.id,
      approvedAt: daysAgo(40),
      isActive: false,
    },
    {
      key: 'lifestyle-con',
      organizerKey: 'individual',
      title: 'Lifestyle & Wellness Conclave',
      description: 'Fitness, mindfulness, nutrition, and lifestyle brands.',
      expectedFootfall: 12500,
      startDate: daysFromNow(26),
      endDate: daysFromNow(27),
      status: EventStatus.PUBLISHED,
      verificationStatus: VerificationStatus.PENDING,
      category: EventCategory.LIFESTYLE,
      edition: EventEdition.QUATERLY,
      website: 'https://lifestyle-conclave.example.com',
      contactPhone: '+91-555-210-0008',
      contactEmail: 'partner@lifestyle-conclave.example.com',
    },
    {
      key: 'community-meetup',
      organizerKey: 'company',
      title: 'Community Impact Meetup',
      description: 'Small-format event for local civic initiatives.',
      expectedFootfall: 2500,
      startDate: daysFromNow(14),
      endDate: daysFromNow(14),
      status: EventStatus.DRAFT,
      verificationStatus: VerificationStatus.REJECTED,
      category: EventCategory.OTHER,
      edition: EventEdition.OTHER,
      website: null,
      approvedById: usersByKey.manager2.id,
      approvedAt: daysAgo(1),
      rejectionReason: 'Insufficient event budget and scope details.',
    },
  ];

  const eventsByKey: Record<string, { id: string }> = {};

  for (const seed of eventSeeds) {
    const event = await prisma.event.create({
      data: {
        organizerId: organizersByKey[seed.organizerKey].id,
        title: seed.title,
        description: seed.description ?? null,
        expectedFootfall: seed.expectedFootfall,
        startDate: seed.startDate,
        endDate: seed.endDate,
        status: seed.status,
        website: seed.website ?? null,
        verificationStatus: seed.verificationStatus,
        isActive: seed.isActive ?? true,
        category: seed.category,
        pptDeckUrl: seed.pptDeckUrl ?? null,
        contactPhone: seed.contactPhone ?? null,
        contactEmail: seed.contactEmail ?? null,
        edition: seed.edition,
        approvedById: seed.approvedById ?? null,
        approvedAt: seed.approvedAt ?? null,
        rejectionReason: seed.rejectionReason ?? null,
      },
    });

    eventsByKey[seed.key] = { id: event.id };
  }

  // ============================================
  // ADDRESSES (event location optionality coverage)
  // ============================================
  console.log('Creating addresses...');

  const addressSeeds: Array<{
    eventKey: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }> = [
    {
      eventKey: 'tech-summit',
      addressLine1: '1200 Innovation Drive',
      addressLine2: 'Hall A',
      city: 'San Francisco',
      state: 'California',
      country: 'USA',
      postalCode: '94105',
    },
    {
      eventKey: 'business-expo',
      addressLine1: '88 Commerce Ave',
      addressLine2: null,
      city: 'Chicago',
      state: 'Illinois',
      country: 'USA',
      postalCode: '60601',
    },
    {
      eventKey: 'education-fair',
      addressLine1: '1 University Plaza',
      addressLine2: 'Convention Center',
      city: 'Boston',
      state: 'Massachusetts',
      country: 'USA',
      postalCode: '02115',
    },
    {
      eventKey: 'cultural-carnival',
      addressLine1: '560 Heritage Lane',
      addressLine2: null,
      city: 'Austin',
      state: 'Texas',
      country: 'USA',
      postalCode: '78701',
    },
    {
      eventKey: 'lifestyle-con',
      addressLine1: '420 Wellness Street',
      addressLine2: 'Floor 3',
      city: 'Los Angeles',
      state: 'California',
      country: 'USA',
      postalCode: '90015',
    },
    {
      eventKey: 'community-meetup',
      addressLine1: '75 Civic Center Rd',
      addressLine2: null,
      city: 'Seattle',
      state: 'Washington',
      country: 'USA',
      postalCode: '98101',
    },
  ];

  for (const seed of addressSeeds) {
    await prisma.address.create({
      data: {
        eventId: eventsByKey[seed.eventKey].id,
        addressLine1: seed.addressLine1,
        addressLine2: seed.addressLine2 ?? null,
        city: seed.city,
        state: seed.state,
        country: seed.country,
        postalCode: seed.postalCode,
      },
    });
  }

  // ============================================
  // AUDIENCE PROFILES + DISTRIBUTIONS
  // ============================================
  console.log('Creating audience profiles...');

  const techProfile = await prisma.eventAudienceProfile.create({
    data: {
      eventId: eventsByKey['tech-summit'].id,
    },
  });

  await prisma.audienceGender.createMany({
    data: [
      { profileId: techProfile.id, gender: GenderType.MALE, percentage: 52 },
      { profileId: techProfile.id, gender: GenderType.FEMALE, percentage: 46 },
      { profileId: techProfile.id, gender: GenderType.OTHER, percentage: 2 },
    ],
  });

  await prisma.audienceAgeGroup.createMany({
    data: [
      { profileId: techProfile.id, bracket: AgeBracket.AGE_5_12, percentage: 2 },
      { profileId: techProfile.id, bracket: AgeBracket.AGE_12_17, percentage: 8 },
      { profileId: techProfile.id, bracket: AgeBracket.AGE_17_28, percentage: 45 },
      { profileId: techProfile.id, bracket: AgeBracket.AGE_28_45, percentage: 35 },
      { profileId: techProfile.id, bracket: AgeBracket.AGE_45_PLUS, percentage: 10 },
    ],
  });

  await prisma.audienceIncomeGroup.createMany({
    data: [
      { profileId: techProfile.id, bracket: IncomeBracket.BELOW_10L, percentage: 20 },
      {
        profileId: techProfile.id,
        bracket: IncomeBracket.BETWEEN_10L_25L,
        percentage: 31,
      },
      {
        profileId: techProfile.id,
        bracket: IncomeBracket.BETWEEN_25L_50L,
        percentage: 25,
      },
      {
        profileId: techProfile.id,
        bracket: IncomeBracket.BETWEEN_50L_1CR,
        percentage: 16,
      },
      { profileId: techProfile.id, bracket: IncomeBracket.ABOVE_1CR, percentage: 8 },
    ],
  });

  await prisma.audienceRegionDistribution.createMany({
    data: [
      {
        profileId: techProfile.id,
        stateOrUT: 'California',
        country: 'United States',
        percentage: 40,
      },
      {
        profileId: techProfile.id,
        stateOrUT: 'New York',
        country: 'United States',
        percentage: 35,
      },
      {
        profileId: techProfile.id,
        stateOrUT: 'Texas',
        country: 'United States',
        percentage: 25,
      },
    ],
  });

  const lifestyleProfile = await prisma.eventAudienceProfile.create({
    data: {
      eventId: eventsByKey['lifestyle-con'].id,
    },
  });

  await prisma.audienceGender.create({
    data: {
      profileId: lifestyleProfile.id,
      gender: GenderType.FEMALE,
      percentage: 100,
    },
  });

  await prisma.audienceAgeGroup.create({
    data: {
      profileId: lifestyleProfile.id,
      bracket: AgeBracket.AGE_28_45,
      percentage: 100,
    },
  });

  await prisma.audienceIncomeGroup.create({
    data: {
      profileId: lifestyleProfile.id,
      bracket: IncomeBracket.BETWEEN_10L_25L,
      percentage: 100,
    },
  });

  await prisma.audienceRegionDistribution.create({
    data: {
      profileId: lifestyleProfile.id,
      stateOrUT: 'California',
      country: 'United States',
      percentage: 100,
    },
  });

  // ============================================
  // TIERS (ALL TierType + lock/soldout/inactive combinations)
  // ============================================
  console.log('Creating sponsorship tiers...');

  const tierSeeds: Array<{
    key: string;
    eventKey: string;
    tierType: TierType;
    customName?: string | null;
    askingPrice: number;
    totalSlots: number;
    soldSlots: number;
    isLocked: boolean;
    isActive: boolean;
    benefits: string[];
  }> = [
    {
      key: 'title-tier',
      eventKey: 'tech-summit',
      tierType: TierType.TITLE,
      customName: null,
      askingPrice: 300000,
      totalSlots: 1,
      soldSlots: 1,
      isLocked: true,
      isActive: true,
      benefits: ['Event naming rights', 'Prime stage branding'],
    },
    {
      key: 'platinum-tier',
      eventKey: 'tech-summit',
      tierType: TierType.PLATINUM,
      customName: null,
      askingPrice: 180000,
      totalSlots: 3,
      soldSlots: 1,
      isLocked: true,
      isActive: true,
      benefits: ['Main stage booth', 'VIP networking access'],
    },
    {
      key: 'gold-tier',
      eventKey: 'tech-summit',
      tierType: TierType.GOLD,
      customName: null,
      askingPrice: 95000,
      totalSlots: 5,
      soldSlots: 0,
      isLocked: false,
      isActive: true,
      benefits: [],
    },
    {
      key: 'custom-tier',
      eventKey: 'tech-summit',
      tierType: TierType.CUSTOM,
      customName: 'Startup Alley Partner',
      askingPrice: 40000,
      totalSlots: 2,
      soldSlots: 2,
      isLocked: false,
      isActive: true,
      benefits: ['Demo booth', 'Startup pitch mention'],
    },
    {
      key: 'legacy-custom-inactive',
      eventKey: 'tech-summit',
      tierType: TierType.CUSTOM,
      customName: 'Legacy Partner Pack',
      askingPrice: 25000,
      totalSlots: 1,
      soldSlots: 0,
      isLocked: false,
      isActive: false,
      benefits: ['Archived package'],
    },
    {
      key: 'presenting-tier',
      eventKey: 'business-expo',
      tierType: TierType.PRESENTING,
      customName: null,
      askingPrice: 130000,
      totalSlots: 1,
      soldSlots: 0,
      isLocked: false,
      isActive: true,
      benefits: ['Co-presenter mention'],
    },
    {
      key: 'powered-tier',
      eventKey: 'business-expo',
      tierType: TierType.POWERED_BY,
      customName: null,
      askingPrice: 90000,
      totalSlots: 2,
      soldSlots: 2,
      isLocked: true,
      isActive: true,
      benefits: ['Powered-by placement'],
    },
    {
      key: 'silver-tier',
      eventKey: 'business-expo',
      tierType: TierType.SILVER,
      customName: null,
      askingPrice: 60000,
      totalSlots: 4,
      soldSlots: 1,
      isLocked: false,
      isActive: true,
      benefits: ['Newsletter mention'],
    },
  ];

  const tiersByKey: Record<string, { id: string }> = {};

  for (const seed of tierSeeds) {
    const tier = await prisma.sponsorshipTier.create({
      data: {
        eventId: eventsByKey[seed.eventKey].id,
        tierType: seed.tierType,
        customName: seed.customName ?? null,
        askingPrice: seed.askingPrice,
        totalSlots: seed.totalSlots,
        soldSlots: seed.soldSlots,
        isLocked: seed.isLocked,
        isActive: seed.isActive,
        benefits: JSON.stringify(seed.benefits),
      },
    });
    tiersByKey[seed.key] = { id: tier.id };
  }

  // ============================================
  // TIER DELIVERABLE FORMS + ROWS (all DeliverableFormStatus)
  // ============================================
  console.log('Creating tier deliverable forms...');

  const deliverableFormSeeds: Array<{
    key: string;
    tierKey: string;
    status: DeliverableFormStatus;
    rows: Array<{
      category: DeliverableCategory;
      deliverableName: string;
      brandingType: BrandingType;
      quantity: number;
      unit: DeliverableUnit;
      otherUnit?: string | null;
      remarks?: string | null;
      sortOrder?: number;
    }>;
  }> = [
    {
      key: 'form-title-submitted',
      tierKey: 'title-tier',
      status: DeliverableFormStatus.SUBMITTED,
      rows: [
        {
          category: DeliverableCategory.PHYSICAL,
          deliverableName: 'Main Stage Backdrop Branding',
          brandingType: BrandingType.EXCLUSIVE,
          quantity: 1,
          unit: DeliverableUnit.BOARDS,
          remarks: 'Center stage full-width branding',
        },
        {
          category: DeliverableCategory.DIGITAL,
          deliverableName: 'Event Mobile App Featured Banner',
          brandingType: BrandingType.MULTI,
          quantity: 7,
          unit: DeliverableUnit.DAYS,
          remarks: 'Runs throughout event week',
        },
      ],
    },
    {
      key: 'form-platinum-sent',
      tierKey: 'platinum-tier',
      status: DeliverableFormStatus.SENT_TO_ORGANIZER,
      rows: [
        {
          category: DeliverableCategory.PHYSICAL,
          deliverableName: 'Exhibition Booth Panels',
          brandingType: BrandingType.MULTI,
          quantity: 4,
          unit: DeliverableUnit.PIECES,
          remarks: 'Booth wall side panels',
        },
      ],
    },
    {
      key: 'form-gold-draft',
      tierKey: 'gold-tier',
      status: DeliverableFormStatus.DRAFT,
      rows: [
        {
          category: DeliverableCategory.DIGITAL,
          deliverableName: 'Social Media Mention Slots',
          brandingType: BrandingType.MULTI,
          quantity: 6,
          unit: DeliverableUnit.POSTS,
          remarks: 'Across Instagram and LinkedIn',
        },
      ],
    },
    {
      key: 'form-presenting-filled',
      tierKey: 'presenting-tier',
      status: DeliverableFormStatus.FILLED,
      rows: [
        {
          category: DeliverableCategory.PHYSICAL,
          deliverableName: 'Presenting Sponsor Zone Signage',
          brandingType: BrandingType.EXCLUSIVE,
          quantity: 3,
          unit: DeliverableUnit.BANNERS,
        },
        {
          category: DeliverableCategory.DIGITAL,
          deliverableName: 'Custom Deliverable Unit Example',
          brandingType: BrandingType.MULTI,
          quantity: 12,
          unit: DeliverableUnit.OTHER,
          otherUnit: 'Story frames',
        },
      ],
    },
  ];

  const deliverableFormsByKey: Record<string, { id: string }> = {};

  for (const seed of deliverableFormSeeds) {
    const form = await prisma.tierDeliverableForm.create({
      data: {
        tierId: tiersByKey[seed.tierKey].id,
        status: seed.status,
        rows: {
          create: seed.rows.map((row, index) => ({
            category: row.category,
            deliverableName: row.deliverableName,
            brandingType: row.brandingType,
            quantity: row.quantity,
            unit: row.unit,
            otherUnit: row.otherUnit ?? null,
            remarks: row.remarks ?? null,
            sortOrder: row.sortOrder ?? index,
          })),
        },
      },
    });
    deliverableFormsByKey[seed.key] = { id: form.id };
  }

  // ============================================
  // DELIVERABLE TEMPLATES
  // ============================================
  console.log('Creating deliverable templates...');

  const deliverableTemplateSeeds: Array<{
    name: string;
    description: string;
    rows: Array<{
      category: DeliverableCategory;
      deliverableName: string;
      brandingType: BrandingType;
      quantity: number;
      unit: DeliverableUnit;
      otherUnit?: string | null;
      remarks?: string | null;
    }>;
  }> = [
    {
      name: 'Tech Conference Core Pack',
      description: 'Default pack for B2B technology conferences.',
      rows: [
        {
          category: DeliverableCategory.PHYSICAL,
          deliverableName: 'Entrance Arch Branding',
          brandingType: BrandingType.MULTI,
          quantity: 2,
          unit: DeliverableUnit.PIECES,
        },
        {
          category: DeliverableCategory.DIGITAL,
          deliverableName: 'Website Hero Banner',
          brandingType: BrandingType.EXCLUSIVE,
          quantity: 14,
          unit: DeliverableUnit.DAYS,
          remarks: 'Displayed on homepage before event',
        },
      ],
    },
    {
      name: 'Community Event Light Pack',
      description: 'Lean template for local community and impact events.',
      rows: [
        {
          category: DeliverableCategory.PHYSICAL,
          deliverableName: 'On-ground Flyers',
          brandingType: BrandingType.MULTI,
          quantity: 500,
          unit: DeliverableUnit.PIECES,
        },
        {
          category: DeliverableCategory.DIGITAL,
          deliverableName: 'Community Group Mentions',
          brandingType: BrandingType.MULTI,
          quantity: 5,
          unit: DeliverableUnit.OTHER,
          otherUnit: 'Announcements',
        },
      ],
    },
  ];

  for (const seed of deliverableTemplateSeeds) {
    await prisma.deliverableTemplate.create({
      data: {
        name: seed.name,
        description: seed.description,
        rows: seed.rows as Prisma.InputJsonValue,
      },
    });
  }

  // ============================================
  // SPONSORSHIPS (all SponsorshipStatus + active/inactive)
  // ============================================
  console.log('Creating sponsorships...');

  const sponsorshipSeeds: Array<{
    key: string;
    companyType: CompanyType;
    eventKey: string;
    status: SponsorshipStatus;
    tier?: string | null;
    notes?: string | null;
    isActive: boolean;
  }> = [
    {
      key: 'sp-active',
      companyType: CompanyType.TECHNOLOGY,
      eventKey: 'tech-summit',
      status: SponsorshipStatus.ACTIVE,
      tier: 'TITLE',
      notes: 'Primary title sponsor.',
      isActive: true,
    },
    {
      key: 'sp-pending',
      companyType: CompanyType.FINANCE,
      eventKey: 'tech-summit',
      status: SponsorshipStatus.PENDING,
      tier: 'PLATINUM',
      notes: null,
      isActive: true,
    },
    {
      key: 'sp-paused',
      companyType: CompanyType.FMCG,
      eventKey: 'business-expo',
      status: SponsorshipStatus.PAUSED,
      tier: 'SILVER',
      notes: 'Paused pending internal budget cycle.',
      isActive: true,
    },
    {
      key: 'sp-completed',
      companyType: CompanyType.HEALTHCARE_PHARMA,
      eventKey: 'education-fair',
      status: SponsorshipStatus.COMPLETED,
      tier: 'GOLD',
      notes: 'Contract completed for previous edition.',
      isActive: true,
    },
    {
      key: 'sp-cancelled',
      companyType: CompanyType.RETAIL_ECOMMERCE,
      eventKey: 'cultural-carnival',
      status: SponsorshipStatus.CANCELLED,
      tier: null,
      notes: 'Cancelled after event budget revisions.',
      isActive: true,
    },
    {
      key: 'sp-inactive',
      companyType: CompanyType.MANUFACTURING_INDUSTRIAL,
      eventKey: 'lifestyle-con',
      status: SponsorshipStatus.ACTIVE,
      tier: null,
      notes: 'Inactive legacy sponsorship row.',
      isActive: false,
    },
  ];

  const sponsorshipsByKey: Record<string, { id: string }> = {};

  for (const seed of sponsorshipSeeds) {
    const sponsorship = await prisma.sponsorship.create({
      data: {
        companyId: companiesByType[seed.companyType]!.id,
        eventId: eventsByKey[seed.eventKey].id,
        status: seed.status,
        tier: seed.tier ?? null,
        notes: seed.notes ?? null,
        isActive: seed.isActive,
      },
    });
    sponsorshipsByKey[seed.key] = { id: sponsorship.id };
  }

  // ============================================
  // PROPOSALS (all ProposalStatus + organizer approval edges)
  // ============================================
  console.log('Creating proposals...');

  const proposalSeeds: Array<{
    key: string;
    sponsorshipKey: string;
    tierKey?: string | null;
    status: ProposalStatus;
    proposedTier?: string | null;
    proposedAmount?: number | null;
    message?: string | null;
    notes?: string | null;
    submittedAt?: Date | null;
    reviewedAt?: Date | null;
    reviewedById?: string | null;
    reviewedByRole?: Role | null;
    managerReviewNote?: string | null;
    organizerApprovalStatus?: OrganizerApprovalStatus;
    organizerApprovedById?: string | null;
    organizerApprovedAt?: Date | null;
    organizerRejectionNote?: string | null;
    isActive?: boolean;
  }> = [
    {
      key: 'proposal-draft',
      sponsorshipKey: 'sp-pending',
      tierKey: 'platinum-tier',
      status: ProposalStatus.DRAFT,
      proposedTier: 'PLATINUM',
      proposedAmount: null,
      message: 'Initial draft for Q2 budget.',
      organizerApprovalStatus: OrganizerApprovalStatus.PENDING,
    },
    {
      key: 'proposal-submitted',
      sponsorshipKey: 'sp-pending',
      tierKey: 'platinum-tier',
      status: ProposalStatus.SUBMITTED,
      proposedTier: 'PLATINUM',
      proposedAmount: 175000,
      message: 'Submitting revised amount with added booth staffing.',
      submittedAt: daysAgo(5),
      organizerApprovalStatus: OrganizerApprovalStatus.PENDING,
    },
    {
      key: 'proposal-under-review',
      sponsorshipKey: 'sp-paused',
      tierKey: 'silver-tier',
      status: ProposalStatus.UNDER_MANAGER_REVIEW,
      proposedTier: 'SILVER',
      proposedAmount: 58000,
      message: 'Need manager review before organizer routing.',
      submittedAt: daysAgo(8),
      reviewedById: usersByKey.manager1.id,
      reviewedByRole: Role.MANAGER,
      managerReviewNote: 'Financial terms look acceptable.',
      organizerApprovalStatus: OrganizerApprovalStatus.PENDING,
    },
    {
      key: 'proposal-forwarded',
      sponsorshipKey: 'sp-paused',
      tierKey: 'presenting-tier',
      status: ProposalStatus.FORWARDED_TO_ORGANIZER,
      proposedTier: 'PRESENTING',
      proposedAmount: 120000,
      message: 'Forwarded after manager recommendation.',
      submittedAt: daysAgo(10),
      reviewedAt: daysAgo(9),
      reviewedById: usersByKey.manager2.id,
      reviewedByRole: Role.MANAGER,
      managerReviewNote: 'Forwarding to organizer for final decision.',
      organizerApprovalStatus: OrganizerApprovalStatus.PENDING,
    },
    {
      key: 'proposal-approved',
      sponsorshipKey: 'sp-active',
      tierKey: 'title-tier',
      status: ProposalStatus.APPROVED,
      proposedTier: 'TITLE',
      proposedAmount: 260000,
      message: 'Approved with keynote branding add-on.',
      notes: 'Final commercial agreement signed.',
      submittedAt: daysAgo(14),
      reviewedAt: daysAgo(12),
      reviewedById: usersByKey.manager1.id,
      reviewedByRole: Role.MANAGER,
      managerReviewNote: 'Meets strategic fit criteria.',
      organizerApprovalStatus: OrganizerApprovalStatus.APPROVED,
      organizerApprovedById: organizerUsersByKey.individual.id,
      organizerApprovedAt: daysAgo(11),
    },
    {
      key: 'proposal-rejected',
      sponsorshipKey: 'sp-cancelled',
      tierKey: null,
      status: ProposalStatus.REJECTED,
      proposedTier: 'CUSTOM',
      proposedAmount: 50000,
      message: 'Rejected due to mismatch with event guidelines.',
      notes: 'Rejected in organizer review round.',
      submittedAt: daysAgo(13),
      reviewedAt: daysAgo(12),
      reviewedById: usersByKey.manager2.id,
      reviewedByRole: Role.MANAGER,
      managerReviewNote: 'Not aligned with event category.',
      organizerApprovalStatus: OrganizerApprovalStatus.REJECTED,
      organizerApprovedById: organizerUsersByKey.club.id,
      organizerApprovedAt: daysAgo(11),
      organizerRejectionNote: 'Brand does not match community policy.',
    },
    {
      key: 'proposal-request-changes',
      sponsorshipKey: 'sp-inactive',
      tierKey: null,
      status: ProposalStatus.REQUEST_CHANGES,
      proposedTier: 'GOLD',
      proposedAmount: 81000,
      message: 'Please revise activation timeline and deliverables.',
      submittedAt: daysAgo(6),
      reviewedAt: daysAgo(4),
      reviewedById: usersByKey.admin.id,
      reviewedByRole: Role.ADMIN,
      managerReviewNote: 'Need clearer execution plan.',
      organizerApprovalStatus: OrganizerApprovalStatus.PENDING,
    },
    {
      key: 'proposal-withdrawn',
      sponsorshipKey: 'sp-completed',
      tierKey: null,
      status: ProposalStatus.WITHDRAWN,
      proposedTier: 'GOLD',
      proposedAmount: 90000,
      message: 'Withdrawn by sponsor after strategy change.',
      submittedAt: daysAgo(7),
      organizerApprovalStatus: OrganizerApprovalStatus.PENDING,
    },
    {
      key: 'proposal-inactive-approved',
      sponsorshipKey: 'sp-completed',
      tierKey: null,
      status: ProposalStatus.APPROVED,
      proposedTier: 'POWERED_BY',
      proposedAmount: 65000,
      message: 'Legacy approved proposal retained as inactive.',
      notes: 'Archived record for analytics.',
      submittedAt: daysAgo(40),
      reviewedAt: daysAgo(39),
      reviewedById: usersByKey.manager3.id,
      reviewedByRole: Role.MANAGER,
      organizerApprovalStatus: OrganizerApprovalStatus.APPROVED,
      organizerApprovedById: organizerUsersByKey.education.id,
      organizerApprovedAt: daysAgo(38),
      isActive: false,
    },
  ];

  const proposalsByKey: Record<string, { id: string }> = {};

  for (const seed of proposalSeeds) {
    const proposal = await prisma.proposal.create({
      data: {
        sponsorshipId: sponsorshipsByKey[seed.sponsorshipKey].id,
        tierId: seed.tierKey ? tiersByKey[seed.tierKey].id : null,
        status: seed.status,
        proposedTier: seed.proposedTier ?? null,
        proposedAmount: seed.proposedAmount ?? null,
        message: seed.message ?? null,
        notes: seed.notes ?? null,
        submittedAt: seed.submittedAt ?? null,
        reviewedAt: seed.reviewedAt ?? null,
        reviewedById: seed.reviewedById ?? null,
        reviewedByRole: seed.reviewedByRole ?? null,
        managerReviewNote: seed.managerReviewNote ?? null,
        organizerApprovalStatus:
          seed.organizerApprovalStatus ?? OrganizerApprovalStatus.PENDING,
        organizerApprovedById: seed.organizerApprovedById ?? null,
        organizerApprovedAt: seed.organizerApprovedAt ?? null,
        organizerRejectionNote: seed.organizerRejectionNote ?? null,
        isActive: seed.isActive ?? true,
      },
    });

    proposalsByKey[seed.key] = { id: proposal.id };
  }

  // ============================================
  // PROPOSAL MESSAGES
  // ============================================
  console.log('Creating proposal messages...');

  await prisma.proposalMessage.createMany({
    data: [
      {
        proposalId: proposalsByKey['proposal-submitted'].id,
        senderId: sponsorUsersByType[CompanyType.FINANCE]!.id,
        senderRole: Role.SPONSOR,
        message: 'Attached revised budget and audience activation plan.',
      },
      {
        proposalId: proposalsByKey['proposal-submitted'].id,
        senderId: usersByKey.manager1.id,
        senderRole: Role.MANAGER,
        message: 'Received. Reviewing legal and commercial terms.',
      },
      {
        proposalId: proposalsByKey['proposal-under-review'].id,
        senderId: organizerUsersByKey.nonProfit.id,
        senderRole: Role.ORGANIZER,
        message: 'Need more details on on-ground stall requirements.',
      },
      {
        proposalId: proposalsByKey['proposal-approved'].id,
        senderId: usersByKey.admin.id,
        senderRole: Role.ADMIN,
        message: 'Approved proposal archived for compliance tracking.',
      },
      {
        proposalId: proposalsByKey['proposal-rejected'].id,
        senderId: usersByKey.manager2.id,
        senderRole: Role.MANAGER,
        message: 'Rejected due to policy mismatch and low relevance.',
      },
    ],
  });

  // ============================================
  // REFRESH TOKENS
  // ============================================
  console.log('Creating refresh tokens...');

  await prisma.refreshToken.createMany({
    data: [
      {
        userId: usersByKey.superAdmin.id,
        tokenHash: 'seed_rt_superadmin_active',
        deviceInfo: 'MacBook Pro / Chrome',
        isRevoked: false,
        expiresAt: daysFromNow(30),
        rotatedAt: null,
      },
      {
        userId: usersByKey.manager1.id,
        tokenHash: 'seed_rt_manager_revoked',
        deviceInfo: 'iPhone / Safari',
        isRevoked: true,
        expiresAt: daysFromNow(20),
        rotatedAt: daysAgo(1),
      },
      {
        userId: sponsorUsersByType[CompanyType.TECHNOLOGY]!.id,
        tokenHash: 'seed_rt_sponsor_expired',
        deviceInfo: null,
        isRevoked: false,
        expiresAt: daysAgo(2),
        rotatedAt: null,
      },
    ],
  });

  // ============================================
  // NOTIFICATIONS (ALL severities + read/unread)
  // ============================================
  console.log('Creating notifications...');

  await prisma.notification.createMany({
    data: [
      {
        userId: usersByKey.manager1.id,
        title: 'New Event Awaiting Review',
        message: 'SME Growth Business Expo is pending verification.',
        severity: NotificationSeverity.INFO,
        read: false,
        link: '/manager/events',
        entityType: 'Event',
        entityId: eventsByKey['business-expo'].id,
      },
      {
        userId: organizerUsersByKey.individual.id,
        title: 'Proposal Approved',
        message: 'A title sponsorship proposal has been approved.',
        severity: NotificationSeverity.SUCCESS,
        read: true,
        link: '/organizer/proposals',
        entityType: 'Proposal',
        entityId: proposalsByKey['proposal-approved'].id,
      },
      {
        userId: sponsorUsersByType[CompanyType.FINANCE]!.id,
        title: 'Proposal Needs Changes',
        message: 'Please revise budget allocations before resubmission.',
        severity: NotificationSeverity.WARNING,
        read: false,
        link: null,
        entityType: 'Proposal',
        entityId: proposalsByKey['proposal-request-changes'].id,
      },
      {
        userId: usersByKey.admin.id,
        title: 'Delivery Failure',
        message: 'One of the proposal workflow emails failed to send.',
        severity: NotificationSeverity.ERROR,
        read: false,
        link: '/manager/activity',
        entityType: 'EmailLog',
        entityId: null,
      },
    ],
  });

  // ============================================
  // EMAIL LOGS (all EmailStatus)
  // ============================================
  console.log('Creating email logs...');

  await prisma.emailLog.createMany({
    data: [
      {
        recipient: sponsorUsersByType[CompanyType.FINANCE]!.email,
        subject: 'Proposal Submitted Successfully',
        jobName: 'proposal_submission_email',
        entityType: 'Proposal',
        entityId: proposalsByKey['proposal-submitted'].id,
        status: EmailStatus.SENT,
        errorMessage: null,
      },
      {
        recipient: organizerUsersByKey.club.email,
        subject: 'Proposal Rejection Notice',
        jobName: 'proposal_status_notification',
        entityType: 'Proposal',
        entityId: proposalsByKey['proposal-rejected'].id,
        status: EmailStatus.FAILED,
        errorMessage: 'SMTP timeout from provider.',
      },
      {
        recipient: usersByKey.manager1.email,
        subject: 'Daily Manager Digest',
        jobName: 'manager_daily_digest',
        entityType: null,
        entityId: null,
        status: EmailStatus.SENT,
        errorMessage: null,
      },
    ],
  });

  // ============================================
  // AUDIT LOGS
  // ============================================
  console.log('Creating audit logs...');

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: usersByKey.manager1.id,
        actorRole: 'MANAGER',
        action: 'event.verified',
        entityType: 'Event',
        entityId: eventsByKey['tech-summit'].id,
        metadata: {
          previousStatus: 'PENDING',
          newStatus: 'VERIFIED',
          source: 'seed',
        },
      },
      {
        actorId: organizerUsersByKey.individual.id,
        actorRole: 'ORGANIZER',
        action: 'proposal.status_changed',
        entityType: 'Proposal',
        entityId: proposalsByKey['proposal-approved'].id,
        metadata: {
          previousStatus: 'UNDER_MANAGER_REVIEW',
          newStatus: 'APPROVED',
          actionBy: 'organizer',
        },
      },
      {
        actorId: usersByKey.admin.id,
        actorRole: 'ADMIN',
        action: 'email.delivery_failure',
        entityType: 'EmailLog',
        entityId: proposalsByKey['proposal-rejected'].id,
        metadata: Prisma.JsonNull,
      },
      {
        actorId: usersByKey.manager2.id,
        actorRole: 'MANAGER',
        action: 'deliverable_form.sent',
        entityType: 'TierDeliverableForm',
        entityId: deliverableFormsByKey['form-platinum-sent'].id,
        metadata: {
          tierKey: 'platinum-tier',
          newStatus: DeliverableFormStatus.SENT_TO_ORGANIZER,
          source: 'seed',
        },
      },
    ],
  });

  // ============================================
  // SUMMARY
  // ============================================
  const [
    userCount,
    organizerCount,
    companyCount,
    eventCount,
    addressCount,
    tierCount,
    deliverableFormCount,
    deliverableRowCount,
    deliverableTemplateCount,
    audienceProfileCount,
    sponsorshipCount,
    proposalCount,
    proposalMessageCount,
    tokenCount,
    notificationCount,
    emailLogCount,
    auditLogCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organizer.count(),
    prisma.company.count(),
    prisma.event.count(),
    prisma.address.count(),
    prisma.sponsorshipTier.count(),
    prisma.tierDeliverableForm.count(),
    prisma.tierDeliverableRow.count(),
    prisma.deliverableTemplate.count(),
    prisma.eventAudienceProfile.count(),
    prisma.sponsorship.count(),
    prisma.proposal.count(),
    prisma.proposalMessage.count(),
    prisma.refreshToken.count(),
    prisma.notification.count(),
    prisma.emailLog.count(),
    prisma.auditLog.count(),
  ]);

  console.log('\n📊 Seed Summary:');
  console.log('================');
  console.log(`Users: ${userCount}`);
  console.log(`Organizers: ${organizerCount}`);
  console.log(`Companies: ${companyCount}`);
  console.log(`Events: ${eventCount}`);
  console.log(`Addresses: ${addressCount}`);
  console.log(`Sponsorship Tiers: ${tierCount}`);
  console.log(`Tier Deliverable Forms: ${deliverableFormCount}`);
  console.log(`Tier Deliverable Rows: ${deliverableRowCount}`);
  console.log(`Deliverable Templates: ${deliverableTemplateCount}`);
  console.log(`Audience Profiles: ${audienceProfileCount}`);
  console.log(`Sponsorships: ${sponsorshipCount}`);
  console.log(`Proposals: ${proposalCount}`);
  console.log(`Proposal Messages: ${proposalMessageCount}`);
  console.log(`Refresh Tokens: ${tokenCount}`);
  console.log(`Notifications: ${notificationCount}`);
  console.log(`Email Logs: ${emailLogCount}`);
  console.log(`Audit Logs: ${auditLogCount}`);
  console.log(`\n🔑 All passwords: ${PASSWORD}`);
  console.log('🔐 Seed auth flow test tokens (raw):');
  console.log(`   - standalone user email verification: ${seedAuthTokens.standaloneVerification}`);
  console.log(`   - manager3 password reset: ${seedAuthTokens.manager3Reset}`);
  console.log('\n✅ Comprehensive seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
