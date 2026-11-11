/**
 * Flow Pomodoro — thin, SSR-safe wrappers around browser platform APIs
 * (Notifications, Service Worker / PWA, Fullscreen, theme attributes).
 */
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

export function registerPomodoroServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
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
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Apply theme mode + accent + font presets to `<html>` (consumed by `globals.css`). */
export function applyAppearance(mode: ThemeModePreference, accent: AccentId, font: FontId): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = resolveThemeMode(mode);
  root.setAttribute('data-theme', resolved);
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-accent', accent);
  root.setAttribute('data-font', font);
}

/**
 * Inline (pre-hydration) script that applies the saved appearance before first paint
 * to avoid a light/dark flash. Kept in sync with `POMODORO_STORAGE_KEY`.
 */
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('ants-flow-pomodoro-v1')||'null');var a=(s&&s.settings&&s.settings.appearance)||{};var m=a.mode||'system';if(m==='system'){m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;r.setAttribute('data-theme',m);if(m==='dark'){r.classList.add('dark');}r.setAttribute('data-accent',a.accent||'amber');r.setAttribute('data-font',a.font||'jakarta');}catch(e){}})();`;

