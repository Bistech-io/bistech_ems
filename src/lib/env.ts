import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_MOCKING: z.enum(['enabled', 'disabled']).default('disabled'),
});

const serverEnvSchema = z.object({
  API_INTERNAL_URL: z.string().url().default('http://localhost:4000'),
  SESSION_COOKIE_NAME: z.string().min(1).default('ems_access'),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING ?? 'disabled',
});

export const isMockingEnabled = publicEnv.NEXT_PUBLIC_API_MOCKING === 'enabled';

export function getServerEnv() {
  return serverEnvSchema.parse({
    API_INTERNAL_URL: process.env.API_INTERNAL_URL ?? 'http://localhost:4000',
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'ems_access',
  });
}
