import type { NextConfig } from "next";

const isDevPreview =
  process.env.VERCEL_GIT_COMMIT_REF === 'dev' ||
  process.env.VERCEL_ENV === 'preview' ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

const defaultApi = isDevPreview
  ? 'https://bistech-ems-server-dev.vercel.app'
  : process.env.NODE_ENV === 'production'
    ? 'https://bistech-ems-server.vercel.app'
    : 'http://localhost:4000';

const rawConfiguredApi = process.env.API_INTERNAL_URL;
const resolvedApi =
  isDevPreview && rawConfiguredApi === 'https://bistech-ems-server.vercel.app'
    ? 'https://bistech-ems-server-dev.vercel.app'
    : (rawConfiguredApi ?? defaultApi);

const apiInternal = resolvedApi.replace(/\/+$/, '');

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@ems/contracts"],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
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
