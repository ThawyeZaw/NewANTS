'use client';

import React from 'react';
import { ArrowUpRight, Compass, Flame, GraduationCap } from 'lucide-react';
import { type EcosystemAppId } from '../mocks/ecosystem-chrome.mock';
import { cn } from '../utils/cn';

export interface BrandHeaderBadgeProps {
  /** Which ecosystem product header is being rendered */
  app?: EcosystemAppId;
  /** Optional custom product name override */
  productName?: string;
  /** URL for the primary product brand click */
  productHref?: string;
  /** URL for the subtle "by The ANTs" endorsement badge */
  orgHref?: string;
  /** Whether to show the subtle "by The ANTs" endorsement pill (defaults to true on Flow & Study) */
  showEndorsement?: boolean;
  /** Additional wrapper classes */
  className?: string;
}

const DEFAULT_META: Record<
  EcosystemAppId,
  { name: string; subtitle: string; icon: React.ReactNode }
> = {
  org: {
    name: 'The ANTs',
    subtitle: 'Academic Network & Tutors',
    icon: <Compass className="h-4 w-4 text-on-primary" aria-hidden="true" />,
  },
  flow: {
    name: 'Flow',
    subtitle: 'Productivity Studio',
    icon: <Flame className="h-4 w-4 text-on-primary" aria-hidden="true" />,
  },
  study: {
    name: 'Study',
    subtitle: 'IGCSE & IAL Tracker',
    icon: <GraduationCap className="h-4 w-4 text-on-primary" aria-hidden="true" />,
  },
};

export function BrandHeaderBadge({
  app = 'flow',
  productName,
  productHref = '/',
  orgHref = 'https://the-ants.org',
  showEndorsement,
  className,
}: BrandHeaderBadgeProps) {
  const meta = DEFAULT_META[app];
  const displayTitle = productName ?? meta.name;
  const shouldShowEndorsement = showEndorsement ?? app !== 'org';

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <a
        href={productHref}
        className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary shadow-xs transition-transform duration-150 group-hover:scale-105">
          {meta.icon}
        </span>
        <div className="flex flex-col">
          <span className="text-base font-extrabold tracking-tight text-foreground leading-none">
            {displayTitle}
          </span>
          <span className="mt-0.5 text-[11px] font-medium text-foreground-muted leading-none">
            {meta.subtitle}
          </span>
        </div>
      </a>

      {shouldShowEndorsement && (
        <a
          href={orgHref}
          target="_blank"
          rel="noopener noreferrer"
          title="Visit The ANTs Organization Showcase (the-ants.org)"
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-border bg-surface-inset px-2.5 py-0.5 text-[11px] font-semibold text-foreground-muted transition-all duration-150',
            'hover:border-primary-tint-border hover:bg-primary-tint hover:text-on-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <span>by The ANTs</span>
          <ArrowUpRight className="h-3 w-3 opacity-75" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

