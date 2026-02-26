import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API requests to backend to avoid CORS/cookie issues in development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/:path*',
      },
    ];
  },
};

export default nextConfig;
