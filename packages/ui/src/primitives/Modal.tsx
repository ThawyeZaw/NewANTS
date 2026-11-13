'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  /** Controls whether the modal overlay is open */
  open: boolean;
  /** Callback fired when the user requests to close the modal (Escape, backdrop click, or X button) */
  onClose: () => void;
  /** Modal header title */
  title?: React.ReactNode;
  /** Optional subtitle / description below the title */
  description?: React.ReactNode;
  /** Optional header badge or action slot */
  headerBadge?: React.ReactNode;
  /** Modal body content */
  children: React.ReactNode;
  /** Optional footer slot (e.g. Cancel / Confirm buttons) */
  footer?: React.ReactNode;
  /** Dialog width preset */
  size?: ModalSize;
  /** Additional dialog panel className */
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  headerBadge,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Translucent backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm ants-modal-backdrop-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Tier-3 Elevated Modal Surface */}
      <div
        className={cn(
          'relative z-10 w-full rounded-2xl border border-border-hover bg-surface-elevated text-foreground shadow-[var(--shadow-tier-3)] ants-modal-panel-in',
          sizeClasses[size],
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                {title && (
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    {title}
                  </h2>
                )}
                {headerBadge}
              </div>
              {description && (
                <p className="text-xs text-foreground-muted leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2.5 rounded-b-2xl border-t border-border bg-surface-inset/50 px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

