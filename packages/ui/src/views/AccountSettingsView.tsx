'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CalendarClock,
  Check,
  ExternalLink,
  Eye,
  FolderGit2,
  GraduationCap,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  computeProfileCompleteness,
  hasTutorRole,
  normalizeTelegramHandle,
  sanitizeAccountUsernameInput,
  summarizeTutorSchedule,
  validateAccountUsername,
  type CertificationItem,
  type PortfolioHighlightItem,
  type ProfileSectionVisibility,
  type SharedUserProfileData,
  type TelegramAccountState,
  type TutorScheduleMap,
} from '../lib/account';
import { ZYY_PROFILE_MOCK } from '../mocks/account-profile.mock';
import { type UserRole } from '../mocks/ecosystem-chrome.mock';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../primitives/Card';
import { cn } from '../utils/cn';
import { TelegramConnectCardView } from './TelegramConnectCardView';
import { TutorSlotPainterView } from './TutorSlotPainterView';

export type SettingsTabId = 'profile' | 'schedule' | 'telegram' | 'visibility';

export interface AccountSettingsViewProps {
  /** Active signed-in user profile */
  profile?: SharedUserProfileData;
  /** Optional demo persona switcher list (`@zaylynnhtet`, `@thawyezaw`, `@minkhant`) */
  availablePersonas?: SharedUserProfileData[];
  /** Controlled active tab override (defaults to URL `#telegram` hash check -> `'profile'`) */
  initialTab?: SettingsTabId;
  /** Existing ANTs account usernames used for collision validation when editing `/@[username]` */
  takenUsernames?: readonly string[];
  /** Callback invoked on any profile field, schedule paint, portfolio item, or Telegram update */
  onChange?: (next: SharedUserProfileData) => void;
  /** Callback invoked when switching active persona in prototype mode */
  onSwitchPersona?: (username: string) => void;
  /** Callback invoked when resetting local prototype state */
  onResetDemo?: () => void;
  /** Optional SPA navigation handler for `<a href>` links (keeps `@ants/ui` Next-agnostic) */
  onNavigate?: (path: string) => void;
  className?: string;
}

const SETTINGS_TABS: { id: SettingsTabId; label: string }[] = [
  { id: 'profile', label: 'Profile & Portfolio' },
  { id: 'schedule', label: 'Tutor Schedule' },
  { id: 'telegram', label: 'Telegram Bot' },
  { id: 'visibility', label: 'Visibility & Roles' },
];

const ROLE_DISPLAY: Record<
  UserRole,
  { label: string; variant: 'active-filter' | 'verified' | 'deadline' | 'editorial' }
> = {
  student: { label: 'Student', variant: 'active-filter' },
  tutor: { label: 'Verified Tutor', variant: 'verified' },
  teacher: { label: 'Teacher', variant: 'verified' },
  contributor: { label: 'Contributor', variant: 'active-filter' },
  main_contributor: { label: 'Lead Reviewer', variant: 'verified' },
  admin: { label: 'Admin', variant: 'deadline' },
};

const PORTFOLIO_CATEGORIES: PortfolioHighlightItem['category'][] = [
  'Study Notes',
  'Build & Tooling',
  'Research & Essays',
  'Exam Prep',
];

