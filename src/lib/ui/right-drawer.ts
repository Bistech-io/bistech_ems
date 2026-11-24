'use client';

import { useEffect, useId, useSyncExternalStore } from 'react';

const activeDrawers = new Map<string, number>();
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): number {
  let maxOffset = 0;
  for (const width of activeDrawers.values()) {
    if (width > maxOffset) {
      maxOffset = width;
    }
  }
  return maxOffset;
}

function getServerSnapshot(): number {
  return 0;
}

/**
 * Registers a right-side slide-over drawer while open so floating bottom-right
 * controls (e.g. the feedback button) smoothly shift left alongside the drawer.
 */
export function useRegisterRightDrawer(isOpen: boolean, widthPx: number): void {
  const id = useId();

  useEffect(() => {
    if (!isOpen) {
      if (activeDrawers.delete(id)) {
        emitChange();
      }
      return;
    }

    activeDrawers.set(id, widthPx);
    emitChange();

    return () => {
      if (activeDrawers.delete(id)) {
        emitChange();
      }
    };
  }, [id, isOpen, widthPx]);
}

/**
 * Returns the widest currently open right-side drawer width in pixels (0 when none open).
 */
export function useRightDrawerOffset(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
