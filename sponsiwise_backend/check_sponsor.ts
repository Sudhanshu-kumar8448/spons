
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Fallback if .env is in current dir
if (!process.env.DATABASE_URL) {
    dotenv.config();
}

console.log('Database URL present:', !!process.env.DATABASE_URL);

// Use the adapter approach
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = 'sponsor.eco-world@example.com';
    console.log(`Checking user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { company: true },
    });

    console.log('User found:', user);

    if (user) {
        console.log(`Checking companies for tenant: ${user.tenantId}`);
        const companies = await prisma.company.findMany({
            where: { tenantId: user.tenantId },
        });
        console.log('Companies found:', companies);

        // If user has no company but companies exist, link to the first one
        if (!user.companyId && companies.length > 0) {
            console.log(`Linking user to company: ${companies[0].id}`);
            await prisma.user.update({
                where: { id: user.id },
                data: { companyId: companies[0].id }
            });
            console.log('Link successful');
        } else if (!user.companyId && companies.length === 0) {
            console.log('No company found for tenant. Creating one...');

            // Need to ensure unique slug
            const slug = 'eco-world-' + Math.floor(Math.random() * 1000);

            const newCompany = await prisma.company.create({
                data: {
                    tenantId: user.tenantId,
                    name: 'Eco World',
                    slug: slug,
                    type: 'SPONSOR',
                    verificationStatus: 'VERIFIED',
                }
            });
            console.log(`Created company: ${newCompany.id}`);
            await prisma.user.update({
                where: { id: user.id },
                data: { companyId: newCompany.id }
            });
            console.log('Link successful');
        } else {
            console.log('User is already linked to a company:', user.companyId);

            if (!user.companyId) {
                console.log('Unexpected null companyId');
                return;
            }

            // Check if company exists
            const linkedCompany = await prisma.company.findUnique({ where: { id: user.companyId } });
            if (!linkedCompany) {
                console.log('BUT that company does not exist in DB! Fixing...');
                // remove link and recurse/retry logic (simplified here: just create new one)
                // For now, let's just create a new one to be safe if companies list was empty, 
                // but if companies list has items, use the first one.
                if (companies.length > 0) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { companyId: companies[0].id }
                    });
                    console.log('Relinked to existing company');
                } else {
                    // Create new
                    const slug = 'eco-world-' + Math.floor(Math.random() * 1000);
                    const newCompany = await prisma.company.create({
                        data: {
                            tenantId: user.tenantId,
                            name: 'Eco World',
                            slug: slug,
                            type: 'SPONSOR',
                            verificationStatus: 'VERIFIED',
                        }
                    });
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { companyId: newCompany.id }
                    });
                    console.log('Created new company and linked');
                }
            } else {
                console.log('Company link is valid.');
            }
        }
    } else {
        console.log('User not found!');
    }
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
