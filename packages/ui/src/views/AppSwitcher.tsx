'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Calculator,
  Compass,
  Flame,
  GraduationCap,
  Grip,
  Timer,
} from 'lucide-react';
import {
  MOCK_ECOSYSTEM_APPS,
  MOCK_ECOSYSTEM_SHORTCUTS,
  type EcosystemAppId,
  type EcosystemAppItem,
  type EcosystemQuickShortcut,
} from '../mocks/ecosystem-chrome.mock';
import { Badge } from '../primitives/Badge';
import { cn } from '../utils/cn';

export interface AppSwitcherProps {
  /** Currently active app in the ecosystem */
  currentApp?: EcosystemAppId;
  /** Ecosystem app cards list (defaults to MOCK_ECOSYSTEM_APPS) */
  apps?: EcosystemAppItem[];
  /** Quick guest utility links (defaults to MOCK_ECOSYSTEM_SHORTCUTS) */
  shortcuts?: EcosystemQuickShortcut[];
  /** Use local dev ports (:3000, :3001, :3002) instead of production URLs */
  useLocalUrls?: boolean;
  /** Controlled initial open state */
  defaultOpen?: boolean;
  /** Callback when an app item is selected */
  onSelectApp?: (app: EcosystemAppItem) => void;
  /** Additional className for trigger wrapper */
  className?: string;
}

const APP_ICONS: Record<EcosystemAppId, React.ReactNode> = {
  org: <Compass className="h-5 w-5 text-primary" aria-hidden="true" />,
  flow: <Flame className="h-5 w-5 text-primary" aria-hidden="true" />,
  study: <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />,
};

export function AppSwitcher({
  currentApp = 'org',
  apps = MOCK_ECOSYSTEM_APPS,
  shortcuts = MOCK_ECOSYSTEM_SHORTCUTS,
  useLocalUrls = false,
  defaultOpen = false,
  onSelectApp,
  className,
}: AppSwitcherProps) {
  const [open, setOpen] = useState(defaultOpen);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* 9-Dot Launcher Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Switch ANTs Ecosystem App"
        title="The ANTs Ecosystem Switcher (The ANTs · Flow · Study)"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-[color,background-color,border-color,transform] duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
          open
            ? 'border-primary bg-primary-tint text-primary'
            : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:bg-surface-inset hover:text-foreground'
        )}
      >
        <Grip className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Tier-3 Elevated Popover */}
      {open && (
        <div
          role="menu"
          aria-label="The ANTs Ecosystem Applications"
          className="ants-panel-enter absolute right-0 z-50 mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border border-border-hover bg-surface-elevated p-4 text-foreground shadow-[var(--shadow-tier-3)]"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="label-caps text-foreground-muted">THE ANTS ECOSYSTEM</p>
              <p className="text-xs text-foreground-muted mt-0.5">
                Unified SSO across <span className="font-mono">.the-ants.org</span>
              </p>
            </div>
            <Badge variant="active-filter" mono>
              3 APPS
            </Badge>
          </div>

          <div className="mt-3 space-y-2">
            {apps.map((app) => {
              const isCurrent = app.id === currentApp;
              const targetHref = useLocalUrls ? app.localUrl : app.prodUrl;

              return (
                <a
                  key={app.id}
                  href={targetHref}
                  role="menuitem"
                  onClick={(e) => {
                    if (onSelectApp) {
                      e.preventDefault();
                      onSelectApp(app);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    'group flex items-start gap-3.5 rounded-xl border p-3 transition-all duration-150',
                    isCurrent
                      ? 'border-primary-tint-border bg-primary-tint/50'
                      : 'border-border bg-surface-card hover:border-border-hover hover:bg-surface-inset'
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated shadow-2xs transition-transform group-hover:scale-105">
                    {APP_ICONS[app.id]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {app.name}
                        </span>
                        {app.id !== 'org' && (
                          <span className="text-[10px] font-medium text-foreground-muted">
                            by The ANTs
                          </span>
                        )}
                      </div>
                      {isCurrent ? (
                        <Badge variant="verified" dot>
                          Current
                        </Badge>
                      ) : (
                        <span className="font-mono text-[11px] text-foreground-subtle group-hover:text-primary inline-flex items-center gap-0.5">
                          {app.domain}
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-foreground-muted">
                      {app.tagline}
                    </p>
                    <p className="mt-1 text-[11px] text-foreground-subtle leading-relaxed">
                      {app.description}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Guest-Accessible Utility Shortcuts */}
          {shortcuts.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="label-caps text-foreground-subtle mb-2">
                INSTANT GUEST TOOLS (NO LOGIN REQUIRED)
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {shortcuts.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-inset/60 px-2.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-card"
                  >
                    <span className="inline-flex items-center gap-1.5 truncate">
                      {item.id === 'calculator' ? (
                        <Calculator className="h-3.5 w-3.5 text-primary shrink-0" />
                      ) : (
                        <Timer className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="font-mono text-[10px] font-bold text-primary ml-1.5 shrink-0">
                      {item.badge}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

