import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers';

export const worker = setupWorker(...authHandlers);

let started = false;

export async function startMockWorker(): Promise<void> {
  if (started || typeof window === 'undefined') return;
  started = true;
  await worker.start({
    onUnhandledRequest: 'bypass',
  });
}
