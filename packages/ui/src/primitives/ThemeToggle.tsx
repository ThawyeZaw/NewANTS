'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../utils/cn';

export type ThemeMode = 'light' | 'dark';

export interface ThemeToggleProps {
  /** Optional controlled theme mode */
  theme?: ThemeMode;
  /** Default initial theme when uncontrolled */
  defaultTheme?: ThemeMode;
  /** Callback fired when theme switches between Light ("The ANTs Academic System") and Dark ("Amber Academic Studio") */
  onThemeChange?: (theme: ThemeMode) => void;
  /** Show text label alongside icon */
  showLabel?: boolean;
  /** Additional classes */
  className?: string;
}

const STORAGE_KEY = 'ants-theme';

function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeToggle({
  theme: controlledTheme,
  defaultTheme = 'light',
  onThemeChange,
  showLabel = false,
  className,
}: ThemeToggleProps) {
  const [internalTheme, setInternalTheme] = useState<ThemeMode>(defaultTheme);

  const activeTheme = controlledTheme ?? internalTheme;

  useEffect(() => {
    if (controlledTheme !== undefined) {
      applyThemeToDocument(controlledTheme);
      return;
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark') {
        setInternalTheme(saved);
        applyThemeToDocument(saved);
        return;
      }
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      const initial: ThemeMode = prefersDark ? 'dark' : defaultTheme;
      setInternalTheme(initial);
      applyThemeToDocument(initial);
    } catch {
      applyThemeToDocument(defaultTheme);
    }
  }, [controlledTheme, defaultTheme]);

  const handleToggle = () => {
    const nextTheme: ThemeMode = activeTheme === 'dark' ? 'light' : 'dark';
    if (controlledTheme === undefined) {
      setInternalTheme(nextTheme);
      try {
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage errors in restricted environments
      }
    }
    applyThemeToDocument(nextTheme);
    onThemeChange?.(nextTheme);
  };

  const isDark = activeTheme === 'dark';

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to Light Academic theme' : 'Switch to Amber Dark Studio theme'}
      title={isDark ? 'Light Mode (The ANTs Academic System)' : 'Dark Mode (Amber Academic Studio)'}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-all duration-150',
        'hover:border-border-hover hover:bg-surface-inset active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-primary transition-transform duration-200" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-primary transition-transform duration-200" aria-hidden="true" />
      )}
      {showLabel && (
        <span>{isDark ? 'Amber Dark' : 'Academic Light'}</span>
      )}
    </button>
  );
}

