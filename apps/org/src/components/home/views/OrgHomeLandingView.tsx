'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  Compass,
  QrCode,
  Users,
} from 'lucide-react';
import { ScrollReveal, cn, useSlidingIndicator } from '@ants/ui';
import {
  loadOrgCmsState,
  subscribeOrgCmsChanges,
} from '../../../lib/cms';
import type { OrgActivityMock } from '../../../mocks/showcase-content.mock';
import {
  MOCK_ORG_HOME_DATA,
  type OrgHomeLandingMockData,
} from '../../../mocks/showcase-home.mock';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';
import { OrgProductsVideoView } from './OrgProductsVideoView';

export interface OrgHomeLandingViewProps {
  /** Home showcase content (defaults to MOCK_ORG_HOME_DATA) */
  data?: OrgHomeLandingMockData;
  /** Use local dev ports (:3001, :3002) for Study & Flow links */
  useLocalUrls?: boolean;
  /** Optional external .mp4 / .webm URL for Our Products showcase video */
  productsVideoUrl?: string;
  /** Optional poster image URL for Our Products showcase video */
  productsPosterUrl?: string;
}

interface OrbitToolNode {
  id: 'calculator' | 'study' | 'tutors' | 'flow';
  shortLabel: string;
  code: string;
  label: string;
  metric: string;
  caption: string;
  href: string;
  external?: boolean;
  cx: number;
  cy: number;
}

function OrbitNodeSvgIcon({
  id,
  x,
  y,
  size,
  stroke,
}: {
  id: OrbitToolNode['id'];
  x: number;
  y: number;
  size: number;
  stroke: string;
}) {
  const shared = {
    x,
    y,
    width: size,
    height: size,
    stroke,
    strokeWidth: 2,
    'aria-hidden': true as const,
  };
  switch (id) {
    case 'calculator':
      return <Calculator {...shared} />;
    case 'study':
      return <BookOpen {...shared} />;
    case 'tutors':
      return <Users {...shared} />;
    case 'flow':
      return <Compass {...shared} />;
  }
}

