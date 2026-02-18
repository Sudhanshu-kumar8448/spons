import { registerAs } from '@nestjs/config';

/**
 * BullMQ configuration — derives Redis connection from existing env vars.
 *
 * All BullMQ queues and workers share this connection config.
 * The key prefix isolates BullMQ keys from cache keys in the same Redis DB.
 */
export interface BullMQConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  tls?: Record<string, unknown>;
  /** Key prefix to namespace BullMQ keys in Redis */
  prefix: string;
}

export default registerAs(
  'bullmq',
  (): BullMQConfig => ({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    tls: process.env.NODE_ENV === 'production' ? {} : undefined,
    prefix: process.env.BULLMQ_PREFIX || 'sponsiwise:jobs',
  }),
);