const TIMEZONE_PRESETS = [
  'Asia/Yangon (UTC+06:30)',
  'Asia/Singapore (UTC+08:00)',
  'Asia/Bangkok (UTC+07:00)',
  'Europe/London (UTC+00:00)',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function AccountSettingsView({
  profile = ZYY_PROFILE_MOCK,
  availablePersonas,
  initialTab,
  takenUsernames,
  onChange,
  onSwitchPersona,
  onResetDemo,
  onNavigate,
  className,
}: AccountSettingsViewProps) {
  const [localProfile, setLocalProfile] = useState<SharedUserProfileData>(profile);
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => initialTab ?? 'profile');
  const [savedPulse, setSavedPulse] = useState(false);

  // Account `@username` draft state (separate from Telegram `@username`)
  const [usernameDraft, setUsernameDraft] = useState(profile.username);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Portfolio item quick-add composer state
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectCategory, setNewProjectCategory] =
    useState<PortfolioHighlightItem['category']>('Study Notes');
  const [newProjectSummary, setNewProjectSummary] = useState('');
  const [newProjectTags, setNewProjectTags] = useState('');

  // Certification quick-add composer state
  const [newCertTitle, setNewCertTitle] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertYear, setNewCertYear] = useState('2026');
  const [newCertCode, setNewCertCode] = useState('');

  // Taught subject input
  const [newSubjectInput, setNewSubjectInput] = useState('');

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  // Honor `/settings#telegram` deep-links from `UserMenuView`
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      return;
    }
    if (typeof window !== 'undefined' && window.location.hash === '#telegram') {
      setActiveTab('telegram');
    }
  }, [initialTab]);

  const activeData = onChange ? profile : localProfile;

  useEffect(() => {
    setUsernameDraft(activeData.username);
    setUsernameError(null);
  }, [activeData.id, activeData.username]);

  const existingUsernames = useMemo(
    () => takenUsernames ?? availablePersonas?.map((p) => p.username) ?? [],
    [takenUsernames, availablePersonas]
  );

  const usernameValidation = useMemo(
    () => validateAccountUsername(usernameDraft, existingUsernames, activeData.username),
    [usernameDraft, existingUsernames, activeData.username]
  );

  const updateProfile = (updater: (prev: SharedUserProfileData) => SharedUserProfileData) => {
    const next = updater(activeData);
    if (!onChange) {
      setLocalProfile(next);
    }
    onChange?.(next);
    setSavedPulse(true);
  };

  const handleCommitAccountUsername = () => {
    if (!usernameValidation.valid) {
      setUsernameError(usernameValidation.error ?? 'Invalid ANTs account username.');
      return;
    }
    setUsernameError(null);
    setUsernameDraft(usernameValidation.normalized);
    if (usernameValidation.normalized !== activeData.username) {
      updateProfile((prev) => ({
        ...prev,
        username: usernameValidation.normalized,
      }));
    }
  };

  useEffect(() => {
    if (!savedPulse) return;
    const timer = window.setTimeout(() => setSavedPulse(false), 1800);
    return () => window.clearTimeout(timer);
  }, [savedPulse]);

  const isTutor = hasTutorRole(activeData.roles);
  const scheduleSummary = useMemo(
    () => summarizeTutorSchedule(activeData.tutorSchedule),
    [activeData.tutorSchedule]
  );
  const completeness = useMemo(() => computeProfileCompleteness(activeData), [activeData]);
  const publicProfileHref = `/@${activeData.username}`;

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(path);
  };

  const handleAddPortfolioItem = (event: React.FormEvent) => {
    event.preventDefault();
    const title = newProjectTitle.trim();
    const summary = newProjectSummary.trim();
    if (!title || !summary) return;

    const tags = newProjectTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);

    const item: PortfolioHighlightItem = {
      id: `pf_${Date.now()}`,
      title,
      category: newProjectCategory,
      summary,
      tags: tags.length > 0 ? tags : [newProjectCategory],
      updatedLabel: 'Just added',
    };

    updateProfile((prev) => ({
      ...prev,
      portfolioItems: [item, ...prev.portfolioItems],
    }));

    setNewProjectTitle('');
    setNewProjectSummary('');
    setNewProjectTags('');
  };

  const handleRemovePortfolioItem = (itemId: string) => {
    updateProfile((prev) => ({
      ...prev,
      portfolioItems: prev.portfolioItems.filter((item) => item.id !== itemId),
    }));
  };

  const handleAddCertification = (event: React.FormEvent) => {
    event.preventDefault();
    const title = newCertTitle.trim();
    const issuer = newCertIssuer.trim();
    if (!title || !issuer) return;

    const item: CertificationItem = {
      id: `cert_${Date.now()}`,
      title,
      issuer,
      year: newCertYear.trim() || '2026',
      credentialCode: newCertCode.trim() || undefined,
      verified: false,
    };

    updateProfile((prev) => ({
      ...prev,
      certifications: [item, ...prev.certifications],
    }));

    setNewCertTitle('');
    setNewCertIssuer('');
    setNewCertCode('');
  };

  const handleRemoveCertification = (certId: string) => {
    updateProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c.id !== certId),
    }));
  };

  const handleAddSubject = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = newSubjectInput.trim();
    if (!clean) return;
    if (activeData.taughtSubjects.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setNewSubjectInput('');
      return;
    }
    updateProfile((prev) => ({
      ...prev,
      taughtSubjects: [...prev.taughtSubjects, clean].slice(0, 12),
    }));
    setNewSubjectInput('');
  };

  const handleRemoveSubject = (subject: string) => {
    updateProfile((prev) => ({
      ...prev,
      taughtSubjects: prev.taughtSubjects.filter((s) => s !== subject),
    }));
  };

  const handleVisibilityToggle = (key: keyof ProfileSectionVisibility, value: boolean) => {
    updateProfile((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [key]: value,
      },
    }));
  };

  return (
    <div className={cn('space-y-5', className)}>
      {/* Page Header Row (Direct Title + Public Preview Link + Status) */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Account &amp; Profile Settings
            </h1>
            <span className="font-mono text-xs font-semibold text-foreground-muted">
              ANTs @{activeData.username}
            </span>
            {savedPulse && (
              <Badge variant="verified" dot>
                Saved locally
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground-muted">
            Shared identity, portfolio highlights, Sun–Sat tutor availability, and Telegram Bot alerts across Flow &amp; Study.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onResetDemo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetDemo}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Reset demo
            </Button>
          )}
          <a
            href={publicProfileHref}
            onClick={(e) => handleNavClick(e, publicProfileHref)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Eye className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>View Public Profile</span>
            <ExternalLink className="h-3 w-3 text-foreground-muted" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Account setting sections"
        className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-inset p-1"
      >
        {SETTINGS_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="settings-tabpanel"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-primary-solid text-on-primary shadow-[var(--shadow-tier-1)]'
                  : 'text-foreground-muted hover:text-foreground'
              )}
            >
              <span>{tab.label}</span>
              {tab.id === 'schedule' && isTutor && (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
                    active
                      ? 'bg-on-primary/15 text-on-primary'
                      : 'bg-surface-card text-foreground-muted'
                  )}
                >
                  {scheduleSummary.availableHours + scheduleSummary.flexibleHours}h
                </span>
              )}
              {tab.id === 'telegram' && (
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    activeData.telegram.status === 'connected'
                      ? active
                        ? 'bg-on-primary'
                        : 'bg-success'
                      : active
                        ? 'bg-on-primary/60'
                        : 'bg-foreground-muted'
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Asymmetric Split Workspace: Active Settings Editor + Right Summary Rail */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div
          id="settings-tabpanel"
          role="tabpanel"
          aria-labelledby={`settings-tab-${activeTab}`}
          className="min-w-0 space-y-5"
        >
          {/* TAB 1: Profile Identity & Portfolio Sections */}
          {activeTab === 'profile' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Public Identity &amp; Academic Track</CardTitle>
                  <CardDescription>
                    Updates displayed across Flow, Study, and your public{' '}
                    <span className="font-mono text-foreground">{publicProfileHref}</span> showcase.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="profile-display-name"
                        className="mb-1.5 block text-xs font-semibold text-foreground"
                      >
                        Display Name
                      </label>
                      <input
                        id="profile-display-name"
                        type="text"
                        value={activeData.name}
                        onChange={(e) =>
                          updateProfile((prev) => ({ ...prev, name: e.target.value }))
                        }
                        maxLength={80}
                        placeholder="Your full name"
                        className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-account-username"
                        className="mb-1.5 block text-xs font-semibold text-foreground"
                      >
                        ANTs Account Username
                      </label>
                      <div
                        className={cn(
                          'flex h-10 items-center rounded-lg border bg-surface-card focus-within:ring-2 focus-within:ring-ring',
                          usernameError
                            ? 'border-destructive focus-within:border-destructive'
                            : 'border-border focus-within:border-primary'
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="select-none pl-3 font-mono text-xs font-semibold text-foreground-muted"
                        >
                          /@
                        </span>
                        <input
                          id="profile-account-username"
                          type="text"
                          value={usernameDraft}
                          onChange={(e) => {
                            const cleaned = sanitizeAccountUsernameInput(e.target.value);
                            setUsernameDraft(cleaned);
                            if (usernameError) setUsernameError(null);
                          }}
                          onBlur={handleCommitAccountUsername}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCommitAccountUsername();
                            }
                          }}
                          maxLength={32}
                          placeholder="your_ants_handle"
                          aria-invalid={Boolean(usernameError)}
                          aria-describedby="profile-username-hint"
                          className="h-full min-w-0 flex-1 bg-transparent px-1 font-mono text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
                        />
                        {usernameDraft !== activeData.username && usernameValidation.valid && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleCommitAccountUsername}
                            className="mr-1.5 inline-flex h-7 shrink-0 items-center rounded-md bg-primary-tint px-2 text-xs font-semibold text-on-primary-tint transition-colors hover:bg-primary-solid hover:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                      <p
                        id="profile-username-hint"
                        className={cn(
                          'mt-1 text-[11px]',
                          usernameError ? 'font-medium text-destructive' : 'text-foreground-muted'
                        )}
                      >
                        {usernameError ?? (
                          <>
                            Public profile URL:{' '}
                            <span className="font-mono text-foreground">
                              /@{usernameValidation.normalized || activeData.username}
                            </span>{' '}
                            · Separate from your Telegram @username
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="profile-headline"
                        className="mb-1.5 block text-xs font-semibold text-foreground"
                      >
                        Headline
                      </label>
                      <input
                        id="profile-headline"
                        type="text"
                        value={activeData.headline}
                        onChange={(e) =>
                          updateProfile((prev) => ({ ...prev, headline: e.target.value }))
                        }
                        maxLength={120}
                        placeholder="Role, curriculum focus, or mentoring specialty"
                        className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-institution"
                        className="mb-1.5 block text-xs font-semibold text-foreground"
                      >
                        Institution / Team
                      </label>
                      <input
                        id="profile-institution"
                        type="text"
                        value={activeData.institution}
                        onChange={(e) =>
                          updateProfile((prev) => ({ ...prev, institution: e.target.value }))
                        }
                        maxLength={100}
                        placeholder="School or ANTs group"
                        className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-bio"
                      className="mb-1.5 block text-xs font-semibold text-foreground"
                    >
                      About / Mentoring Approach
                    </label>
                    <textarea
                      id="profile-bio"
                      rows={3}
                      value={activeData.bio}
                      onChange={(e) =>
                        updateProfile((prev) => ({ ...prev, bio: e.target.value }))
                      }
                      maxLength={480}
                      placeholder="Share your study track, teaching focus, and academic projects"
                      className="w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="profile-curriculum"
                        className="mb-1.5 block text-xs font-semibold text-foreground"
                      >
                        Primary Curriculum Focus
                      </label>
                      <input
                        id="profile-curriculum"
                        type="text"
                        value={activeData.curriculumLabel}
                        onChange={(e) =>
                          updateProfile((prev) => ({ ...prev, curriculumLabel: e.target.value }))
                        }
                        maxLength={100}
                        placeholder="e.g. Pearson Edexcel IAL · WMA11–WMA14"
                        className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-timezone"
                        className="mb-1.5 block text-xs font-semibold text-foreground"
                      >
                        Schedule Timezone
                      </label>
                      <select
                        id="profile-timezone"
                        value={activeData.timezone}
                        onChange={(e) =>
                          updateProfile((prev) => ({ ...prev, timezone: e.target.value }))
                        }
                        className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {TIMEZONE_PRESETS.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                        {!TIMEZONE_PRESETS.includes(activeData.timezone) && (
                          <option value={activeData.timezone}>{activeData.timezone}</option>
                        )}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Portfolio Highlights Section */}
              <Card>
                <CardHeader
                  action={
                    <Badge variant="editorial" mono>
                      {activeData.portfolioItems.length}{' '}
                      {activeData.portfolioItems.length === 1 ? 'item' : 'items'}
                    </Badge>
                  }
                >
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle>Portfolio Projects &amp; Study Notes</CardTitle>
                  </div>
                  <CardDescription>
                    Showcase curated study guides, past-paper logs, or Flow tooling builds on your public profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeData.portfolioItems.length === 0 ? (
                    <p className="rounded-lg bg-surface-inset/60 px-4 py-6 text-center text-xs text-foreground-muted">
                      No portfolio highlights added yet. Add a project or study note below.
                    </p>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      {activeData.portfolioItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {item.title}
                              </span>
                              <Badge variant="active-filter">{item.category}</Badge>
                            </div>
                            <p className="text-xs leading-relaxed text-foreground-muted">
                              {item.summary}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-surface-inset px-1.5 py-0.5 text-[11px] font-medium text-foreground-muted"
                                >
                                  {tag}
                                </span>
                              ))}
                              <span className="text-[11px] text-foreground-muted">
                                · {item.updatedLabel}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePortfolioItem(item.id)}
                            aria-label={`Remove portfolio item ${item.title}`}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-destructive-tint hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={handleAddPortfolioItem}
                    className="space-y-3 border-t border-border-subtle pt-4"
                  >
                    <p className="text-xs font-semibold text-foreground">Add Portfolio Highlight</p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_170px]">
                      <input
                        type="text"
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        placeholder="Title (e.g. WMA12 Differential Equations Visual Guide)"
                        maxLength={90}
                        aria-label="New portfolio item title"
                        className="h-9 rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <select
                        value={newProjectCategory}
                        onChange={(e) =>
                          setNewProjectCategory(
                            e.target.value as PortfolioHighlightItem['category']
                          )
                        }
                        aria-label="Portfolio category"
                        className="h-9 rounded-lg border border-border bg-surface-card px-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {PORTFOLIO_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
                      <input
                        type="text"
                        value={newProjectSummary}
                        onChange={(e) => setNewProjectSummary(e.target.value)}
                        placeholder="Brief outcome or takeaway (1 sentence)"
                        maxLength={180}
                        aria-label="New portfolio item summary"
                        className="h-9 rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="text"
                        value={newProjectTags}
                        onChange={(e) => setNewProjectTags(e.target.value)}
                        placeholder="Tags: WMA12, Physics"
                        maxLength={60}
                        aria-label="New portfolio item tags"
                        className="h-9 rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newProjectTitle.trim() || !newProjectSummary.trim()}
                        leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Add Highlight
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Verified Certifications Section */}
              <Card>
                <CardHeader
                  action={
                    <Badge variant="verified" mono>
                      {activeData.certifications.length} listed
                    </Badge>
                  }
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle>Academic Credentials &amp; Certifications</CardTitle>
                  </div>
                  <CardDescription>
                    Exam results and ANTs peer fellowships displayed cleanly on your public profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="divide-y divide-border-subtle">
                    {activeData.certifications.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {cert.title}
                            </span>
                            {cert.verified ? (
                              <Badge variant="verified" dot>
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="editorial">Pending review</Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-foreground-muted">
                            {cert.issuer} · <span className="font-mono tabular-nums">{cert.year}</span>
                            {cert.credentialCode && (
                              <span className="font-mono"> · {cert.credentialCode}</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCertification(cert.id)}
                          aria-label={`Remove certification ${cert.title}`}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-destructive-tint hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleAddCertification}
                    className="grid grid-cols-1 gap-2 border-t border-border-subtle pt-4 sm:grid-cols-[minmax(0,1fr)_160px_84px_120px_auto]"
                  >
                    <input
                      type="text"
                      value={newCertTitle}
                      onChange={(e) => setNewCertTitle(e.target.value)}
                      placeholder="Qualification or certificate title"
                      maxLength={90}
                      aria-label="Certification title"
                      className="h-9 rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="text"
                      value={newCertIssuer}
                      onChange={(e) => setNewCertIssuer(e.target.value)}
                      placeholder="Issuer (e.g. Edexcel)"
                      maxLength={60}
                      aria-label="Certification issuer"
                      className="h-9 rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="text"
                      value={newCertYear}
                      onChange={(e) => setNewCertYear(e.target.value)}
                      placeholder="Year"
                      maxLength={8}
                      aria-label="Certification year"
                      className="h-9 rounded-lg border border-border bg-surface-card px-2.5 font-mono text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="text"
                      value={newCertCode}
                      onChange={(e) => setNewCertCode(e.target.value)}
                      placeholder="Code (optional)"
                      maxLength={20}
                      aria-label="Certification credential code"
                      className="h-9 rounded-lg border border-border bg-surface-card px-2.5 font-mono text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!newCertTitle.trim() || !newCertIssuer.trim()}
                      leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                    >
                      Add
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}

          {/* TAB 2: Tutor Availability Slot-Painter & Teaching Setup */}
          {activeTab === 'schedule' && (
            <Card>
              <CardHeader
                action={
                  isTutor ? (
                    <Badge variant="verified" dot mono>
                      {scheduleSummary.availableHours + scheduleSummary.flexibleHours}h / wk open
                    </Badge>
                  ) : (
                    <Badge variant="editorial">Tutor role locked</Badge>
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                  <CardTitle>Weekly Tutor Availability Slot-Painter</CardTitle>
                </div>
                <CardDescription>
                  Select a brush and click-and-drag across Sun–Sat hours (
                  <span className="font-mono text-foreground">08:00–21:00</span>) to set live
                  tutoring slots surfaced on{' '}
                  <span className="font-mono text-foreground">{publicProfileHref}</span>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {!isTutor ? (
                  <div className="space-y-3 rounded-lg bg-surface-inset/75 p-5">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Tutor scheduling unlocks once verified as a Peer Tutor or Admin
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                          Switch to a tutor demo persona on the right rail (
                          <span className="font-mono text-foreground">@zaylynnhtet</span> or{' '}
                          <span className="font-mono text-foreground">@thawyezaw</span>) to test
                          drag-painting, or submit a role verification request below.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={activeData.roleUpgradeStatus === 'pending_tutor'}
                        onClick={() =>
                          updateProfile((prev) => ({
                            ...prev,
                            roleUpgradeStatus: 'pending_tutor',
                          }))
                        }
                        leftIcon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        {activeData.roleUpgradeStatus === 'pending_tutor'
                          ? 'Tutor Application Pending Review'
                          : 'Apply to Become an ANTs Tutor'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="tutor-hourly-rate"
                          className="mb-1.5 block text-xs font-semibold text-foreground"
                        >
                          Hourly Session Rate
                        </label>
                        <input
                          id="tutor-hourly-rate"
                          type="text"
                          value={activeData.hourlyRateLabel}
                          onChange={(e) =>
                            updateProfile((prev) => ({ ...prev, hourlyRateLabel: e.target.value }))
                          }
                          maxLength={40}
                          placeholder="e.g. 25,000 MMK / hr or Free Peer Mentoring"
                          className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 font-mono text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="tutor-public-tg"
                          className="mb-1.5 block text-xs font-semibold text-foreground"
                        >
                          Public Booking Telegram @username
                        </label>
                        <input
                          id="tutor-public-tg"
                          type="text"
                          value={activeData.tutorTelegramUsername}
                          onChange={(e) =>
                            updateProfile((prev) => ({
                              ...prev,
                              tutorTelegramUsername: e.target.value,
                            }))
                          }
                          onBlur={(e) =>
                            updateProfile((prev) => ({
                              ...prev,
                              tutorTelegramUsername: e.target.value.trim()
                                ? normalizeTelegramHandle(e.target.value, '')
                                : '',
                            }))
                          }
                          maxLength={36}
                          placeholder="@your_booking_handle"
                          className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 font-mono text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="mt-1 text-[11px] text-foreground-muted">
                          Student inquiries open <span className="font-mono">t.me</span> directly. Can differ from ANTs{' '}
                          <span className="font-mono">@{activeData.username}</span> &amp; your notification account.
                        </p>
                      </div>
                    </div>

                    {/* Taught Subjects Tag Editor */}
                    <div className="space-y-2 border-t border-border-subtle pt-4">
                      <p className="text-xs font-semibold text-foreground">Taught Subjects &amp; Exam Codes</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {activeData.taughtSubjects.map((subj) => (
                          <span
                            key={subj}
                            className="inline-flex items-center gap-1.5 rounded-full border border-primary-tint-border bg-primary-tint px-2.5 py-1 text-xs font-semibold text-on-primary-tint"
                          >
                            <span>{subj}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubject(subj)}
                              aria-label={`Remove taught subject ${subj}`}
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <form onSubmit={handleAddSubject} className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={newSubjectInput}
                          onChange={(e) => setNewSubjectInput(e.target.value)}
                          placeholder="Add syllabus code (e.g. WFM01 Further Pure 1)"
                          maxLength={48}
                          aria-label="Add taught subject"
                          className="h-9 min-w-[220px] flex-1 rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={!newSubjectInput.trim()}
                          leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                        >
                          Add Subject
                        </Button>
                      </form>
                    </div>

                    {/* Interactive Sun–Sat Drag Slot-Painter Grid */}
                    <div className="border-t border-border-subtle pt-4">
                      <TutorSlotPainterView
                        schedule={activeData.tutorSchedule}
                        mode="edit"
                        tutorName={activeData.name}
                        tutorTelegramUsername={activeData.tutorTelegramUsername}
                        timezoneLabel={activeData.timezone}
                        onChange={(nextSchedule: TutorScheduleMap) =>
                          updateProfile((prev) => ({
                            ...prev,
                            tutorSchedule: nextSchedule,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Telegram Bot & Cross-App Notifications */}
          {activeTab === 'telegram' && (
            <TelegramConnectCardView
              id="telegram"
              telegram={activeData.telegram}
              accountUsername={activeData.username}
              isTutor={isTutor}
              onChange={(nextTelegram: TelegramAccountState) =>
                updateProfile((prev) => ({
                  ...prev,
                  telegram: nextTelegram,
                }))
              }
            />
          )}

          {/* TAB 4: Visibility Controls & Multi-Role Union */}
          {activeTab === 'visibility' && (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle>Public Profile Section Visibility</CardTitle>
                  </div>
                  <CardDescription>
                    Control which sections visitors see when visiting{' '}
                    <span className="font-mono text-foreground">{publicProfileHref}</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border-subtle">
                  <VisibilityRow
                    label="Show Streak, XP & Monthly Focus Hours"
                    description="Displays your 14-day Flow streak, Scholar XP ledger, and total focus sessions."
                    checked={activeData.visibility.showStatsStreak}
                    onChange={(v) => handleVisibilityToggle('showStatsStreak', v)}
                  />
                  <VisibilityRow
                    label="Show Portfolio Projects & Study Guides"
                    description="Publishes curated study notes, past-paper logs, and builds to visitors."
                    checked={activeData.visibility.showPortfolioProjects}
                    onChange={(v) => handleVisibilityToggle('showPortfolioProjects', v)}
                  />
                  <VisibilityRow
                    label="Show Verified Certifications"
                    description="Lists Edexcel / Cambridge qualifications and community peer fellowships."
                    checked={activeData.visibility.showCertifications}
                    onChange={(v) => handleVisibilityToggle('showCertifications', v)}
                  />
                  <VisibilityRow
                    label="Show Tutor Weekly Availability Grid"
                    description="Renders your live Sun–Sat slot grid for student inquiries when holding a Tutor role."
                    checked={activeData.visibility.showTutorSchedule}
                    onChange={(v) => handleVisibilityToggle('showTutorSchedule', v)}
                  />
                  <VisibilityRow
                    label="Enable 1-Click Telegram Booking Inquiry"
                    description="Shows a prefilled Telegram booking message addressed to your tutor handle next to open schedule slots."
                    checked={activeData.visibility.showTelegramInquiry}
                    onChange={(v) => handleVisibilityToggle('showTelegramInquiry', v)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle>Ecosystem Roles &amp; SSO Workspace</CardTitle>
                  </div>
                  <CardDescription>
                    Multi-role capability union assigned via <span className="font-mono">.the-ants.org</span> Better Auth SSO.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeData.roles.map((r) => {
                      const meta = ROLE_DISPLAY[r];
                      return (
                        <Badge key={r} variant={meta.variant}>
                          {meta.label}
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 rounded-xl bg-surface-inset p-1.5 sm:grid-cols-2">
                    <button
                      type="button"
                      aria-pressed={activeData.preferredApp === 'flow'}
                      onClick={() => updateProfile((prev) => ({ ...prev, preferredApp: 'flow' }))}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        activeData.preferredApp === 'flow'
                          ? 'bg-primary-tint text-on-primary-tint'
                          : 'text-foreground-muted hover:bg-surface-card hover:text-foreground'
                      )}
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Default Landing: Flow Studio
                        </p>
                        <p className="text-xs text-foreground-muted">
                          Timetable, Tasks &amp; Pomodoro
                        </p>
                      </div>
                      {activeData.preferredApp === 'flow' && (
                        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                      )}
                    </button>

                    <button
                      type="button"
                      aria-pressed={activeData.preferredApp === 'study'}
                      onClick={() => updateProfile((prev) => ({ ...prev, preferredApp: 'study' }))}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        activeData.preferredApp === 'study'
                          ? 'bg-primary-tint text-on-primary-tint'
                          : 'text-foreground-muted hover:bg-surface-card hover:text-foreground'
                      )}
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Default Landing: Study Tracker
                        </p>
                        <p className="text-xs text-foreground-muted">
                          IGCSE &amp; IAL Topics &amp; Past Papers
                        </p>
                      </div>
                      {activeData.preferredApp === 'study' && (
                        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {!isTutor && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
                      <span className="text-xs text-foreground-muted">
                        Want to teach IGCSE / IAL peers or publish exam notes?
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={activeData.roleUpgradeStatus === 'pending_tutor'}
                          onClick={() =>
                            updateProfile((prev) => ({ ...prev, roleUpgradeStatus: 'pending_tutor' }))
                          }
                        >
                          {activeData.roleUpgradeStatus === 'pending_tutor'
                            ? 'Tutor Request Sent'
                            : 'Request Tutor Role'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={activeData.roleUpgradeStatus === 'pending_contributor'}
                          onClick={() =>
                            updateProfile((prev) => ({
                              ...prev,
                              roleUpgradeStatus: 'pending_contributor',
                            }))
                          }
                        >
                          {activeData.roleUpgradeStatus === 'pending_contributor'
                            ? 'Contributor Request Sent'
                            : 'Request Contributor'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sticky Right Rail: Live Card Preview, Completeness & Persona Switcher */}
        <aside className="space-y-4 xl:sticky xl:top-20">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-solid font-mono text-sm font-bold text-on-primary">
                  {getInitials(activeData.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{activeData.name}</p>
                  <p className="truncate font-mono text-xs text-foreground-muted">
                    ANTs @{activeData.username}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {activeData.roles.map((r) => {
                      const meta = ROLE_DISPLAY[r];
                      return (
                        <Badge key={r} variant={meta.variant}>
                          {meta.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Profile Completeness Bar */}
              <div className="space-y-1.5 border-t border-border-subtle pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Profile readiness</span>
                  <span className="font-mono font-bold tabular-nums text-on-primary-tint">
                    {completeness.percent}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-inset">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${completeness.percent}%` }}
                  />
                </div>
                {completeness.missingItems.length > 0 && (
                  <p className="text-[11px] text-foreground-muted">
                    Next up: {completeness.missingItems.join(' · ')}
                  </p>
                )}
              </div>

              {/* Live Cross-App Telemetry Strip */}
              <div className="grid grid-cols-2 divide-x divide-border-subtle rounded-lg bg-surface-inset/60 text-xs">
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 text-foreground-muted">
                    <Send className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>Telegram Account</span>
                  </div>
                  {activeData.telegram.status === 'connected' ? (
                    <p className="mt-1 truncate font-mono text-xs font-semibold text-foreground">
                      {activeData.telegram.handle}
                    </p>
                  ) : activeData.telegram.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('telegram')}
                      className="mt-1 truncate font-mono text-xs font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {activeData.telegram.verificationCode}
                    </button>
                  ) : (
                    <div className="mt-1 flex items-center justify-between gap-1.5">
                      <span className="truncate font-mono text-xs font-semibold text-foreground-muted">
                        Not linked
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('telegram')}
                        className="shrink-0 text-[11px] font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Connect
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 text-foreground-muted">
                    <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>{isTutor ? 'Open Slots' : 'Portfolio'}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-foreground">
                    {isTutor
                      ? `${scheduleSummary.availableHours + scheduleSummary.flexibleHours}h / wk`
                      : `${activeData.portfolioItems.length} ${
                          activeData.portfolioItems.length === 1 ? 'highlight' : 'highlights'
                        }`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-3 text-xs text-foreground-muted">
                <span className="inline-flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span className="font-mono tabular-nums font-semibold text-foreground">
                    {activeData.xp.toLocaleString()} XP
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  {activeData.streakDays}d streak · {activeData.focusHoursThisMonth}h month
                </span>
              </div>

              <a
                href={publicProfileHref}
                onClick={(e) => handleNavClick(e, publicProfileHref)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-solid px-3 py-2 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-solid-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Open Public @{activeData.username}</span>
              </a>
            </CardContent>
          </Card>

          {/* Demo Persona Switcher (Zay Tutor / Thaw Admin / Min Khant Student) */}
          {availablePersonas && availablePersonas.length > 0 && onSwitchPersona && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  <CardTitle className="text-sm">Preview Persona Role</CardTitle>
                </div>
                <CardDescription>
                  Switch between Student, Tutor, and Admin states locally.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border-subtle">
                {availablePersonas.map((p) => {
                  const selected = p.username === activeData.username;
                  return (
                    <button
                      key={p.username}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSwitchPersona(p.username)}
                      className={cn(
                        '-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'bg-primary-tint/55 font-semibold text-foreground'
                          : 'text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                      )}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-semibold text-foreground">{p.name}</span>{' '}
                        <span className="font-mono text-[11px]">@{p.username}</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-on-primary-tint">
                        {p.roles.includes('admin')
                          ? 'Admin+Tutor'
                          : p.roles.includes('tutor')
                            ? 'Tutor'
                            : 'Student'}
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function VisibilityRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 transition-colors">
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-foreground-muted">
          {description}
        </span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-border-hover transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface-card shadow-[var(--shadow-tier-1)] transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
