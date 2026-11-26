'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  User,
} from 'lucide-react';
import {
  sanitizeAccountUsernameInput,
  validateAccountUsername,
} from '../lib/account';
import {
  evaluatePasswordStrength,
  validateAuthEmail,
  type AuthFieldErrors,
} from '../lib/auth';
import { MOCK_SHARED_PROFILES } from '../mocks/account-profile.mock';
import { type EcosystemAppId } from '../mocks/ecosystem-chrome.mock';
import { Button } from '../primitives/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../primitives/Card';
import { Checkbox } from '../primitives/Checkbox';
import { Input } from '../primitives/Input';
import { Tabs } from '../primitives/Tabs';
import { cn } from '../utils/cn';
import { BrandHeaderBadge } from './BrandHeaderBadge';

export type AuthFormMode = 'login' | 'signup';
export type AcademicTrackOption = 'igcse' | 'ial' | 'tutor' | 'productivity';

export interface AuthFormSubmitPayload {
  mode: AuthFormMode;
  email: string;
  password: string;
  name?: string;
  username?: string;
  academicTrack?: AcademicTrackOption;
  rememberMe: boolean;
}

export interface AuthDemoPersonaOption {
  username: string;
  name: string;
  email: string;
  roleSummary: string;
}

export const DEFAULT_AUTH_DEMO_PERSONAS: AuthDemoPersonaOption[] = [
  {
    username: 'zaylynnhtet',
    name: 'Zay Lynn Htet',
    email: 'zay@the-ants.org',
    roleSummary: 'IAL Tutor · Student',
  },
  {
    username: 'thawyezaw',
    name: 'Thaw Ye Zaw',
    email: 'thaw@the-ants.org',
    roleSummary: 'Admin · Lead',
  },
  {
    username: 'minkhant',
    name: 'Min Khant',
    email: 'minkhant@the-ants.org',
    roleSummary: 'IGCSE Student',
  },
];

export interface AuthFormViewProps {
  /** Controlled auth mode ('login' | 'signup') */
  mode?: AuthFormMode;
  /** Default mode when uncontrolled */
  defaultMode?: AuthFormMode;
  /** Callback when switching between Sign In and Sign Up */
  onModeChange?: (mode: AuthFormMode) => void;
  /** Host app context ('flow' or 'study') */
  app?: EcosystemAppId;
  /** Callback when form is submitted */
  onSubmit?: (payload: AuthFormSubmitPayload) => void;
  /** Callback when an OAuth provider button is clicked */
  onSocialAuth?: (provider: 'google' | 'github') => void;
  /** Callback when a 1-click Demo Persona pill is clicked */
  onDemoPersonaSelect?: (username: string) => void;
  /** Existing usernames for unique handle generation */
  existingUsernames?: readonly string[];
  /** Custom demo personas list */
  demoPersonas?: readonly AuthDemoPersonaOption[];
  /** Whether to show the collapsible Demo accounts disclosure in Sign In mode (default: true) */
  showDemoPersonas?: boolean;
  /** Hide internal BrandHeaderBadge when rendered inside AuthStudioView */
  hideBrandHeader?: boolean;
  /** Loading state from auth container */
  isLoading?: boolean;
  /** Optional server/validation error message */
  error?: string | null;
  /** Optional field-level validation errors */
  fieldErrors?: AuthFieldErrors;
  /** Additional className */
  className?: string;
}

function GoogleMarkSvg() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

