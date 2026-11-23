'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'bistech_ems_theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyDocumentTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('theme-transitioning');

  if (mode === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
  }

  root.dataset.theme = mode;

  window.setTimeout(() => {
    root.classList.remove('theme-transitioning');
  }, 450);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    let initial: ThemeMode = 'dark';
    try {
      const stored = window.localStorage?.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        initial = stored;
      }
    } catch {
      // Ignore storage errors
    }

    const timer = window.setTimeout(() => {
      setThemeState(initial);
      applyDocumentTheme(initial);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    applyDocumentTheme(next);
    try {
      window.localStorage?.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      applyDocumentTheme(next);
      try {
        window.localStorage?.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'dark',
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}
