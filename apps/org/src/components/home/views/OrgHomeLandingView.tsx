'use client';

import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Flame,
  GraduationCap,
  Users,
} from 'lucide-react';
import {
  MOCK_ORG_HOME_DATA,
  type OrgHomeLandingMockData,
} from '../../../mocks/showcase-home.mock';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';

export interface OrgHomeLandingViewProps {
  /** Home showcase content (defaults to MOCK_ORG_HOME_DATA) */
  data?: OrgHomeLandingMockData;
  /** Use local dev ports (:3001, :3002) for Study & Flow links */
  useLocalUrls?: boolean;
}

export function OrgHomeLandingView({
  data = MOCK_ORG_HOME_DATA,
  useLocalUrls = true,
}: OrgHomeLandingViewProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath="/" useLocalUrls={useLocalUrls} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:px-6 space-y-24">
        {/* 1. Editorial Hero — No Eyebrow Kicker, Clear Measure */}
        <section className="max-w-2xl space-y-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            {data.heroTitle}{' '}
            <span className="text-primary">{data.heroHighlight}</span>
          </h1>
          <p className="text-base sm:text-lg text-foreground-muted leading-relaxed max-w-[62ch]">
            {data.heroDescription}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="/calculator"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              <Calculator className="h-4 w-4" />
              <span>Open Grade Calculator</span>
            </a>
            <a
              href="/team"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset"
            >
              <Users className="h-4 w-4 text-primary" />
              <span>Meet Our Tutors & Team</span>
            </a>
          </div>
        </section>

        {/* 2. Open Editorial Impact Strip */}
        <section
          aria-label="Community impact"
          className="grid grid-cols-2 gap-8 border-y border-border py-10 sm:grid-cols-4"
        >
          {data.impactStats.map((stat) => (
            <div key={stat.id} className="space-y-1.5">
              <p className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-sm font-semibold text-foreground">{stat.label}</p>
              <p className="text-xs text-foreground-muted leading-relaxed">
                {stat.detail}
              </p>
            </div>
          ))}
        </section>

        {/* 3. Two Focused Workspaces (Study & Flow) */}
        <section className="space-y-8">
          <div className="max-w-xl space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Two focused workspaces, free for students
            </h2>
            <p className="text-sm sm:text-base text-foreground-muted">
              Sign in once and move seamlessly between your syllabus tracker and daily timetable.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {data.products.map((product) => {
              const targetUrl = useLocalUrls ? product.localHref : product.href;
              const isStudy = product.id === 'study';

              return (
                <a
                  key={product.id}
                  href={targetUrl}
                  className="group flex flex-col justify-between rounded-2xl border border-border bg-surface-card p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary">
                          {isStudy ? (
                            <GraduationCap className="h-5 w-5" />
                          ) : (
                            <Flame className="h-5 w-5" />
                          )}
                        </span>
                        <div>
                          <span className="text-base font-bold text-foreground">
                            {product.name}
                          </span>
                          <span className="ml-1.5 text-xs text-foreground-muted">
                            {product.endorsement}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-foreground-muted">
                        {product.domainLabel}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {product.headline}
                      </h3>
                      <p className="text-sm text-foreground-muted leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    <ul className="space-y-2 pt-1 text-xs text-foreground-muted">
                      {product.highlights.slice(0, 3).map((point) => (
                        <li key={point} className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4 border-t border-border-subtle flex items-center justify-between text-xs font-semibold text-primary">
                    <span>{product.ctaLabel}</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* 4. Hackathon Showcase — Clean Editorial Feature */}
        <section className="rounded-2xl border border-border bg-surface-card p-7 sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-2.5">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {data.hackathon.title}
              </h2>
              <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">
                {data.hackathon.subtitle}
              </p>
              <p className="font-mono text-xs text-foreground-muted pt-1">
                {data.hackathon.dateLabel} · {data.hackathon.locationLabel} ·{' '}
                {data.hackathon.participantCount}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href={data.hackathon.externalWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-hover"
              >
                <span>Visit Hackathon Site</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <a
                href={data.hackathon.showcaseRoute}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-surface-inset"
              >
                <span>Read Recap</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* 5. Founders, Tutors & Recent Activities — Unboxed Editorial Lists */}
        <section className="grid grid-cols-1 gap-12 md:grid-cols-2">
          {/* Founders & Tutors */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Founders & Tutors
              </h2>
              <a
                href="/team"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Meet all tutors</span>
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {data.featuredMembers.map((member) => (
                <a
                  key={member.username}
                  href={`/team#${member.username}`}
                  className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-surface-inset/50 px-2 -mx-2 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-foreground-muted truncate mt-0.5">
                      {member.specialization}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-primary font-medium shrink-0">
                    {member.availabilityLabel}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Recent Community Activities */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Community Activities
              </h2>
              <a
                href="/activities"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>All activities</span>
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {data.recentActivities.map((act) => (
                <a
                  key={act.slug}
                  href={`/activities/${act.slug}`}
                  className="block py-4 space-y-1 transition-colors hover:bg-surface-inset/50 px-2 -mx-2 rounded-lg"
                >
                  <div className="flex items-center justify-between text-xs text-foreground-muted">
                    <span className="font-medium text-primary">
                      {act.category}
                    </span>
                    <span className="font-mono">{act.dateLabel}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {act.title}
                  </p>
                  <p className="text-xs text-foreground-muted line-clamp-2 leading-relaxed">
                    {act.summary}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />
    </div>
  );
}
