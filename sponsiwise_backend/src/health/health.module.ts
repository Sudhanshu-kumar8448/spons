import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { PrismaService } from '../common/providers/prisma.service';
import { RedisProvider } from '../common/providers';
import { RedisHealthIndicator } from './redis-health.indicator';

@Module({
    imports: [TerminusModule, HttpModule],
    controllers: [HealthController],
    providers: [PrismaService, RedisProvider, RedisHealthIndicator],
})
export class HealthModule { }
