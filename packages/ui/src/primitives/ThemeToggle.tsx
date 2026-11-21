'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../utils/cn';

export type ThemeMode = 'light' | 'dark';

export interface ThemeStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

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

export const THEME_STORAGE_KEY = 'ants-theme';
export const THEME_COOKIE_KEY = 'ants_theme';
export const THEME_CHANGE_EVENT = 'ants-theme-change';

const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

let themeTransitionTimer: number | null = null;

function beginThemeTransition(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const root = document.documentElement;
  root.classList.add('ants-theme-transitioning');
  if (themeTransitionTimer !== null) {
    window.clearTimeout(themeTransitionTimer);
  }
  themeTransitionTimer = window.setTimeout(() => {
    root.classList.remove('ants-theme-transitioning');
    themeTransitionTimer = null;
  }, 260);
}

export function applyThemeToDocument(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Parses `ants_theme` (`'light' | 'dark'`) from a raw `document.cookie` or HTTP `Cookie` header string.
 */
export function parseThemeCookieValue(cookieHeader: string): ThemeMode | null {
  if (!cookieHeader) return null;
  const segments = cookieHeader.split(';');
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (trimmed.startsWith(`${THEME_COOKIE_KEY}=`)) {
      const value = trimmed.slice(THEME_COOKIE_KEY.length + 1).trim();
      if (value === 'dark' || value === 'light') {
        return value;
      }
    }
  }
  return null;
}

/**
 * Encodes `ants_theme` for `document.cookie` sharing across all `.the-ants.org` subdomains
 * (`the-ants.org`, `study.the-ants.org`, `flow.the-ants.org`) as well as `localhost` ports (`:3000`, `:3001`, `:3002`).
 */
export function serializeThemeCookieValue(
  mode: ThemeMode,
  hostname?: string
): string {
  const host =
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  const domainAttr =
    host === 'the-ants.org' || host.endsWith('.the-ants.org')
      ? '; Domain=.the-ants.org'
      : '';
  return `${THEME_COOKIE_KEY}=${mode}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${domainAttr}`;
}

function resolveThemeStorage(storage?: ThemeStorageLike | null): ThemeStorageLike | null {
  if (storage !== undefined) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Reads the synced `'ants_theme'` cookie (cross-subdomain/cross-port) and origin `'ants-theme'` localStorage.
 * Priority: shared cookie > localStorage > document `[data-theme]` > `fallback` (`'light'`).
 */
export function readStoredThemeMode(
  fallback: ThemeMode = 'light',
  options: {
    cookieString?: string;
    storage?: ThemeStorageLike | null;
    hostname?: string;
    skipBackfill?: boolean;
  } = {}
): ThemeMode {
  const cookieHeader =
    options.cookieString ??
    (typeof document !== 'undefined' ? document.cookie : '');
  const cookieMode = parseThemeCookieValue(cookieHeader);
  const store = resolveThemeStorage(options.storage);

  if (cookieMode === 'dark' || cookieMode === 'light') {
    if (store) {
      try {
        if (store.getItem(THEME_STORAGE_KEY) !== cookieMode) {
          store.setItem(THEME_STORAGE_KEY, cookieMode);
        }
      } catch {
        // Ignore storage errors in restricted environments
      }
    }
    return cookieMode;
  }

  if (store) {
    try {
      const saved = store.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        if (!options.skipBackfill && typeof document !== 'undefined') {
          try {
            document.cookie = serializeThemeCookieValue(saved, options.hostname);
          } catch {
            // Ignore cookie write errors in restricted environments
          }
        }
        return saved;
      }
    } catch {
      // Ignore storage read errors in restricted environments
    }
  }

  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') {
      return attr;
    }
    if (document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
  }

  return fallback;
}

