'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { isMockingEnabled } from '@/lib/env';

/**
 * Single bootstrap integration point for MSW mocking.
 * Removing `src/mocks/` and this provider leaves all feature code intact.
 */
export function MockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isMockingEnabled);

  useEffect(() => {
    if (!isMockingEnabled) return;

    let cancelled = false;
    import('@/mocks/browser')
      .then(({ startMockWorker }) => startMockWorker())
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
