'use client';

import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const titleId = useId();
  const descriptionId = useId();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

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

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const dialogNode = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      {/* Translucent backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm ants-modal-backdrop-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Tier-3 Elevated Modal Surface — viewport-bounded flex layout so header/footer stay pinned */}
      <div
        className={cn(
          'relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-border-hover bg-surface-elevated text-foreground shadow-[var(--shadow-tier-3)] ants-modal-panel-in sm:max-h-[calc(100dvh-2.5rem)]',
          sizeClasses[size],
          className
        )}
      >
        {(title || description) && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                {title && (
                  <h2
                    id={titleId}
                    className="text-lg font-bold tracking-tight text-foreground"
                  >
                    {title}
                  </h2>
                )}
                {headerBadge}
              </div>
              {description && (
                <p
                  id={descriptionId}
                  className="text-xs leading-relaxed text-foreground-muted"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-border bg-surface-inset/50 px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return portalTarget ? createPortal(dialogNode, portalTarget) : dialogNode;
}
