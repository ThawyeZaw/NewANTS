/**
 * Flow Pomodoro — thin, SSR-safe wrappers around browser platform APIs
 * (Notifications, Service Worker / PWA, Fullscreen, theme attributes).
 */
import {
  persistThemeMode,
  readStoredThemeMode,
} from '@ants/ui';
import type { AccentId, FontId, ThemeModePreference } from './engine';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Show a system notification, preferring the service worker (required on Android / installed PWAs). */
export async function showSystemNotification(title: string, body: string): Promise<void> {
  if (getNotificationPermission() !== 'granted') return;
  const options: NotificationOptions = {
    body,
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: 'flow-pomodoro',
  };
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return;
      }
    }
    new Notification(title, options);
  } catch {
    // Some browsers (e.g. Android Chrome without SW) throw on `new Notification` — ignore.
  }
}

export async function unregisterDevServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('ants-flow-pwa-'))
          .map((key) => window.caches.delete(key))
      );
    }
  } catch {
    // Ignore storage/SW cleanup errors in restricted browsing contexts.
  }
}

export function registerPomodoroServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  // Never run an offline caching SW in local Next.js dev mode — stale HTML/CSS chunk
  // hashes break stylesheets whenever `next dev` restarts or pauses.
  if (process.env.NODE_ENV !== 'production') {
    void unregisterDevServiceWorkers();
    return;
  }
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export async function enterFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  try {
    await el.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    // Fullscreen may be denied (iframe, iOS Safari) — focus mode still works without it.
  }
}

export async function exitFullscreen(): Promise<void> {
  if (typeof document === 'undefined' || !document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    // ignore
  }
}

export function resolveThemeMode(mode: ThemeModePreference): 'light' | 'dark' {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return readStoredThemeMode('light');
}

/** Apply theme mode + accent + font presets to `<html>` (consumed by `globals.css`) and sync shared `ants_theme` cookie + `'ants-theme'`. */
export function applyAppearance(mode: ThemeModePreference, accent: AccentId, font: FontId): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = resolveThemeMode(mode);
  persistThemeMode(resolved, { skipTransition: true, dispatch: false });
  root.setAttribute('data-accent', accent);
  root.setAttribute('data-font', font);
}

/**
 * Inline (pre-hydration) script that applies the synced appearance before first paint
 * to avoid a light/dark flash. Priority: shared `ants_theme` cookie > `'ants-theme'` localStorage > Pomodoro saved mode > `'light'`.
 */
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('ants-flow-pomodoro-v1')||'null');var a=(s&&s.settings&&s.settings.appearance)||{};var c=document.cookie.match(/(?:^|;\\s*)ants_theme=(dark|light)/);var l=localStorage.getItem('ants-theme');var m=(c&&c[1])||((l==='dark'||l==='light')?l:(a.mode==='dark'?'dark':'light'));if(l!==m)localStorage.setItem('ants-theme',m);if(!c||c[1]!==m){var h=location.hostname;var d=(h==='the-ants.org'||h.slice(-13)==='.the-ants.org')?'; Domain=.the-ants.org':'';document.cookie='ants_theme='+m+'; Path=/; Max-Age=31536000; SameSite=Lax'+d;}var r=document.documentElement;r.setAttribute('data-theme',m);if(m==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');}r.setAttribute('data-accent',a.accent||'amber');r.setAttribute('data-font',a.font||'jakarta');}catch(e){}})();`;

