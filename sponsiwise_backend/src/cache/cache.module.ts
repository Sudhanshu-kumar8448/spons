import { Module, Global } from '@nestjs/common';
import { CacheService } from '../common/providers/cache.service';
import { RedisProvider, REDIS_CLIENT } from '../common/providers';

/**
 * CacheModule — makes CacheService available application-wide.
 *
 * Marked @Global so feature modules only need to inject CacheService
 * without adding CacheModule to their own imports array.
 *
 * Re-registers RedisProvider so the REDIS_CLIENT token is available
 * in this module's own injector context.
 */
@Global()
@Module({
  providers: [RedisProvider, CacheService],
  exports: [CacheService, REDIS_CLIENT],
})
export class CacheModule {}
