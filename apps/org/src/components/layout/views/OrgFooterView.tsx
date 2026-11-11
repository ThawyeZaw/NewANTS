'use client';

import React from 'react';
import { BrandHeaderBadge } from '@ants/ui';

export interface OrgFooterViewProps {
  /** Use local dev ports for Study & Flow links */
  useLocalUrls?: boolean;
}

export function OrgFooterView({ useLocalUrls = true }: OrgFooterViewProps) {
  const studyUrl = useLocalUrls ? 'http://localhost:3001' : 'https://study.the-ants.org';
  const flowUrl = useLocalUrls ? 'http://localhost:3002' : 'https://flow.the-ants.org';

  return (
    <footer className="border-t border-border bg-surface-card/50 mt-20">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <BrandHeaderBadge app="org" productHref="/" showEndorsement={false} />
            <p className="text-xs text-foreground-muted max-w-sm">
              A student-and-educator community building calm, open-access tools and mentorship for IGCSE & A-Level learners.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-foreground-muted">
            <a href="/team" className="hover:text-foreground transition-colors">
              Team & Tutors
            </a>
            <a href="/activities" className="hover:text-foreground transition-colors">
              Activities
            </a>
            <a href="/articles" className="hover:text-foreground transition-colors">
              Articles
            </a>
            <a href="/calculator" className="hover:text-foreground transition-colors">
              Grade Calculator
            </a>
            <a href={studyUrl} className="hover:text-foreground transition-colors">
              Study App
            </a>
            <a href={flowUrl} className="hover:text-foreground transition-colors">
              Flow App
            </a>
            <a href="/design-system" className="hover:text-foreground transition-colors">
              Design Tokens
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-border-subtle pt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-foreground-subtle">
          <span>© {new Date().getFullYear()} The ANTs. Built with care by students & mentors.</span>
          <span className="font-mono">the-ants.org · study.the-ants.org · flow.the-ants.org</span>
        </div>
      </div>
    </footer>
  );
}

