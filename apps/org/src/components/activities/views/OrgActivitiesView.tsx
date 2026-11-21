'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Images,
  MapPin,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react';
import { Button, Input, cn, useSlidingIndicator } from '@ants/ui';
import { loadOrgCmsState, subscribeOrgCmsChanges } from '../../../lib/cms';
import {
  countActivitiesByCategory,
  filterActivities,
} from '../../../lib/showcase';
import {
  MOCK_ORG_ACTIVITIES,
  type OrgActivityCategory,
  type OrgActivityMock,
} from '../../../mocks/showcase-content.mock';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';
import { EditorialArtworkView } from '../../shared/views/EditorialArtworkView';

export interface OrgActivitiesViewProps {
  /** Community activities spanning Tutoring, Student's Meet & Exam Venue Visits */
  activities?: OrgActivityMock[];
  /** Optional initial category filter */
  initialCategory?: 'all' | OrgActivityCategory;
  /** Use local dev ports in shared Navbar & Footer */
  useLocalUrls?: boolean;
}

const ACTIVITY_TABS: Array<{ id: 'all' | OrgActivityCategory; label: string }> = [
  { id: 'all', label: 'All Activities' },
  { id: 'Tutoring', label: 'Tutoring' },
  { id: "Student's Meet", label: "Student's Meet" },
  { id: 'Exam Venue Visit', label: 'Exam Venue Visit' },
  { id: 'Hackathon', label: 'Hackathon' },
];

/**
 * `/activities` Showcase View (`[ZYY-2.4]`).
 */
export function OrgActivitiesView({
  activities: activitiesProp,
  initialCategory = 'all',
  useLocalUrls = true,
}: OrgActivitiesViewProps) {
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
  const [category, setCategory] = useState<'all' | OrgActivityCategory>(
    initialCategory
  );
  const [searchQuery, setSearchQuery] = useState('');
  const categoryTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: categoryRect,
    ready: categoryReady,
    animate: categoryAnimate,
  } = useSlidingIndicator(categoryTabsRef, category, {
    activeSelector: '[aria-pressed="true"]',
  });
  const categoryIndicatorReady = categoryReady && categoryRect.visible;

  const counts = useMemo(() => countActivitiesByCategory(activities), [activities]);

  const filteredActivities = useMemo(
    () => filterActivities(activities, { category, searchQuery }),
    [activities, category, searchQuery]
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath="/activities" useLocalUrls={useLocalUrls} />

      <main className="ants-main-enter mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16 space-y-10">
        {/* Header */}
        <section className="max-w-2xl space-y-3">
          <h1 className="ants-hero-enter text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Community Activities &amp; Galleries
          </h1>
          <p
            style={{ '--stagger-index': 1 } as React.CSSProperties}
            className="ants-stagger-item text-sm sm:text-base text-foreground-muted leading-relaxed max-w-[64ch]"
          >
            Past-paper tutoring sessions, Student Meets, pre-exam venue walkthroughs, and
            student hackathons organized for private and school candidates.
          </p>
        </section>

        {/* Unboxed Hairline Filter Strip */}
        <section
          aria-label="Filter community activities"
          className="flex flex-col gap-3 border-y border-border py-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div
            ref={categoryTabsRef}
            role="group"
            aria-label="Activity category filter"
            data-gliding-ready={categoryIndicatorReady ? 'true' : 'false'}
            className="ants-glide-host relative flex flex-wrap items-center gap-1.5"
          >
            <span
              aria-hidden="true"
              data-animate={categoryAnimate ? 'true' : 'false'}
              className="ants-glide-indicator z-0 rounded-lg bg-primary-solid shadow-xs"
              style={{
                transform: `translate3d(${categoryRect.x}px, ${categoryRect.y}px, 0)`,
                width: `${categoryRect.width}px`,
                height: `${categoryRect.height}px`,
                opacity: categoryIndicatorReady ? 1 : 0,
              }}
            />
            {ACTIVITY_TABS.map((tab) => {
              const active = category === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  data-active={active ? 'true' : 'false'}
                  onClick={() => setCategory(tab.id)}
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
                    {counts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="w-full lg:w-64">
            <Input
              aria-label="Search activities"
              placeholder="Filter venue, WMA11, lab..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              rightIcon={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear activity search"
                    className="text-foreground-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : undefined
              }
            />
          </div>
        </section>

        {/* Activities Documentary Photo Grid */}
        {filteredActivities.length === 0 ? (
          <div className="border-b border-border py-12 text-center space-y-3">
            <Images className="mx-auto h-7 w-7 text-foreground-subtle" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                No activities match those filters
              </h2>
              <p className="text-xs text-foreground-muted">
                Clear the search box or switch back to All Activities.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => {
                setCategory('all');
                setSearchQuery('');
              }}
            >
              Reset filters
            </Button>
          </div>
        ) : (
          <section
            key={category}
            aria-label="Community activity recaps"
            className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2"
          >
            {filteredActivities.map((act, idx) => (
              <Link
                key={act.id}
                href={`/activities/${act.slug}`}
                style={{ '--stagger-index': Math.min(idx, 8) } as React.CSSProperties}
                className="ants-stagger-item ants-card-interactive group flex flex-col justify-between space-y-4 rounded-xl p-3 -m-3 border border-transparent"
              >
                <div className="space-y-3.5">
                  <div className="ants-clip-reveal overflow-hidden rounded-lg">
                    <EditorialArtworkView
                      imageSrc={act.coverImageSrc}
                      alt={act.coverAlt}
                      theme={act.artworkTheme}
                      hoverZoom
                      className="aspect-[16/10] w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-foreground-muted">
                    <span className="font-semibold text-primary-solid">
                      {act.category}
                    </span>
                    <span className="tabular-nums">
                      {act.dateLabel} · {act.gallery.length} photos
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary-solid transition-colors">
                      {act.title}
                    </h2>
                    <p className="text-sm text-foreground-muted leading-relaxed line-clamp-2">
                      {act.summary}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-foreground-subtle">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{act.location}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{act.attendanceLabel}</span>
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-semibold text-foreground group-hover:text-primary-solid transition-colors">
                    <span>
                      {act.isUpcoming || act.externalLinks?.length
                        ? 'View Event & Register'
                        : 'Open Gallery'}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />
    </div>
  );
}
