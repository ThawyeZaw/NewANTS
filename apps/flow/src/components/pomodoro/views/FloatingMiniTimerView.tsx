'use client';

import React from 'react';
import { Pause, Play, SkipForward } from 'lucide-react';
import { cn } from '@ants/ui';
import { PHASE_LABELS, type PomodoroPhase, type TimerStatus } from '../../../lib/pomodoro/engine';

export interface FloatingMiniTimerViewProps {
  visible?: boolean;
  phase?: PomodoroPhase;
  status?: TimerStatus;
  timeLabel?: string;
  progress?: number;
  taskTitle?: string | null;
  onToggle?: () => void;
  onSkip?: () => void;
  /** Return to the full timer */
  onOpen?: () => void;
  className?: string;
}

export function FloatingMiniTimerView({
  visible = true,
  phase = 'work',
  status = 'running',
  timeLabel = '19:45',
  progress = 0.21,
  taskTitle = 'WMA11 Differentiation past paper (Jan 2024)',
  onToggle,
  onSkip,
  onOpen,
  className,
}: FloatingMiniTimerViewProps) {
  if (!visible) return null;

  const isWork = phase === 'work';
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <aside
      aria-label="Mini timer"
      className={cn(
        'ants-bottom-sheet-in fixed bottom-20 right-4 z-30 w-[calc(100vw-2rem)] max-w-[280px] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-[var(--shadow-tier-3)] md:bottom-6 md:right-6',
        className
      )}
    >
      <div className="h-0.5 bg-surface-inset" aria-hidden="true">
        <div
          className={cn('h-full transition-[width] duration-300', isWork ? 'bg-primary' : 'bg-success')}
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Back to timer"
        >
          <span className="block font-mono text-xl font-semibold tabular-nums tracking-[-0.03em] text-foreground">
            {timeLabel}
          </span>
          <span className="block truncate text-xs text-foreground-muted">
            {isWork ? taskTitle ?? PHASE_LABELS.work : PHASE_LABELS[phase]}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={status === 'running' ? 'Pause' : 'Resume'}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {status === 'running' ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip to next interval"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
