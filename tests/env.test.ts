import { afterEach, describe, expect, it } from 'vitest';
import { getServerEnv, publicEnv } from '@/lib/env';

describe('Environment Configuration', () => {
  const originalApiInternal = process.env.API_INTERNAL_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalVercelRef = process.env.VERCEL_GIT_COMMIT_REF;

  afterEach(() => {
    process.env.API_INTERNAL_URL = originalApiInternal;
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    (process.env as Record<string, string | undefined>).VERCEL_ENV = originalVercelEnv;
    (process.env as Record<string, string | undefined>).VERCEL_GIT_COMMIT_REF = originalVercelRef;
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

  it('routes to dev backend on preview/dev deployments', () => {
    delete process.env.API_INTERNAL_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    (process.env as Record<string, string | undefined>).VERCEL_ENV = 'preview';
    (process.env as Record<string, string | undefined>).VERCEL_GIT_COMMIT_REF = 'dev';
    const env = getServerEnv();
    expect(env.API_INTERNAL_URL).toBe('https://bistech-ems-server-dev.vercel.app');
  });

  it('automatically points to dev backend on preview if API_INTERNAL_URL was root production URL', () => {
    process.env.API_INTERNAL_URL = 'https://bistech-ems-server.vercel.app';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    (process.env as Record<string, string | undefined>).VERCEL_ENV = 'preview';
    const env = getServerEnv();
    expect(env.API_INTERNAL_URL).toBe('https://bistech-ems-server-dev.vercel.app');
  });

  it('exposes public NEXT_PUBLIC_SERVER_ORIGIN', () => {
    expect(publicEnv.NEXT_PUBLIC_SERVER_ORIGIN).toBeDefined();
    expect(publicEnv.NEXT_PUBLIC_SERVER_ORIGIN).toMatch(/^https?:\/\//);
  });
});
