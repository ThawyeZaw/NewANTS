'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  QrCode,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  summarizeTutorSchedule,
  cn,
  useSlidingIndicator,
} from '@ants/ui';
import { loadOrgCmsState, subscribeOrgCmsChanges } from '../../../lib/cms';
import {
  countTeamMembersByRole,
  filterTeamMembers,
} from '../../../lib/showcase';
import {
  MOCK_ORG_TEAM_MEMBERS,
  type OrgCurriculumBoard,
  type OrgMemberRoleCategory,
  type OrgTeamMemberMock,
} from '../../../mocks/showcase-team.mock';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';
import {
  TelegramInquiryModalView,
  type SelectedTutorSlot,
} from './TelegramInquiryModalView';
import { TutorAvailabilityDrawerView } from './TutorAvailabilityDrawerView';

export interface OrgTeamShowcaseViewProps {
  /** Team, Founder, Tutor, Contributor & Alumni records (defaults to MOCK_ORG_TEAM_MEMBERS) */
  members?: OrgTeamMemberMock[];
  /** Optional initial role tab filter */
  initialRoleFilter?: 'all' | OrgMemberRoleCategory;
  /** Use local dev ports in shared Navbar & Footer */
  useLocalUrls?: boolean;
}

const ROLE_FILTER_TABS: Array<{
  id: 'all' | OrgMemberRoleCategory;
  label: string;
}> = [
  { id: 'all', label: 'All Members' },
  { id: 'founder', label: 'Founders' },
  { id: 'tutor', label: 'Tutors' },
  { id: 'contributor', label: 'Contributors' },
  { id: 'alumni', label: 'Alumni' },
];

const BOARD_FILTERS: Array<'all' | OrgCurriculumBoard> = [
  'all',
  'Edexcel IAL',
  'Cambridge AS & A-Level',
  'Cambridge IGCSE',
];

function getSingleRoleLabel(member: OrgTeamMemberMock): string {
  if (member.isFounder && member.isTutor) return 'Founder · Tutor';
  if (member.isFounder) return 'Founder';
  if (member.isTutor) return 'Verified Tutor';
  if (member.roleCategories.includes('alumni')) return 'Alumni';
  return 'Contributor';
}

/**
 * `/team` Showcase View (`[ZYY-2.2]` + `[ZYY-2.3]` integration).
 * Filters members across role categories, curriculum boards, and subject search,
 * opening the Slide-Over Availability Drawer (`TutorAvailabilityDrawerView`) and
 * Telegram QR Modal (`TelegramInquiryModalView`).
 */
