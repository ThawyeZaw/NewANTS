'use client';

import React from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  LogOut,
  Timer,
} from 'lucide-react';
import type { AuthFieldErrors } from '../lib/auth';
import type { EcosystemAppId, MockUserProfile } from '../mocks/ecosystem-chrome.mock';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { ThemeToggle } from '../primitives/ThemeToggle';
import { cn } from '../utils/cn';
import { AppSwitcher } from './AppSwitcher';
import {
  AuthFormView,
  DEFAULT_AUTH_DEMO_PERSONAS,
  type AuthDemoPersonaOption,
  type AuthFormMode,
  type AuthFormSubmitPayload,
} from './AuthFormView';
import { AuthShowcaseVideoView } from './AuthShowcaseVideoView';
import { BrandHeaderBadge } from './BrandHeaderBadge';

export interface AuthStudioCapabilityRow {
  id: string;
  title: string;
  description: string;
  code: string;
  icon: React.ReactNode;
}

export interface AuthStudioViewProps {
  /** Host application ('flow' | 'study') */
  app?: EcosystemAppId;
  /** Controlled mode ('login' | 'signup') */
  mode?: AuthFormMode;
  defaultMode?: AuthFormMode;
  onModeChange?: (mode: AuthFormMode) => void;
  /** Currently authenticated user (if already signed in) */
  activeUser?: MockUserProfile | null;
  /** Sanitized return path after sign-in/sign-up (e.g. '/timetable' or '/curriculum') */
  redirectTo?: string;
  /** Optional external .mp4 / .webm URL rendered inside the left video showcase */
  videoUrl?: string;
  /** Optional poster image URL when external videoUrl is supplied */
  posterUrl?: string;
  /** Existing handles for live signup @username collision validation */
  existingUsernames?: readonly string[];
  /** Demo personas for 1-click sign-in */
  demoPersonas?: readonly AuthDemoPersonaOption[];
  /** Form submit handler */
  onSubmit?: (payload: AuthFormSubmitPayload) => void;
  /** OAuth provider click handler */
  onSocialAuth?: (provider: 'google' | 'github') => void;
  /** 1-click Demo Persona selection handler */
  onDemoPersonaSelect?: (username: string) => void;
  /** Continue to workspace when already authenticated */
  onContinueAuthenticated?: () => void;
  /** Sign out current user to switch accounts */
  onSignOut?: () => void;
  /** Navigate to an internal/external path */
  onNavigate?: (href: string) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Top-level form error */
  error?: string | null;
  /** Field-level validation errors */
  fieldErrors?: AuthFieldErrors;
  /** External URLs for cross-app links */
  orgUrl?: string;
  flowUrl?: string;
  studyUrl?: string;
  className?: string;
}

