import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../common/providers/prisma.service';

import { RedisHealthIndicator } from './redis-health.indicator';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private db: PrismaHealthIndicator,
        private prisma: PrismaService,
        private memory: MemoryHealthIndicator,
        private redis: RedisHealthIndicator,
    ) { }

    @Get()
    @HealthCheck()
    async check() {
        const result = await this.health.check([
            () => this.db.pingCheck('database', this.prisma),
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
            () => this.redis.isHealthy('redis'),
        ]);

        // In production, return only status without leaking infrastructure details
        if (process.env.NODE_ENV === 'production') {
            return { status: result.status };
        }

        return result;
    }
}
