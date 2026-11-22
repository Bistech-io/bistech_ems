import { z } from 'zod';

const DEFAULT_PROD_SERVER_ORIGIN = 'https://bistech-ems-server.vercel.app';
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
  const defaultUrl =
    process.env.NODE_ENV === 'production'
      ? DEFAULT_PROD_SERVER_ORIGIN
      : DEFAULT_DEV_SERVER_ORIGIN;

  const rawUrl = process.env.API_INTERNAL_URL ?? defaultUrl;
  const normalizedUrl = rawUrl.replace(/\/+$/, '');

  return serverEnvSchema.parse({
    API_INTERNAL_URL: normalizedUrl,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'ems_access',
  });
}
