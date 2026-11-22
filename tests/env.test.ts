import { afterEach, describe, expect, it } from 'vitest';
import { getServerEnv, publicEnv } from '@/lib/env';

describe('Environment Configuration', () => {
  const originalApiInternal = process.env.API_INTERNAL_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.API_INTERNAL_URL = originalApiInternal;
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  });

  it('normalizes API_INTERNAL_URL by stripping trailing slashes', () => {
    process.env.API_INTERNAL_URL = 'https://bistech-ems-server.vercel.app/';
    const env = getServerEnv();
    expect(env.API_INTERNAL_URL).toBe('https://bistech-ems-server.vercel.app');
  });

  it('defaults production API_INTERNAL_URL to deployed vercel backend', () => {
    delete process.env.API_INTERNAL_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    const env = getServerEnv();
    expect(env.API_INTERNAL_URL).toBe('https://bistech-ems-server.vercel.app');
  });

  it('exposes public NEXT_PUBLIC_SERVER_ORIGIN', () => {
    expect(publicEnv.NEXT_PUBLIC_SERVER_ORIGIN).toBeDefined();
    expect(publicEnv.NEXT_PUBLIC_SERVER_ORIGIN).toMatch(/^https?:\/\//);
  });
});
