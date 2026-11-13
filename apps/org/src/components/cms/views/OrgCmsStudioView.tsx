'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  Check,
  Download,
  Home,
  Lock,
  LogIn,
  RotateCcw,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  ANTS_AUTH_SESSION_EVENT,
  Button,
  Modal,
  authenticateDemoPersona,
  cn,
  hasContributorRole,
  loadAuthSession,
  saveAuthSession,
  useSlidingIndicator,
  type AntsSsoSessionState,
} from '@ants/ui';
import {
  createDefaultOrgCmsState,
  deleteCmsActivity,
  deleteCmsArticle,
  deleteCmsTeamMember,
  exportOrgCmsJson,
  importOrgCmsJson,
  loadOrgCmsState,
  moveCmsActivity,
  moveCmsArticle,
  moveCmsTeamMember,
  resetOrgCmsState,
  saveOrgCmsState,
  subscribeOrgCmsChanges,
  updateCmsHomeData,
  upsertCmsActivity,
  upsertCmsArticle,
  upsertCmsTeamMember,
  type OrgCmsSectionId,
  type OrgCmsState,
} from '../../../lib/cms';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';
import { CmsActivitiesEditorView } from './CmsActivitiesEditorView';
import { CmsArticlesEditorView } from './CmsArticlesEditorView';
import { CmsTextarea } from './CmsFieldPrimitives';
import { CmsHomeEditorView } from './CmsHomeEditorView';
import { CmsTeamEditorView } from './CmsTeamEditorView';

export interface OrgCmsStudioViewProps {
  /** Optional explicit initial CMS snapshot (used in tests or Thaw's [THAW-2.3] Server Container) */
  initialState?: OrgCmsState;
  /** Optional starting section */
  initialSection?: OrgCmsSectionId;
  /** Use local dev ports in shared Navbar & Footer */
  useLocalUrls?: boolean;
  /** Optional external change callback for container wiring */
  onStateChange?: (next: OrgCmsState) => void;
  /** Development preview mode: 'auto' checks real session; 'contributor' simulates access; 'locked' forces restricted gate */
  simulatedAccess?: 'auto' | 'contributor' | 'locked';
}

const SECTION_NAV: Array<{
  id: OrgCmsSectionId;
  label: string;
  liveHref: string;
  liveLabel: string;
}> = [
  { id: 'home', label: 'Home Page', liveHref: '/', liveLabel: 'View Home' },
  {
    id: 'team',
    label: 'Team & Tutors',
    liveHref: '/team',
    liveLabel: 'View Team',
  },
  {
    id: 'activities',
    label: 'Activities',
    liveHref: '/activities',
    liveLabel: 'View Activities',
  },
  {
    id: 'articles',
    label: 'Articles',
    liveHref: '/articles',
    liveLabel: 'View Articles',
  },
];

function SectionIcon({
  id,
  className,
}: {
  id: OrgCmsSectionId;
  className?: string;
}) {
  switch (id) {
    case 'home':
      return <Home className={className} aria-hidden="true" />;
    case 'team':
      return <Users className={className} aria-hidden="true" />;
    case 'activities':
      return <Calendar className={className} aria-hidden="true" />;
    case 'articles':
      return <BookOpen className={className} aria-hidden="true" />;
  }
}

function formatSavedTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * `/cms` Organization Content Studio (`Operate` mode).
 * Pure `'use client'` presentational studio allowing live editing of Home, Team & Tutors,
 * Activities & Hackathon, and Articles persisted in `localStorage` (`ants-org-cms-v1`).
 * Keeps `apps/org/src/app/admin/**` untouched for `[THAW-2.3]`.
 */
