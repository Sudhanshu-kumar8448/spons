import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
    dotenv.config();
}

console.log('Database URL present:', !!process.env.DATABASE_URL);

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
        if (!user.companyId) {
            const companies = await prisma.company.findMany({ take: 1 });

            if (companies.length > 0) {
                console.log(`Linking user to company: ${companies[0].id}`);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { companyId: companies[0].id },
                });
                console.log('Link successful');
            } else {
                console.log('No company found. Creating one...');
                const slug = 'eco-world-' + Math.floor(Math.random() * 1000);
                const newCompany = await prisma.company.create({
                    data: {
                        name: 'Eco World',
                        slug,
                        type: 'OTHER',
                        verificationStatus: 'VERIFIED',
                    },
                });
                console.log(`Created company: ${newCompany.id}`);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { companyId: newCompany.id },
                });
                console.log('Link successful');
            }
        } else {
            console.log('User is already linked to a company:', user.companyId);
            const linkedCompany = await prisma.company.findUnique({
                where: { id: user.companyId },
            });
            if (!linkedCompany) {
                console.log('Company does not exist! Fixing...');
                const slug = 'eco-world-' + Math.floor(Math.random() * 1000);
                const newCompany = await prisma.company.create({
                    data: {
                        name: 'Eco World',
                        slug,
                        type: 'OTHER',
                        verificationStatus: 'VERIFIED',
                    },
                });
                await prisma.user.update({
                    where: { id: user.id },
                    data: { companyId: newCompany.id },
                });
                console.log('Created new company and linked');
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
