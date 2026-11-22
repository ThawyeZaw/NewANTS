import type { BlockCategory, TaskPriority } from '../../../lib/timetable/engine';

export const CATEGORY_BLOCK_CLASSES: Record<BlockCategory, string> = {
  'deep-work':
    'border-amber-300/80 dark:border-amber-600/40 border-l-[3.5px] border-l-amber-500 bg-amber-500/10 dark:bg-amber-500/15 text-amber-950 dark:text-amber-100 hover:border-amber-400 dark:hover:border-amber-500/60 shadow-[0_1px_2px_rgba(245,158,11,0.06)]',
  study:
    'border-indigo-300/80 dark:border-indigo-600/40 border-l-[3.5px] border-l-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-950 dark:text-indigo-100 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-[0_1px_2px_rgba(99,102,241,0.06)]',
  work:
    'border-sky-300/80 dark:border-sky-600/40 border-l-[3.5px] border-l-sky-500 bg-sky-500/10 dark:bg-sky-500/15 text-sky-950 dark:text-sky-100 hover:border-sky-400 dark:hover:border-sky-500/60 shadow-[0_1px_2px_rgba(14,165,233,0.06)]',
  health:
    'border-emerald-300/80 dark:border-emerald-600/40 border-l-[3.5px] border-l-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 hover:border-emerald-400 dark:hover:border-emerald-500/60 shadow-[0_1px_2px_rgba(16,185,129,0.06)]',
  reading:
    'border-teal-300/80 dark:border-teal-600/40 border-l-[3.5px] border-l-teal-500 bg-teal-500/10 dark:bg-teal-500/15 text-teal-950 dark:text-teal-100 hover:border-teal-400 dark:hover:border-teal-500/60 shadow-[0_1px_2px_rgba(20,184,166,0.06)]',
  family:
    'border-rose-300/80 dark:border-rose-600/40 border-l-[3.5px] border-l-rose-500 bg-rose-500/10 dark:bg-rose-500/15 text-rose-950 dark:text-rose-100 hover:border-rose-400 dark:hover:border-rose-500/60 shadow-[0_1px_2px_rgba(244,63,94,0.06)]',
  meal:
    'border-orange-300/80 dark:border-orange-600/40 border-l-[3.5px] border-l-orange-500 bg-orange-500/10 dark:bg-orange-500/15 text-orange-950 dark:text-orange-100 hover:border-orange-400 dark:hover:border-orange-500/60 shadow-[0_1px_2px_rgba(249,115,22,0.06)]',
  commute:
    'border-violet-300/80 dark:border-violet-600/40 border-l-[3.5px] border-l-violet-500 bg-violet-500/10 dark:bg-violet-500/15 text-violet-950 dark:text-violet-100 hover:border-violet-400 dark:hover:border-violet-500/60 shadow-[0_1px_2px_rgba(139,92,246,0.06)]',
  buffer:
    'border-dashed border-slate-300/90 dark:border-slate-700 border-l-[3.5px] border-l-slate-400 dark:border-l-slate-500 bg-slate-500/10 dark:bg-slate-500/15 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600',
  sleep:
    'border-slate-200 dark:border-slate-800 border-l-[3.5px] border-l-indigo-400/80 dark:border-l-indigo-400/60 bg-slate-500/[0.06] dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700',
};

export const CATEGORY_PILL_CLASSES: Record<BlockCategory, string> = {
  'deep-work': 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/30',
  study: 'bg-indigo-500/20 text-indigo-900 dark:text-indigo-200 border-indigo-500/30',
  work: 'bg-sky-500/20 text-sky-900 dark:text-sky-200 border-sky-500/30',
  health: 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/30',
  reading: 'bg-teal-500/20 text-teal-900 dark:text-teal-200 border-teal-500/30',
  family: 'bg-rose-500/20 text-rose-900 dark:text-rose-200 border-rose-500/30',
  meal: 'bg-orange-500/20 text-orange-900 dark:text-orange-200 border-orange-500/30',
  commute: 'bg-violet-500/20 text-violet-900 dark:text-violet-200 border-violet-500/30',
  buffer: 'bg-slate-500/20 text-slate-800 dark:text-slate-200 border-slate-500/30',
  sleep: 'bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-800 dark:text-indigo-300 border-indigo-500/25',
};

export const CATEGORY_DOT_CLASSES: Record<BlockCategory, string> = {
  'deep-work': 'bg-amber-500',
  study: 'bg-indigo-500',
  work: 'bg-sky-500',
  health: 'bg-emerald-500',
  reading: 'bg-teal-500',
  family: 'bg-rose-500',
  meal: 'bg-orange-500',
  commute: 'bg-violet-500',
  buffer: 'bg-slate-400',
  sleep: 'bg-indigo-400',
};

export const PRIORITY_BADGE_CLASSES: Record<TaskPriority, string> = {
  P1: 'border-destructive-border bg-destructive-tint text-on-destructive-tint',
  P2: 'border-primary-tint-border bg-primary-tint text-on-primary-tint',
  P3: 'border-success-border bg-success-tint text-on-success-tint',
  P4: 'border-border bg-surface-inset text-foreground-muted',
};
