'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Globe,
  QrCode,
  Send,
} from 'lucide-react';
import { Badge, Button, ScrollReveal, cn } from '@ants/ui';
import { loadOrgCmsState, subscribeOrgCmsChanges } from '../../../lib/cms';
import { findTeamMemberByUsername } from '../../../lib/showcase';
import {
  MOCK_ORG_TEAM_MEMBERS,
  type OrgTeamMemberMock,
} from '../../../mocks/showcase-team.mock';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';
import {
  TelegramInquiryModalView,
  type SelectedTutorSlot,
} from './TelegramInquiryModalView';
import { TutorAvailabilityDrawerView } from './TutorAvailabilityDrawerView';

export interface OrgTeamMemberDetailViewProps {
  /** URL handle parameter (`[username]` from `/team/[username]`) */
  username: string;
  /** Optional explicit member dataset */
  members?: OrgTeamMemberMock[];
  /** Use local dev ports in Navbar/Footer */
  useLocalUrls?: boolean;
}

/**
 * `/team/[username]` Individual Team Member & Tutor Showcase View (`[ZYY-2.2]` + `[ZYY-2.3]`).
 */
export function OrgTeamMemberDetailView({
  username,
  members: membersProp,
  useLocalUrls = true,
}: OrgTeamMemberDetailViewProps) {
  const [cmsMembers, setCmsMembers] = useState<OrgTeamMemberMock[] | null>(null);

  useEffect(() => {
    if (membersProp !== undefined) return;
    const sync = () => setCmsMembers(loadOrgCmsState().team);
    sync();
    return subscribeOrgCmsChanges(sync);
  }, [membersProp]);

  const members = membersProp ?? cmsMembers ?? MOCK_ORG_TEAM_MEMBERS;
  const member = useMemo(
    () => findTeamMemberByUsername(members, username),
    [members, username]
  );

  const [qrState, setQrState] = useState<{
    open: boolean;
    slot: SelectedTutorSlot | null;
  }>({ open: false, slot: null });

  const activePath = member ? `/team/${member.username}` : '/team';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath={activePath} useLocalUrls={useLocalUrls} />

      <main className="ants-main-enter mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {!member ? (
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-surface-card p-8 space-y-4">
            <h1 className="text-xl font-bold text-foreground">
              Team member not found
            </h1>
            <p className="text-sm text-foreground-muted leading-relaxed">
              No showcase record matches{' '}
              <span className="font-mono text-foreground">@{username}</span>. Browse our
              Founders, Tutors, and Contributors on the team page.
            </p>
            <Link
              href="/team"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-solid px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-solid-hover"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Team Directory</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb">
              <Link
                href="/team"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>All Team &amp; Tutors</span>
              </Link>
            </nav>

            {/* Open Editorial Profile Header */}
            <header className="border-b border-border pb-8 space-y-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-base font-extrabold',
                      member.isFounder
                        ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-inset text-foreground'
                    )}
                  >
                    {member.initials}
                  </div>
                  <div className="space-y-2">
                    <h1 className="ants-hero-enter text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                      {member.name}
                    </h1>
                    <div
                      style={{ '--stagger-index': 1 } as React.CSSProperties}
                      className="ants-stagger-item flex flex-wrap items-center gap-2.5 text-sm"
                    >
                      <span className="font-semibold text-foreground">
                        {member.roleBadge}
                      </span>
                      {member.isFounder && <Badge variant="active-filter">Founder</Badge>}
                      {member.isTutor && !member.isFounder && (
                        <Badge variant="verified" dot>
                          Verified Tutor
                        </Badge>
                      )}
                    </div>
                    <p
                      style={{ '--stagger-index': 2 } as React.CSSProperties}
                      className="ants-stagger-item text-sm sm:text-base text-foreground-muted max-w-[62ch] leading-relaxed"
                    >
                      {member.bio}
                    </p>
                  </div>
                </div>

                {member.isTutor && (
                  <Button
                    variant="primary"
                    size="md"
                    className="shrink-0"
                    leftIcon={<QrCode className="h-4 w-4" aria-hidden="true" />}
                    rightIcon={<Send className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => setQrState({ open: true, slot: null })}
                  >
                    Telegram QR Inquiry
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-foreground-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-foreground-subtle" aria-hidden="true" />
                  <span>{member.institution}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-foreground-subtle" aria-hidden="true" />
                  <span>{member.timezoneLabel}</span>
                </span>
                <span className="text-foreground-subtle">{member.joinedLabel}</span>
                {member.hourlyRateLabel && (
                  <span className="font-mono font-semibold text-foreground tabular-nums">
                    {member.hourlyRateLabel}
                  </span>
                )}
              </div>
            </header>

            {/* Unboxed Two-Column Details */}
            <section className="grid grid-cols-1 gap-10 border-b border-border pb-10 md:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-base font-bold text-foreground">
                  Background &amp; Roles
                </h2>
                <ul className="space-y-2.5 text-sm text-foreground-muted">
                  {member.achievements.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-base font-bold text-foreground">
                  Curriculums &amp; Taught Subjects
                </h2>
                <dl className="divide-y divide-border-subtle border-y border-border-subtle text-sm">
                  <div className="py-3 space-y-1">
                    <dt className="text-xs font-medium text-foreground-subtle">
                      Examination Boards
                    </dt>
                    <dd className="text-foreground font-medium">
                      {member.curriculums.join(' · ')}
                    </dd>
                  </div>
                  <div className="py-3 space-y-1">
                    <dt className="text-xs font-medium text-foreground-subtle">
                      Subjects &amp; Papers
                    </dt>
                    <dd className="text-foreground-muted leading-relaxed">
                      {member.taughtSubjects.join(', ')}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Embedded Sun–Sat Interactive Schedule for Verified Tutors */}
            {member.isTutor && (
              <ScrollReveal
                as="section"
                aria-label="Tutor weekly availability"
                className="rounded-xl border border-border bg-surface-card p-6 sm:p-7"
              >
                <TutorAvailabilityDrawerView
                  tutor={member}
                  embedded
                  onOpenTelegramModal={(_t, slot) =>
                    setQrState({ open: true, slot: slot ?? null })
                  }
                />
              </ScrollReveal>
            )}
          </div>
        )}
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />

      <TelegramInquiryModalView
        open={qrState.open}
        onClose={() => setQrState({ open: false, slot: null })}
        tutor={member}
        selectedSlot={qrState.slot}
      />
    </div>
  );
}
