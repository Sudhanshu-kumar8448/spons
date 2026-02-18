export interface RedisConfig {
  host: string;
  port: number;
  db: number;
  password?: string;
  tls?: Record<string, unknown>;
}

export default (): { redis: RedisConfig } => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const host = process.env.REDIS_HOST;

  if (nodeEnv === 'production' && !host) {
    throw new Error('FATAL: REDIS_HOST environment variable is not set. Cannot start in production without a Redis connection.');
  }

  return {
    redis: {
      host: host || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      db: parseInt(process.env.REDIS_DB || '0', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      tls: nodeEnv === 'production' ? {} : undefined,
    },
  };
};
