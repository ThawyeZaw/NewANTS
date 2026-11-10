'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional field label */
  label?: string;
  /** Optional helper hint below input */
  hint?: string;
  /** Optional error message (switches border to destructive semantic token) */
  error?: string;
  /** Leading icon or prefix element */
  leftIcon?: React.ReactNode;
  /** Trailing icon or action element */
  rightIcon?: React.ReactNode;
  /** Uses JetBrains Mono tabular numerals (ideal for raw marks, UMS, durations, syllabus codes) */
  mono?: boolean;
  /** Wrapper container className */
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    leftIcon,
    rightIcon,
    mono = false,
    id: providedId,
    className,
    containerClassName,
    disabled,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = providedId ?? generatedId;
  const hasError = Boolean(error);

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-foreground tracking-tight"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 inline-flex items-center text-foreground-subtle">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          className={cn(
            'w-full rounded-lg border bg-surface-card px-3.5 py-2 text-sm text-foreground transition-all duration-150',
            'placeholder:text-foreground-subtle',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-inset',
            hasError
              ? 'border-destructive focus:border-destructive focus:ring-destructive-border'
              : 'border-border hover:border-border-hover',
            Boolean(leftIcon) && 'pl-9',
            Boolean(rightIcon) && 'pr-9',
            mono && 'font-mono tabular-nums',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 inline-flex items-center text-foreground-subtle">
            {rightIcon}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-foreground-muted">{hint}</p>
      )}
    </div>
  );
});

