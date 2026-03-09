import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'http',
        hostname: '**.minio.io',
      },
      {
        protocol: 'https',
        hostname: '**.minio.io',
      },
      {
        protocol: 'http',
        hostname: 'minio',
      },
      // Add your MinIO/S3 domain here
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
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
