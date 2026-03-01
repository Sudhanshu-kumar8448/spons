import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
//implements ka matlab hai ki ham ek contaract sign kiye hai kisi interface ke sath not class ke sath ke ham iska properties and method use karenge hi . 
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    // yaha ham naya pool create kar rahe hai instead of default of the prisma .pool kahe  to har bar ham jab database intialize karte hai then wo naya connection karta hai pool reuses connections
    const pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    // below line tells prisma to use the custom pool instead of default one
    const adapter = new PrismaPg(pool);

    // calls parent constructor because we have :
    // •PrismaService extends PrismaClient
	  // •So we must initialize parent class
    super({ adapter });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
