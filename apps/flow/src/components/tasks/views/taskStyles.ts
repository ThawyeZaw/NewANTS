import type { TaskPriority } from '../../../lib/timetable/engine';
import { PRIORITY_BADGE_CLASSES } from '../../timetable/views/timetableStyles';

export { PRIORITY_BADGE_CLASSES };

/** TickTick-style priority completion ring classes (border + subtle fill tint on hover/rest). */
export const PRIORITY_CHECKBOX_CLASSES: Record<TaskPriority, string> = {
  P1: 'border-destructive bg-destructive-tint/60 text-destructive hover:bg-destructive-tint',
  P2: 'border-primary bg-primary-tint/60 text-primary hover:bg-primary-tint',
  P3: 'border-success bg-success-tint/50 text-success hover:bg-success-tint',
  P4: 'border-border-hover bg-surface-inset/50 text-foreground-muted hover:border-foreground-muted',
};

/** Checked completion state matching the task's semantic priority tone. */
export const PRIORITY_CHECKED_CLASSES: Record<TaskPriority, string> = {
  P1: 'border-destructive bg-destructive text-on-destructive',
  P2: 'border-primary bg-primary text-on-primary',
  P3: 'border-success bg-success text-on-success',
  P4: 'border-foreground-muted bg-foreground-muted text-background',
};

/** Crisp 1px card outline distinction (zero heavy border-left stripes or stacked drop shadows). */
export const PRIORITY_CARD_CLASSES: Record<TaskPriority, string> = {
  P1: 'border-destructive-border bg-surface-card hover:border-destructive',
  P2: 'border-primary-tint-border bg-surface-card hover:border-primary',
  P3: 'border-border bg-surface-card hover:border-success-border',
  P4: 'border-border bg-surface-card hover:border-border-hover',
};

export const PRIORITY_DOT_CLASSES: Record<TaskPriority, string> = {
  P1: 'bg-destructive',
  P2: 'bg-primary',
  P3: 'bg-success',
  P4: 'bg-foreground-subtle',
};

