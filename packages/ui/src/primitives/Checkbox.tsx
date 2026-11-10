'use client';

import React, { useId } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../utils/cn';

export interface CheckboxProps {
  /** Controlled checked state */
  checked?: boolean;
  /** Indeterminate partial selection state */
  indeterminate?: boolean;
  /** Callback when checkbox state changes */
  onCheckedChange?: (checked: boolean) => void;
  /** Primary label text */
  label?: React.ReactNode;
  /** Secondary description below label */
  description?: React.ReactNode;
  /** Strikethrough label when checked (for Task Planner / Topic Tracker checklists) */
  strikeWhenChecked?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** HTML id */
  id?: string;
  /** Additional wrapper className */
  className?: string;
}

export function Checkbox({
  checked = false,
  indeterminate = false,
  onCheckedChange,
  label,
  description,
  strikeWhenChecked = false,
  disabled = false,
  id: providedId,
  className,
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = providedId ?? generatedId;
  const isActive = checked || indeterminate;

  const handleToggle = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  return (
    <div
      className={cn(
        'inline-flex items-start gap-2.5 select-none',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className
      )}
      onClick={handleToggle}
    >
      <button
        id={checkboxId}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive
            ? 'border-primary bg-primary text-on-primary'
            : 'border-border-hover bg-surface-card hover:border-primary'
        )}
      >
        {indeterminate ? (
          <Minus className="h-3 w-3 stroke-[3]" aria-hidden="true" />
        ) : (
          checked && <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
        )}
      </button>
      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && (
            <span
              className={cn(
                'text-sm font-medium text-foreground leading-snug transition-colors',
                strikeWhenChecked && checked && 'line-through text-foreground-subtle'
              )}
            >
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-foreground-muted leading-relaxed">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