function OrbitNodePillIcon({
  id,
  className,
}: {
  id: OrbitToolNode['id'];
  className?: string;
}) {
  switch (id) {
    case 'calculator':
      return <Calculator className={className} aria-hidden="true" />;
    case 'study':
      return <BookOpen className={className} aria-hidden="true" />;
    case 'tutors':
      return <Users className={className} aria-hidden="true" />;
    case 'flow':
      return <Compass className={className} aria-hidden="true" />;
  }
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const ACTIVITY_THUMBNAILS: Record<string, string> = {
  Hackathon: '/images/org/hackathon-table.jpg',
  'Exam Venue Visit': '/images/org/exam-venue.jpg',
  Tutoring: '/images/org/tutoring-session.jpg',
  "Student's Meet": '/images/org/students-meet.jpg',
};

export function OrgHomeLandingView({
  data: dataProp,
  useLocalUrls = true,
  productsVideoUrl,
  productsPosterUrl,
}: OrgHomeLandingViewProps) {
  const [cmsHome, setCmsHome] = useState<OrgHomeLandingMockData | null>(null);
  const [cmsActivities, setCmsActivities] = useState<OrgActivityMock[] | null>(null);

  useEffect(() => {
    if (dataProp !== undefined) return;
    const sync = () => {
      const state = loadOrgCmsState();
      setCmsHome(state.home);
      setCmsActivities(state.activities);
    };
    sync();
    return subscribeOrgCmsChanges(sync);
  }, [dataProp]);

  const data = dataProp ?? cmsHome ?? MOCK_ORG_HOME_DATA;
  const studyProduct =
    data.products.find((p) => p.id === 'study') ?? data.products[0]!;
  const flowProduct =
    data.products.find((p) => p.id === 'flow') ?? data.products[1]!;

  const studyUrl = useLocalUrls ? studyProduct.localHref : studyProduct.href;
  const flowUrl = useLocalUrls ? flowProduct.localHref : flowProduct.href;
  const studyBaseUrl = studyUrl.replace(/\/+$/, '');
  const registerUrl = `${studyBaseUrl}/signup`;
  const signInUrl = `${studyBaseUrl}/login`;

  const heroTitleParts = data.heroTitle.split(' — ');
  const hasLeadTagline = heroTitleParts.length > 1;
  const leadHeadline = heroTitleParts[0] ?? data.heroTitle;
  const rawSubHeadline = hasLeadTagline
    ? heroTitleParts.slice(1).join(' — ')
    : null;
  const subHeadline = rawSubHeadline
    ? `${rawSubHeadline.charAt(0).toUpperCase()}${rawSubHeadline.slice(1)}`
    : null;

  // Interactive Hero Orbit Node State
  const orbitNodes: OrbitToolNode[] = [
    {
      id: 'calculator',
      shortLabel: 'Calculator',
      code: 'No Login',
      label: 'Grade Calculator',
      metric: 'Raw 64/75 → 92/100 UMS (A*)',
      caption: 'Guest grade boundary lookup for Edexcel IAL & IGCSE.',
      href: '/calculator',
      cx: 180,
      cy: 46,
    },
    {
      id: 'study',
      shortLabel: 'Study',
      code: 'Trackers',
      label: 'Study Workspace',
      metric: '14-Unit Maths Suite & Past Papers',
      caption: 'Syllabus checklists, past papers & YMA01 validation.',
      href: studyUrl,
      external: true,
      cx: 314,
      cy: 180,
    },
    {
      id: 'tutors',
      shortLabel: 'Tutors',
      code: 'Weekly Slots',
      label: 'Peer Tutors & QR',
      metric: '35+ Verified Instructors',
      caption: 'Browse Sun–Sat teaching slots & Telegram inquiry QR.',
      href: '/team',
      cx: 180,
      cy: 314,
    },
    {
      id: 'flow',
      shortLabel: 'Flow',
      code: '24h Studio',
      label: 'Flow Planner',
      metric: 'Timetable, Tasks & Pomodoro',
      caption: '24-hour weekly planner, priority tasks & Pomodoro.',
      href: flowUrl,
      external: true,
      cx: 46,
      cy: 180,
    },
  ];

  const [activeOrbitId, setActiveOrbitId] =
    useState<OrbitToolNode['id']>('calculator');
  const activeOrbit =
    orbitNodes.find((n) => n.id === activeOrbitId) ?? orbitNodes[0]!;
  const orbitPillsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: orbitRect,
    ready: orbitReady,
    animate: orbitAnimate,
  } = useSlidingIndicator(orbitPillsRef, activeOrbitId, {
    activeSelector: '[aria-pressed="true"]',
  });
  const orbitGlideReady = orbitReady && orbitRect.visible;

  // Interactive Tutor Carousel State
  const [activeTutorIdx, setActiveTutorIdx] = useState<number>(0);
  const members = data.featuredMembers;
  const activeMember = members[activeTutorIdx] ?? members[0]!;
  const tutorChipsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: tutorChipRect,
    ready: tutorChipReady,
    animate: tutorChipAnimate,
  } = useSlidingIndicator(tutorChipsRef, activeMember.username, {
    activeSelector: '[aria-selected="true"]',
  });
  const tutorGlideReady = tutorChipReady && tutorChipRect.visible;

  const handlePrevTutor = () => {
    setActiveTutorIdx((prev) => (prev - 1 + members.length) % members.length);
  };

  const handleNextTutor = () => {
    setActiveTutorIdx((prev) => (prev + 1) % members.length);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath="/" useLocalUrls={useLocalUrls} />

      <main className="ants-main-enter mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14 space-y-16">
        {/* ===================================================================
         * 1. VISUAL HERO SPLIT (REGISTER/CALCULATOR CTAs + ECOSYSTEM ORBIT)
         * =================================================================== */}
        <section
          aria-label="The ANTs Academic Ecosystem"
          className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-10"
        >
          {/* Left Column: Title, Academic Summary & Register/Calculator CTAs */}
          <div className="space-y-6 lg:col-span-7">
            <div className="ants-hero-enter space-y-2.5">
              <h1 className="text-balance font-extrabold">
                {subHeadline ? (
                  <>
                    <span className="block text-3xl sm:text-[2.75rem] tracking-[-0.03em] leading-[1.06] text-primary-solid">
                      {leadHeadline}
                    </span>
                    <span className="mt-1.5 block text-2xl sm:text-[2.1rem] tracking-[-0.025em] leading-[1.15] text-foreground">
                      {subHeadline}
                    </span>
                  </>
                ) : (
                  <span className="block text-3xl sm:text-[2.75rem] tracking-[-0.025em] leading-[1.08] text-foreground">
                    {leadHeadline}
                  </span>
                )}
              </h1>
              <p className="text-sm font-medium text-foreground-muted">
                {data.heroBadge}
              </p>
            </div>

            <p
              style={{ '--stagger-index': 1 } as React.CSSProperties}
              className="ants-stagger-item text-[15px] sm:text-base text-foreground-muted leading-relaxed max-w-[52ch]"
            >
              {data.heroDescription}
            </p>

            <div
              style={{ '--stagger-index': 2 } as React.CSSProperties}
              className="ants-stagger-item space-y-3 pt-1"
            >
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={registerUrl}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-solid px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-solid-hover active:scale-[0.98]"
                >
                  <span>Register for Free</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
                <Link
                  href="/calculator"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset active:scale-[0.98]"
                >
                  <Calculator className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>Launch Grade Calculator</span>
                </Link>
              </div>
              <a
                href={signInUrl}
                className="inline-flex items-center gap-1 font-mono text-xs text-foreground-muted hover:text-foreground transition-colors"
              >
                <span>Already have an account? Sign in</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Right Column: Interactive SVG Ecosystem Orbit & Live Telemetry Dock */}
          <div className="lg:col-span-5">
            <div
              data-testid="hero-ecosystem-orbit"
              className="ants-clip-reveal rounded-xl border border-border bg-surface-card p-5 divide-y divide-border"
            >
              {/* Interactive Orbital Diagram */}
              <div className="pb-4">
                <div className="flex items-center justify-between text-xs pb-2">
                  <span className="font-bold text-foreground">
                    Interactive Ecosystem Map
                  </span>
                  <span className="font-mono text-[11px] text-foreground-muted">
                    Select any node
                  </span>
                </div>

                <div className="relative mx-auto aspect-square w-full max-w-[310px]">
                  <svg
                    viewBox="0 0 360 360"
                    className="h-full w-full overflow-visible"
                    role="img"
                    aria-label="Interactive orbital diagram of The ANTs tools: Calculator, Study, Tutors, and Flow"
                  >
                    {/* Outer & Inner Geometric Orbit Rings */}
                    <circle
                      cx="180"
                      cy="180"
                      r="134"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="1.25"
                      strokeDasharray="5 5"
                      className="ants-orbit-ring-slow"
                    />
                    <circle
                      cx="180"
                      cy="180"
                      r="90"
                      fill="none"
                      stroke="var(--border-subtle)"
                      strokeWidth="1"
                      strokeDasharray="3 6"
                      className="ants-orbit-ring-reverse"
                    />

                    {/* Crosshair Axis Spokes */}
                    <line
                      x1="180"
                      y1="46"
                      x2="180"
                      y2="314"
                      stroke="var(--border-subtle)"
                      strokeWidth="1"
                    />
                    <line
                      x1="46"
                      y1="180"
                      x2="314"
                      y2="180"
                      stroke="var(--border-subtle)"
                      strokeWidth="1"
                    />

                    {/* Active Node Connection Vector */}
                    <line
                      x1="180"
                      y1="180"
                      x2={activeOrbit.cx}
                      y2={activeOrbit.cy}
                      stroke="var(--primary)"
                      strokeWidth="2"
                    />

                    {/* Center Core Hub: The ANTs */}
                    <circle
                      cx="180"
                      cy="180"
                      r="42"
                      fill="var(--surface-inset)"
                      stroke="var(--primary)"
                      strokeWidth="1.5"
                    />
                    <text
                      x="180"
                      y="176"
                      textAnchor="middle"
                      fill="var(--foreground)"
                      fontSize="12"
                      fontWeight="800"
                    >
                      THE ANTs
                    </text>
                    <text
                      x="180"
                      y="192"
                      textAnchor="middle"
                      fill="var(--foreground-muted)"
                      fontSize="9.5"
                      fontFamily="var(--font-mono)"
                    >
                      IGCSE · IAL
                    </text>

                    {/* 4 Interactive Orbital Nodes */}
                    {orbitNodes.map((node) => {
                      const selected = node.id === activeOrbitId;
                      return (
                        <g
                          key={node.id}
                          role="button"
                          tabIndex={0}
                          data-orbit-node={node.id}
                          aria-label={`${node.label}: ${node.metric}`}
                          onClick={() => setActiveOrbitId(node.id)}
                          onMouseEnter={() => setActiveOrbitId(node.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setActiveOrbitId(node.id);
                            }
                          }}
                          className="cursor-pointer focus:outline-none"
                        >
                          {selected && (
                            <circle
                              cx={node.cx}
                              cy={node.cy}
                              r="42"
                              fill="var(--primary-tint)"
                              className="ants-pulse-node"
                            />
                          )}
                          <circle
                            cx={node.cx}
                            cy={node.cy}
                            r="35"
                            fill={
                              selected
                                ? 'var(--primary-solid)'
                                : 'var(--surface-card)'
                            }
                            stroke={
                              selected ? 'var(--primary-solid)' : 'var(--border-hover)'
                            }
                            strokeWidth="1.5"
                          />
                          <OrbitNodeSvgIcon
                            id={node.id}
                            x={node.cx - 8}
                            y={node.cy - 19}
                            size={16}
                            stroke={selected ? 'var(--on-primary)' : 'var(--primary)'}
                          />
                          <text
                            x={node.cx}
                            y={node.cy + 14}
                            textAnchor="middle"
                            fill={
                              selected ? 'var(--on-primary)' : 'var(--foreground)'
                            }
                            fontSize="9"
                            fontWeight="700"
                          >
                            {node.shortLabel}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Quick Node Switcher Pills with gliding highlight */}
                <div
                  ref={orbitPillsRef}
                  data-gliding-ready={orbitGlideReady ? 'true' : 'false'}
                  className="ants-glide-host relative grid grid-cols-2 gap-1.5 pt-3 sm:grid-cols-4 lg:grid-cols-2 xl:flex xl:flex-nowrap xl:items-center"
                >
                  <span
                    aria-hidden="true"
                    data-animate={orbitAnimate ? 'true' : 'false'}
                    className="ants-glide-indicator z-0 rounded-md border border-primary bg-primary-tint"
                    style={{
                      transform: `translate3d(${orbitRect.x}px, ${orbitRect.y}px, 0)`,
                      width: `${orbitRect.width}px`,
                      height: `${orbitRect.height}px`,
                      opacity: orbitGlideReady ? 1 : 0,
                    }}
                  />
                  {orbitNodes.map((node) => {
                    const selected = node.id === activeOrbitId;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        aria-pressed={selected}
                        data-active={selected ? 'true' : 'false'}
                        onClick={() => setActiveOrbitId(node.id)}
                        className={cn(
                          'ants-glide-item relative z-10 inline-flex h-8 xl:flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs font-semibold transition-colors active:scale-[0.98]',
                          selected
                            ? 'border-primary bg-primary-tint text-on-primary-tint'
                            : 'border-border bg-background text-foreground-muted hover:text-foreground'
                        )}
                      >
                        <OrbitNodePillIcon
                          id={node.id}
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            selected ? 'text-on-primary-tint' : 'text-primary'
                          )}
                        />
                        <span>{node.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Node Telemetry Readout & 1-Click Launch */}
              <div
                key={activeOrbit.id}
                className="ants-panel-enter pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-tint-border bg-primary-tint text-on-primary-tint">
                    <OrbitNodePillIcon id={activeOrbit.id} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="shrink-0 whitespace-nowrap rounded border border-primary-tint-border bg-primary-tint px-1.5 py-0.5 font-mono text-[10px] font-bold text-on-primary-tint">
                        {activeOrbit.code}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {activeOrbit.metric}
                      </span>
                    </div>
                    <p className="text-xs leading-snug text-foreground-muted">
                      {activeOrbit.caption}
                    </p>
                  </div>
                </div>

                {activeOrbit.external ? (
                  <a
                    href={activeOrbit.href}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary-solid px-3.5 text-xs font-semibold text-on-primary hover:bg-primary-hover"
                  >
                    <span>Open</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <Link
                    href={activeOrbit.href}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary-solid px-3.5 text-xs font-semibold text-on-primary hover:bg-primary-hover"
                  >
                    <span>Open</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
         * 2. OUR PRODUCTS — INTERACTIVE 4-CHAPTER VIDEO SHOWCASE & QUICK LAUNCH
         * =================================================================== */}
        <ScrollReveal
          as="section"
          aria-labelledby="bento-products-heading"
          data-testid="bento-products-grid"
          className="space-y-6 border-t border-border pt-14"
        >
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
            <h2
              id="bento-products-heading"
              className="text-2xl font-extrabold tracking-tight text-foreground"
            >
              Our Products &amp; Public Tools
            </h2>
            <p className="font-mono text-xs text-foreground-muted">
              Shared .the-ants.org SSO · Works in Light &amp; Amber Dark
            </p>
          </div>

          <OrgProductsVideoView
            studyUrl={studyUrl}
            flowUrl={flowUrl}
            videoUrl={productsVideoUrl}
            posterUrl={productsPosterUrl}
          />
        </ScrollReveal>

        {/* ===================================================================
         * 3. INTERACTIVE TUTOR CAROUSEL + ANIMATED VERTICAL ACTIVITY TIMELINE
         * =================================================================== */}
        <ScrollReveal
          as="section"
          delayMs={40}
          className="grid grid-cols-1 gap-10 border-t border-border pt-14 lg:grid-cols-12"
        >
          {/* Left 6 Cols: Founders & Tutors Interactive Avatar Carousel */}
          <div className="space-y-4 lg:col-span-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                Founders &amp; Peer Tutors
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevTutor}
                  aria-label="Previous tutor"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-card text-foreground-muted hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleNextTutor}
                  aria-label="Next tutor"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-card text-foreground-muted hover:text-foreground"
                >
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <Link
                  href="/team"
                  className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-primary-solid hover:underline"
                >
                  <span>All {members.length}+</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Avatar Selector Chips with gliding highlight */}
            <div
              ref={tutorChipsRef}
              role="tablist"
              aria-label="Featured Founders and Tutors"
              data-gliding-ready={tutorGlideReady ? 'true' : 'false'}
              className="ants-glide-host relative flex flex-wrap gap-2"
            >
              <span
                aria-hidden="true"
                data-animate={tutorChipAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded-full bg-primary-solid shadow-xs"
                style={{
                  transform: `translate3d(${tutorChipRect.x}px, ${tutorChipRect.y}px, 0)`,
                  width: `${tutorChipRect.width}px`,
                  height: `${tutorChipRect.height}px`,
                  opacity: tutorGlideReady ? 1 : 0,
                }}
              />
              {members.map((member, idx) => {
                const selected = idx === activeTutorIdx;
                const initials = member.name
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('');

                return (
                  <button
                    key={member.username}
                    type="button"
                    role="tab"
                    data-tutor-chip={member.username}
                    data-active={selected ? 'true' : 'false'}
                    aria-selected={selected}
                    onClick={() => setActiveTutorIdx(idx)}
                    className={cn(
                      'ants-glide-item relative z-10 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      selected
                        ? 'border-primary bg-primary-solid text-on-primary'
                        : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                    )}
                  >
                    <span className="font-mono text-[11px] font-bold">
                      {initials}
                    </span>
                    <span className="truncate max-w-[130px]">
                      {member.name.split(' (')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Tutor Visual Showcase Stage */}
            <div
              data-testid="active-tutor-carousel-card"
              className="rounded-xl border border-border bg-surface-card p-5"
            >
              <div key={activeMember.username} className="ants-panel-enter divide-y divide-border">
                <div className="pb-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">
                        {activeMember.name}
                      </h3>
                      <span className="rounded bg-primary-tint px-2 py-0.5 font-mono text-[11px] font-semibold text-on-primary-tint border border-primary-tint-border">
                        {activeMember.roleBadge}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted">
                      {activeMember.title}
                    </p>
                    <p className="font-mono text-xs font-semibold text-foreground pt-0.5">
                      {activeMember.specialization}
                    </p>
                  </div>

                  <Link
                    href={`/team/${activeMember.username}`}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-primary-solid px-3 text-xs font-semibold text-on-primary hover:bg-primary-hover"
                  >
                    <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Slots &amp; QR</span>
                  </Link>
                </div>

                {/* Visual Sun–Sat Weekly Slot Strip */}
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-between font-mono text-[11px] text-foreground-muted">
                    <span>Weekly Teaching Availability</span>
                    <span className="font-bold text-on-success-tint">
                      {activeMember.availabilityLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[11px]">
                    {WEEK_DAYS.map((day) => {
                      const isAvailable = activeMember.availabilityLabel.includes(
                        day
                      );
                      return (
                        <div
                          key={day}
                          className={cn(
                            'rounded border py-1.5 font-semibold transition-colors',
                            isAvailable
                              ? 'border-success-border bg-success-tint text-on-success-tint'
                              : 'border-border bg-surface-inset/50 text-foreground-subtle'
                          )}
                        >
                          <span className="block">{day}</span>
                          <span className="block text-[9px]">
                            {isAvailable ? 'OPEN' : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 6 Cols: Icon-Driven Animated Vertical Activity Timeline */}
          <div className="space-y-4 lg:col-span-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                Community Activity Timeline
              </h2>
              <Link
                href="/activities"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-solid hover:underline"
              >
                <span>All galleries</span>
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>

            <div
              data-testid="activity-vertical-timeline"
              className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border space-y-3"
            >
              {data.recentActivities.map((act, idx) => {
                const matchedActivity = cmsActivities?.find(
                  (a) => a.slug === act.slug
                );
                const thumbSrc =
                  matchedActivity?.coverImageSrc ??
                  ACTIVITY_THUMBNAILS[act.category] ??
                  '/images/org/students-meet.jpg';

                return (
                  <Link
                    key={act.slug}
                    href={`/activities/${act.slug}`}
                    style={{ '--stagger-index': idx } as React.CSSProperties}
                    className="ants-reveal-item ants-card-interactive group relative flex items-center justify-between gap-3.5 rounded-xl border border-border bg-surface-card p-3 transition-colors hover:border-border-hover hover:bg-surface-inset/40"
                  >
                    {/* Timeline Node Dot */}
                    <span
                      className="absolute -left-[19px] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-primary bg-background transition-transform group-hover:scale-125"
                      aria-hidden="true"
                    />

                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={thumbSrc}
                        alt={act.title}
                        className="h-14 w-20 shrink-0 rounded-lg object-cover border border-border bg-surface-inset"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                          <span className="font-bold text-primary-solid">
                            {act.category}
                          </span>
                          <span className="text-foreground-muted">·</span>
                          <span className="text-foreground-muted">
                            {act.dateLabel}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary-solid transition-colors">
                          {act.title}
                        </p>
                        <p className="font-mono text-[11px] text-foreground-muted truncate">
                          {act.location}
                        </p>
                      </div>
                    </div>

                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-foreground-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary-solid"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </ScrollReveal>
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />
    </div>
  );
}
