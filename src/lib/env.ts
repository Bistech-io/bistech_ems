import { z } from 'zod';

const isDevPreview =
  process.env.VERCEL_GIT_COMMIT_REF === 'dev' ||
  process.env.VERCEL_ENV === 'preview' ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

const DEFAULT_PROD_SERVER_ORIGIN = isDevPreview
  ? 'https://bistech-ems-server-dev.vercel.app'
  : 'https://bistech-ems-server.vercel.app';
const DEFAULT_DEV_SERVER_ORIGIN = 'http://localhost:4000';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_MOCKING: z.enum(['enabled', 'disabled']).default('disabled'),
  NEXT_PUBLIC_SERVER_ORIGIN: z.string().url().default(
    process.env.NODE_ENV === 'production'
      ? DEFAULT_PROD_SERVER_ORIGIN
      : DEFAULT_DEV_SERVER_ORIGIN,
  ),
});

const serverEnvSchema = z.object({
  API_INTERNAL_URL: z.string().url().default(
    process.env.NODE_ENV === 'production'
      ? DEFAULT_PROD_SERVER_ORIGIN
      : DEFAULT_DEV_SERVER_ORIGIN,
  ),
  SESSION_COOKIE_NAME: z.string().min(1).default('ems_access'),
  CLOUDINARY_URL: z.string().optional(),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING ?? 'disabled',
  NEXT_PUBLIC_SERVER_ORIGIN:
    process.env.NEXT_PUBLIC_SERVER_ORIGIN ??
    process.env.NEXT_PUBLIC_API_URL ??
    (process.env.NODE_ENV === 'production'
      ? DEFAULT_PROD_SERVER_ORIGIN
      : DEFAULT_DEV_SERVER_ORIGIN),
});

export const isMockingEnabled = publicEnv.NEXT_PUBLIC_API_MOCKING === 'enabled';

export function getServerEnv() {
  const isDevPreviewActive =
    process.env.VERCEL_GIT_COMMIT_REF === 'dev' ||
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

  const defaultUrl =
    isDevPreviewActive
      ? 'https://bistech-ems-server-dev.vercel.app'
      : process.env.NODE_ENV === 'production'
        ? DEFAULT_PROD_SERVER_ORIGIN
        : DEFAULT_DEV_SERVER_ORIGIN;

  const rawConfigured = process.env.API_INTERNAL_URL;
  const rawUrl =
    isDevPreviewActive && rawConfigured === 'https://bistech-ems-server.vercel.app'
      ? 'https://bistech-ems-server-dev.vercel.app'
      : (rawConfigured ?? defaultUrl);

  const normalizedUrl = rawUrl.replace(/\/+$/, '');

  return serverEnvSchema.parse({
    API_INTERNAL_URL: normalizedUrl,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'ems_access',
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  });
}
