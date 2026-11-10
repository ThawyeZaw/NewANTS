'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
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
  /** Loading state from auth container */
  isLoading?: boolean;
  /** Optional server/validation error message */
  error?: string | null;
  /** Additional className */
  className?: string;
}

const TRACK_OPTIONS: Array<{ id: AcademicTrackOption; label: string; code: string }> = [
  { id: 'igcse', label: 'IGCSE Student', code: 'CAIE / EDEXCEL' },
  { id: 'ial', label: 'IAL / A-Level', code: 'AS & A2' },
  { id: 'tutor', label: 'Educator / Tutor', code: 'TEACHER' },
  { id: 'productivity', label: 'Flow Planner', code: 'GENERAL' },
];

export function AuthFormView({
  mode: controlledMode,
  defaultMode = 'login',
  onModeChange,
  app = 'study',
  onSubmit,
  onSocialAuth,
  isLoading = false,
  error = null,
  className,
}: AuthFormViewProps) {
  const [internalMode, setInternalMode] = useState<AuthFormMode>(defaultMode);
  const activeMode = controlledMode ?? internalMode;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [academicTrack, setAcademicTrack] = useState<AcademicTrackOption>('ial');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const handleModeSwitch = (next: string) => {
    const nextMode = next as AuthFormMode;
    if (controlledMode === undefined) {
      setInternalMode(nextMode);
    }
    setSubmittedNotice(null);
    onModeChange?.(nextMode);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AuthFormSubmitPayload = {
      mode: activeMode,
      email: email || 'student@the-ants.org',
      password,
      ...(activeMode === 'signup'
        ? {
            name: name || 'Zyy Linn Htet',
            username: username || 'zyylinnhtet',
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
          ? `Prototype Sign-In verified for ${payload.email} (SSO .the-ants.org)`
          : `Prototype Account created for @${payload.username} (${academicTrack.toUpperCase()})`
      );
    }
  };

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
        <BrandHeaderBadge app={app} showEndorsement />
        <CardTitle className="pt-3 text-xl font-extrabold">
          {activeMode === 'login'
            ? 'Welcome back to your studio'
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

        {/* OAuth Social Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onSocialAuth?.('google')}
          >
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onSocialAuth?.('github')}
          >
            Continue with GitHub
          </Button>
        </div>

        <div className="relative flex items-center py-1">
          <div className="grow border-t border-border" />
          <span className="mx-3 shrink-0 label-caps text-foreground-subtle">
            OR CONTINUE WITH EMAIL
          </span>
          <div className="grow border-t border-border" />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive-border bg-destructive-tint px-3.5 py-2.5 text-xs font-medium text-on-destructive-tint">
            {error}
          </div>
        )}

        {submittedNotice && (
          <div className="rounded-lg border border-success-border bg-success-tint px-3.5 py-2.5 text-xs font-medium text-on-success-tint">
            {submittedNotice}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          {activeMode === 'signup' && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  placeholder="Zyy Linn Htet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<User className="h-4 w-4" />}
                />
                <Input
                  label="Public Handle"
                  placeholder="zyylinnhtet"
                  mono
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  leftIcon={<AtSign className="h-4 w-4" />}
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Primary Focus Track
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {TRACK_OPTIONS.map((track) => {
                    const selected = academicTrack === track.id;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => setAcademicTrack(track.id)}
                        className={cn(
                          'flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-all',
                          selected
                            ? 'border-primary bg-primary-tint text-on-primary-tint'
                            : 'border-border bg-surface-card text-foreground hover:border-border-hover'
                        )}
                      >
                        <span className="text-xs font-bold">{track.label}</span>
                        <span className="font-mono text-[10px] opacity-80">
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
            label="Academic or Personal Email"
            type="email"
            placeholder="student@the-ants.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="h-4 w-4" />}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<KeyRound className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-foreground-subtle hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            hint={
              activeMode === 'signup'
                ? 'Minimum 8 characters. Syncs across study.the-ants.org & flow.the-ants.org.'
                : undefined
            }
          />

          <div className="flex items-center justify-between pt-1">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={setRememberMe}
              label="Keep session active across .the-ants.org"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            {activeMode === 'login'
              ? 'Sign In to Workspace'
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
          className="text-xs font-bold text-primary hover:underline"
        >
          {activeMode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </CardFooter>
    </Card>
  );
}

