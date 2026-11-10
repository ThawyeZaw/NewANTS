'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  ChevronDown,
  ExternalLink,
  Flame,
  LogIn,
  LogOut,
  Send,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import {
  MOCK_AUTHENTICATED_USER,
  type MockUserProfile,
  type UserRole,
} from '../mocks/ecosystem-chrome.mock';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { cn } from '../utils/cn';

export interface UserMenuViewProps {
  /** Authenticated user profile or null when browsing as Guest */
  user?: MockUserProfile | null;
  /** Controlled initial open state for dropdown */
  defaultOpen?: boolean;
  /** Callback when Sign In is clicked in Guest mode */
  onSignIn?: () => void;
  /** Callback when Sign Up is clicked in Guest mode */
  onSignUp?: () => void;
  /** Callback when Sign Out is clicked */
  onSignOut?: () => void;
  /** Callback when navigating to a menu route (/settings, /@username, /admin) */
  onNavigate?: (path: string) => void;
  /** Additional wrapper className */
  className?: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  tutor: 'Verified Tutor',
  teacher: 'Teacher',
  contributor: 'Contributor',
  main_contributor: 'Lead Reviewer',
  admin: 'Admin',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function UserMenuView({
  user = MOCK_AUTHENTICATED_USER,
  defaultOpen = false,
  onSignIn,
  onSignUp,
  onSignOut,
  onNavigate,
  className,
}: UserMenuViewProps) {
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

  // Guest Mode State
  if (!user) {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <Badge variant="editorial" mono>
          GUEST MODE
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<LogIn className="h-3.5 w-3.5" />}
          onClick={onSignIn}
        >
          Sign In
        </Button>
        <Button variant="primary" size="sm" onClick={onSignUp}>
          Get Started
        </Button>
      </div>
    );
  }

  const isAdmin = user.roles.includes('admin');
  const initials = getInitials(user.name);

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* User Avatar & Streak Trigger Pill */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'inline-flex items-center gap-2.5 rounded-full border p-1 pr-3 text-left transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
          open
            ? 'border-primary bg-primary-tint/50'
            : 'border-border bg-surface-card hover:border-border-hover hover:bg-surface-inset'
        )}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-on-primary">
          {initials}
        </span>
        <div className="hidden sm:flex flex-col">
          <span className="text-xs font-bold text-foreground leading-none">
            {user.name}
          </span>
          <span className="mt-0.5 font-mono tabular-nums text-[10px] text-primary font-semibold leading-none">
            {user.streakDays}d streak · {user.xp.toLocaleString()} XP
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-foreground-muted transition-transform duration-150',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          role="menu"
          aria-label="User Account Menu"
          className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-2xl border border-border-hover bg-surface-elevated p-3.5 text-foreground shadow-[var(--shadow-tier-3)]"
        >
          {/* Identity & Multi-Role Header */}
          <div className="border-b border-border pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-bold text-on-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {user.name}
                </p>
                <p className="truncate font-mono text-xs text-foreground-muted">
                  @{user.username}
                </p>
              </div>
            </div>

            {user.curriculumLabel && (
              <p className="mt-2 font-mono text-[11px] text-foreground-subtle">
                {user.curriculumLabel}
              </p>
            )}

            {/* Multi-Role Union Badges */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {user.roles.map((r) => (
                <Badge
                  key={r}
                  variant={r === 'admin' ? 'deadline' : r === 'tutor' ? 'verified' : 'active-filter'}
                >
                  {ROLE_LABELS[r]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Gamification & Telegram Status Bar */}
          <div className="my-2.5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-inset/60 p-2.5">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-mono tabular-nums text-xs font-bold text-foreground">
                  {user.streakDays} Days
                </p>
                <p className="text-[10px] text-foreground-muted">Active Streak</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-mono tabular-nums text-xs font-bold text-foreground">
                  {user.xp.toLocaleString()} XP
                </p>
                <p className="text-[10px] text-foreground-muted">Scholar Ledger</p>
              </div>
            </div>
          </div>

          {/* Menu Navigation Items */}
          <div className="space-y-1">
            <a
              href={`/@${user.username}`}
              role="menuitem"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate(`/@${user.username}`);
                  setOpen(false);
                }
              }}
              className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-inset"
            >
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4 text-foreground-muted" />
                <span>Public Portfolio & Schedule</span>
              </span>
              <ExternalLink className="h-3 w-3 text-foreground-subtle" />
            </a>

            <a
              href="/settings"
              role="menuitem"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/settings');
                  setOpen(false);
                }
              }}
              className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-inset"
            >
              <span className="inline-flex items-center gap-2">
                <Settings className="h-4 w-4 text-foreground-muted" />
                <span>Account & Tutor Settings</span>
              </span>
              <span className="font-mono text-[10px] text-foreground-subtle">/settings</span>
            </a>

            <a
              href="/settings#telegram"
              role="menuitem"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('/settings#telegram');
                  setOpen(false);
                }
              }}
              className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-inset"
            >
              <span className="inline-flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <span>Telegram Bot Reminders</span>
              </span>
              <Badge variant={user.telegramConnected ? 'verified' : 'editorial'} dot>
                {user.telegramConnected ? 'Linked' : 'Connect'}
              </Badge>
            </a>

            {isAdmin && (
              <a
                href="https://the-ants.org/admin"
                role="menuitem"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate('/admin');
                    setOpen(false);
                  }
                }}
                className="flex items-center justify-between rounded-lg bg-primary-tint/50 px-2.5 py-2 text-xs font-bold text-on-primary-tint transition-colors hover:bg-primary-tint"
              >
                <span className="inline-flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Organization Admin CMS</span>
                </span>
                <span className="font-mono text-[10px]">/admin</span>
              </a>
            )}
          </div>

          <div className="mt-2.5 border-t border-border pt-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSignOut?.();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive-tint"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out of .the-ants.org</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

