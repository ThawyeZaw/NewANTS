'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ListTodo, Settings, Timer } from 'lucide-react';
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  ANTS_AUTH_SESSION_EVENT,
  AppSwitcher,
  BrandHeaderBadge,
  MOCK_SHARED_PROFILES,
  UserMenuView,
  WorkspaceAuthGateView,
  authenticateDemoPersona,
  cn,
  loadAccountStorageState,
  loadAuthSession,
  saveAuthSession,
  signOutEverywhere,
  useSlidingIndicator,
  type MockUserProfile,
} from '@ants/ui';
import { registerPomodoroServiceWorker } from '../../../lib/pomodoro/browser';

export type FlowTabId = 'timer' | 'stats';
export type FlowSectionId = 'pomodoro' | 'tasks' | 'timetable' | 'settings' | 'profile';

export interface FlowTab {
  id: FlowTabId;
  label: string;
}

export const DEFAULT_FLOW_TABS: FlowTab[] = [
  { id: 'timer', label: 'Timer' },
  { id: 'stats', label: 'Stats' },
];

export interface FlowShellViewProps {
  activeSection?: FlowSectionId;
  activeTab?: FlowTabId;
  tabs?: FlowTab[];
  onTabChange?: (tab: FlowTabId) => void;
  /** Remaining time shown next to the Timer tab while a timer runs and another tab is open */
  timerBadge?: string | null;
  /** Optional background image URL rendered behind the workspace with a contrast scrim */
  backgroundImageSrc?: string | null;
  user?: MockUserProfile | null;
  onUserMenuNavigate?: (path: string) => void;
  onOpenSettings?: () => void;
  /** Optional right-side header action (e.g. theme switcher) */
  headerActions?: React.ReactNode;
  /** Narrow centered layout for Pomodoro; wide layout for 24h Smart Timetable */
  contentWidth?: 'narrow' | 'wide';
  children: React.ReactNode;
}

const SECTION_LINKS: { id: FlowSectionId; label: string; href: string; icon: React.ReactNode }[] = [
  {
    id: 'timetable',
    label: 'Timetable',
    href: '/timetable',
    icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    icon: <ListTodo className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro',
    href: '/pomodoro',
    icon: <Timer className="h-3.5 w-3.5" aria-hidden="true" />,
  },
];

