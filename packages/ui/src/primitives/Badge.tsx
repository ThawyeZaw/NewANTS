'use client';

import React from 'react';
import { cn } from '../utils/cn';

export type BadgeVariant =
  | 'editorial'
  | 'primary'
  | 'active-filter'
  | 'verified'
  | 'success'
  | 'deadline'
  | 'danger'
  | 'subject';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Stitch semantic chip/badge variant */
  variant?: BadgeVariant;
  /** Formats content in JetBrains Mono tabular numerals (for syllabus codes, UMS, scores, countdowns) */
  mono?: boolean;
  /** Renders a status dot (pulsating on deadline/danger variants) */
  dot?: boolean;
  /** Optional leading syllabus code rendered in monospace (e.g. "WMA11" or "0580") */
  code?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  editorial:
    'bg-surface-inset border-border text-foreground-muted uppercase tracking-wider',
  primary:
    'bg-primary text-on-primary border-transparent',
  'active-filter':
    'bg-primary-tint border-primary-tint-border text-on-primary-tint',
  verified:
    'bg-success-tint border-success-border text-on-success-tint',
  success:
    'bg-success-tint border-success-border text-on-success-tint',
  deadline:
    'bg-destructive-tint border-destructive-border text-on-destructive-tint',
  danger:
    'bg-destructive-tint border-destructive-border text-on-destructive-tint',
  subject:
    'bg-primary-tint border-primary-tint-border text-primary rounded-full',
};

export function Badge({
  variant = 'editorial',
  mono = false,
  dot = false,
  code,
  className,
  children,
  ...props
}: BadgeProps) {
  const isPulse = variant === 'deadline' || variant === 'danger';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold leading-4 transition-colors',
        variantClasses[variant],
        mono && 'font-mono tabular-nums tracking-tight',
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full bg-current',
            isPulse && 'animate-pulse'
          )}
          aria-hidden="true"
        />
      )}
      {code && (
        <span className="font-mono tabular-nums font-bold opacity-90">{code}</span>
      )}
      <span>{children}</span>
    </span>
  );
}

