'use client';

import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  HardDrive,
  ListChecks,
  Lock,
  LogIn,
  Send,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCog,
  UserPlus,
} from 'lucide-react';
import type { EcosystemAppId } from '../mocks/ecosystem-chrome.mock';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../primitives/Card';
import { cn } from '../utils/cn';
import {
  DEFAULT_AUTH_DEMO_PERSONAS,
  type AuthDemoPersonaOption,
} from './AuthFormView';

export interface WorkspaceAuthGateViewProps {
  /** 'gate' = full workspace login gate; 'banner' = non-blocking Guest Prototype Preview bar (for Flow /timetable & /tasks) */
  variant?: 'gate' | 'banner';
  /** Host application ('flow' | 'study') */
  app?: EcosystemAppId;
  /** Route path being gated (e.g. '/curriculum' or '/settings') */
  routePath?: string;
  /** Optional custom heading shown in the gate card */
  featureTitle?: string;
  /** Optional custom short line below the gate heading */
  featureDescription?: string;
  /** Demo personas for 1-click instant resume */
  demoPersonas?: readonly AuthDemoPersonaOption[];
  /** Triggered when Sign In is clicked */
  onSignIn?: () => void;
  /** Triggered when Create Account is clicked */
  onSignUp?: () => void;
  /** Triggered when a 1-click Demo Persona resume button is clicked */
  onResumeDemoPersona?: (username: string) => void;
  /** Optional navigation handler for guest tool links */
  onNavigate?: (href: string) => void;
  /** External URLs for cross-app guest links */
  flowUrl?: string;
  studyUrl?: string;
  className?: string;
}

interface GateFeaturePill {
  id: string;
  label: string;
  icon: React.ReactNode;
}

function getPersonaInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function PersonaRoleIcon({ roleSummary }: { roleSummary: string }) {
  const lower = roleSummary.toLowerCase();
  if (lower.includes('admin')) {
    return <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />;
  }
  if (lower.includes('tutor')) {
    return <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />;
  }
  return <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />;
}

