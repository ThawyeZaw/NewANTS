'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Expand,
  MapPin,
  Users,
} from 'lucide-react';
import { ScrollReveal, cn } from '@ants/ui';
import { loadOrgCmsState, subscribeOrgCmsChanges } from '../../../lib/cms';
import { findActivityBySlug } from '../../../lib/showcase';
import {
  MOCK_ORG_ACTIVITIES,
  type OrgActivityMock,
} from '../../../mocks/showcase-content.mock';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';
import { EditorialArtworkView } from '../../shared/views/EditorialArtworkView';
import { ActivityGalleryLightboxView } from './ActivityGalleryLightboxView';

export interface OrgActivityDetailViewProps {
  /** URL slug from `/activities/[slug]` */
  slug: string;
  /** Optional explicit activities list */
  activities?: OrgActivityMock[];
  /** Use local dev ports in shared Navbar & Footer */
  useLocalUrls?: boolean;
}

/**
 * `/activities/[slug]` Event Recap & Interactive Lightbox Gallery View (`[ZYY-2.4]`).
 */
export function OrgActivityDetailView({
  slug,
  activities: activitiesProp,
  useLocalUrls = true,
}: OrgActivityDetailViewProps) {
  const [cmsActivities, setCmsActivities] = useState<OrgActivityMock[] | null>(
    null
  );

  useEffect(() => {
    if (activitiesProp !== undefined) return;
    const sync = () => setCmsActivities(loadOrgCmsState().activities);
    sync();
    return subscribeOrgCmsChanges(sync);
  }, [activitiesProp]);

  const activities = activitiesProp ?? cmsActivities ?? MOCK_ORG_ACTIVITIES;
  const activity = useMemo(
    () => findActivityBySlug(activities, slug),
    [activities, slug]
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const relatedActivities = useMemo(() => {
    if (!activity) return activities.slice(0, 2);
    return activities.filter((a) => a.slug !== activity.slug).slice(0, 2);
  }, [activities, activity]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView
        activePath={activity ? `/activities/${activity.slug}` : '/activities'}
        useLocalUrls={useLocalUrls}
      />

      <main className="ants-main-enter mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {!activity ? (
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-surface-card p-8 space-y-4">
            <h1 className="text-xl font-bold text-foreground">
              Activity recap not found
            </h1>
            <p className="text-sm text-foreground-muted leading-relaxed">
              No community event matches{' '}
              <span className="font-mono text-foreground">{slug}</span>. Browse all
              Tutoring cohorts, Student’s Meets, Exam Venue Visits, and Hackathons on the
              activities page.
            </p>
            <Link
              href="/activities"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-solid px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-solid-hover"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>All Community Activities</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb">
              <Link
                href="/activities"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>All Activities</span>
              </Link>
            </nav>

            {/* Open Event Masthead (Zero Kicker Above Heading) */}
            <header className="space-y-6">
              <div className="space-y-4">
                <h1 className="ants-hero-enter max-w-3xl text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                  {activity.title}
                </h1>
                <p
                  style={{ '--stagger-index': 1 } as React.CSSProperties}
                  className="ants-stagger-item max-w-[65ch] text-base text-foreground-muted leading-relaxed"
                >
                  {activity.summary}
                </p>

                {activity.externalLinks && activity.externalLinks.length > 0 && (
                  <div
                    style={{ '--stagger-index': 2 } as React.CSSProperties}
                    className="ants-stagger-item flex flex-wrap items-center gap-3 pt-1"
                  >
                    {activity.externalLinks.map((ext) => (
                      <a
                        key={ext.href}
                        href={ext.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-colors active:scale-[0.98]',
                          ext.variant === 'primary'
                            ? 'bg-primary-solid text-on-primary hover:bg-primary-solid-hover'
                            : 'border border-border bg-surface-card text-foreground hover:border-border-hover hover:bg-surface-inset'
                        )}
                      >
                        <span>{ext.label}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-6 border-y border-border py-5 sm:grid-cols-4">
                <div className="space-y-1">
                  <dt className="text-xs text-foreground-subtle">Category</dt>
                  <dd className="text-sm font-semibold text-primary-solid">
                    {activity.category}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="inline-flex items-center gap-1.5 text-xs text-foreground-subtle">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Date</span>
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {activity.dateLabel}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="inline-flex items-center gap-1.5 text-xs text-foreground-subtle">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Venue</span>
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {activity.location}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="inline-flex items-center gap-1.5 text-xs text-foreground-subtle">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{activity.isUpcoming ? 'Cohort' : 'Attendance'}</span>
                  </dt>
                  <dd className="text-sm font-semibold text-foreground tabular-nums">
                    {activity.attendanceLabel}
                  </dd>
                </div>
              </dl>
            </header>

            {/* Narrative Recap / Overview + Takeaways Split */}
            <section className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {activity.isUpcoming ? 'Event Overview' : 'Session Recap'}
                </h2>
                <div className="space-y-4 text-base leading-relaxed text-foreground-muted max-w-[66ch]">
                  {activity.recapParagraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              </div>

              <div className="space-y-6 border-t border-border pt-6 lg:col-span-5 lg:border-t-0 lg:pt-0">
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-foreground">
                    {activity.isUpcoming ? 'Key Highlights' : 'What Was Covered'}
                  </h2>
                  <ul className="space-y-2.5 text-sm text-foreground-muted">
                    {activity.highlights.map((item) => (
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

                <div className="border-t border-border-subtle pt-4 text-xs">
                  <span className="font-semibold text-foreground">
                    {activity.isUpcoming ? 'Organizers: ' : 'Facilitators: '}
                  </span>
                  <span className="text-foreground-muted">
                    {activity.facilitators.join(', ')}
                  </span>
                </div>
              </div>
            </section>

            {/* Concise Program Phases (when provided, e.g. Hackathon) */}
            {activity.schedulePhases && activity.schedulePhases.length > 0 && (
              <ScrollReveal
                as="section"
                aria-label="Program schedule phases"
                className="space-y-5 border-t border-border pt-10"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Program Schedule Summary
                  </h2>
                  <span className="font-mono text-xs text-foreground-muted">
                    {activity.schedulePhases.length} Phases
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {activity.schedulePhases.map((phase, idx) => (
                    <div
                      key={phase.phase}
                      style={{ '--stagger-index': idx } as React.CSSProperties}
                      className="ants-reveal-item border-t border-border-subtle pt-3.5 space-y-1.5"
                    >
                      <span className="block font-mono text-xs font-bold text-primary-solid">
                        {phase.window}
                      </span>
                      <h3 className="text-sm font-bold text-foreground leading-snug">
                        {phase.phase}
                      </h3>
                      <p className="font-mono text-[11px] text-foreground-subtle">
                        {phase.mode}
                      </p>
                      <p className="text-xs text-foreground-muted leading-relaxed pt-0.5">
                        {phase.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            )}

            {/* Interactive Documentary Photo Gallery */}
            <ScrollReveal
              as="section"
              aria-label="Event photo gallery"
              className="space-y-5 border-t border-border pt-10"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Event Photos
                </h2>
                <span className="text-xs text-foreground-muted tabular-nums">
                  Select any photo to open gallery viewer ({activity.gallery.length} photos)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {activity.gallery.map((photo, idx) => (
                  <button
                    key={photo.id}
                    type="button"
                    style={{ '--stagger-index': idx } as React.CSSProperties}
                    onClick={() => setLightboxIndex(idx)}
                    className="ants-reveal-item ants-card-interactive group flex flex-col text-left space-y-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl border border-transparent p-2 -m-2"
                  >
                    <div className="relative w-full">
                      <EditorialArtworkView
                        imageSrc={photo.imageSrc}
                        alt={photo.imageAlt}
                        theme={photo.artworkTheme}
                        hoverZoom
                        className="aspect-video w-full"
                      />
                      <span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-card/90 text-foreground opacity-85 transition-opacity group-hover:opacity-100">
                        <Expand className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {photo.caption}
                      </p>
                      <p className="text-xs text-foreground-subtle">
                        {photo.locationTag} · {photo.shotLabel}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollReveal>

            {/* Related Activities */}
            {relatedActivities.length > 0 && (
              <ScrollReveal as="section" className="space-y-4 border-t border-border pt-8">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  More Community Activities
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {relatedActivities.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/activities/${rel.slug}`}
                      className="group flex items-center justify-between gap-4 border-t border-border-subtle pt-4 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <span className="text-xs font-semibold text-primary-solid">
                          {rel.category} · {rel.dateLabel}
                        </span>
                        <p className="truncate text-sm font-bold text-foreground group-hover:text-primary-solid transition-colors">
                          {rel.title}
                        </p>
                      </div>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-foreground-muted transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              </ScrollReveal>
            )}
          </div>
        )}
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />

      {activity && (
        <ActivityGalleryLightboxView
          photos={activity.gallery}
          activeIndex={lightboxIndex}
          activityTitle={activity.title}
          onChangeIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
