export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  apiVersion: string;
  corsOrigin?: string;
}

export default (): { app: AppConfig } => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const corsOrigin = process.env.CORS_ORIGIN;

  if (nodeEnv === 'production' && !corsOrigin) {
    throw new Error('FATAL: CORS_ORIGIN environment variable is not set. Cannot start in production without a strict CORS origin.');
  }

  return {
    app: {
      nodeEnv,
      port: parseInt(process.env.PORT || '3000', 10),
      apiPrefix: process.env.API_PREFIX || 'api',
      apiVersion: process.env.API_VERSION || 'v1',
      corsOrigin,
    },
  };
};