export function AuthStudioView({
  app = 'study',
  mode,
  defaultMode = 'login',
  onModeChange,
  activeUser = null,
  redirectTo,
  videoUrl,
  posterUrl,
  existingUsernames,
  demoPersonas = DEFAULT_AUTH_DEMO_PERSONAS,
  onSubmit,
  onSocialAuth,
  onDemoPersonaSelect,
  onContinueAuthenticated,
  onSignOut,
  onNavigate,
  isLoading = false,
  error = null,
  fieldErrors,
  orgUrl = 'http://localhost:3000',
  flowUrl = 'http://localhost:3002',
  studyUrl = 'http://localhost:3001',
  className,
}: AuthStudioViewProps) {
  const isFlow = app === 'flow';
  const defaultWorkspaceHref = isFlow ? '/timetable' : '/';
  const targetRedirect = redirectTo || defaultWorkspaceHref;

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (onNavigate && href.startsWith('/')) {
      e.preventDefault();
      onNavigate(href);
    }
  };

  const guestCalculatorHref = isFlow ? `${studyUrl}/calculator` : '/calculator';
  const guestPomodoroHref = isFlow ? '/pomodoro' : `${flowUrl}/pomodoro`;

  return (
    <div
      className={cn(
        'min-h-screen bg-background text-foreground flex flex-col',
        className
      )}
    >
      {/* Slim Studio Top Utility Header */}
      <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandHeaderBadge
              app={app}
              productHref={defaultWorkspaceHref}
              orgHref={orgUrl}
              showEndorsement
            />
          </div>

          <div className="flex items-center gap-2">
            <a
              href={isFlow ? '/pomodoro' : '/calculator'}
              onClick={(e) =>
                handleLinkClick(e, isFlow ? '/pomodoro' : '/calculator')
              }
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-card px-3 py-1.5 text-xs font-semibold text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {isFlow ? 'Guest Pomodoro (/pomodoro)' : 'Guest Calculator (/calculator)'}
              </span>
            </a>
            <ThemeToggle />
            <AppSwitcher currentApp={app} useLocalUrls />
          </div>
        </div>
      </header>

      {/* Main Split-Screen Studio Content */}
      <main className="ants-fade-enter flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Active Session Status Bar (when already signed in) */}
        {activeUser && (
          <div
            role="status"
            data-testid="active-sso-session-banner"
            className="mb-8 flex flex-col gap-3 rounded-xl border border-border bg-surface-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-solid font-mono text-xs font-bold text-on-primary">
                {activeUser.name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? '')
                  .join('')}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-foreground">
                    Active session: {activeUser.name}
                  </p>
                  <span className="font-mono text-xs text-on-primary-tint font-semibold">
                    @{activeUser.username}
                  </span>
                  <Badge variant="verified" dot>
                    Signed In
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  You already have an active `.the-ants.org` session. Continue straight to{' '}
                  <span className="font-mono text-foreground">{targetRedirect}</span> or
                  switch accounts below.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onContinueAuthenticated}
                data-testid="continue-to-workspace-btn"
              >
                Continue to {targetRedirect}
              </Button>
              {onSignOut && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<LogOut className="h-3.5 w-3.5" />}
                  onClick={onSignOut}
                  data-testid="auth-studio-signout-btn"
                >
                  Sign Out (Guest Mode)
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start lg:gap-10">
          {/* Left Column: Minimal Headline + Live Product Walkthrough Video + Compact Guest Strip */}
          <section className="space-y-5 lg:pt-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[26px] text-balance">
                {isFlow
                  ? 'Sync schedules, tasks & study in one place.'
                  : 'Track topics, past papers & exam countdowns.'}
              </h1>
              {redirectTo && (
                <span className="font-mono text-xs text-on-primary-tint">
                  Returns to {redirectTo}
                </span>
              )}
            </div>

            <AuthShowcaseVideoView
              app={app}
              videoUrl={videoUrl}
              posterUrl={posterUrl}
            />

            {/* Compact Guest Access Strip (Zero Login Required per Spec Matrix) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  <span>No login needed:</span>
                </span>
                <a
                  href={guestCalculatorHref}
                  onClick={(e) => handleLinkClick(e, guestCalculatorHref)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Calculator className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>Calculator</span>
                </a>
                <a
                  href={guestPomodoroHref}
                  onClick={(e) => handleLinkClick(e, guestPomodoroHref)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Timer className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>Pomodoro</span>
                </a>
              </div>

              <a
                href={orgUrl}
                className="inline-flex items-center gap-1 text-xs font-semibold text-foreground-muted transition-colors hover:text-foreground"
              >
                <span>the-ants.org</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </section>

          {/* Right Column: AuthFormView Workbench */}
          <section aria-label="Authentication form">
            <AuthFormView
              app={app}
              mode={mode}
              defaultMode={defaultMode}
              onModeChange={onModeChange}
              onSubmit={onSubmit}
              onSocialAuth={onSocialAuth}
              onDemoPersonaSelect={onDemoPersonaSelect}
              existingUsernames={existingUsernames}
              demoPersonas={demoPersonas}
              hideBrandHeader
              isLoading={isLoading}
              error={error}
              fieldErrors={fieldErrors}
              className="max-w-none"
            />
          </section>
        </div>
      </main>
    </div>
  );
}

