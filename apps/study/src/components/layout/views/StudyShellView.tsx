'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  Calculator,
  CalendarClock,
  CheckCircle2,
  Compass,
  ExternalLink,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
  Info,
  Layers,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from 'lucide-react';
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  ANTS_AUTH_SESSION_EVENT,
  AppSwitcher,
  BrandHeaderBadge,
  MOCK_AUTHENTICATED_USER,
  MOCK_SHARED_PROFILES,
  ThemeToggle,
  UserMenuView,
  WorkspaceAuthGateView,
  authenticateDemoPersona,
  cn,
  loadAccountStorageState,
  loadAuthSession,
  saveAuthSession,
  signOutEverywhere,
  useSlidingIndicator,
  type AuthSessionStatus,
  type MockUserProfile,
} from '@ants/ui';
import type { StudyNavRouteId } from '../../../lib/study/dashboard';

export type StudyNavGroupId = 'workspace' | 'resources' | 'community';

export interface StudyNavItem {
  id: StudyNavRouteId;
  label: string;
  href: string;
  group: StudyNavGroupId;
  /** True once the dedicated route has been mounted in Stage Z4; queued routes trigger an inline notice instead of a 404. */
  available: boolean;
  /** Upcoming Stage Z4 milestone code displayed subtly on queued routes. */
  stageTag?: string;
}

export const DEFAULT_STUDY_NAV_ITEMS: StudyNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    group: 'workspace',
    available: true,
  },
  {
    id: 'curriculum',
    label: 'Curriculum & Topics',
    href: '/curriculum',
    group: 'workspace',
    available: true,
  },
  {
    id: 'past-papers',
    label: 'Past Papers',
    href: '/past-papers',
    group: 'workspace',
    available: true,
  },
  {
    id: 'countdown',
    label: 'Exam Countdown',
    href: '/countdown',
    group: 'workspace',
    available: true,
  },
  {
    id: 'calculator',
    label: 'Grade Calculator',
    href: '/calculator',
    group: 'workspace',
    available: true,
  },
  {
    id: 'notes',
    label: 'Notes',
    href: '/notes',
    group: 'resources',
    available: true,
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    href: '/flashcards',
    group: 'resources',
    available: true,
  },
  {
    id: 'quizzes',
    label: 'Quizzes',
    href: '/quizzes',
    group: 'resources',
    available: true,
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    href: '/leaderboard',
    group: 'community',
    available: true,
  },
];

export interface StudyShellViewProps {
  activeRoute?: StudyNavRouteId;
  navItems?: StudyNavItem[];
  /** Controlled desktop sidebar collapsed state */
  sidebarCollapsed?: boolean;
  /** Default collapsed state when uncontrolled */
  defaultSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  user?: MockUserProfile | null;
  /** External Flow workspace link */
  flowUrl?: string;
  /** External Org showcase link */
  orgUrl?: string;
  /** Optional custom handler when a queued Stage Z4 route is clicked */
  onQueuedRouteSelect?: (item: StudyNavItem) => void;
  /** Controlled queued-route status banner override */
  queuedNotice?: string | null;
  onDismissQueuedNotice?: () => void;
  /** Right-aligned utility controls beside ThemeToggle */
  headerActions?: React.ReactNode;
  /** Set false when child already renders a top-level <main> landmark (e.g. GradeCalculatorView) */
  wrapWithMain?: boolean;
  children: React.ReactNode;
}

const NAV_ICONS: Record<StudyNavRouteId, React.ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />,
  curriculum: <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />,
  'past-papers': <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />,
  countdown: <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />,
  calculator: <Calculator className="h-4 w-4 shrink-0" aria-hidden="true" />,
  notes: <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />,
  flashcards: <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />,
  quizzes: <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  leaderboard: <Award className="h-4 w-4 shrink-0" aria-hidden="true" />,
  settings: <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />,
};

const GROUP_LABELS: { id: StudyNavGroupId; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'resources', label: 'Study Library' },
  { id: 'community', label: 'Progress' },
];