export function WorkspaceAuthGateView({
  variant = 'gate',
  app = 'study',
  routePath = '/',
  featureTitle,
  featureDescription,
  demoPersonas = DEFAULT_AUTH_DEMO_PERSONAS,
  onSignIn,
  onSignUp,
  onResumeDemoPersona,
  onNavigate,
  flowUrl = 'http://localhost:3002',
  studyUrl = 'http://localhost:3001',
  className,
}: WorkspaceAuthGateViewProps) {
  const isFlow = app === 'flow';
  const isSettings = routePath.startsWith('/settings');

  const defaultTitle =
    featureTitle ??
    (isSettings
      ? 'Account & Telegram'
      : isFlow
        ? 'Flow Studio'
        : 'Study Workspace');

  const featurePills: GateFeaturePill[] = isSettings
    ? [
        {
          id: 'handle',
          label: '@Username',
          icon: <UserCog className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />,
        },
        {
          id: 'slots',
          label: 'Tutor Slots',
          icon: <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />,
        },
        {
          id: 'bot',
          label: '@TheANTsFlowBot',
          icon: <Send className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />,
        },
      ]
    : isFlow
      ? [
          {
            id: 'grid',
            label: '24h Timetable',
            icon: <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />,
          },
          {
            id: 'tasks',
            label: 'P1–P4 Tasks',
            icon: <ListChecks className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />,
          },
          {
            id: 'cron',
            label: 'TG Cron Alerts',
            icon: <Send className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />,
          },
        ]
      : [
          {
            id: 'topics',
            label: 'Topic Mastery',
            icon: <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />,
          },
          {
            id: 'papers',
            label: 'Paper UMS',
            icon: <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />,
          },
          {
            id: 'countdowns',
            label: 'Countdowns',
            icon: <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />,
          },
        ];

  const calculatorHref = isFlow ? `${studyUrl}/calculator` : '/calculator';
  const pomodoroHref = isFlow ? '/pomodoro' : `${flowUrl}/pomodoro`;

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (onNavigate && href.startsWith('/')) {
      e.preventDefault();
      onNavigate(href);
    }
  };

  if (variant === 'banner') {
    return (
      <div
        role="region"
        aria-label="Guest Prototype Preview"
        data-testid="guest-prototype-preview-banner"
        data-route={routePath}
        className={cn(
          'mb-5 flex flex-col gap-3 rounded-xl border border-border bg-surface-card p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4',
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-on-primary-tint">
            <Eye className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-foreground">
                Guest Preview
              </p>
              <Badge variant="editorial" mono>
                {routePath}
              </Badge>
            </div>
            <p className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
              <HardDrive className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
              <span>Local browser · Sign in to sync</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onResumeDemoPersona && demoPersonas[0] && (
            <button
              type="button"
              onClick={() => onResumeDemoPersona(demoPersonas[0]!.username)}
              data-testid="banner-quick-resume-btn"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-inset px-2.5 font-mono text-xs font-semibold text-foreground transition-colors hover:bg-primary-tint hover:text-on-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>@{demoPersonas[0].username}</span>
            </button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<UserPlus className="h-3.5 w-3.5" />}
            onClick={onSignUp}
            data-testid="banner-signup-btn"
          >
            Sign Up
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<LogIn className="h-3.5 w-3.5" />}
            onClick={onSignIn}
            data-testid="banner-signin-btn"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="workspace-auth-login-gate"
      data-route={routePath}
      className={cn('mx-auto w-full max-w-xl py-6 sm:py-10', className)}
    >
      <Card variant="elevated">
        <CardHeader
          action={
            <Badge variant="editorial" mono>
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              <span>SSO</span>
            </Badge>
          }
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-tint-border bg-primary-tint text-on-primary-tint">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-xl font-extrabold tracking-tight">
                {defaultTitle}
              </CardTitle>
              <p className="text-xs text-foreground-muted">
                {featureDescription ?? 'Sign in to unlock synced workspace tools'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* 3 Compact Icon Feature Pills */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {featurePills.map((pill) => (
              <div
                key={pill.id}
                className="flex items-center gap-2 rounded-lg bg-surface-inset px-3 py-2 text-xs font-semibold text-foreground"
              >
                {pill.icon}
                <span className="truncate">{pill.label}</span>
              </div>
            ))}
          </div>

          {/* Primary Clean Icon Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="primary"
              leftIcon={<LogIn className="h-4 w-4" />}
              onClick={onSignIn}
              data-testid="gate-signin-btn"
            >
              Sign In
            </Button>
            <Button
              type="button"
              variant="secondary"
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={onSignUp}
              data-testid="gate-signup-btn"
            >
              Create Account
            </Button>
          </div>

          {/* 1-Click Demo Scholar Accounts with Monogram Avatars & Role Icons */}
          {onResumeDemoPersona && demoPersonas.length > 0 && (
            <div className="border-t border-border-subtle pt-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>Instant Demo</span>
                </span>
                <span className="font-mono text-[11px] text-foreground-muted">
                  1-click
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {demoPersonas.map((persona) => (
                  <button
                    key={persona.username}
                    type="button"
                    onClick={() => onResumeDemoPersona(persona.username)}
                    data-testid={`gate-resume-${persona.username}`}
                    className="group flex items-center gap-2.5 rounded-lg bg-surface-inset px-2.5 py-2.5 text-left transition-colors hover:bg-primary-tint hover:text-on-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary-tint-border bg-primary-tint font-mono text-[11px] font-bold text-on-primary-tint">
                      {getPersonaInitials(persona.name)}
                    </span>
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="flex items-center gap-1 font-mono text-xs font-bold text-foreground truncate">
                        <span className="truncate">@{persona.username}</span>
                        <PersonaRoleIcon roleSummary={persona.roleSummary} />
                      </span>
                      <span className="block truncate text-[11px] text-foreground-muted">
                        {persona.name}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Open Without Login Tools */}
          <div className="border-t border-border-subtle pt-4 space-y-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              <span>Open Without Login</span>
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={calculatorHref}
                onClick={(e) => handleLinkClick(e, calculatorHref)}
                className="group flex items-center justify-between rounded-lg bg-surface-inset px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary-tint/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="inline-flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Grade Calculator</span>
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 text-foreground-muted transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>

              <a
                href={pomodoroHref}
                onClick={(e) => handleLinkClick(e, pomodoroHref)}
                className="group flex items-center justify-between rounded-lg bg-surface-inset px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary-tint/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="inline-flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Pomodoro Timer</span>
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 text-foreground-muted transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Synced Flow ↔ Study</span>
          </span>
          <span className="font-mono text-xs text-foreground-muted">
            .the-ants.org SSO
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