export function OrgCmsStudioView({
  initialState,
  initialSection = 'home',
  useLocalUrls = true,
  onStateChange,
  simulatedAccess: initialSimulatedAccess,
}: OrgCmsStudioViewProps) {
  const isControlled = initialState !== undefined;
  const [cmsState, setCmsState] = useState<OrgCmsState>(
    () => initialState ?? createDefaultOrgCmsState('2026-11-12T00:00:00.000Z')
  );
  const [activeSection, setActiveSection] =
    useState<OrgCmsSectionId>(initialSection);
  const [sessionState, setSessionState] = useState<AntsSsoSessionState>(() =>
    loadAuthSession()
  );
  const [simulatedAccess, setSimulatedAccess] = useState<'auto' | 'contributor' | 'locked'>(
    initialSimulatedAccess ?? (initialState ? 'contributor' : 'auto')
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importDraft, setImportDraft] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const studyUrl = useLocalUrls
    ? 'http://localhost:3001'
    : 'https://study.the-ants.org';

  const navHostRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: navRect,
    ready: navReady,
    animate: navAnimate,
  } = useSlidingIndicator(navHostRef, activeSection, {
    activeSelector: '[aria-current="page"]',
  });
  const navGlideReady = navReady && navRect.visible;

  useEffect(() => {
    const handleAuthSync = () => {
      setSessionState(loadAuthSession());
    };
    handleAuthSync();
    window.addEventListener(ANTS_AUTH_SESSION_EVENT, handleAuthSync);
    window.addEventListener('storage', handleAuthSync);
    return () => {
      window.removeEventListener(ANTS_AUTH_SESSION_EVENT, handleAuthSync);
      window.removeEventListener('storage', handleAuthSync);
    };
  }, []);

  const isRealContributor =
    sessionState.status === 'authenticated' && hasContributorRole(sessionState.user);

  const isAuthorized =
    simulatedAccess === 'contributor' ||
    (simulatedAccess === 'auto' && isRealContributor);

  const handleQuickLogin = (username: 'zaylynnhtet' | 'thawyezaw') => {
    const result = authenticateDemoPersona(username);
    if (result.ok && result.session) {
      saveAuthSession(result.session);
      setSessionState(result.session);
      setSimulatedAccess('auto');
    }
  };

  useEffect(() => {
    if (isControlled) return;
    setCmsState(loadOrgCmsState());
    return subscribeOrgCmsChanges(() => {
      setCmsState(loadOrgCmsState());
    });
  }, [isControlled]);

  useEffect(() => {
    if (!copiedBackup) return;
    const t = window.setTimeout(() => setCopiedBackup(false), 2000);
    return () => window.clearTimeout(t);
  }, [copiedBackup]);

  const commitState = (updater: (prev: OrgCmsState) => OrgCmsState) => {
    setCmsState((prev) => {
      const next = updater(prev);
      const saved = isControlled ? next : saveOrgCmsState(next);
      onStateChange?.(saved);
      return saved;
    });
    setConfirmReset(false);
  };

  const handleResetDefaults = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    const fresh = isControlled
      ? createDefaultOrgCmsState()
      : resetOrgCmsState();
    setCmsState(fresh);
    onStateChange?.(fresh);
    setConfirmReset(false);
  };

  const handleExportDownload = async () => {
    const json = exportOrgCmsJson(cmsState);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ants-org-cms-backup.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch {
        // Fallback to clipboard copy below
      }
      try {
        await navigator.clipboard.writeText(json);
        setCopiedBackup(true);
      } catch {
        // Ignore clipboard errors in headless environments
      }
    }
  };

  const handleImportSubmit = () => {
    const result = importOrgCmsJson(importDraft);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    const saved = isControlled ? result.state : saveOrgCmsState(result.state);
    setCmsState(saved);
    onStateChange?.(saved);
    setImportError(null);
    setImportDraft('');
    setImportModalOpen(false);
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setImportDraft(text);
      setImportError(null);
    } catch {
      setImportError('Unable to read the selected file.');
    }
  };

  const activeNavMeta =
    SECTION_NAV.find((item) => item.id === activeSection) ?? SECTION_NAV[0]!;

  const sectionCounts: Record<OrgCmsSectionId, number | null> = {
    home: null,
    team: cmsState.team.length,
    activities: cmsState.activities.length,
    articles: cmsState.articles.length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath="/cms" useLocalUrls={useLocalUrls} />

      <main className="ants-fade-enter mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        {/* Top Studio Toolbar */}
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Organization Content Studio
            </h1>
            <p className="text-xs sm:text-sm text-foreground-muted">
              Edit Home, Team, Activities, and Articles. Changes save locally and
              update the public showcase immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Contributor Access Indicator & Preview Restricted Gate Toggle */}
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-card px-2.5 py-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
              <span className="font-semibold text-foreground">
                {isRealContributor
                  ? `Contributor: @${sessionState.user?.username}`
                  : 'Simulated Contributor'}
              </span>
              <span className="font-mono text-[11px] text-foreground-muted">
                ({isRealContributor ? sessionState.user?.role : 'dev preview'})
              </span>
              <button
                type="button"
                onClick={() => setSimulatedAccess('locked')}
                title="Preview the restricted contributor gate"
                className="ml-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted hover:border-border-hover hover:text-foreground transition-colors"
              >
                Preview Gate
              </button>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => {
                setImportError(null);
                setImportModalOpen(true);
              }}
              className="h-9"
            >
              Import
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={
                copiedBackup ? (
                  <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                ) : (
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                )
              }
              onClick={handleExportDownload}
              className="h-9"
            >
              {copiedBackup ? 'Exported' : 'Export JSON'}
            </Button>

            <Button
              type="button"
              variant={confirmReset ? 'destructive' : 'ghost'}
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={handleResetDefaults}
              className="h-9"
            >
              {confirmReset ? 'Confirm Reset' : 'Reset'}
            </Button>

            <Link
              href={activeNavMeta.liveHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-solid px-3 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-hover"
            >
              <span>{activeNavMeta.liveLabel}</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </header>

        {!isAuthorized ? (
          <section
            data-testid="cms-role-gate-preview"
            className="mx-auto max-w-xl rounded-2xl border border-border bg-surface-card p-6 sm:p-8 text-center space-y-5 my-8 shadow-[var(--shadow-tier-2)]"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-tint-border bg-primary-tint text-on-primary-tint">
              <Lock className="h-6 w-6" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-inset px-2.5 py-0.5 text-[11px] font-mono font-medium text-foreground-muted">
                <span>Access Policy: Restricted</span>
                <span>·</span>
                <span className="text-on-primary-tint">Contributors Only</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Contributor Access Required
              </h2>
              <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed max-w-md mx-auto">
                The ANTs Content Studio is restricted to active contributors, tutors, and administrators.
                Sign in with an authorized account to edit public showcase copy and availability schedules.
              </p>
            </div>

            {/* Current Session Status */}
            <div className="rounded-xl border border-border bg-surface-inset/60 p-3 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-foreground-muted">Current status:</span>
              {sessionState.status === 'authenticated' && sessionState.user ? (
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Signed in as <strong>@{sessionState.user.username}</strong> ({sessionState.user.role})
                </span>
              ) : (
                <span className="font-medium text-foreground-muted flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-border" />
                  Not signed in (Guest Visitor)
                </span>
              )}
            </div>

            {/* Main Action CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <a
                href={`${studyUrl}/login?redirect=${encodeURIComponent('/cms')}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-solid px-4 text-xs font-semibold text-on-primary hover:bg-primary-hover transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign In as Contributor</span>
              </a>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSimulatedAccess('contributor')}
                className="h-9"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Simulate Contributor (Dev Preview)</span>
              </Button>

              <Link
                href="/"
                className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-surface-inset transition-colors"
              >
                Back to Showcase
              </Link>
            </div>

            {/* Quick Demo Switch for Development */}
            <div className="border-t border-border-subtle pt-4 space-y-2 text-left">
              <span className="block font-mono text-[11px] text-foreground-subtle">
                Quick Contributor Switch (Development &amp; Prototyping):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('zaylynnhtet')}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2.5 text-left text-xs hover:border-primary-tint-border hover:bg-surface-inset transition-colors"
                >
                  <UserCheck className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="block font-semibold text-foreground truncate">Zay Lynn Htet</span>
                    <span className="block font-mono text-[10px] text-foreground-muted truncate">@zaylynnhtet · Contributor &amp; Tutor</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('thawyezaw')}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2.5 text-left text-xs hover:border-primary-tint-border hover:bg-surface-inset transition-colors"
                >
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="block font-semibold text-foreground truncate">Thaw Ye Zaw</span>
                    <span className="block font-mono text-[10px] text-foreground-muted truncate">@thawyezaw · Admin &amp; Lead</span>
                  </div>
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Left Section Sidebar */}
            <aside className="lg:w-56 shrink-0 space-y-4">
              <div
                ref={navHostRef}
                role="navigation"
                aria-label="CMS content sections"
                data-gliding-ready={navGlideReady ? 'true' : 'false'}
                className="ants-glide-host relative flex flex-row gap-1 overflow-x-auto rounded-xl border border-border bg-surface-card p-1.5 lg:flex-col"
              >
                <span
                  aria-hidden="true"
                  data-animate={navAnimate ? 'true' : 'false'}
                  className="ants-glide-indicator z-0 rounded-lg bg-primary-tint border border-primary-tint-border"
                  style={{
                    transform: `translate3d(${navRect.x}px, ${navRect.y}px, 0)`,
                    width: `${navRect.width}px`,
                    height: `${navRect.height}px`,
                    opacity: navGlideReady ? 1 : 0,
                  }}
                />
                {SECTION_NAV.map((item) => {
                  const active = activeSection === item.id;
                  const count = sectionCounts[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      data-active={active ? 'true' : 'false'}
                      data-cms-section={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        'ants-glide-item relative z-10 flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors lg:w-full',
                        active
                          ? 'bg-primary-tint text-on-primary-tint'
                          : 'text-foreground-muted hover:text-foreground'
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <SectionIcon id={item.id} className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {count !== null && (
                        <span className="font-mono text-[11px] tabular-nums opacity-80">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Storage & Sync Readout */}
              <div className="rounded-xl border border-border bg-surface-card p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Local Sync
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-tint px-2 py-0.5 font-mono text-[10px] font-semibold text-on-success-tint">
                    Live
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-foreground-muted">
                  Saved in <span className="font-mono">ants-org-cms-v1</span>.
                  Updated{' '}
                  <span
                    className="font-mono tabular-nums text-foreground"
                    suppressHydrationWarning
                  >
                    {formatSavedTime(cmsState.updatedAt)}
                  </span>
                  .
                </p>
              </div>
            </aside>

            {/* Active Editor Workspace */}
            <section
              key={activeSection}
              className="ants-panel-enter min-w-0 flex-1"
            >
              {activeSection === 'home' && (
                <CmsHomeEditorView
                  home={cmsState.home}
                  team={cmsState.team}
                  activities={cmsState.activities}
                  onChange={(nextHome) =>
                    commitState((prev) => updateCmsHomeData(prev, nextHome))
                  }
                />
              )}

              {activeSection === 'team' && (
                <CmsTeamEditorView
                  team={cmsState.team}
                  onUpsert={(member) =>
                    commitState((prev) => upsertCmsTeamMember(prev, member))
                  }
                  onDelete={(id) =>
                    commitState((prev) => deleteCmsTeamMember(prev, id))
                  }
                  onMove={(id, dir) =>
                    commitState((prev) => moveCmsTeamMember(prev, id, dir))
                  }
                />
              )}

              {activeSection === 'activities' && (
                <CmsActivitiesEditorView
                  activities={cmsState.activities}
                  onUpsert={(activity) =>
                    commitState((prev) => upsertCmsActivity(prev, activity))
                  }
                  onDelete={(id) =>
                    commitState((prev) => deleteCmsActivity(prev, id))
                  }
                  onMove={(id, dir) =>
                    commitState((prev) => moveCmsActivity(prev, id, dir))
                  }
                />
              )}

              {activeSection === 'articles' && (
                <CmsArticlesEditorView
                  articles={cmsState.articles}
                  team={cmsState.team}
                  onUpsert={(article) =>
                    commitState((prev) => upsertCmsArticle(prev, article))
                  }
                  onDelete={(id) =>
                    commitState((prev) => deleteCmsArticle(prev, id))
                  }
                  onMove={(id, dir) =>
                    commitState((prev) => moveCmsArticle(prev, id, dir))
                  }
                />
              )}
            </section>
          </div>
        )}
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />

      {/* JSON Import Modal */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import CMS JSON Backup"
        description="Upload a previously exported ants-org-cms-backup.json file or paste JSON below."
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-inset/50 p-3">
            <span className="text-xs text-foreground-muted">
              Choose a <span className="font-mono">.json</span> backup file from
              your computer:
            </span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="text-xs text-foreground file:mr-2 file:rounded-md file:border file:border-border file:bg-surface-card file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-foreground"
            />
          </div>

          <CmsTextarea
            rows={10}
            mono
            value={importDraft}
            onChange={(val) => {
              setImportDraft(val);
              if (importError) setImportError(null);
            }}
            placeholder='{ "version": 1, "home": { ... }, "team": [ ... ] }'
          />

          {importError && (
            <p
              role="alert"
              className="rounded-lg border border-danger-border bg-danger-tint px-3 py-2 text-xs font-medium text-on-danger-tint"
            >
              {importError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setImportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleImportSubmit}
            >
              Apply Backup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
