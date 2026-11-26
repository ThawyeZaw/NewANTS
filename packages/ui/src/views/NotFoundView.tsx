'use client';

import React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  ANT_MASCOT_PRESETS,
  AntMascotView,
  type AntMascotApp,
} from './AntMascotView';

export interface NotFoundViewProps {
  /** Ecosystem app context ('org' | 'flow' | 'study') */
  app?: Exclude<AntMascotApp, 'telegram'>;
  /** Primary return destination */
  homeHref?: string;
  /** Primary return button label */
  homeLabel?: string;
  /** Optional secondary destination */
  secondaryHref?: string;
  /** Optional secondary button label */
  secondaryLabel?: string;
  /** Optional custom heading */
  title?: string;
  /** Optional custom description */
  description?: string;
  className?: string;
}

const DEFAULT_CONFIG: Record<
  Exclude<AntMascotApp, 'telegram'>,
  { homeHref: string; homeLabel: string; secondaryHref: string; secondaryLabel: string }
> = {
  org: {
    homeHref: '/',
    homeLabel: 'Back to The ANTs',
    secondaryHref: '/calculator',
    secondaryLabel: 'Open Grade Calculator',
  },
  flow: {
    homeHref: '/timetable',
    homeLabel: 'Back to Timetable',
    secondaryHref: '/pomodoro',
    secondaryLabel: 'Open Pomodoro',
  },
  study: {
    homeHref: '/',
    homeLabel: 'Back to Study Dashboard',
    secondaryHref: '/curriculum',
    secondaryLabel: 'Browse Curriculum',
  },
};

export function NotFoundView({
  app = 'org',
  homeHref,
  homeLabel,
  secondaryHref,
  secondaryLabel,
  title = 'Page not found',
  description = 'This route does not exist or may have moved. Head back to continue your session.',
  className,
}: NotFoundViewProps) {
  const defaults = DEFAULT_CONFIG[app];
  const resolvedHomeHref = homeHref ?? defaults.homeHref;
  const resolvedHomeLabel = homeLabel ?? defaults.homeLabel;
  const resolvedSecondaryHref = secondaryHref ?? defaults.secondaryHref;
  const resolvedSecondaryLabel = secondaryLabel ?? defaults.secondaryLabel;

  return (
    <main
      data-testid="not-found-view"
      data-app={app}
      className={cn(
        'min-h-[75vh] bg-background text-foreground flex items-center justify-center px-4 py-16',
        className
      )}
    >
      <div className="mx-auto flex max-w-md flex-col items-center text-center space-y-6">
        <AntMascotView
          {...ANT_MASCOT_PRESETS.notFound}
          app={app}
          size="lg"
          interactive
          badge="404"
        />

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl text-balance">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-foreground-muted">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={resolvedHomeHref}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-solid px-4 text-sm font-semibold text-on-primary transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{resolvedHomeLabel}</span>
          </a>
          <a
            href={resolvedSecondaryHref}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{resolvedSecondaryLabel}</span>
          </a>
        </div>
      </div>
    </main>
  );
}