export function persistThemeMode(
  mode: ThemeMode,
  options: {
    storage?: ThemeStorageLike | null;
    hostname?: string;
    skipCookie?: boolean;
    skipTransition?: boolean;
    dispatch?: boolean;
  } = {}
): void {
  if (!options.skipTransition) {
    beginThemeTransition();
  }
  applyThemeToDocument(mode);

  if (!options.skipCookie && typeof document !== 'undefined') {
    try {
      document.cookie = serializeThemeCookieValue(mode, options.hostname);
    } catch {
      // Ignore cookie write errors in restricted environments
    }
  }

  const store = resolveThemeStorage(options.storage);
  if (store) {
    try {
      store.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors in restricted environments
    }
  }

  if (options.dispatch !== false && typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_CHANGE_EVENT, { detail: mode }));
    } catch {
      // Ignore event dispatch errors
    }
  }
}

export function ThemeToggle({
  theme: controlledTheme,
  defaultTheme = 'light',
  onThemeChange,
  showLabel = false,
  className,
}: ThemeToggleProps) {
  const [internalTheme, setInternalTheme] = useState<ThemeMode>(
    controlledTheme ?? defaultTheme
  );

  const activeTheme = controlledTheme ?? internalTheme;
  const activeThemeRef = useRef<ThemeMode>(activeTheme);
  activeThemeRef.current = activeTheme;

  const prevControlledThemeRef = useRef<ThemeMode | undefined>(undefined);
  const onThemeChangeRef = useRef(onThemeChange);
  onThemeChangeRef.current = onThemeChange;

  useEffect(() => {
    if (controlledTheme !== undefined) {
      if (
        prevControlledThemeRef.current !== undefined &&
        prevControlledThemeRef.current !== controlledTheme
      ) {
        beginThemeTransition();
      }
      prevControlledThemeRef.current = controlledTheme;
      applyThemeToDocument(controlledTheme);

      const checkControlledExternal = () => {
        const resolved = readStoredThemeMode(controlledTheme);
        if (resolved !== activeThemeRef.current) {
          beginThemeTransition();
          applyThemeToDocument(resolved);
          onThemeChangeRef.current?.(resolved);
        }
      };

      const handleVisibility = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          checkControlledExternal();
        }
      };

      window.addEventListener('focus', checkControlledExternal);
      window.addEventListener('pageshow', checkControlledExternal);
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        window.removeEventListener('focus', checkControlledExternal);
        window.removeEventListener('pageshow', checkControlledExternal);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }

    const syncTheme = (next?: ThemeMode, animateIfChanged = false) => {
      const resolved =
        next === 'dark' || next === 'light' ? next : readStoredThemeMode(defaultTheme);
      const currentDomTheme: ThemeMode =
        typeof document !== 'undefined' &&
        (document.documentElement.getAttribute('data-theme') === 'dark' ||
          document.documentElement.classList.contains('dark'))
          ? 'dark'
          : 'light';

      if (animateIfChanged && (resolved !== currentDomTheme || resolved !== activeThemeRef.current)) {
        beginThemeTransition();
      }
      setInternalTheme(resolved);
      applyThemeToDocument(resolved);
    };

    syncTheme(undefined, false);

    const handleCustomChange = (event: Event) => {
      const detail = (event as CustomEvent<ThemeMode>).detail;
      syncTheme(detail, false);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        syncTheme(undefined, true);
      }
    };
    const handleExternalReturn = () => {
      syncTheme(undefined, true);
    };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncTheme(undefined, true);
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleCustomChange);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleExternalReturn);
    window.addEventListener('pageshow', handleExternalReturn);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleCustomChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleExternalReturn);
      window.removeEventListener('pageshow', handleExternalReturn);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [controlledTheme, defaultTheme]);

  const handleToggle = () => {
    const nextTheme: ThemeMode = activeTheme === 'dark' ? 'light' : 'dark';
    if (controlledTheme === undefined) {
      setInternalTheme(nextTheme);
    }
    persistThemeMode(nextTheme);
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
        'group inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-[color,background-color,border-color,transform] duration-150',
        'hover:border-border-hover hover:bg-surface-inset active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-primary transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-primary transition-transform duration-200 group-hover:-rotate-12" aria-hidden="true" />
      )}
      {showLabel && (
        <span>{isDark ? 'Amber Dark' : 'Academic Light'}</span>
      )}
    </button>
  );
}
