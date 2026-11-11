'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarDays, ListTodo, Settings, Timer } from 'lucide-react';
import {
  AppSwitcher,
  BrandHeaderBadge,
  UserMenuView,
  cn,
  type MockUserProfile,
} from '@ants/ui';

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
  className,
}: {
  activeSection: FlowSectionId;
  className?: string;
}) {
  return (
    <nav aria-label="Flow workspaces" className={cn('flex items-center gap-1 rounded-lg bg-surface-inset p-1', className)}>
      {SECTION_LINKS.map((item) => {
        const active = item.id === activeSection;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
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
  if (tabs.length === 0) return null;
  return (
    <div role="tablist" aria-label="Workspace sections" className={cn('flex items-center gap-1', className)}>
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange?.(tab.id)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
  tabs = DEFAULT_FLOW_TABS,
  onTabChange,
  timerBadge = null,
  backgroundImageSrc = null,
  user = null,
  onUserMenuNavigate,
  onOpenSettings,
  headerActions,
  contentWidth = 'narrow',
  children,
}: FlowShellViewProps) {
  const containerWidth = contentWidth === 'wide' ? 'max-w-[1440px]' : 'max-w-5xl';

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
          backgroundImageSrc ? 'bg-background/80 backdrop-blur-md' : 'bg-background'
        )}
      >
        <div className={cn('mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6', containerWidth)}>
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
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
              className="[&>a:last-child]:hidden md:[&>a:last-child]:inline-flex"
            />
            <SectionNav activeSection={activeSection} className="hidden sm:flex" />
          </div>

          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
            timerBadge={timerBadge}
            className="hidden sm:flex"
          />

          <div className="flex items-center gap-1.5">
            {headerActions}
            {onOpenSettings ? (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Settings"
                title="Settings"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  activeSection === 'settings'
                    ? 'bg-primary-tint text-on-primary-tint'
                    : 'text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                )}
              >
                <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
              </Link>
            )}
            <AppSwitcher currentApp="flow" useLocalUrls />
            <UserMenuView user={user} onNavigate={onUserMenuNavigate} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-1.5 sm:hidden">
          <SectionNav activeSection={activeSection} />
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
            timerBadge={timerBadge}
          />
        </div>
      </header>

      <main
        className={cn(
          'relative z-10 mx-auto px-4 pb-16 sm:px-6',
          contentWidth === 'wide' ? 'max-w-[1440px] pt-5 sm:pt-6' : 'max-w-5xl pt-8 sm:pt-12'
        )}
      >
        {children}
      </main>
    </div>
  );
}
