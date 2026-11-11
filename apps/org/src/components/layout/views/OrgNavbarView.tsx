'use client';

import React, { useState } from 'react';
import { Calculator, Menu, X } from 'lucide-react';
import {
  AppSwitcher,
  BrandHeaderBadge,
  ThemeToggle,
  cn,
} from '@ants/ui';
import {
  MOCK_ORG_NAV_LINKS,
  type OrgNavLink,
} from '../../../mocks/showcase-home.mock';

export interface OrgNavbarViewProps {
  /** Navigation links for the-ants.org public showcase */
  links?: OrgNavLink[];
  /** Currently active pathname (e.g. '/', '/team', '/calculator') */
  activePath?: string;
  /** Use local dev ports in AppSwitcher */
  useLocalUrls?: boolean;
}

export function OrgNavbarView({
  links = MOCK_ORG_NAV_LINKS,
  activePath = '/',
  useLocalUrls = true,
}: OrgNavbarViewProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
        <BrandHeaderBadge app="org" productHref="/" showEndorsement={false} />

        {/* Desktop Minimal Nav */}
        <nav
          aria-label="Organization Navigation"
          className="hidden md:flex items-center gap-6"
        >
          {links.map((item) => {
            const isActive = activePath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  isActive
                    ? 'text-foreground font-semibold'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <a
            href="/calculator"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              activePath === '/calculator'
                ? 'bg-primary text-on-primary'
                : 'bg-primary-tint text-on-primary-tint hover:bg-primary hover:text-on-primary'
            )}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Calculator</span>
          </a>

          <ThemeToggle />
          <AppSwitcher currentApp="org" useLocalUrls={useLocalUrls} />

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground-muted hover:text-foreground md:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="border-t border-border bg-surface-card px-4 py-3 space-y-1 md:hidden"
        >
          {links.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-inset"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

