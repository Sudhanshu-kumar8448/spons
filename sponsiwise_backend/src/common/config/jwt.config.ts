export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export default (): { jwt: JwtConfig } => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret) {
    throw new Error('FATAL: JWT_ACCESS_SECRET environment variable is not set. Cannot start without a secure JWT secret.');
  }
  if (!refreshSecret) {
    throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is not set. Cannot start without a secure refresh secret.');
  }

  return {
    jwt: {
      accessSecret,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshSecret,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
  };
};
