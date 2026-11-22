import type { NextConfig } from "next";

const defaultApi =
  process.env.NODE_ENV === 'production'
    ? 'https://bistech-ems-server.vercel.app'
    : 'http://localhost:4000';

const apiInternal = (process.env.API_INTERNAL_URL ?? defaultApi).replace(/\/+$/, '');

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@ems/contracts"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternal}/api/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