function SectionNav({
  activeSection,
  timerBadge,
  className,
}: {
  activeSection: FlowSectionId;
  timerBadge?: string | null;
  className?: string;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const { rect, ready, animate } = useSlidingIndicator(navRef, activeSection, {
    activeSelector: '[aria-current="page"]',
    persistKey: 'flow-desktop-section-nav',
  });
  const indicatorReady = ready && rect.visible;

  return (
    <nav
      ref={navRef}
      aria-label="Flow workspaces"
      data-gliding-ready={indicatorReady ? 'true' : 'false'}
      className={cn('ants-glide-host relative flex items-center gap-1 rounded-xl bg-surface-inset p-1', className)}
    >
      <span
        aria-hidden="true"
        data-animate={animate ? 'true' : 'false'}
        className="ants-glide-indicator z-0 rounded-lg bg-surface-card shadow-[var(--shadow-tier-1)]"
        style={{
          transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          opacity: indicatorReady ? 1 : 0,
        }}
      />
      {SECTION_LINKS.map((item) => {
        const active = item.id === activeSection;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            data-active={active ? 'true' : 'false'}
            className={cn(
              'ants-glide-item relative z-10 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors lg:px-3',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
              active
                ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.id === 'pomodoro' && !active && timerBadge && (
              <span className="font-mono text-[11px] font-medium tabular-nums text-primary">{timerBadge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileBottomDock({
  activeSection,
  timerBadge,
}: {
  activeSection: FlowSectionId;
  timerBadge?: string | null;
}) {
  const dockRef = useRef<HTMLDivElement | null>(null);
  const { rect, ready, animate } = useSlidingIndicator(dockRef, activeSection, {
    activeSelector: '[aria-current="page"]',
    persistKey: 'flow-mobile-dock',
  });
  const indicatorReady = ready && rect.visible;

  return (
    <nav
      aria-label="Mobile workspace navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/92 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div
        ref={dockRef}
        data-gliding-ready={indicatorReady ? 'true' : 'false'}
        className="ants-glide-host relative mx-auto grid max-w-md grid-cols-3 gap-1 px-2 py-1.5"
      >
        <span
          aria-hidden="true"
          data-animate={animate ? 'true' : 'false'}
          className="ants-glide-indicator z-0 rounded-xl bg-primary-tint"
          style={{
            transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            opacity: indicatorReady ? 1 : 0,
          }}
        />
        {SECTION_LINKS.map((item) => {
          const active = item.id === activeSection;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              data-active={active ? 'true' : 'false'}
              className={cn(
                'ants-glide-item relative z-10 flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95',
                active
                  ? 'bg-primary-tint text-on-primary-tint'
                  : 'text-foreground-muted hover:text-foreground'
              )}
            >
              <span className="relative inline-flex items-center justify-center">
                {item.icon}
                {item.id === 'pomodoro' && !active && timerBadge && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-primary"
                  />
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TabBar({
  tabs,
  activeTab,
  onTabChange,
  timerBadge,
  className,
}: {
  tabs: FlowTab[];
  activeTab: FlowTabId;
  onTabChange?: (tab: FlowTabId) => void;
  timerBadge: string | null;
  className?: string;
}) {
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const { rect, ready, animate } = useSlidingIndicator(tabBarRef, activeTab, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const indicatorReady = ready && rect.visible;

  if (tabs.length === 0) return null;
  return (
    <div
      ref={tabBarRef}
      role="tablist"
      aria-label="Workspace sections"
      data-gliding-ready={indicatorReady ? 'true' : 'false'}
      className={cn('ants-glide-host relative flex items-center gap-1', className)}
    >
      <span
        aria-hidden="true"
        data-animate={animate ? 'true' : 'false'}
        className="ants-glide-indicator z-0 rounded-lg bg-surface-inset"
        style={{
          transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          opacity: indicatorReady ? 1 : 0,
        }}
      />
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active ? 'true' : 'false'}
            onClick={() => onTabChange?.(tab.id)}
            className={cn(
              'ants-glide-item relative z-10 inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
              active
                ? 'bg-surface-inset text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.id === 'timer' && timerBadge && !active && (
              <span className="font-mono text-xs font-medium tabular-nums text-primary">{timerBadge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function FlowShellView({
  activeSection = 'pomodoro',
  activeTab = 'timer',
  tabs = [],
  onTabChange,
  timerBadge = null,
  backgroundImageSrc = null,
  user,
  onUserMenuNavigate,
  onOpenSettings,
  headerActions,
  contentWidth = 'narrow',
  children,
}: FlowShellViewProps) {
  const mainWidth = contentWidth === 'wide' ? 'max-w-[1440px]' : 'max-w-5xl';
  const [sessionUser, setSessionUser] = useState<MockUserProfile | null>(null);
  const [sessionHydrated, setSessionHydrated] = useState(false);

  useEffect(() => {
    registerPomodoroServiceWorker();
    const syncSession = () => {
      const current = loadAuthSession();
      setSessionUser(current.status === 'authenticated' ? current.user : null);
      setSessionHydrated(true);
    };
    syncSession();
    window.addEventListener(ANTS_AUTH_SESSION_EVENT, syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener(ANTS_AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  const effectiveUser =
    user !== undefined ? user : sessionHydrated ? sessionUser : null;

  const currentSectionPath =
    activeSection === 'timetable'
      ? '/timetable'
      : activeSection === 'tasks'
        ? '/tasks'
        : activeSection === 'settings'
          ? '/settings'
          : '/pomodoro';

  const handleSignIn = () => {
    window.location.href = `/login?redirect=${encodeURIComponent(currentSectionPath)}`;
  };

  const handleSignUp = () => {
    window.location.href = `/signup?redirect=${encodeURIComponent(currentSectionPath)}`;
  };

  const handleSignOut = () => {
    signOutEverywhere();
    setSessionUser(null);
  };

  const handleResumeDemoPersona = (username: string) => {
    const accounts = loadAccountStorageState(
      MOCK_SHARED_PROFILES,
      ACCOUNT_PROFILE_STORAGE_KEY
    );
    const res = authenticateDemoPersona(username, accounts ?? undefined);
    if (res.ok && res.session) {
      saveAuthSession(res.session, { accountState: res.nextAccountState });
      setSessionUser(res.session.user);
    }
  };

  const handleNavigate = (path: string) => {
    if (onUserMenuNavigate) {
      onUserMenuNavigate(path);
      return;
    }
    if (path === '/admin') {
      window.location.href = 'http://localhost:3000/admin';
      return;
    }
    window.location.href = path;
  };

  const showGuestPrototypeBanner =
    sessionHydrated &&
    effectiveUser === null &&
    (activeSection === 'timetable' || activeSection === 'tasks');

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {backgroundImageSrc && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <img
            src={backgroundImageSrc}
            alt=""
            className="h-full w-full object-cover object-center transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-background/85 backdrop-blur-xs" />
        </div>
      )}

      <header
        className={cn(
          'sticky top-0 z-20 border-b border-border',
          backgroundImageSrc ? 'bg-background/80 backdrop-blur-md' : 'bg-background/95 backdrop-blur-sm'
        )}
      >
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-6 md:gap-3 xl:grid xl:grid-cols-[1fr_auto_1fr] xl:gap-4">
          <div className="flex min-w-0 items-center justify-self-start">
            <BrandHeaderBadge
              app="flow"
              productHref={
                activeSection === 'timetable'
                  ? '/timetable'
                  : activeSection === 'tasks'
                    ? '/tasks'
                    : '/pomodoro'
              }
              orgHref="http://localhost:3000"
              className="[&>a:first-child_div>span:last-child]:hidden lg:[&>a:first-child_div>span:last-child]:block [&>a:not(:first-child)]:hidden xl:[&>a:not(:first-child)]:inline-flex"
            />
          </div>

          <SectionNav
            activeSection={activeSection}
            timerBadge={timerBadge}
            className="hidden justify-self-center md:flex"
          />

          <div className="flex items-center gap-1 justify-self-end sm:gap-1.5">
            {headerActions}
            {onOpenSettings ? (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Settings"
                title="Settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-9"
              >
                <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            ) : (
              <Link
                href="/settings"
                aria-label="Account & Profile Settings"
                title="Account & Profile Settings"
                aria-current={activeSection === 'settings' ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-9',
                  activeSection === 'settings'
                    ? 'bg-primary-tint text-on-primary-tint'
                    : 'text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                )}
              >
                <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
              </Link>
            )}
            <AppSwitcher currentApp="flow" useLocalUrls />
            <UserMenuView
              user={effectiveUser}
              onSignIn={handleSignIn}
              onSignUp={handleSignUp}
              onSignOut={handleSignOut}
              onNavigate={handleNavigate}
            />
          </div>
        </div>

        {tabs.length > 0 && (
          <div className="mx-auto flex max-w-[1440px] items-center justify-center border-t border-border px-3 py-1.5 sm:px-6">
            <TabBar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={onTabChange}
              timerBadge={timerBadge}
            />
          </div>
        )}
      </header>

      <main
        className={cn(
          'ants-fade-enter relative z-10 mx-auto px-4 pb-24 sm:px-6 md:pb-16',
          mainWidth,
          contentWidth === 'wide' ? 'pt-5 sm:pt-6' : 'pt-6 sm:pt-10'
        )}
      >
        {showGuestPrototypeBanner && (
          <WorkspaceAuthGateView
            variant="banner"
            app="flow"
            routePath={currentSectionPath}
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
            onResumeDemoPersona={handleResumeDemoPersona}
          />
        )}
        {children}
      </main>

      <MobileBottomDock activeSection={activeSection} timerBadge={timerBadge} />
    </div>
  );
}
