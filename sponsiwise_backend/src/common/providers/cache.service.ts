import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';

/** Default TTL in seconds (60s) — conservative to avoid stale data */
const DEFAULT_TTL = 60;

/**
 * CacheService — lightweight, safe Redis caching abstraction.
 *
 * Design principles:
 *  - Transparent: callers use get/set/del — JSON serialisation is internal
 *  - Optional: every method catches errors and returns null / void on failure
 *  - Tenant-aware: callers build scoped keys; helpers provided for patterns
 *  - No business logic: this is pure infrastructure
 *
 * If Redis is unreachable the system falls back to DB queries automatically
 * because every cache miss returns `null`.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

  // ─── CORE OPERATIONS ────────────────────────────────────

  /**
   * Read a value from cache. Returns `null` on miss or error.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn(
        `Cache GET failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Write a value to cache with an optional TTL (defaults to 60 s).
   */
  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL): Promise<void> {
    try {
      const serialised = JSON.stringify(value);
      await this.redis.set(key, serialised, 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(
        `Cache SET failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete one or more keys. Silently ignores errors.
   */
  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.del(...keys);
    } catch (error) {
      this.logger.warn(
        `Cache DEL failed for keys [${keys.join(', ')}]: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete all keys matching a pattern (e.g. "events:list:tenant:abc*").
   * Uses SCAN to avoid blocking Redis on large key-spaces.
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(
        `Cache DEL-BY-PATTERN failed for "${pattern}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ─── KEY BUILDERS ───────────────────────────────────────

  /**
   * Build a colon-separated cache key from segments.
   * Example: CacheService.key('events', 'list', 'tenant', tenantId)
   *          → "events:list:tenant:<tenantId>"
   */
  static key(...segments: string[]): string {
    return segments.join(':');
  }
}
