'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  sanitizeAccountUsernameInput,
  validateAccountUsername,
} from '../lib/account';
import {
  evaluatePasswordStrength,
  validateAuthEmail,
  validateSignInIdentifier,
  type AuthFieldErrors,
} from '../lib/auth';
import { MOCK_SHARED_PROFILES } from '../mocks/account-profile.mock';
import { type EcosystemAppId } from '../mocks/ecosystem-chrome.mock';
import { Badge } from '../primitives/Badge';
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
  /** Existing usernames for live signup handle collision checks */
  existingUsernames?: readonly string[];
  /** Custom demo personas list */
  demoPersonas?: readonly AuthDemoPersonaOption[];
  /** Whether to show the 1-click Demo Persona bar (default: true) */
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

const TRACK_OPTIONS: Array<{ id: AcademicTrackOption; label: string; code: string }> = [
  { id: 'ial', label: 'IAL / A-Level', code: 'AS & A2' },
  { id: 'igcse', label: 'IGCSE Student', code: 'CAIE / EDEXCEL' },
  { id: 'tutor', label: 'Educator / Tutor', code: 'MENTOR' },
  { id: 'productivity', label: 'Flow Planner', code: '24H STUDIO' },
];

function GoogleMarkSvg() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.78 0-.8-.08-1.57-.2-2.31Z"
      />
      <path
        fill="currentColor"
        opacity="0.75"
        d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.26 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.59H-2.1v3.73C.54 18.42 5.93 22 12.18 22Z"
      />
    </svg>
  );
}

