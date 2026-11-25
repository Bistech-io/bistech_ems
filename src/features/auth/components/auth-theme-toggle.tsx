'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';

export function AuthThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#23302B] bg-[#0B0F0E]/85 px-3 text-xs font-medium text-[#A3B3AC] transition-colors hover:border-[#2E8B57] hover:text-[#F0F5F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D]"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="h-3.5 w-3.5 text-[#4CAF7D]" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-[#4CAF7D]" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}
