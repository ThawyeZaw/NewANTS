'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  BookOpen,
  Calculator,
  Clock,
  Layers,
  Megaphone,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Timer,
  X,
} from 'lucide-react';
import { Button, Input, cn, useSlidingIndicator } from '@ants/ui';
import { loadOrgCmsState, subscribeOrgCmsChanges } from '../../../lib/cms';
import {
  countArticlesByCategory,
  filterArticles,
  findTeamMemberByUsername,
  type ArticleSortOrder,
} from '../../../lib/showcase';
import {
  MOCK_ORG_ARTICLES,
  type OrgArticleCategory,
  type OrgArticleMock,
} from '../../../mocks/showcase-content.mock';
import {
  MOCK_ORG_TEAM_MEMBERS,
  type OrgTeamMemberMock,
} from '../../../mocks/showcase-team.mock';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';

export interface OrgArticlesViewProps {
  /** Articles & essays dataset */
  articles?: OrgArticleMock[];
  /** Optional initial category filter */
  initialCategory?: 'all' | OrgArticleCategory;
  /** Use local dev ports in shared Navbar & Footer */
  useLocalUrls?: boolean;
}

const ARTICLE_CATEGORIES: Array<{
  id: 'all' | OrgArticleCategory;
  label: string;
}> = [
  { id: 'all', label: 'All Articles' },
  { id: 'Study Guide', label: 'Study Guides' },
  { id: 'Exam Strategy', label: 'Exam Strategy' },
  { id: 'Productivity', label: 'Productivity' },
  { id: 'Announcement', label: 'Announcements' },
];

const SORT_OPTIONS: Array<{
  id: ArticleSortOrder;
  label: string;
}> = [
  { id: 'newest', label: 'Latest' },
  { id: 'shortest', label: 'Quick Read' },
  { id: 'title', label: 'Title A–Z' },
];

const QUICK_TOPIC_TAGS = [
  'UMS',
  'Pomodoro',
  'WMA11',
  'Time Blocking',
  'Cambridge 9702',
  'Open Access',
] as const;

function CategoryTabIcon({
  category,
  className,
}: {
  category: 'all' | OrgArticleCategory;
  className?: string;
}) {
  switch (category) {
    case 'all':
      return <Layers className={className} aria-hidden="true" />;
    case 'Study Guide':
      return <BookOpen className={className} aria-hidden="true" />;
    case 'Exam Strategy':
      return <Target className={className} aria-hidden="true" />;
    case 'Productivity':
      return <Timer className={className} aria-hidden="true" />;
    case 'Announcement':
      return <Megaphone className={className} aria-hidden="true" />;
  }
}

