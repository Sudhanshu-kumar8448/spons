import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API requests to backend to avoid CORS/cookie issues in development only.
  // In production, api-client.ts calls NEXT_PUBLIC_API_BASE_URL directly.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/:path*',
      },
    ];
  },
};

export default nextConfig;
