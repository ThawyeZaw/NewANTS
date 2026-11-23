'use client';

import React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import type { EcosystemAppId } from '../mocks/ecosystem-chrome.mock';
import { Badge } from '../primitives/Badge';
import { ThemeToggle } from '../primitives/ThemeToggle';
import { cn } from '../utils/cn';
import { AntMascot } from './AntMascotView';
import { AppSwitcher } from './AppSwitcher';
import { BrandHeaderBadge } from './BrandHeaderBadge';

export interface NotFoundQuickLink {
  label: string;
  href: string;
}

export interface NotFoundViewProps {
  /** Which ANTs application rendered this 404 route */
  app?: EcosystemAppId;
  /** Recovery heading */
  title?: string;
  /** Helpful recovery description */
  description?: string;
  /** Primary return destination */
  primaryHref?: string;
  /** Primary return button copy */
  primaryLabel?: string;
  /** Helpful quick destination pills */
  quickLinks?: readonly NotFoundQuickLink[];
  /** Use local dev ports (:3000, :3001, :3002) in AppSwitcher */
  useLocalUrls?: boolean;
  className?: string;
}

const DEFAULT_TITLES: Record<EcosystemAppId, string> = {
  org: 'Page not found on The ANTs',
  study: 'Syllabus route not found',
  flow: 'Focus route not found',
};

const DEFAULT_DESCRIPTIONS: Record<EcosystemAppId, string> = {
  org: 'The page may have moved or the URL has a typo. Jump back to the main showcase or open a public tool below.',
  study: 'Milo sniffed through the syllabus drawers, but this page does not exist. Head back to your Study workspace.',
  flow: 'Milo searched every time block, but this route is missing. Jump back to Flow Pomodoro or your Timetable.',
};

const DEFAULT_PRIMARY_HREFS: Record<EcosystemAppId, { href: string; label: string }> = {
  org: { href: '/', label: 'Back to The ANTs' },
  study: { href: '/', label: 'Back to Study Dashboard' },
  flow: { href: '/pomodoro', label: 'Back to Flow Pomodoro' },
};

export function NotFoundView({
  app = 'org',
  title,
  description,
  primaryHref,
  primaryLabel,
  quickLinks = [],
  useLocalUrls = true,
  className,
}: NotFoundViewProps) {
  const defaults = DEFAULT_PRIMARY_HREFS[app];
  const resolvedHref = primaryHref ?? defaults.href;
  const resolvedLabel = primaryLabel ?? defaults.label;

  return (
    <div
      data-testid={`not-found-${app}`}
      className={cn('min-h-screen bg-background text-foreground flex flex-col', className)}
    >
      <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <BrandHeaderBadge app={app} productHref={resolvedHref} showEndorsement={app !== 'org'} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AppSwitcher currentApp={app} useLocalUrls={useLocalUrls} />
          </div>
        </div>
      </header>

      <main className="ants-fade-enter mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-14 text-center sm:px-6">
        <AntMascot
          mood="curious"
          app={app}
          propVariant="magnifier"
          size="lg"
          interactive
          speech="Hmm, Milo’s antennae can’t find this page. Let’s head back!"
          tapLines={[
            'Try one of the verified quick routes right below.',
            'Even the best explorers take a wrong turn—tap below to reset!',
          ]}
        />

        <div className="mt-6 space-y-2.5">
          <Badge variant="editorial" mono className="mx-auto">
            404 · Route Missing
          </Badge>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl text-balance">
            {title ?? DEFAULT_TITLES[app]}
          </h1>
          <p className="mx-auto max-w-[50ch] text-sm leading-relaxed text-foreground-muted">
            {description ?? DEFAULT_DESCRIPTIONS[app]}
          </p>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href={resolvedHref}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-solid px-5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-solid-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{resolvedLabel}</span>
          </a>
        </div>

        {quickLinks.length > 0 && (
          <nav aria-label="Recovery quick links" className="mt-8 w-full max-w-md border-t border-border pt-6">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {quickLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Compass className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}