export function OrgTeamShowcaseView({
  members: membersProp,
  initialRoleFilter = 'all',
  useLocalUrls = true,
}: OrgTeamShowcaseViewProps) {
  const [cmsMembers, setCmsMembers] = useState<OrgTeamMemberMock[] | null>(null);

  useEffect(() => {
    if (membersProp !== undefined) return;
    const sync = () => setCmsMembers(loadOrgCmsState().team);
    sync();
    return subscribeOrgCmsChanges(sync);
  }, [membersProp]);

  const members = membersProp ?? cmsMembers ?? MOCK_ORG_TEAM_MEMBERS;
  const [roleFilter, setRoleFilter] = useState<'all' | OrgMemberRoleCategory>(
    initialRoleFilter
  );
  const [boardFilter, setBoardFilter] = useState<'all' | OrgCurriculumBoard>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const roleTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: roleRect,
    ready: roleReady,
    animate: roleAnimate,
  } = useSlidingIndicator(roleTabsRef, roleFilter, {
    activeSelector: '[aria-pressed="true"]',
  });
  const roleIndicatorReady = roleReady && roleRect.visible;

  const boardTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: boardRect,
    ready: boardReady,
    animate: boardAnimate,
  } = useSlidingIndicator(boardTabsRef, boardFilter, {
    activeSelector: '[aria-pressed="true"]',
  });
  const boardIndicatorReady = boardReady && boardRect.visible;

  const [drawerTutor, setDrawerTutor] = useState<OrgTeamMemberMock | null>(null);
  const [qrModalState, setQrModalState] = useState<{
    tutor: OrgTeamMemberMock | null;
    slot: SelectedTutorSlot | null;
  }>({ tutor: null, slot: null });

  const roleCounts = useMemo(() => countTeamMembersByRole(members), [members]);

  const filteredMembers = useMemo(
    () =>
      filterTeamMembers(members, {
        roleFilter,
        boardFilter,
        searchQuery,
      }),
    [members, roleFilter, boardFilter, searchQuery]
  );

  const totalWeeklyOpenHours = useMemo(() => {
    return members
      .filter((m) => m.isTutor)
      .reduce((acc, m) => {
        const s = summarizeTutorSchedule(m.weeklySchedule);
        return acc + s.availableHours + s.flexibleHours;
      }, 0);
  }, [members]);

  const hasActiveFilters =
    roleFilter !== 'all' || boardFilter !== 'all' || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setRoleFilter('all');
    setBoardFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath="/team" useLocalUrls={useLocalUrls} />

      <main className="ants-main-enter mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16 space-y-10">
        {/* Page Header — Direct Typography, Understated Inline Count Summary */}
        <section className="max-w-2xl space-y-3">
          <h1 className="ants-hero-enter text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Founders, Tutors &amp; Contributors
          </h1>
          <p
            style={{ '--stagger-index': 1 } as React.CSSProperties}
            className="ants-stagger-item text-sm sm:text-base text-foreground-muted leading-relaxed max-w-[64ch]"
          >
            Teachers, engineers, and past candidates maintaining The ANTs. Open any tutor’s weekly
            Sun–Sat calendar to check free hours and prefill a Telegram message.
          </p>
          <p
            style={{ '--stagger-index': 2 } as React.CSSProperties}
            className="ants-stagger-item text-xs text-foreground-subtle pt-1 tabular-nums"
          >
            {members.length} members listed · {roleCounts.founder} founders · {roleCounts.tutor}{' '}
            active tutors ({totalWeeklyOpenHours} weekly hours)
          </p>
        </section>

        {/* Unboxed Hairline Filter Bar */}
        <section
          aria-label="Filter team members"
          className="space-y-4 border-y border-border py-5"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              ref={roleTabsRef}
              role="group"
              aria-label="Filter by member role"
              data-gliding-ready={roleIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative flex flex-wrap items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                data-animate={roleAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded-lg bg-primary-solid shadow-xs"
                style={{
                  transform: `translate3d(${roleRect.x}px, ${roleRect.y}px, 0)`,
                  width: `${roleRect.width}px`,
                  height: `${roleRect.height}px`,
                  opacity: roleIndicatorReady ? 1 : 0,
                }}
              />
              {ROLE_FILTER_TABS.map((tab) => {
                const active = roleFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => setRoleFilter(tab.id)}
                    className={cn(
                      'ants-glide-item relative z-10 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
                      active
                        ? 'border-transparent bg-primary-solid text-on-primary'
                        : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:text-foreground'
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        'font-mono text-[11px] tabular-nums',
                        active ? 'opacity-90' : 'text-foreground-subtle'
                      )}
                    >
                      {roleCounts[tab.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-full lg:w-72">
              <Input
                aria-label="Search team members and subjects"
                placeholder="Search name, WMA12, 9702..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
                rightIcon={
                  searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search query"
                      className="text-foreground-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : undefined
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-foreground-muted mr-1">
                Syllabus:
              </span>
              <div
                ref={boardTabsRef}
                data-gliding-ready={boardIndicatorReady ? 'true' : 'false'}
                className="ants-glide-host relative flex flex-wrap items-center gap-2"
              >
                <span
                  aria-hidden="true"
                  data-animate={boardAnimate ? 'true' : 'false'}
                  className="ants-glide-indicator z-0 rounded-md border border-primary-tint-border bg-primary-tint"
                  style={{
                    transform: `translate3d(${boardRect.x}px, ${boardRect.y}px, 0)`,
                    width: `${boardRect.width}px`,
                    height: `${boardRect.height}px`,
                    opacity: boardIndicatorReady ? 1 : 0,
                  }}
                />
                {BOARD_FILTERS.map((board) => {
                  const active = boardFilter === board;
                  return (
                    <button
                      key={board}
                      type="button"
                      aria-pressed={active}
                      data-active={active ? 'true' : 'false'}
                      onClick={() => setBoardFilter(board)}
                      className={cn(
                        'ants-glide-item relative z-10 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
                        active
                          ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint font-semibold'
                          : 'border-border bg-background text-foreground-muted hover:border-border-hover hover:text-foreground'
                      )}
                    >
                      {board === 'all' ? 'All Boards' : board}
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="text-xs tabular-nums text-foreground-subtle">
              Showing {filteredMembers.length} of {members.length}
            </span>
          </div>
        </section>

        {/* Two-Column Directory Grid */}
        {filteredMembers.length === 0 ? (
          <div className="border-b border-border py-12 text-center space-y-3">
            <Users className="mx-auto h-7 w-7 text-foreground-subtle" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                No members match those filters
              </h2>
              <p className="text-xs text-foreground-muted">
                Clear the curriculum filter or search another subject code.
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={resetFilters}
              >
                Reset filters
              </Button>
            )}
          </div>
        ) : (
          <section
            key={`${roleFilter}-${boardFilter}`}
            aria-label="Team directory"
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            {filteredMembers.map((member, idx) => {
              const slotSummary = member.isTutor
                ? summarizeTutorSchedule(member.weeklySchedule)
                : null;
              const roleLabel = getSingleRoleLabel(member);
              const subjectPreview = member.taughtSubjects.slice(0, 3).join(' · ');
              const extraSubjectsCount = Math.max(0, member.taughtSubjects.length - 3);

              return (
                <article
                  key={member.id}
                  id={member.username}
                  style={{ '--stagger-index': Math.min(idx, 8) } as React.CSSProperties}
                  className="ants-stagger-item ants-card-interactive flex flex-col justify-between rounded-xl border border-border bg-surface-card p-6"
                >
                  <div className="space-y-4">
                    {/* Header: Initials Monogram, Name, and Single Concise Role Label */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-bold',
                            member.isFounder
                              ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                              : 'border-border bg-surface-inset text-foreground'
                          )}
                        >
                          {member.initials}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-foreground truncate">
                            {member.name}
                          </h2>
                          <p className="text-xs text-foreground-muted truncate">
                            {member.roleBadge}
                          </p>
                        </div>
                      </div>

                      {member.isFounder ? (
                        <Badge variant="active-filter" className="shrink-0">
                          {roleLabel}
                        </Badge>
                      ) : (
                        <span className="shrink-0 text-xs font-medium text-foreground-subtle pt-0.5">
                          {roleLabel}
                        </span>
                      )}
                    </div>

                    {/* Concise Bio */}
                    <p className="text-sm text-foreground-muted leading-relaxed line-clamp-2">
                      {member.bio}
                    </p>

                    {/* Plain Typographic Subjects & Institution */}
                    <div className="space-y-2 border-t border-border-subtle pt-3 text-xs">
                      <p className="text-foreground font-medium leading-relaxed">
                        {subjectPreview}
                        {extraSubjectsCount > 0 && (
                          <span className="whitespace-nowrap text-foreground-subtle">
                            {' · '}+{extraSubjectsCount} more
                          </span>
                        )}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-foreground-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2
                            className="h-3.5 w-3.5 shrink-0 text-foreground-subtle"
                            aria-hidden="true"
                          />
                          <span>{member.institution}</span>
                        </span>

                        {member.isTutor && slotSummary && (
                          <span className="font-mono text-[11px] tabular-nums text-foreground">
                            {slotSummary.availableHours}h open · {slotSummary.flexibleHours}h flex
                            {member.hourlyRateLabel ? ` · ${member.hourlyRateLabel}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
                    {member.isTutor ? (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          leftIcon={<CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
                          onClick={() => setDrawerTutor(member)}
                        >
                          Schedule
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Open Telegram QR inquiry for ${member.name}`}
                          leftIcon={<QrCode className="h-3.5 w-3.5" aria-hidden="true" />}
                          onClick={() => setQrModalState({ tutor: member, slot: null })}
                        >
                          QR
                        </Button>
                        <Link
                          href={`/team/${member.username}`}
                          aria-label={`View full profile for ${member.name}`}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground-muted transition-colors hover:border-border-hover hover:text-foreground"
                        >
                          <span>Profile</span>
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </>
                    ) : (
                      <Link
                        href={`/team/${member.username}`}
                        className="inline-flex h-8 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset"
                      >
                        <span>View Profile &amp; Contributions</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />

      <TutorAvailabilityDrawerView
        tutor={drawerTutor}
        open={Boolean(drawerTutor)}
        onClose={() => setDrawerTutor(null)}
        onOpenTelegramModal={(tutor, slot) => {
          setQrModalState({ tutor, slot: slot ?? null });
        }}
      />

      <TelegramInquiryModalView
        open={Boolean(qrModalState.tutor)}
        onClose={() => setQrModalState({ tutor: null, slot: null })}
        tutor={qrModalState.tutor}
        selectedSlot={qrModalState.slot}
      />
    </div>
  );
}