function deriveInitials(name: string): string {
  const cleaned = name.replace(/\(.*?\)/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AN';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

/**
 * Custom Geometric & Typographic SVG Cover Header for each article theme.
 * Uses Paired Stitch CSS custom properties (--primary, --success, --foreground, --border)
 * so Light ("The ANTs Academic System") and Dark ("Amber Academic Studio") switch seamlessly.
 */
function ArticleTypographicCover({
  article,
  featured = false,
}: {
  article: OrgArticleMock;
  featured?: boolean;
}) {
  const coverCode =
    article.coverCode ??
    (article.category === 'Exam Strategy'
      ? 'EDEXCEL IAL · UMS'
      : article.category === 'Productivity'
        ? 'FLOW · 24H STUDIO'
        : article.category === 'Study Guide'
          ? 'SYLLABUS GUIDE'
          : 'ECOSYSTEM NOTE');

  const coverFormula =
    article.coverFormula ?? article.tags.slice(0, 2).join(' · ');

  return (
    <div
      className={cn(
        'ants-article-cover flex flex-col justify-between border-b border-border p-4 sm:p-5',
        featured
          ? 'lg:border-b-0 lg:border-r lg:min-h-[340px]'
          : 'min-h-[196px]'
      )}
    >
      {/* Top Bar: Category Badge & Read Time Pill */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-primary-tint-border bg-primary-tint px-2.5 py-1 text-xs font-semibold text-on-primary-tint">
          <CategoryTabIcon category={article.category} className="h-3.5 w-3.5" />
          <span>{article.category}</span>
        </span>

        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-card/90 px-2.5 py-1 font-mono text-xs tabular-nums text-foreground-muted">
          <Clock className="h-3 w-3 text-primary" aria-hidden="true" />
          <span>{article.readMinutes} min read</span>
        </span>
      </div>

      {/* Center Geometric SVG Diagram + Stylized Typographic Watermark */}
      <div className="relative z-10 my-3 flex items-center justify-center">
        {article.artworkTheme === 'article-ums' && (
          <svg
            viewBox="0 0 320 128"
            className="ants-article-cover-svg h-28 w-full max-w-[310px]"
            role="img"
            aria-label="Piecewise linear interpolation graph mapping raw marks to UMS"
          >
            {/* Reference Grid Lines */}
            <line
              x1="36"
              y1="22"
              x2="296"
              y2="22"
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <line
              x1="36"
              y1="52"
              x2="296"
              y2="52"
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <line
              x1="36"
              y1="82"
              x2="296"
              y2="82"
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            {/* Coordinate Axes */}
            <line
              x1="36"
              y1="14"
              x2="36"
              y2="106"
              stroke="var(--foreground-subtle)"
              strokeWidth="1.5"
            />
            <line
              x1="36"
              y1="106"
              x2="300"
              y2="106"
              stroke="var(--foreground-subtle)"
              strokeWidth="1.5"
            />
            {/* Axis Labels */}
            <text
              x="10"
              y="26"
              fill="var(--foreground-subtle)"
              fontSize="9"
              fontFamily="var(--font-mono)"
            >
              100
            </text>
            <text
              x="14"
              y="55"
              fill="var(--primary)"
              fontSize="9"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              80A
            </text>
            <text
              x="14"
              y="85"
              fill="var(--foreground-subtle)"
              fontSize="9"
              fontFamily="var(--font-mono)"
            >
              60C
            </text>
            {/* Piecewise Linear Interpolation Curve */}
            <polyline
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="36,102 96,82 152,66 206,52 252,32 292,22"
            />
            {/* Projection Dashed Lines for 64/75 -> 92 UMS (A*) */}
            <line
              x1="252"
              y1="32"
              x2="252"
              y2="106"
              stroke="var(--success)"
              strokeDasharray="3 2"
              strokeWidth="1.25"
            />
            <line
              x1="36"
              y1="32"
              x2="252"
              y2="32"
              stroke="var(--success)"
              strokeDasharray="3 2"
              strokeWidth="1.25"
            />
            {/* Boundary Nodes */}
            <circle cx="96" cy="82" r="3.5" fill="var(--surface-card)" stroke="var(--primary)" strokeWidth="2" />
            <circle cx="206" cy="52" r="4" fill="var(--primary)" />
            <circle cx="252" cy="32" r="5" fill="var(--success)" />
            {/* Callout Tag */}
            <rect
              x="166"
              y="8"
              width="126"
              height="18"
              rx="4"
              fill="var(--surface-card)"
              stroke="var(--border)"
            />
            <text
              x="229"
              y="20"
              textAnchor="middle"
              fill="var(--foreground)"
              fontSize="9.5"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              64/75 → 92 UMS (A*)
            </text>
          </svg>
        )}

        {article.artworkTheme === 'article-focus' && (
          <svg
            viewBox="0 0 320 128"
            className="ants-article-cover-svg h-28 w-full max-w-[310px]"
            role="img"
            aria-label="24-hour sustainable time blocking dial and Pomodoro sprint bars"
          >
            {/* Left Chronograph Dial */}
            <circle
              cx="66"
              cy="64"
              r="42"
              fill="var(--surface-card)"
              stroke="var(--border)"
              strokeWidth="1.5"
            />
            <circle
              cx="66"
              cy="64"
              r="34"
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="4"
            />
            <circle
              cx="66"
              cy="64"
              r="34"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeDasharray="145 214"
              strokeLinecap="round"
              transform="rotate(-90 66 64)"
            />
            <text
              x="66"
              y="62"
              textAnchor="middle"
              fill="var(--foreground)"
              fontSize="12"
              fontWeight="800"
              fontFamily="var(--font-mono)"
            >
              25:00
            </text>
            <text
              x="66"
              y="75"
              textAnchor="middle"
              fill="var(--primary)"
              fontSize="8.5"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              +15m GAP
            </text>

            {/* Right Time-Blocking Stack */}
            <g transform="translate(126, 20)">
              <rect
                x="0"
                y="0"
                width="174"
                height="22"
                rx="5"
                fill="var(--primary-tint)"
                stroke="var(--primary-tint-border)"
              />
              <text
                x="10"
                y="14"
                fill="var(--on-primary-tint)"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                08:00 P1 · Timed Past Paper
              </text>

              <rect
                x="0"
                y="30"
                width="138"
                height="18"
                rx="4"
                fill="var(--surface-card)"
                stroke="var(--border)"
                strokeDasharray="3 2"
              />
              <text
                x="10"
                y="42"
                fill="var(--foreground-muted)"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                09:30 Buffer · Walk &amp; Reset (15m)
              </text>

              <rect
                x="0"
                y="56"
                width="162"
                height="22"
                rx="5"
                fill="var(--success-tint)"
                stroke="var(--success-border)"
              />
              <text
                x="10"
                y="70"
                fill="var(--on-success-tint)"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                22:30 Protected Sleep (7.5h)
              </text>
            </g>
          </svg>
        )}

        {article.artworkTheme === 'article-maths' && (
          <svg
            viewBox="0 0 320 128"
            className="ants-article-cover-svg h-28 w-full max-w-[310px]"
            role="img"
            aria-label="Parabola curve with tangent intersection illustrating discriminant condition b squared minus 4ac equals zero"
          >
            {/* Coordinate Grid */}
            <line x1="28" y1="98" x2="292" y2="98" stroke="var(--foreground-subtle)" strokeWidth="1.25" />
            <line x1="92" y1="12" x2="92" y2="114" stroke="var(--foreground-subtle)" strokeWidth="1.25" />
            {/* Parabola Curve y = ax^2 + bx + c */}
            <path
              d="M 52 20 Q 148 134 244 20"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Tangent Line */}
            <line
              x1="78"
              y1="96"
              x2="262"
              y2="50"
              stroke="var(--success)"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            {/* Tangent Intersection Point P */}
            <circle cx="176" cy="71" r="5" fill="var(--success)" />
            <circle
              cx="176"
              cy="71"
              r="9"
              fill="none"
              stroke="var(--success)"
              strokeOpacity="0.4"
              strokeWidth="1.5"
            />
            {/* Formula Callout Pill */}
            <rect
              x="166"
              y="18"
              width="124"
              height="22"
              rx="5"
              fill="var(--surface-card)"
              stroke="var(--border)"
            />
            <text
              x="228"
              y="32"
              textAnchor="middle"
              fill="var(--foreground)"
              fontSize="10"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              Δ = b² − 4ac = 0
            </text>
          </svg>
        )}

        {article.artworkTheme !== 'article-ums' &&
          article.artworkTheme !== 'article-focus' &&
          article.artworkTheme !== 'article-maths' &&
          (article.category === 'Study Guide' ? (
            <svg
              viewBox="0 0 320 128"
              className="ants-article-cover-svg h-28 w-full max-w-[310px]"
              role="img"
              aria-label="Physics practical best-fit gradient line and uncertainty error bars"
            >
              <line x1="40" y1="104" x2="288" y2="104" stroke="var(--foreground-subtle)" strokeWidth="1.5" />
              <line x1="40" y1="16" x2="40" y2="104" stroke="var(--foreground-subtle)" strokeWidth="1.5" />
              {/* Best-fit Line */}
              <line x1="56" y1="94" x2="268" y2="24" stroke="var(--primary)" strokeWidth="2.5" />
              {/* Worst-fit Dashed Line */}
              <line
                x1="56"
                y1="98"
                x2="268"
                y2="18"
                stroke="var(--foreground-subtle)"
                strokeDasharray="4 3"
                strokeWidth="1.25"
              />
              {/* Gradient Triangle */}
              <polyline
                fill="none"
                stroke="var(--success)"
                strokeDasharray="3 2"
                strokeWidth="1.5"
                points="98,80 232,80 232,36"
              />
              {/* Error Bars */}
              <g stroke="var(--foreground)" strokeWidth="1.5">
                <line x1="98" y1="72" x2="98" y2="88" />
                <line x1="164" y1="50" x2="164" y2="66" />
                <line x1="232" y1="28" x2="232" y2="44" />
              </g>
              <circle cx="98" cy="80" r="3.5" fill="var(--primary)" />
              <circle cx="164" cy="58" r="3.5" fill="var(--primary)" />
              <circle cx="232" cy="36" r="3.5" fill="var(--primary)" />
              <text
                x="220"
                y="94"
                textAnchor="end"
                fill="var(--success)"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                Δy / Δx ± ε%
              </text>
            </svg>
          ) : (
            <svg
              viewBox="0 0 320 128"
              className="ants-article-cover-svg h-28 w-full max-w-[310px]"
              role="img"
              aria-label="Three-app open architecture connecting Showcase, Study, and Flow"
            >
              {/* Connecting Lines */}
              <line x1="82" y1="64" x2="160" y2="34" stroke="var(--primary)" strokeWidth="1.75" />
              <line x1="160" y1="34" x2="238" y2="64" stroke="var(--primary)" strokeWidth="1.75" />
              <line
                x1="82"
                y1="64"
                x2="238"
                y2="64"
                stroke="var(--border-hover)"
                strokeDasharray="4 3"
                strokeWidth="1.5"
              />
              {/* Node 1: the-ants.org */}
              <rect
                x="28"
                y="46"
                width="84"
                height="36"
                rx="8"
                fill="var(--surface-card)"
                stroke="var(--primary)"
                strokeWidth="1.75"
              />
              <text
                x="70"
                y="67"
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                the-ants.org
              </text>
              {/* Node 2: Study */}
              <rect
                x="118"
                y="14"
                width="84"
                height="36"
                rx="8"
                fill="var(--primary-tint)"
                stroke="var(--primary-tint-border)"
                strokeWidth="1.75"
              />
              <text
                x="160"
                y="35"
                textAnchor="middle"
                fill="var(--on-primary-tint)"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                Study :3001
              </text>
              {/* Node 3: Flow */}
              <rect
                x="208"
                y="46"
                width="84"
                height="36"
                rx="8"
                fill="var(--surface-card)"
                stroke="var(--success)"
                strokeWidth="1.75"
              />
              <text
                x="250"
                y="67"
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                Flow :3002
              </text>
              {/* Bottom Stamp */}
              <text
                x="160"
                y="108"
                textAnchor="middle"
                fill="var(--foreground-muted)"
                fontSize="9"
                fontWeight="600"
                fontFamily="var(--font-mono)"
              >
                OPEN PUBLIC TOOLS · SEPARATE WORKSPACES
              </text>
            </svg>
          ))}
      </div>

      {/* Bottom Typographic Cover Strip: Domain Code & Formula Stamp */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-2.5 font-mono text-[11px]">
        <span className="font-bold tracking-tight text-foreground">
          {coverCode}
        </span>
        <span className="rounded bg-surface-card/90 px-2 py-0.5 text-primary-solid font-semibold border border-border-subtle">
          {coverFormula}
        </span>
      </div>
    </div>
  );
}

/**
 * Animated Author Avatar Chip giving credit a tactile, editorial magazine feel.
 * Links directly to `/team/[authorUsername]` and resolves Founder/Tutor status from `MOCK_ORG_TEAM_MEMBERS`.
 */
function AuthorAvatarChip({
  authorUsername,
  authorName,
  authorRole,
  teamMembers = MOCK_ORG_TEAM_MEMBERS,
}: {
  authorUsername: string;
  authorName: string;
  authorRole: string;
  teamMembers?: OrgTeamMemberMock[];
}) {
  const member = useMemo(
    () => findTeamMemberByUsername(teamMembers, authorUsername),
    [teamMembers, authorUsername]
  );
  const initials = member?.initials ?? deriveInitials(authorName);
  const isFounder = member?.isFounder ?? true;

  return (
    <Link
      href={`/team/${authorUsername}`}
      aria-label={`View author profile for ${authorName} (${authorRole})`}
      className="ants-author-chip group/author inline-flex items-center gap-2.5 rounded-full border border-border bg-surface-card py-1 pl-1.5 pr-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          'ants-author-avatar flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-bold tracking-tight',
          isFounder
            ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
            : 'border-border bg-surface-inset text-foreground'
        )}
      >
        {initials}
      </span>

      <span className="min-w-0 leading-tight">
        <span className="flex items-center gap-1 text-xs font-bold text-foreground group-hover/author:text-primary-solid transition-colors">
          <span className="truncate">{authorName}</span>
          <ArrowUpRight
            className="ants-author-arrow h-3 w-3 shrink-0 text-foreground-subtle"
            aria-hidden="true"
          />
        </span>
        <span className="block truncate text-[11px] text-foreground-muted">
          {authorRole}
        </span>
      </span>
    </Link>
  );
}

/**
 * `/articles` Editorial Magazine Index View (`[ZYY-2.4]`).
 * Renovated with glassmorphic category/search/sort controls, stylized typographic & geometric SVG covers,
 * hover-to-reveal article summaries, and animated author avatar chips matching The ANTs Stitch theme.
 */
export function OrgArticlesView({
  articles: articlesProp,
  initialCategory = 'all',
  useLocalUrls = true,
}: OrgArticlesViewProps) {
  const [cmsArticles, setCmsArticles] = useState<OrgArticleMock[] | null>(null);
  const [cmsTeam, setCmsTeam] = useState<OrgTeamMemberMock[] | null>(null);

  useEffect(() => {
    const sync = () => {
      const state = loadOrgCmsState();
      if (articlesProp === undefined) {
        setCmsArticles(state.articles);
      }
      setCmsTeam(state.team);
    };
    sync();
    return subscribeOrgCmsChanges(sync);
  }, [articlesProp]);

  const articles = articlesProp ?? cmsArticles ?? MOCK_ORG_ARTICLES;
  const teamMembers = cmsTeam ?? MOCK_ORG_TEAM_MEMBERS;
  const [category, setCategory] = useState<'all' | OrgArticleCategory>(
    initialCategory
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ArticleSortOrder>('newest');

  const categoryTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: categoryRect,
    ready: categoryReady,
    animate: categoryAnimate,
  } = useSlidingIndicator(categoryTabsRef, category, {
    activeSelector: '[aria-pressed="true"]',
  });
  const categoryIndicatorReady = categoryReady && categoryRect.visible;

  const sortTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: sortRect,
    ready: sortReady,
    animate: sortAnimate,
  } = useSlidingIndicator(sortTabsRef, sortBy, {
    activeSelector: '[aria-pressed="true"]',
  });
  const sortIndicatorReady = sortReady && sortRect.visible;

  const categoryCounts = useMemo(
    () => countArticlesByCategory(articles),
    [articles]
  );

  const totalReadMinutes = useMemo(
    () => articles.reduce((sum, item) => sum + item.readMinutes, 0),
    [articles]
  );

  const filteredArticles = useMemo(
    () => filterArticles(articles, { category, searchQuery, sortBy }),
    [articles, category, searchQuery, sortBy]
  );

  const [leadArticle, ...restArticles] = filteredArticles;

  const hasActiveFilters =
    category !== 'all' ||
    searchQuery.trim().length > 0 ||
    sortBy !== 'newest';

  const handleTagToggle = (tag: string) => {
    setSearchQuery((prev) =>
      prev.trim().toLowerCase() === tag.toLowerCase() ? '' : tag
    );
  };

  const resetAllFilters = () => {
    setCategory('all');
    setSearchQuery('');
    setSortBy('newest');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath="/articles" useLocalUrls={useLocalUrls} />

      <main className="ants-main-enter mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14 space-y-10">
        {/* ===================================================================
         * 1. EDITORIAL MAGAZINE MASTHEAD & PUBLICATION LEDGER
         * =================================================================== */}
        <section
          aria-label="Editorial masthead"
          className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end"
        >
          <div className="space-y-3 lg:col-span-8">
            <h1 className="ants-hero-enter text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.12]">
              Articles, Guides &amp; Notes
            </h1>
            <p
              style={{ '--stagger-index': 1 } as React.CSSProperties}
              className="ants-stagger-item text-sm sm:text-base text-foreground-muted leading-relaxed max-w-[64ch]"
            >
              Exam strategy walkthroughs, piecewise UMS scaling guides, and sustainable revision
              systems written by peer tutors, former candidates, and builders at The ANTs.
            </p>
          </div>

          <div
            style={{ '--stagger-index': 2 } as React.CSSProperties}
            className="ants-stagger-item flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-card p-4 lg:col-span-4"
          >
            <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
              <div>
                <span className="block text-base font-bold text-foreground">
                  {articles.length}
                </span>
                <span className="text-[11px] text-foreground-muted">
                  Published Guides
                </span>
              </div>
              <div className="h-7 w-px bg-border" aria-hidden="true" />
              <div>
                <span className="block text-base font-bold text-foreground">
                  {totalReadMinutes}m
                </span>
                <span className="text-[11px] text-foreground-muted">
                  Total Reading
                </span>
              </div>
            </div>

            <Link
              href="/calculator"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary-tint-border bg-primary-tint px-3 py-1.5 text-xs font-semibold text-on-primary-tint transition-colors hover:bg-primary-solid hover:text-on-primary"
            >
              <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
              <span>UMS Calculator</span>
            </Link>
          </div>
        </section>

        {/* ===================================================================
         * 2. GLASSMORPHIC FILTER, SEARCH & SORT COMMAND BAR
         * =================================================================== */}
        <section
          aria-label="Filter and sort articles"
          className="ants-article-toolbar-glass sticky top-16 z-20 rounded-xl border border-border p-3.5 sm:p-4 space-y-3.5 shadow-xs"
        >
          {/* Row 1: Fluid Category Tabs + Instant Search Input */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              ref={categoryTabsRef}
              role="group"
              aria-label="Article category filter"
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
              {ARTICLE_CATEGORIES.map((tab) => {
                const active = category === tab.id;
                const count = categoryCounts[tab.id];
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
                    <CategoryTabIcon
                      category={tab.id}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        'font-mono text-[11px] tabular-nums',
                        active ? 'opacity-90' : 'text-foreground-subtle'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-full lg:w-72">
              <Input
                aria-label="Search articles"
                placeholder="Search UMS, Pomodoro, WMA11, author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
                rightIcon={
                  searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear article search"
                      className="text-foreground-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : undefined
                }
              />
            </div>
          </div>

          {/* Row 2: Quick Topic Tag Chips + Interactive Sort Switcher */}
          <div className="flex flex-col gap-2.5 border-t border-border-subtle pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-foreground-muted mr-1">
                Topics:
              </span>
              {QUICK_TOPIC_TAGS.map((tag) => {
                const isTagActive =
                  searchQuery.trim().toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={isTagActive}
                    onClick={() => handleTagToggle(tag)}
                    className={cn(
                      'rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isTagActive
                        ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint font-semibold'
                        : 'border-border bg-background text-foreground-muted hover:border-border-hover hover:text-foreground'
                    )}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown
                  className="h-3.5 w-3.5 text-foreground-subtle"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-foreground-muted">
                  Sort:
                </span>
                <div
                  ref={sortTabsRef}
                  role="group"
                  aria-label="Sort articles"
                  data-gliding-ready={sortIndicatorReady ? 'true' : 'false'}
                  className="ants-glide-host relative inline-flex items-center gap-1 rounded-lg border border-border bg-background p-0.5"
                >
                  <span
                    aria-hidden="true"
                    data-animate={sortAnimate ? 'true' : 'false'}
                    className="ants-glide-indicator z-0 rounded-md border border-primary-tint-border bg-primary-tint"
                    style={{
                      transform: `translate3d(${sortRect.x}px, ${sortRect.y}px, 0)`,
                      width: `${sortRect.width}px`,
                      height: `${sortRect.height}px`,
                      opacity: sortIndicatorReady ? 1 : 0,
                    }}
                  />
                  {SORT_OPTIONS.map((opt) => {
                    const active = sortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={active}
                        data-active={active ? 'true' : 'false'}
                        onClick={() => setSortBy(opt.id)}
                        className={cn(
                          'ants-glide-item relative z-10 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'bg-primary-tint text-on-primary-tint font-semibold'
                            : 'text-foreground-muted hover:text-foreground'
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <span className="font-mono text-xs tabular-nums text-foreground-subtle">
                {filteredArticles.length} of {articles.length}
              </span>
            </div>
          </div>
        </section>

        {/* ===================================================================
         * 3. EMPTY STATE OR FEATURED LEAD + 2-COLUMN MAGAZINE CARD GRID
         * =================================================================== */}
        {filteredArticles.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-card py-14 px-6 text-center space-y-3">
            <BookOpen
              className="mx-auto h-7 w-7 text-foreground-subtle"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                No articles match those filters
              </h2>
              <p className="text-xs text-foreground-muted">
                Reset the category or search query to browse all published study guides and notes.
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={resetAllFilters}
              >
                Reset filters
              </Button>
            )}
          </div>
        ) : (
          <div key={`${category}-${sortBy}`} className="space-y-8">
            {/* ---------------------------------------------------------------
             * 3A. FEATURED LEAD EDITORIAL CARD (Wide Split Cover + Body)
             * --------------------------------------------------------------- */}
            {leadArticle && (
              <article
                style={{ '--stagger-index': 0 } as React.CSSProperties}
                className="ants-stagger-item ants-article-card overflow-hidden rounded-2xl border border-border bg-surface-card lg:grid lg:grid-cols-12"
              >
                {/* Left 5 Columns: Stylized Typographic & SVG Cover */}
                <div className="lg:col-span-5">
                  <ArticleTypographicCover article={leadArticle} featured />
                </div>

                {/* Right 7 Columns: Editorial Headline, Interactive Summary & Author Chip */}
                <div className="flex flex-col justify-between p-6 sm:p-7 lg:col-span-7 space-y-5">
                  <div className="space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground-muted">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-primary-solid">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Featured Guide · {leadArticle.publishedLabel}</span>
                      </span>

                      {leadArticle.coverMetric && (
                        <span className="rounded-md border border-border bg-surface-inset px-2 py-0.5 font-mono text-[11px] tabular-nums text-foreground">
                          {leadArticle.coverMetric}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl sm:text-[1.75rem] font-extrabold tracking-tight text-foreground leading-[1.18]">
                        <Link
                          href={`/articles/${leadArticle.slug}`}
                          className="hover:text-primary-solid transition-colors focus-visible:outline-none focus-visible:underline"
                        >
                          {leadArticle.title}
                        </Link>
                      </h2>
                      <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">
                        {leadArticle.subtitle}
                      </p>
                    </div>

                    {/* Summary & Section Takeaways Box */}
                    <div className="rounded-xl border border-border-subtle bg-surface-inset/70 p-4 space-y-2.5">
                      <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                        {leadArticle.summary}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {leadArticle.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagToggle(tag)}
                            className="rounded border border-border bg-surface-card px-2 py-0.5 font-mono text-[11px] text-foreground-muted transition-colors hover:border-primary-tint-border hover:text-primary-solid"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Animated Author Avatar Chip + Read CTA */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-4">
                    <AuthorAvatarChip
                      authorUsername={leadArticle.authorUsername}
                      authorName={leadArticle.authorName}
                      authorRole={leadArticle.authorRole}
                      teamMembers={teamMembers}
                    />

                    <Link
                      href={`/articles/${leadArticle.slug}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-solid px-4 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-solid-hover"
                    >
                      <span>Read Full Guide</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            )}

            {/* ---------------------------------------------------------------
             * 3B. 2-COLUMN INTERACTIVE EDITORIAL MAGAZINE CARD GRID
             * --------------------------------------------------------------- */}
            {restArticles.length > 0 && (
              <section
                aria-label="Published articles grid"
                className="grid grid-cols-1 gap-6 md:grid-cols-2"
              >
                {restArticles.map((article, idx) => (
                  <article
                    key={article.id}
                    style={
                      {
                        '--stagger-index': Math.min(idx + 1, 8),
                      } as React.CSSProperties
                    }
                    className="ants-stagger-item ants-article-card group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface-card"
                  >
                    <div>
                      {/* Stylized Typographic & SVG Cover */}
                      <ArticleTypographicCover article={article} />

                      {/* Card Body */}
                      <div className="p-5 sm:p-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground-subtle">
                          <span className="font-mono tabular-nums">
                            {article.publishedLabel} · {article.sections.length}{' '}
                            {article.sections.length === 1 ? 'section' : 'sections'}
                          </span>
                          {article.coverMetric && (
                            <span className="font-mono text-[11px] font-medium text-foreground-muted">
                              {article.coverMetric}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug">
                            <Link
                              href={`/articles/${article.slug}`}
                              className="group-hover:text-primary-solid transition-colors focus-visible:outline-none focus-visible:underline"
                            >
                              {article.title}
                            </Link>
                          </h3>
                          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
                            {article.subtitle}
                          </p>
                        </div>

                        {/* Hover-to-Reveal Summary Drawer (expands on desktop :hover/:focus-within, always visible on touch) */}
                        <div
                          data-reveal-mode="hover"
                          className="ants-article-summary-reveal"
                        >
                          <div className="ants-article-summary-inner">
                            <div className="mt-2 rounded-lg border border-border-subtle bg-surface-inset/75 p-3 space-y-2">
                              <p className="text-xs text-foreground leading-relaxed">
                                {article.summary}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {article.tags.map((tag) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => handleTagToggle(tag)}
                                    className="rounded border border-border bg-surface-card px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted transition-colors hover:border-primary-tint-border hover:text-primary-solid"
                                  >
                                    #{tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Animated Author Avatar Chip + Read Link */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-5 py-4 sm:px-6 bg-surface-card">
                      <AuthorAvatarChip
                        authorUsername={article.authorUsername}
                        authorName={article.authorName}
                        authorRole={article.authorRole}
                        teamMembers={teamMembers}
                      />

                      <Link
                        href={`/articles/${article.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-solid hover:underline"
                      >
                        <span>Read Guide</span>
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </div>
        )}
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />
    </div>
  );
}