function GitHubMarkSvg() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.85.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.81 0 .27.18.59.69.49A10.27 10.27 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
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
  const [username, setUsername] = useState('');
  const [academicTrack, setAcademicTrack] = useState<AcademicTrackOption>(
    app === 'flow' ? 'productivity' : 'ial'
  );
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPanelOpen, setResetPanelOpen] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState<string | null>(null);
  const [localFieldErrors, setLocalFieldErrors] = useState<AuthFieldErrors>({});
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const knownHandles = useMemo(
    () => existingUsernames ?? Object.keys(MOCK_SHARED_PROFILES),
    [existingUsernames]
  );

  const liveUsernameCheck = useMemo(() => {
    if (activeMode !== 'signup' || !username.trim()) return null;
    return validateAccountUsername(username, knownHandles);
  }, [activeMode, username, knownHandles]);

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

    setSubmittedNotice(
      `Signed in as ${persona.name} (@${persona.username}) across .the-ants.org`
    );
  };

  const handleSocialClick = (provider: 'google' | 'github') => {
    setLocalFieldErrors({});
    if (onSocialAuth) {
      onSocialAuth(provider);
      return;
    }
    const label = provider === 'google' ? 'Google' : 'GitHub';
    setSubmittedNotice(
      `${label} SSO session verified for .the-ants.org`
    );
  };

  const handleSendPasswordReset = () => {
    const target = email.trim() || 'zay@the-ants.org';
    const check = validateAuthEmail(target);
    if (!check.valid) {
      setLocalFieldErrors((prev) => ({
        ...prev,
        email: check.error,
      }));
      return;
    }
    setLocalFieldErrors({});
    setResetEmailSent(check.normalized);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedNotice(null);

    // When standalone without input, allow quick prototype submit with realistic defaults
    const effectiveEmail =
      email.trim() || (activeMode === 'login' ? 'zay@the-ants.org' : '');
    const effectivePassword =
      password || (activeMode === 'login' && !email.trim() ? 'ants-studio-2026' : '');

    if (activeMode === 'login') {
      const idCheck = validateSignInIdentifier(effectiveEmail);
      const nextErrors: AuthFieldErrors = {};
      if (!idCheck.valid) {
        nextErrors.email = idCheck.error;
      }
      if (!effectivePassword) {
        nextErrors.password = 'Enter your password (or pick a Demo Persona above).';
      } else if (effectivePassword.length < 6) {
        nextErrors.password = 'Password must be at least 6 characters.';
      }

      if (nextErrors.email || nextErrors.password) {
        setLocalFieldErrors(nextErrors);
        return;
      }
    } else {
      const nextErrors: AuthFieldErrors = {};
      const cleanName = name.trim();
      if (cleanName.length < 2) {
        nextErrors.name = 'Enter your full name (at least 2 characters).';
      }
      const handleCheck = validateAccountUsername(username, knownHandles);
      if (!handleCheck.valid) {
        nextErrors.username = handleCheck.error;
      }
      const emailCheck = validateAuthEmail(email);
      if (!emailCheck.valid) {
        nextErrors.email = emailCheck.error;
      }
      if (!passwordStrength.checks.minLength) {
        nextErrors.password = 'Password must be at least 8 characters.';
      }

      if (
        nextErrors.name ||
        nextErrors.username ||
        nextErrors.email ||
        nextErrors.password
      ) {
        setLocalFieldErrors(nextErrors);
        return;
      }
    }

    setLocalFieldErrors({});
    const normalizedUsername = sanitizeAccountUsernameInput(username) || 'zaylynnhtet';
    const payload: AuthFormSubmitPayload = {
      mode: activeMode,
      email: effectiveEmail,
      password: effectivePassword,
      ...(activeMode === 'signup'
        ? {
            name: name.trim() || 'Zay Lynn Htet',
            username: normalizedUsername,
            academicTrack,
          }
        : {}),
      rememberMe,
    };

    if (onSubmit) {
      onSubmit(payload);
    } else {
      setSubmittedNotice(
        activeMode === 'login'
          ? `Session verified for ${payload.email} (SSO .the-ants.org)`
          : `Account created for @${payload.username} (${academicTrack.toUpperCase()})`
      );
    }
  };

  const hostAppLabel = app === 'flow' ? 'Flow Studio' : 'Study Workspace';

  return (
    <Card
      variant="elevated"
      className={cn('mx-auto w-full max-w-md border-border-hover', className)}
    >
      <CardHeader
        action={
          <Badge variant="verified" dot mono>
            SSO .the-ants.org
          </Badge>
        }
      >
        {!hideBrandHeader && (
          <div className="mb-2">
            <BrandHeaderBadge app={app} showEndorsement />
          </div>
        )}
        <CardTitle className="text-xl font-extrabold tracking-tight">
          {activeMode === 'login'
            ? `Sign in to ${hostAppLabel}`
            : 'Create your unified ANTs account'}
        </CardTitle>
        <CardDescription>
          One single sign-on session across{' '}
          <span className="font-semibold text-foreground">Flow</span> (Timetable & Tasks)
          and <span className="font-semibold text-foreground">Study</span> (IGCSE & IAL
          Trackers).
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
            { value: 'login', label: 'Sign In (/login)' },
            { value: 'signup', label: 'Create Account (/signup)' },
          ]}
        />

        {/* 1-Click Demo Persona Quick-Sign-In Bar */}
        {showDemoPersonas && demoPersonas.length > 0 && (
          <div className="rounded-xl bg-surface-inset p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                Instant Demo Personas
              </span>
              <span className="font-mono text-[11px] text-foreground-muted">
                1-click SSO
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {demoPersonas.map((persona) => (
                <button
                  key={persona.username}
                  type="button"
                  onClick={() => handleSelectDemoPersona(persona)}
                  data-testid={`demo-persona-${persona.username}`}
                  className="flex flex-col items-start rounded-lg bg-background/80 px-2.5 py-2 text-left transition-colors hover:bg-primary-tint/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-mono text-xs font-bold text-foreground">
                    @{persona.username}
                  </span>
                  <span className="mt-0.5 truncate w-full text-[11px] text-foreground-muted">
                    {persona.roleSummary}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* OAuth Social Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<GoogleMarkSvg />}
            onClick={() => handleSocialClick('google')}
          >
            Google
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<GitHubMarkSvg />}
            onClick={() => handleSocialClick('github')}
          >
            GitHub
          </Button>
        </div>

        <div className="relative flex items-center py-0.5">
          <div className="grow border-t border-border-subtle" />
          <span className="mx-3 shrink-0 text-xs font-medium text-foreground-muted">
            or continue with credentials
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
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  placeholder="e.g. Aung Myat"
                  value={name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setName(nextName);
                    if (!username && nextName.trim().length >= 3) {
                      setUsername(sanitizeAccountUsernameInput(nextName));
                    }
                    if (localFieldErrors.name) {
                      setLocalFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  error={mergedFieldErrors.name}
                  leftIcon={<User className="h-4 w-4" />}
                />
                <Input
                  label="Public Handle"
                  placeholder="aungmyat"
                  mono
                  value={username}
                  onChange={(e) => {
                    setUsername(sanitizeAccountUsernameInput(e.target.value));
                    if (localFieldErrors.username) {
                      setLocalFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }
                  }}
                  error={
                    mergedFieldErrors.username ??
                    (liveUsernameCheck && !liveUsernameCheck.valid
                      ? liveUsernameCheck.error
                      : undefined)
                  }
                  hint={
                    liveUsernameCheck?.valid
                      ? `@${liveUsernameCheck.normalized} is available`
                      : undefined
                  }
                  leftIcon={<AtSign className="h-4 w-4" />}
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Primary Focus Track
                </span>
                <div
                  role="radiogroup"
                  aria-label="Primary Focus Track"
                  className="grid grid-cols-2 gap-2"
                >
                  {TRACK_OPTIONS.map((track) => {
                    const selected = academicTrack === track.id;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setAcademicTrack(track.id)}
                        className={cn(
                          'flex flex-col items-start rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selected
                            ? 'bg-primary-tint text-on-primary-tint ring-1 ring-primary'
                            : 'bg-surface-inset text-foreground hover:bg-surface-inset/80'
                        )}
                      >
                        <span className="text-xs font-bold">{track.label}</span>
                        <span className="font-mono text-[10px] text-foreground-muted">
                          {track.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <Input
            label={
              activeMode === 'login'
                ? 'Email or ANTs @username'
                : 'Academic or Personal Email'
            }
            type={activeMode === 'login' ? 'text' : 'email'}
            placeholder={
              activeMode === 'login'
                ? 'zay@the-ants.org or @zaylynnhtet'
                : 'scholar@the-ants.org'
            }
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
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter at least 8 characters"
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
              hint={
                activeMode === 'signup' && password.length === 0
                  ? 'Minimum 8 characters. Syncs across study.the-ants.org & flow.the-ants.org.'
                  : undefined
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
                      ? '8+ chars verified'
                      : 'At least 8 characters required'}
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {passwordStrength.label} ({passwordStrength.score}/4)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={setRememberMe}
              label="Keep session active across .the-ants.org"
            />
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

          {/* Inline Password Recovery Drawer (Login Mode) */}
          {activeMode === 'login' && (
            <div
              data-open={resetPanelOpen ? 'true' : 'false'}
              className="ants-accordion"
            >
              <div className="ants-accordion-inner">
                <div className="mt-1 rounded-xl bg-surface-inset p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">
                    Send a password recovery link to your `.the-ants.org` email:
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs text-foreground-muted">
                      {email.trim() || 'zay@the-ants.org'}
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
                      Recovery link dispatched to{' '}
                      <span className="font-mono font-semibold">{resetEmailSent}</span>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            {activeMode === 'login'
              ? `Sign In to ${hostAppLabel}`
              : 'Create Unified Account'}
          </Button>
        </form>
      </CardContent>

      <CardFooter>
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Better Auth Cross-Subdomain Cookie</span>
        </span>
        <button
          type="button"
          onClick={() =>
            handleModeSwitch(activeMode === 'login' ? 'signup' : 'login')
          }
          className="text-xs font-bold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
        >
          {activeMode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </CardFooter>
    </Card>
  );
}
