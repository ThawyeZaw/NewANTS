'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Calculator, Menu, X } from 'lucide-react';
import {
  AppSwitcher,
  BrandHeaderBadge,
  ThemeToggle,
  cn,
  useSlidingIndicator,
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
  const desktopNavRef = useRef<HTMLElement | null>(null);
  const { rect, ready, animate } = useSlidingIndicator(desktopNavRef, activePath, {
    activeSelector: '[aria-current="page"]',
    persistKey: 'org-desktop-nav',
  });
  const indicatorReady = ready && rect.visible;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
        <BrandHeaderBadge app="org" productHref="/" showEndorsement={false} />

        {/* Desktop Minimal Nav: preserves parent tab highlight across nested slug routes with gliding underline */}
        <nav
          ref={desktopNavRef}
          aria-label="Organization Navigation"
          data-gliding-ready={indicatorReady ? 'true' : 'false'}
          className="ants-glide-host relative hidden md:flex items-center gap-6"
        >
          <span
            aria-hidden="true"
            data-animate={animate ? 'true' : 'false'}
            className="ants-glide-indicator z-0 rounded-full bg-primary"
            style={{
              transform: `translate3d(${rect.x}px, ${Math.max(0, rect.y + rect.height + 2)}px, 0)`,
              width: `${rect.width}px`,
              height: '2.5px',
              opacity: indicatorReady ? 1 : 0,
            }}
          />
          {links.map((item) => {
            const isActive =
              item.href === '/'
                ? activePath === '/'
                : activePath === item.href || activePath.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                data-active={isActive ? 'true' : 'false'}
                className={cn(
                  'ants-glide-item relative z-10 inline-flex items-center gap-1.5 text-sm font-medium transition-colors rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'text-foreground font-semibold underline decoration-primary decoration-2 underline-offset-8'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            href="/calculator"
            aria-label="Open Grade Calculator"
            aria-current={activePath === '/calculator' ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              activePath === '/calculator'
                ? 'bg-primary-solid text-on-primary'
                : 'bg-primary-tint text-on-primary-tint hover:bg-primary-solid hover:text-on-primary'
            )}
          >
            <Calculator className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden min-[420px]:inline">Calculator</span>
          </Link>

          <ThemeToggle />
          <AppSwitcher currentApp="org" useLocalUrls={useLocalUrls} />

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="org-mobile-nav"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer (CSS Grid 0fr -> 1fr accordion) */}
      <div
        id="org-mobile-nav"
        data-open={mobileMenuOpen ? 'true' : 'false'}
        aria-hidden={!mobileMenuOpen}
        className="ants-accordion border-t border-border bg-surface-card md:hidden"
      >
        <div className="ants-accordion-inner">
          <nav aria-label="Mobile Navigation" className="px-4 py-3 space-y-1">
            {links.map((item) => {
              const isActive =
                item.href === '/'
                  ? activePath === '/'
                  : activePath === item.href || activePath.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  tabIndex={mobileMenuOpen ? undefined : -1}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-tint text-on-primary-tint font-semibold'
                      : 'text-foreground hover:bg-surface-inset'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

