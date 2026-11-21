'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CalendarClock,
  FolderGit2,
  Globe,
  GraduationCap,
  Lock,
  Send,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  buildTelegramInquiryUrl,
  hasTutorRole,
  summarizeTutorSchedule,
  type SharedUserProfileData,
} from '../lib/account';
import { ZYY_PROFILE_MOCK } from '../mocks/account-profile.mock';
import { type UserRole } from '../mocks/ecosystem-chrome.mock';
import { Badge } from '../primitives/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../primitives/Card';
import { cn } from '../utils/cn';
import { TutorSlotPainterView } from './TutorSlotPainterView';

export interface PublicProfileSwitchItem {
  username: string;
  name: string;
  roleLabel: string;
}

export interface UserProfileViewProps {
  /** Profile record matched from `@[handle]`, or `null` if unknown handle */
  profile?: SharedUserProfileData | null;
  /** Raw handle requested from URL (`/ @username`), used in not-found fallback */
  requestedHandle?: string;
  /** Highlights quick edit button when viewing your own active account */
  isOwnProfile?: boolean;
  /** Optional quick links to jump between demo profiles (`@zaylynnhtet`, `@thawyezaw`, `@minkhant`) */
  availableProfiles?: PublicProfileSwitchItem[];
  /** Optional SPA navigation handler for internal `<a href>` links */
  onNavigate?: (path: string) => void;
  className?: string;
}

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function UserProfileView({
  profile = ZYY_PROFILE_MOCK,
  requestedHandle,
  isOwnProfile = false,
  availableProfiles,
  onNavigate,
  className,
}: UserProfileViewProps) {
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string | null>(null);
  const scheduleSummary = useMemo(
    () => (profile ? summarizeTutorSchedule(profile.tutorSchedule) : { availableHours: 0, flexibleHours: 0, activeDays: 0 }),
    [profile]
  );

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!onNavigate) return;
    if (path.startsWith('http://') || path.startsWith('https://')) return;
    event.preventDefault();
    onNavigate(path);
  };

  if (!profile) {
    const cleanHandle = requestedHandle ? requestedHandle.replace(/^@+/, '') : 'unknown';
    return (
      <Card className={cn('mx-auto max-w-xl', className)}>
        <CardHeader>
          <CardTitle>Member profile not found</CardTitle>
          <CardDescription>
            No public ANTs profile matches{' '}
            <span className="font-mono text-foreground">@{cleanHandle}</span> in this local workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableProfiles && availableProfiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Explore sample ANTs profiles:</p>
              <div className="flex flex-wrap gap-2">
                {availableProfiles.map((item) => (
                  <a
                    key={item.username}
                    href={`/@${item.username}`}
                    onClick={(e) => handleNavClick(e, `/@${item.username}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>{item.name}</span>
                    <span className="font-mono text-foreground-muted">@{item.username}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
            <a
              href="/settings"
              onClick={(e) => handleNavClick(e, '/settings')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-solid px-3.5 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-solid-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Open Account Settings</span>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isTutor = hasTutorRole(profile.roles);

  const visibleSectionsCount = [
    profile.visibility.showStatsStreak,
    isTutor && profile.visibility.showTutorSchedule,
    profile.visibility.showPortfolioProjects,
    profile.visibility.showCertifications,
  ].filter(Boolean).length;

  const inquiryHandle = profile.visibility.showTelegramInquiry
    ? profile.tutorTelegramUsername ||
      (profile.telegram.status === 'connected' ? profile.telegram.handle : '')
    : '';

  const inquiryHref = inquiryHandle
    ? buildTelegramInquiryUrl(inquiryHandle, profile.name, selectedSlotLabel ?? undefined)
    : null;

  return (
    <div className={cn('space-y-5', className)}>
      {/* Top Identity Header Card */}
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-solid font-mono text-lg font-bold text-on-primary shadow-[var(--shadow-tier-1)] sm:h-16 sm:w-16">
                {getInitials(profile.name)}
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {profile.name}
                  </h1>
                  <span className="font-mono text-sm font-medium text-foreground-muted">
                    @{profile.username}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">{profile.headline}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {profile.roles.map((r) => {
                    const meta = ROLE_DISPLAY[r];
                    return (
                      <Badge key={r} variant={meta.variant} dot={r === 'tutor' || r === 'admin'}>
                        {meta.label}
                      </Badge>
                    );
                  })}
                  {profile.telegram.status === 'connected' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-inset px-2.5 py-0.5 font-mono text-[11px] font-semibold leading-4 text-foreground-muted">
                      Telegram: {profile.telegram.handle}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isTutor && inquiryHref && (
                <a
                  href={inquiryHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-solid px-3.5 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-solid-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {selectedSlotLabel ? `Book ${selectedSlotLabel}` : 'Message on Telegram'}
                  </span>
                </a>
              )}
              <a
                href="/settings"
                onClick={(e) => handleNavClick(e, '/settings')}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Settings className="h-3.5 w-3.5 text-foreground-muted" aria-hidden="true" />
                <span>{isOwnProfile ? 'Edit Profile & Slots' : 'Manage Settings'}</span>
              </a>
            </div>
          </div>

          <p className="max-w-3xl text-sm leading-relaxed text-foreground-muted">{profile.bio}</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border-subtle pt-3.5 text-xs text-foreground-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{profile.institution}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{profile.curriculumLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{profile.timezone}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
              <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Member since {profile.memberSince}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Unified Public Telemetry Strip (gated by visibility.showStatsStreak) */}
      {profile.visibility.showStatsStreak && (
        <section
          aria-label="Study and Flow activity summary"
          className="grid grid-cols-2 divide-border-subtle rounded-xl border border-border bg-surface-card shadow-[var(--shadow-tier-1)] sm:grid-cols-4 sm:divide-x"
        >
          <div className="border-b border-r border-border-subtle px-4 py-3.5 sm:border-b-0 sm:border-r-0">
            <span className="block text-[11px] font-semibold text-foreground-muted">
              Active Streak
            </span>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
              {profile.streakDays}d
            </p>
          </div>

          <div className="border-b border-border-subtle px-4 py-3.5 sm:border-b-0">
            <span className="block text-[11px] font-semibold text-foreground-muted">
              Scholar XP
            </span>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
              {profile.xp.toLocaleString()}
            </p>
          </div>

          <div className="border-r border-border-subtle px-4 py-3.5 sm:border-r-0">
            <span className="block text-[11px] font-semibold text-foreground-muted">
              Focus This Month
            </span>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
              {profile.focusHoursThisMonth}h
            </p>
          </div>

          <div className="px-4 py-3.5">
            <span className="block text-[11px] font-semibold text-foreground-muted">
              Completed Blocks
            </span>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
              {profile.completedSessions}
            </p>
          </div>
        </section>
      )}

      {/* Main Content + Right Side Rail */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {/* Tutor Schedule & Interactive Inquiry Slot Showcase */}
          {isTutor && profile.visibility.showTutorSchedule && (
            <Card>
              <CardHeader
                action={
                  <Badge variant="verified" dot mono>
                    {profile.hourlyRateLabel}
                  </Badge>
                }
              >
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                  <CardTitle>Weekly Tutoring Availability</CardTitle>
                </div>
                <CardDescription>
                  Click any open <span className="font-semibold text-on-success-tint">Available</span>{' '}
                  or <span className="font-semibold text-on-primary-tint">Flexible</span> hour below to prepare a Telegram session inquiry.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.taughtSubjects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs font-semibold text-foreground-muted">
                      Subjects:
                    </span>
                    {profile.taughtSubjects.map((subject) => (
                      <Badge key={subject} variant="active-filter">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                )}

                <TutorSlotPainterView
                  schedule={profile.tutorSchedule}
                  mode="preview"
                  tutorName={profile.name}
                  tutorTelegramUsername={inquiryHandle}
                  timezoneLabel={profile.timezone}
                  onSelectPreviewSlot={(slot) => setSelectedSlotLabel(slot.rangeLabel)}
                />
              </CardContent>
            </Card>
          )}

          {/* Portfolio Projects & Study Highlights */}
          {profile.visibility.showPortfolioProjects && (
            <Card>
              <CardHeader
                action={
                  <Badge variant="editorial" mono>
                    {profile.portfolioItems.length}{' '}
                    {profile.portfolioItems.length === 1 ? 'highlight' : 'highlights'}
                  </Badge>
                }
              >
                <div className="flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  <CardTitle>Portfolio Projects &amp; Study Guides</CardTitle>
                </div>
                <CardDescription>
                  Published past-paper logs, visual guides, and workspace tooling built within The ANTs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.portfolioItems.length === 0 ? (
                  <p className="rounded-lg bg-surface-inset/60 px-4 py-6 text-center text-xs text-foreground-muted">
                    No public portfolio items published yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {profile.portfolioItems.map((item) => (
                      <article
                        key={item.id}
                        className="flex flex-col justify-between gap-3 rounded-lg bg-surface-inset/60 p-4 transition-colors hover:bg-surface-inset"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge variant="active-filter">{item.category}</Badge>
                            <span className="text-[11px] text-foreground-muted">
                              {item.updatedLabel}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold leading-snug text-foreground">
                            {item.title}
                          </h3>
                          <p className="text-xs leading-relaxed text-foreground-muted">
                            {item.summary}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground-muted"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          {item.href && (
                            <a
                              href={item.href}
                              onClick={(e) => handleNavClick(e, item.href!)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span>{item.linkLabel ?? 'Open'}</span>
                              <ArrowRight className="h-3 w-3" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Verified Certifications */}
          {profile.visibility.showCertifications && (
            <Card>
              <CardHeader
                action={
                  <Badge variant="verified" mono>
                    {profile.certifications.length} verified
                  </Badge>
                }
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
                  <CardTitle>Academic Credentials &amp; Distinctions</CardTitle>
                </div>
                <CardDescription>
                  Exam results and community mentoring credentials linked to @{profile.username}.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border-subtle">
                {profile.certifications.length === 0 ? (
                  <p className="rounded-lg bg-surface-inset/60 px-4 py-6 text-center text-xs text-foreground-muted">
                    No certifications listed publicly.
                  </p>
                ) : (
                  profile.certifications.map((cert) => (
                    <div
                      key={cert.id}
                      className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-2.5">
                        <ShieldCheck
                          className={cn(
                            'mt-0.5 h-4 w-4 shrink-0',
                            cert.verified ? 'text-success' : 'text-foreground-muted'
                          )}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-xs font-semibold text-foreground">{cert.title}</p>
                          <p className="text-xs text-foreground-muted">
                            {cert.issuer} ·{' '}
                            <span className="font-mono tabular-nums">{cert.year}</span>
                            {cert.credentialCode && (
                              <span className="font-mono"> · {cert.credentialCode}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge variant={cert.verified ? 'verified' : 'editorial'} dot>
                        {cert.verified ? 'Verified' : 'Pending'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {visibleSectionsCount === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Lock className="h-6 w-6 text-foreground-muted" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">
                  Optional portfolio sections are currently set to private
                </p>
                <p className="max-w-md text-xs text-foreground-muted">
                  This member only shares their display name and role headline publicly right now.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Companion Sidebar */}
        <aside className="space-y-4 xl:sticky xl:top-20">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Booking &amp; Ecosystem Status</CardTitle>
              <CardDescription>
                Live cross-app sync across Flow &amp; Study.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                <span className="text-foreground-muted">ANTs Account</span>
                <span className="font-mono font-semibold text-foreground">
                  @{profile.username}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2.5">
                <span className="text-foreground-muted">Telegram Account</span>
                <div className="flex items-center gap-2">
                  <Badge variant={profile.telegram.status === 'connected' ? 'verified' : 'editorial'} dot>
                    {profile.telegram.status === 'connected'
                      ? `Linked ${profile.telegram.handle}`
                      : 'Not linked'}
                  </Badge>
                  {isOwnProfile && profile.telegram.status !== 'connected' && (
                    <a
                      href="/settings#telegram"
                      onClick={(e) => handleNavClick(e, '/settings#telegram')}
                      className="text-[11px] font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Connect
                    </a>
                  )}
                </div>
              </div>

              {isTutor &&
                profile.visibility.showTelegramInquiry &&
                profile.tutorTelegramUsername &&
                profile.tutorTelegramUsername !== profile.telegram.handle && (
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                    <span className="text-foreground-muted">Booking Telegram</span>
                    <span className="font-mono font-semibold text-foreground">
                      {profile.tutorTelegramUsername}
                    </span>
                  </div>
                )}

              {isTutor && (
                <>
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                    <span className="text-foreground-muted">Open Weekly Slots</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {scheduleSummary.availableHours}h open · {scheduleSummary.flexibleHours}h flex
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                    <span className="text-foreground-muted">Session Rate</span>
                    <span className="font-mono font-semibold text-foreground">
                      {profile.hourlyRateLabel}
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Preferred Workspace</span>
                <span className="font-mono font-semibold uppercase text-foreground">
                  {profile.preferredApp}
                </span>
              </div>

              {isTutor && profile.visibility.showTelegramInquiry && selectedSlotLabel && (
                <p className="rounded-lg bg-primary-tint/50 px-3 py-2 text-xs text-on-primary-tint">
                  Selected slot:{' '}
                  <span className="font-mono font-semibold">{selectedSlotLabel}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {availableProfiles && availableProfiles.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  <CardTitle className="text-sm">Explore Members</CardTitle>
                </div>
                <CardDescription>
                  Compare public Tutor, Admin &amp; Student profiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border-subtle">
                {availableProfiles.map((item) => {
                  const isCurrent = item.username === profile.username;
                  return (
                    <a
                      key={item.username}
                      href={`/@${item.username}`}
                      onClick={(e) => handleNavClick(e, `/@${item.username}`)}
                      className={cn(
                        '-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isCurrent
                          ? 'bg-primary-tint/55 font-semibold text-foreground'
                          : 'text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                      )}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-semibold text-foreground">{item.name}</span>{' '}
                        <span className="font-mono text-[11px]">@{item.username}</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-on-primary-tint">
                        {item.roleLabel}
                      </span>
                    </a>
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