export function StudyShellView({
  activeRoute = 'dashboard',
  navItems = DEFAULT_STUDY_NAV_ITEMS,
  sidebarCollapsed: controlledCollapsed,
  defaultSidebarCollapsed = false,
  onToggleSidebarCollapse,
  user = MOCK_AUTHENTICATED_USER,
  flowUrl = 'http://localhost:3002/timetable',
  orgUrl = 'http://localhost:3000',
  onQueuedRouteSelect,
  queuedNotice: controlledNotice,
  onDismissQueuedNotice,
  headerActions,
  wrapWithMain = true,
  children,
}: StudyShellViewProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultSidebarCollapsed);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [internalNotice, setInternalNotice] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<AuthSessionStatus>('authenticated');
  const [sessionUser, setSessionUser] = useState<MockUserProfile | null>(
    MOCK_AUTHENTICATED_USER
  );
  const [sessionHydrated, setSessionHydrated] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      const current = loadAuthSession();
      setSessionStatus(current.status);
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

  const effectiveUser: MockUserProfile | null =
    user === null
      ? null
      : sessionHydrated && sessionStatus === 'guest'
        ? null
        : sessionHydrated && sessionUser
          ? user && user.username === sessionUser.username
            ? user
            : sessionUser
          : (user ?? MOCK_AUTHENTICATED_USER);

  const currentRoutePath =
    activeRoute === 'dashboard'
      ? '/'
      : activeRoute === 'curriculum'
        ? '/curriculum'
        : activeRoute === 'past-papers'
          ? '/past-papers'
          : activeRoute === 'calculator'
            ? '/calculator'
            : activeRoute === 'settings'
              ? '/settings'
              : `/${activeRoute}`;

  const handleSignIn = () => {
    window.location.href = `/login?redirect=${encodeURIComponent(currentRoutePath)}`;
  };

  const handleSignUp = () => {
    window.location.href = `/signup?redirect=${encodeURIComponent(currentRoutePath)}`;
  };

  const handleSignOut = () => {
    signOutEverywhere();
    setSessionStatus('guest');
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
      setSessionStatus('authenticated');
      setSessionUser(res.session.user);
    }
  };

  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  const activeNotice = controlledNotice !== undefined ? controlledNotice : internalNotice;
  const desktopSidebarNavRef = useRef<HTMLElement | null>(null);
  const {
    rect: sidebarRect,
    ready: sidebarReady,
    animate: sidebarAnimate,
  } = useSlidingIndicator(
    desktopSidebarNavRef,
    `${activeRoute}-${isCollapsed ? 'collapsed' : 'expanded'}`,
    {
      activeSelector: '[aria-current="page"]',
      persistKey: isCollapsed ? 'study-sidebar-collapsed' : 'study-sidebar-expanded',
    }
  );
  const sidebarIndicatorReady = sidebarReady && sidebarRect.visible;

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileDrawerOpen]);

  const handleToggleCollapse = () => {
    if (onToggleSidebarCollapse) {
      onToggleSidebarCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const handleQueuedSelect = (item: StudyNavItem) => {
    setMobileDrawerOpen(false);
    if (onQueuedRouteSelect) {
      onQueuedRouteSelect(item);
      return;
    }
    setInternalNotice(
      `${item.label} (${item.href}) is scheduled for Stage ${item.stageTag ?? 'Z4'}. Dashboard (/), Curriculum (/curriculum), Past Papers (/past-papers), and Grade Calculator (/calculator) are active now.`
    );
  };

  const handleUserMenuNavigate = (path: string) => {
    if (path === '/settings' || path.startsWith('/settings#')) {
      window.location.href = path;
      return;
    }
    if (path === '/admin') {
      window.open(`${orgUrl}/admin`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (path.startsWith('/@')) {
      window.open(`http://localhost:3002${path}`, '_blank', 'noopener,noreferrer');
    }
  };

  const dismissNotice = () => {
    if (onDismissQueuedNotice) {
      onDismissQueuedNotice();
    } else {
      setInternalNotice(null);
    }
  };

  const renderNavItem = (item: StudyNavItem, collapsed: boolean, onCloseDrawer?: () => void) => {
    const active = item.id === activeRoute;
    const baseClass = cn(
      'ants-glide-item relative z-10 group flex w-full items-center rounded-md text-left text-sm transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      collapsed ? 'justify-center px-2 py-2.5' : 'justify-between gap-2.5 px-2.5 py-2',
      active
        ? 'bg-primary-tint font-semibold text-on-primary-tint'
        : item.available
          ? 'font-medium text-foreground-muted hover:bg-surface-inset hover:text-foreground'
          : 'font-medium text-foreground-muted/85 hover:bg-surface-inset/70 hover:text-foreground'
    );

    const innerContent = (
      <>
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={cn(active ? 'text-on-primary-tint' : 'text-foreground-muted group-hover:text-foreground')}>
            {NAV_ICONS[item.id]}
          </span>
          {!collapsed && <span className="truncate">{item.label}</span>}
        </span>
        {!collapsed && !item.available && item.stageTag && (
          <span className="shrink-0 font-mono text-[10px] font-medium text-foreground-muted">
            {item.stageTag}
          </span>
        )}
      </>
    );

    if (item.available) {
      return (
        <Link
          key={item.id}
          href={item.href}
          aria-current={active ? 'page' : undefined}
          data-active={active ? 'true' : 'false'}
          title={collapsed ? item.label : undefined}
          onClick={onCloseDrawer}
          className={baseClass}
        >
          {innerContent}
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        title={collapsed ? `${item.label} (${item.stageTag ?? 'Queued'})` : undefined}
        onClick={() => handleQueuedSelect(item)}
        className={baseClass}
      >
        {innerContent}
      </button>
    );
  };

  const renderSidebarNavigation = (
    collapsed: boolean,
    onCloseDrawer?: () => void,
    withGlideIndicator = false
  ) => (
    <div className="flex h-full flex-col justify-between gap-4 py-4">
      <nav
        ref={withGlideIndicator ? desktopSidebarNavRef : undefined}
        aria-label="Study workspace navigation"
        data-gliding-ready={withGlideIndicator && sidebarIndicatorReady ? 'true' : 'false'}
        className={cn(withGlideIndicator && 'ants-glide-host relative', 'space-y-5 px-2.5')}
      >
        {withGlideIndicator && (
          <span
            aria-hidden="true"
            data-animate={sidebarAnimate ? 'true' : 'false'}
            className="ants-glide-indicator z-0 rounded-md bg-primary-tint"
            style={{
              transform: `translate3d(${sidebarRect.x}px, ${sidebarRect.y}px, 0)`,
              width: `${sidebarRect.width}px`,
              height: `${sidebarRect.height}px`,
              opacity: sidebarIndicatorReady ? 1 : 0,
            }}
          >
            <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary" />
          </span>
        )}
        {GROUP_LABELS.map((group) => {
          const items = navItems.filter((item) => item.group === group.id);
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="space-y-1">
              {!collapsed ? (
                <p className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-subtle">
                  {group.label}
                </p>
              ) : (
                <div className="mx-2 my-1 border-t border-border-subtle" aria-hidden="true" />
              )}
              <div className="space-y-0.5">
                {items.map((item) => renderNavItem(item, collapsed, onCloseDrawer))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="space-y-1.5 border-t border-border px-2.5 pt-3">
        <a
          href={flowUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? 'Open Flow Timetable (:3002)' : undefined}
          className={cn(
            'flex items-center rounded-md text-xs font-semibold text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-2.5 py-2'
          )}
        >
          <span className="flex items-center gap-2.5">
            <Compass className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {!collapsed && <span>Flow Timetable</span>}
          </span>
          {!collapsed && <ExternalLink className="h-3.5 w-3.5 text-foreground-subtle" aria-hidden="true" />}
        </a>
        {renderNavItem(
          {
            id: 'settings',
            label: 'Settings',
            href: '/settings',
            group: 'community',
            available: true,
          },
          collapsed,
          onCloseDrawer
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Slim Top Utility Bar */}
      <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="flex h-full items-center justify-between gap-2 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open study navigation drawer"
              aria-expanded={mobileDrawerOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-card text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Desktop Sidebar Collapse Toggle */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-card text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <BrandHeaderBadge
              app="study"
              productHref="/"
              orgHref={orgUrl}
              className="[&>a:last-child]:hidden md:[&>a:last-child]:inline-flex"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {headerActions}
            <ThemeToggle />
            <AppSwitcher currentApp="study" useLocalUrls />
            <UserMenuView
              user={effectiveUser}
              onSignIn={handleSignIn}
              onSignUp={handleSignUp}
              onSignOut={handleSignOut}
              onNavigate={handleUserMenuNavigate}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-w-0">
        {/* Desktop Collapsible Left Sidebar */}
        <aside
          aria-label="Study sidebar"
          className={cn(
            'hidden shrink-0 border-r border-border bg-surface-card transition-[width] duration-200 lg:sticky lg:top-14 lg:flex lg:h-[calc(100vh-3.5rem)] lg:flex-col lg:overflow-y-auto',
            isCollapsed ? 'w-[68px]' : 'w-60'
          )}
        >
          {renderSidebarNavigation(isCollapsed, undefined, true)}
        </aside>

        {/* Main Workspace Surface */}
        {(() => {
          const ContentTag = wrapWithMain ? 'main' : 'div';
          return (
            <ContentTag
              className={cn(
                'min-w-0 flex-1',
                wrapWithMain ? 'px-4 pt-6 pb-24 sm:px-8 sm:pt-8 lg:pb-12' : ''
              )}
            >
              <div className={cn('ants-fade-enter', wrapWithMain ? 'mx-auto max-w-[1160px]' : '')}>
                {activeNotice && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={cn(
                      'ants-panel-enter flex items-start justify-between gap-3 rounded-lg border border-primary-tint-border bg-primary-tint/60 px-4 py-3 text-sm text-on-primary-tint',
                      wrapWithMain ? 'mb-6' : 'mx-auto mt-6 max-w-5xl px-4 sm:px-6'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <p className="leading-snug">{activeNotice}</p>
                    </div>
                    <button
                      type="button"
                      onClick={dismissNotice}
                      aria-label="Dismiss route status notice"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}

                {effectiveUser === null && activeRoute !== 'calculator' ? (
                  <WorkspaceAuthGateView
                    variant="gate"
                    app="study"
                    routePath={currentRoutePath}
                    onSignIn={handleSignIn}
                    onSignUp={handleSignUp}
                    onResumeDemoPersona={handleResumeDemoPersona}
                  />
                ) : (
                  children
                )}
              </div>
            </ContentTag>
          );
        })()}
      </div>

      {/* Mobile Navigation Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Study workspace navigation"
          className="fixed inset-0 z-40 flex lg:hidden"
        >
          <button
            type="button"
            aria-label="Close navigation drawer"
            onClick={() => setMobileDrawerOpen(false)}
            className="ants-modal-backdrop-in fixed inset-0 bg-foreground/30 backdrop-blur-[2px]"
          />
          <div className="ants-drawer-left-in relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-surface-card shadow-[var(--shadow-tier-3)]">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Study Navigation</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation drawer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderSidebarNavigation(false, () => setMobileDrawerOpen(false))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Quick Bar */}
      <nav
        aria-label="Mobile quick navigation"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-elevated/95 backdrop-blur-md lg:hidden"
      >
        <div className="grid grid-cols-4 h-14">
          <Link
            href="/"
            aria-current={activeRoute === 'dashboard' ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
              activeRoute === 'dashboard'
                ? 'text-on-primary-tint'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/curriculum"
            aria-current={activeRoute === 'curriculum' ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
              activeRoute === 'curriculum'
                ? 'text-on-primary-tint'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            <span>Syllabus</span>
          </Link>

          <Link
            href="/past-papers"
            aria-current={activeRoute === 'past-papers' ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
              activeRoute === 'past-papers'
                ? 'text-on-primary-tint'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span>Past Papers</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-foreground-muted transition-colors hover:text-foreground"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
            <span>All Tools</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
