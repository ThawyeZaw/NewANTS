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

/** Crisp 1px card outline distinction (calm hairline borders with subtle priority distinction). */
export const PRIORITY_CARD_CLASSES: Record<TaskPriority, string> = {
  P1: 'border-destructive-border/70 bg-surface-card hover:border-destructive/60 transition-colors',
  P2: 'border-primary-tint-border/60 bg-surface-card hover:border-primary/50 transition-colors',
  P3: 'border-border/60 bg-surface-card hover:border-border transition-colors',
  P4: 'border-border/50 bg-surface-card hover:border-border transition-colors',
};

export const PRIORITY_DOT_CLASSES: Record<TaskPriority, string> = {
  P1: 'bg-destructive',
  P2: 'bg-primary',
  P3: 'bg-success',
  P4: 'bg-foreground-subtle',
};

