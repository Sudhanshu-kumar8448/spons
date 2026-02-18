import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisConfig } from '../config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: async (configService: ConfigService): Promise<Redis> => {
    const logger = new Logger('RedisProvider');
    const redisConfig = configService.get<RedisConfig>('redis');

    if (!redisConfig) {
      throw new Error('Redis configuration not found');
    }

    const client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      db: redisConfig.db,
      password: redisConfig.password || undefined,
      tls: redisConfig.tls,
      lazyConnect: true,
      enableReadyCheck: true,
    });

    try {
      await client.connect();
      logger.log(`Redis connected to ${redisConfig.host}:${redisConfig.port}`);

      // Connection test: SET / GET
      const testKey = '__connection_test__';
      const testValue = `connected_at_${Date.now()}`;

      await client.set(testKey, testValue);
      const result = await client.get(testKey);
      await client.del(testKey);

      if (result === testValue) {
        logger.log('Redis SET/GET test passed');
      } else {
        logger.warn('Redis SET/GET test returned unexpected value');
      }
    } catch (error) {
      logger.error('Redis connection failed', error);
      throw error;
    }

    return client;
  },
  inject: [ConfigService],
};
