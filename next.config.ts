import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:5000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiUrl}/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    domains: ['localhost'],
  },
};

export default nextConfig;
