'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant following Stitch Light & Amber Dark specifications */
  variant?: ButtonVariant;
  /** Control dimensions */
  size?: ButtonSize;
  /** Displays spinner and disables interaction */
  isLoading?: boolean;
  /** Optional leading icon element */
  leftIcon?: React.ReactNode;
  /** Optional trailing icon element */
  rightIcon?: React.ReactNode;
  /** Expands button to 100% container width */
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-solid text-on-primary border border-transparent hover:bg-primary-solid-hover active:bg-primary-active shadow-xs',
  secondary:
    'bg-surface-card text-foreground border border-border hover:bg-surface-inset hover:border-border-hover',
  outline:
    'bg-transparent text-on-primary-tint border border-primary-tint-border hover:bg-primary-tint',
  destructive:
    'bg-destructive text-on-destructive border border-transparent hover:bg-destructive-hover',
  ghost:
    'bg-transparent text-foreground-muted border border-transparent hover:bg-surface-inset hover:text-foreground',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2.5 rounded-xl',
  icon: 'h-9 w-9 p-0 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 select-none',
        'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:bg-surface-inset disabled:text-foreground-muted disabled:border-border disabled:shadow-none disabled:opacity-100',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      {children && <span className="inline-flex items-center gap-1.5 leading-none">{children}</span>}
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
});

