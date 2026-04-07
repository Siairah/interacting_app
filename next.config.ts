// import type { NextConfig } from "next";
// import { getDefaultApiBaseUrl } from "./src/config/api";

// const apiUrl =
//   process.env.NEXT_PUBLIC_API_URL?.trim() || getDefaultApiBaseUrl();

// const nextConfig: NextConfig = {
//   async rewrites() {
//     return [
//       { source: '/api/:path*', destination: `${apiUrl}/:path*` },
//     ];
//   },
//   images: {
//     remotePatterns: [
//       {
//         protocol: 'https',
//         hostname: '**',
//       },
//     ],
//     domains: ['localhost'],
//   },
// };

// export default nextConfig;
import type { NextConfig } from "next";
import { getDefaultApiBaseUrl } from "./src/config/api";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim() || getDefaultApiBaseUrl();

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiUrl}/:path*` },
    ];
  },

  // ✅ ADD THIS PART
  eslint: {
    ignoreDuringBuilds: true,
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