function deriveAvailableUsername(
  name: string,
  email: string,
  knownHandles: readonly string[]
): string {
  const baseSeed =
    sanitizeAccountUsernameInput(name) ||
    sanitizeAccountUsernameInput(email.split('@')[0] ?? '') ||
    'scholar';
  const padded = baseSeed.length >= 3 ? baseSeed : `${baseSeed}ant`;
  let candidate = padded;
  let suffix = 2;
  while (!validateAccountUsername(candidate, knownHandles).valid) {
    candidate = `${padded}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function AuthFormView({
  mode: controlledMode,
  defaultMode = 'login',
  onModeChange,
  app = 'study',
  onSubmit,
  onSocialAuth,
  onDemoPersonaSelect,
  existingUsernames,
  demoPersonas = DEFAULT_AUTH_DEMO_PERSONAS,
  showDemoPersonas = true,
  hideBrandHeader = false,
  isLoading = false,
  error = null,
  fieldErrors: externalFieldErrors,
  className,
}: AuthFormViewProps) {
  const [internalMode, setInternalMode] = useState<AuthFormMode>(defaultMode);
  const activeMode = controlledMode ?? internalMode;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPanelOpen, setResetPanelOpen] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [localFieldErrors, setLocalFieldErrors] = useState<AuthFieldErrors>({});
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const knownHandles = useMemo(
    () => existingUsernames ?? Object.keys(MOCK_SHARED_PROFILES),
    [existingUsernames]
  );

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  );

  const mergedFieldErrors: AuthFieldErrors = {
    ...localFieldErrors,
    ...externalFieldErrors,
  };

  const handleModeSwitch = (next: string) => {
    const nextMode = next as AuthFormMode;
    if (controlledMode === undefined) {
      setInternalMode(nextMode);
    }
    setLocalFieldErrors({});
    setSubmittedNotice(null);
    setResetPanelOpen(false);
    setResetEmailSent(null);
    setDemoOpen(false);
    onModeChange?.(nextMode);
  };

  const handleSelectDemoPersona = (persona: AuthDemoPersonaOption) => {
    setEmail(persona.email);
    setPassword('ants-studio-2026');
    setLocalFieldErrors({});
    setSubmittedNotice(null);

    if (onDemoPersonaSelect) {
      onDemoPersonaSelect(persona.username);
      return;
    }

    if (onSubmit) {
      onSubmit({
        mode: 'login',
        email: persona.email,
        password: 'ants-studio-2026',
        rememberMe,
      });
      return;
    }

    setSubmittedNotice(`Signed in as ${persona.name} (@${persona.username})`);
  };

  const handleGoogleClick = () => {
    setLocalFieldErrors({});
    setSubmittedNotice(null);
    if (onSocialAuth) {
      onSocialAuth('google');
      return;
    }
    setSubmittedNotice('Signed in with Google.');
  };

  const handleSendPasswordReset = () => {
    const target = email.trim();
    const check = validateAuthEmail(target);
    if (!check.valid) {
      setLocalFieldErrors((prev) => ({
        ...prev,
        email: 'Enter your email address above to receive a reset link.',
      }));
      return;
    }
    setLocalFieldErrors({});
    setResetEmailSent(check.normalized);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedNotice(null);

    const emailCheck = validateAuthEmail(email);
    const nextErrors: AuthFieldErrors = {};

    if (!emailCheck.valid) {
      nextErrors.email = emailCheck.error;
    }

    if (activeMode === 'login') {
      if (!password) {
        nextErrors.password = 'Enter your password.';
      } else if (password.length < 6) {
        nextErrors.password = 'Password must be at least 6 characters.';
      }
    } else {
      if (name.trim().length < 2) {
        nextErrors.name = 'Enter your full name (at least 2 characters).';
      }
      if (!passwordStrength.checks.minLength) {
        nextErrors.password = 'Password must be at least 8 characters.';
      }
    }

    if (nextErrors.name || nextErrors.email || nextErrors.password) {
      setLocalFieldErrors(nextErrors);
      return;
    }

    setLocalFieldErrors({});
    const defaultTrack: AcademicTrackOption = app === 'flow' ? 'productivity' : 'ial';
    const derivedUsername =
      activeMode === 'signup'
        ? deriveAvailableUsername(name, emailCheck.normalized, knownHandles)
        : undefined;

    const payload: AuthFormSubmitPayload = {
      mode: activeMode,
      email: emailCheck.normalized,
      password,
      ...(activeMode === 'signup'
        ? {
            name: name.trim(),
            username: derivedUsername,
            academicTrack: defaultTrack,
          }
        : {}),
      rememberMe,
    };

    if (onSubmit) {
      onSubmit(payload);
    } else {
      setSubmittedNotice(
        activeMode === 'login'
          ? `Signed in as ${payload.email}`
          : `Account created for ${payload.email}`
      );
    }
  };

  const hostAppLabel = app === 'flow' ? 'Flow' : 'Study';

  return (
    <Card
      variant="elevated"
      className={cn('mx-auto w-full max-w-md border-border-hover', className)}
    >
      <CardHeader className="pb-4">
        {!hideBrandHeader && (
          <div className="mb-2">
            <BrandHeaderBadge app={app} showEndorsement />
          </div>
        )}
        <CardTitle className="text-xl font-extrabold tracking-tight">
          {activeMode === 'login'
            ? `Sign in to ${hostAppLabel}`
            : `Create your ${hostAppLabel} account`}
        </CardTitle>
        <CardDescription>
          {activeMode === 'login'
            ? 'Continue with Google or your email and password.'
            : 'One ANTs account works across both Flow and Study.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mode Switcher */}
        <Tabs
          variant="segmented"
          value={activeMode}
          onValueChange={handleModeSwitch}
          className="w-full"
          items={[
            { value: 'login', label: 'Sign In' },
            { value: 'signup', label: 'Create Account' },
          ]}
        />

        {/* Primary Social Auth: Google */}
        <Button
          type="button"
          variant="secondary"
          fullWidth
          leftIcon={<GoogleMarkSvg />}
          onClick={handleGoogleClick}
          disabled={isLoading}
          data-testid="auth-google-btn"
          className="h-10 font-semibold"
        >
          Continue with Google
        </Button>

        <div className="relative flex items-center py-0.5">
          <div className="grow border-t border-border-subtle" />
          <span className="mx-3 shrink-0 text-xs font-medium text-foreground-muted">
            or continue with email
          </span>
          <div className="grow border-t border-border-subtle" />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-destructive-tint px-3.5 py-2.5 text-xs font-medium text-on-destructive-tint"
          >
            {error}
          </div>
        )}

        {submittedNotice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg bg-success-tint px-3.5 py-2.5 text-xs font-medium text-on-success-tint"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>{submittedNotice}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-3.5" noValidate>
          {activeMode === 'signup' && (
            <Input
              label="Full Name"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (localFieldErrors.name) {
                  setLocalFieldErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              error={mergedFieldErrors.name}
              leftIcon={<User className="h-4 w-4" />}
            />
          )}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (localFieldErrors.email) {
                setLocalFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            error={mergedFieldErrors.email}
            leftIcon={<Mail className="h-4 w-4" />}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="auth-password-input"
                className="text-xs font-semibold text-foreground"
              >
                Password
              </label>
              {activeMode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setResetPanelOpen((prev) => !prev);
                    setResetEmailSent(null);
                  }}
                  className="text-xs font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
                >
                  {resetPanelOpen ? 'Close reset' : 'Forgot password?'}
                </button>
              )}
            </div>

            <Input
              id="auth-password-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
              placeholder={
                activeMode === 'login' ? 'Enter your password' : 'At least 8 characters'
              }
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (localFieldErrors.password) {
                  setLocalFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              error={mergedFieldErrors.password}
              leftIcon={<KeyRound className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            {/* Live Password Strength Meter in Signup Mode */}
            {activeMode === 'signup' && password.length > 0 && (
              <div className="space-y-1.5 pt-0.5" aria-live="polite">
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((step) => {
                    const active = passwordStrength.score >= step;
                    const toneClass =
                      passwordStrength.score <= 1
                        ? 'bg-destructive'
                        : passwordStrength.score === 2
                          ? 'bg-primary'
                          : 'bg-success';
                    return (
                      <span
                        key={step}
                        className={cn(
                          'h-1.5 rounded-full transition-colors',
                          active ? toneClass : 'bg-surface-inset'
                        )}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-foreground-muted">
                  <span>
                    {passwordStrength.checks.minLength
                      ? '8+ characters'
                      : 'At least 8 characters required'}
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Inline Password Recovery Drawer (Login Mode) */}
          {activeMode === 'login' && (
            <div
              data-open={resetPanelOpen ? 'true' : 'false'}
              className="ants-accordion"
            >
              <div className="ants-accordion-inner">
                <div className="rounded-xl bg-surface-inset p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">
                    Send a password reset link to your email:
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs text-foreground-muted">
                      {email.trim() || 'Enter your email above'}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      tabIndex={resetPanelOpen ? undefined : -1}
                      onClick={handleSendPasswordReset}
                    >
                      Send Reset Link
                    </Button>
                  </div>
                  {resetEmailSent && (
                    <p className="text-xs font-medium text-on-success-tint">
                      Reset link sent to{' '}
                      <span className="font-mono font-semibold">{resetEmailSent}</span>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-0.5">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={setRememberMe}
              label="Keep me signed in"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            {activeMode === 'login' ? 'Sign in with Email' : 'Create Account'}
          </Button>
        </form>

        {/* Collapsible Demo Accounts (Sign In mode only) */}
        {activeMode === 'login' && showDemoPersonas && demoPersonas.length > 0 && (
          <div className="border-t border-border-subtle pt-3">
            <button
              type="button"
              aria-expanded={demoOpen}
              onClick={() => setDemoOpen((prev) => !prev)}
              data-testid="demo-accounts-toggle"
              className="flex w-full items-center justify-between rounded-md py-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Demo accounts</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  demoOpen && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </button>

            <div
              data-open={demoOpen ? 'true' : 'false'}
              className="ants-accordion"
            >
              <div className="ants-accordion-inner">
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {demoPersonas.map((persona) => (
                    <button
                      key={persona.username}
                      type="button"
                      tabIndex={demoOpen ? undefined : -1}
                      onClick={() => handleSelectDemoPersona(persona)}
                      data-testid={`demo-persona-${persona.username}`}
                      className="flex flex-col items-start rounded-lg bg-surface-inset px-2.5 py-2 text-left transition-colors hover:bg-primary-tint/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="font-mono text-xs font-bold text-foreground">
                        @{persona.username}
                      </span>
                      <span className="mt-0.5 w-full truncate text-[11px] text-foreground-muted">
                        {persona.roleSummary}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <button
          type="button"
          onClick={() =>
            handleModeSwitch(activeMode === 'login' ? 'signup' : 'login')
          }
          className="text-xs font-semibold text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
        >
          {activeMode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <span className="font-bold text-on-primary-tint">Sign up</span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span className="font-bold text-on-primary-tint">Sign in</span>
            </>
          )}
        </button>
      </CardFooter>
    </Card>
  );
}
