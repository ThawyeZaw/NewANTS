'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ANTS_AUTH_SESSION_EVENT,
  BrandHeaderBadge,
  hasContributorRole,
  loadAuthSession,
} from '@ants/ui';

export interface OrgFooterViewProps {
  /** Use local dev ports for Study & Flow links */
  useLocalUrls?: boolean;
}

export function OrgFooterView({ useLocalUrls = true }: OrgFooterViewProps) {
  const studyUrl = useLocalUrls ? 'http://localhost:3001' : 'https://study.the-ants.org';
  const flowUrl = useLocalUrls ? 'http://localhost:3002' : 'https://flow.the-ants.org';

  const [isContributor, setIsContributor] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      const session = loadAuthSession();
      setIsContributor(
        session.status === 'authenticated' && hasContributorRole(session.user)
      );
    };

    syncSession();
    window.addEventListener(ANTS_AUTH_SESSION_EVENT, syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener(ANTS_AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  return (
    <footer className="border-t border-border bg-background mt-20">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <BrandHeaderBadge app="org" productHref="/" showEndorsement={false} />
            <p className="text-xs text-foreground-muted leading-relaxed max-w-sm">
              Student and tutor group maintaining open IGCSE and IAL grade calculators,
              weekly tutoring availability, and study meetups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-foreground-muted">
            <Link href="/team" className="hover:text-foreground transition-colors">
              Team &amp; Tutors
            </Link>
            <Link href="/activities" className="hover:text-foreground transition-colors">
              Activities
            </Link>
            <Link href="/articles" className="hover:text-foreground transition-colors">
              Articles
            </Link>
            <Link href="/calculator" className="hover:text-foreground transition-colors">
              Grade Calculator
            </Link>
            <a href={studyUrl} className="hover:text-foreground transition-colors">
              Study App
            </a>
            <a href={flowUrl} className="hover:text-foreground transition-colors">
              Flow App
            </a>
            <Link href="/design-system" className="hover:text-foreground transition-colors">
              Design Tokens
            </Link>
            {isContributor && (
              <Link href="/cms" className="hover:text-foreground transition-colors">
                CMS Studio
              </Link>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-border-subtle pt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-foreground-subtle">
          <span>© {new Date().getFullYear()} The ANTs · ACE With Us · Yangon &amp; Online</span>
          <span>the-ants.org · study.the-ants.org · flow.the-ants.org</span>
        </div>
      </div>
    </footer>
  );
}
