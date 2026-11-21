import type { BlockCategory, TaskPriority } from '../../../lib/timetable/engine';

export const CATEGORY_BLOCK_CLASSES: Record<BlockCategory, string> = {
  'deep-work':
    'border-primary-tint-border bg-primary-tint text-on-primary-tint hover:border-primary',
  study:
    'border-primary-tint-border bg-primary-tint text-on-primary-tint hover:border-primary',
  work:
    'border-border bg-surface-card text-foreground hover:border-border-hover',
  health:
    'border-success-border bg-success-tint text-on-success-tint hover:border-success',
  reading:
    'border-success-border bg-success-tint/70 text-on-success-tint hover:border-success',
  family:
    'border-primary-tint-border/80 bg-surface-elevated text-foreground hover:border-primary',
  meal:
    'border-border bg-surface-card text-foreground hover:border-border-hover',
  commute:
    'border-border bg-surface-inset text-foreground-muted hover:border-border-hover',
  buffer:
    'border-dashed border-border-hover bg-surface-inset/75 text-foreground-muted hover:border-primary',
  sleep:
    'border-border-subtle bg-surface-inset/50 text-foreground-subtle hover:border-border',
};

export const CATEGORY_DOT_CLASSES: Record<BlockCategory, string> = {
  'deep-work': 'bg-primary',
  study: 'bg-primary',
  work: 'bg-foreground',
  health: 'bg-success',
  reading: 'bg-success',
  family: 'bg-primary',
  meal: 'bg-foreground-muted',
  commute: 'bg-foreground-subtle',
  buffer: 'bg-foreground-subtle',
  sleep: 'bg-foreground-subtle',
};

export const PRIORITY_BADGE_CLASSES: Record<TaskPriority, string> = {
  P1: 'border-destructive-border bg-destructive-tint text-on-destructive-tint',
  P2: 'border-primary-tint-border bg-primary-tint text-on-primary-tint',
  P3: 'border-success-border bg-success-tint text-on-success-tint',
  P4: 'border-border bg-surface-inset text-foreground-muted',
};

