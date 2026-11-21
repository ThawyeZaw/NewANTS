'use client';

import React, { forwardRef } from 'react';
import { cn } from '../utils/cn';

export type CardVariant = 'default' | 'elevated' | 'inset' | 'interactive';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Surface elevation tier and interactivity style */
  variant?: CardVariant;
  /** Removes default internal padding when false */
  padded?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    'bg-surface-card text-foreground border border-border shadow-[var(--shadow-tier-1)]',
  elevated:
    'bg-surface-elevated text-foreground border border-border-hover shadow-[var(--shadow-tier-2)]',
  inset:
    'bg-surface-inset text-foreground border border-border shadow-none',
  interactive:
    'bg-surface-card text-foreground border border-border shadow-[var(--shadow-tier-1)] transition-[transform,border-color,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[var(--shadow-tier-2)] cursor-pointer',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', padded = false, className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl overflow-hidden',
        variantClasses[variant],
        padded && 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional right-side action or badge slot */
  action?: React.ReactNode;
}

export function CardHeader({ action, className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 border-b border-border-subtle px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">{children}</div>
      {action && <div className="shrink-0 self-start">{action}</div>}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-semibold tracking-tight text-foreground', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-foreground-muted leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-inset/50 px-5 py-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

