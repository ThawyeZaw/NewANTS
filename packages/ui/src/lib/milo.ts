import type { EcosystemAppId } from '../mocks/ecosystem-chrome.mock';
import type { AntMascotMood, AntMascotPropVariant } from '../views/AntMascotView';

export const MILO_COMPANION_STORAGE_KEY = 'ants-milo-companion-v1';
export const ANTS_MILO_CHEER_EVENT = 'ants-milo-cheer';

export type MiloDockEdge = 'left' | 'right';

export interface MiloDockPosition {
  edge: MiloDockEdge;
  bottomPx: number;
}

export interface MiloCompanionPrefs {
  minimized: boolean;
  quiet: boolean;
  position?: MiloDockPosition | null;
}

export interface MiloCheerPayload {
  message: string;
  mood?: AntMascotMood;
  propVariant?: AntMascotPropVariant;
  badge?: string;
  durationMs?: number;
}

export interface MiloStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const DEFAULT_MILO_COMPANION_PREFS: MiloCompanionPrefs = {
  minimized: false,
  quiet: false,
};

export const MILO_DRAG_QUIPS: readonly string[] = [
  'Wheee! New perch unlocked!',
  'Ooh, cozy corner! Double-tap me to hop home.',
  'Good view from here—ready when you are!',
];

export interface ClampMiloDragPositionInput {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
  dockSize: number;
  edgeMargin?: number;
  topMargin?: number;
  bottomMargin?: number;
}

export interface ClampedMiloDragResult {
  left: number;
  top: number;
  edge: MiloDockEdge;
  bottomPx: number;
}

/**
 * Clamps drag coordinates cleanly inside the visible viewport and computes the
 * nearest horizontal edge (`left` | `right`) + bottom offset for persistence.
 */
export function clampMiloDragPosition({
  x,
  y,
  viewportWidth,
  viewportHeight,
  dockSize,
  edgeMargin = 14,
  topMargin = 68,
  bottomMargin = 16,
}: ClampMiloDragPositionInput): ClampedMiloDragResult {
  const maxLeft = Math.max(edgeMargin, viewportWidth - dockSize - edgeMargin);
  const maxTop = Math.max(topMargin, viewportHeight - dockSize - bottomMargin);
  const left = Math.round(Math.min(maxLeft, Math.max(edgeMargin, x)));
  const top = Math.round(Math.min(maxTop, Math.max(topMargin, y)));
  const edge: MiloDockEdge = left + dockSize / 2 < viewportWidth / 2 ? 'left' : 'right';
  const bottomPx = Math.max(bottomMargin, Math.round(viewportHeight - (top + dockSize)));
  return { left, top, edge, bottomPx };
}

function sanitizeMiloDockPosition(raw: unknown): MiloDockPosition | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as Partial<MiloDockPosition>;
  if (candidate.edge !== 'left' && candidate.edge !== 'right') return undefined;
  if (
    typeof candidate.bottomPx !== 'number' ||
    !Number.isFinite(candidate.bottomPx) ||
    candidate.bottomPx < 0
  ) {
    return undefined;
  }
  return {
    edge: candidate.edge,
    bottomPx: Math.round(candidate.bottomPx),
  };
}

function resolveMiloStorage(storage?: MiloStorageLike | null): MiloStorageLike | null {
  if (storage !== undefined) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadMiloCompanionPrefs(
  storage?: MiloStorageLike | null
): MiloCompanionPrefs {
  const store = resolveMiloStorage(storage);
  if (!store) return { ...DEFAULT_MILO_COMPANION_PREFS };
  try {
    const raw = store.getItem(MILO_COMPANION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MILO_COMPANION_PREFS };
    const parsed = JSON.parse(raw) as Partial<MiloCompanionPrefs> | null;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_MILO_COMPANION_PREFS };
    }
    const position = sanitizeMiloDockPosition(parsed.position);
    return position
      ? {
          minimized: Boolean(parsed.minimized),
          quiet: Boolean(parsed.quiet),
          position,
        }
      : {
          minimized: Boolean(parsed.minimized),
          quiet: Boolean(parsed.quiet),
        };
  } catch {
    return { ...DEFAULT_MILO_COMPANION_PREFS };
  }
}

export function saveMiloCompanionPrefs(
  prefs: MiloCompanionPrefs,
  storage?: MiloStorageLike | null
): void {
  const store = resolveMiloStorage(storage);
  if (!store) return;
  try {
    const position = sanitizeMiloDockPosition(prefs.position);
    const payload: MiloCompanionPrefs = {
      minimized: Boolean(prefs.minimized),
      quiet: Boolean(prefs.quiet),
      ...(position ? { position } : {}),
    };
    store.setItem(MILO_COMPANION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore restricted storage errors
  }
}

export function emitMiloCheer(payload: MiloCheerPayload): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent<MiloCheerPayload>(ANTS_MILO_CHEER_EVENT, { detail: payload })
    );
  } catch {
    // Ignore custom event errors
  }
}

export interface RouteMiloQuipSet {
  mood: AntMascotMood;
  propVariant: AntMascotPropVariant;
  lines: readonly string[];
}

export function getRouteMiloQuips(
  app: EcosystemAppId,
  pathname = '/'
): RouteMiloQuipSet {
  const clean = pathname.split('?')[0] || '/';

  if (app === 'org') {
    if (clean.startsWith('/calculator')) {
      return {
        mood: 'studying',
        propVariant: 'pencil',
        lines: [
          'Slide your paper marks—Milo updates every UMS boundary live.',
          'Aim for the next grade boundary—one strong paper swings totals fast!',
        ],
      };
    }
    if (clean.startsWith('/team')) {
      return {
        mood: 'nudge',
        propVariant: 'bell',
        lines: [
          'Check any tutor’s Sun–Sat grid and message them on Telegram.',
          'Every verified slot opens a prefilled Telegram booking note.',
        ],
      };
    }
    if (clean.startsWith('/activities')) {
      return {
        mood: 'happy',
        propVariant: 'pencil',
        lines: [
          'Tutoring tables, student meets, and hackathons—explore what’s open.',
          'Tap any activity album to browse real session photos.',
        ],
      };
    }
    if (clean.startsWith('/articles')) {
      return {
        mood: 'studying',
        propVariant: 'scholar',
        lines: [
          'Grab a mug and read one concise study guide before revising.',
          'Practical exam strategies written by our tutors and top scorers.',
        ],
      };
    }
    return {
      mood: 'happy',
      propVariant: 'pencil',
      lines: [
        'Small daily habits, colony-sized results! Explore Study & Flow anytime.',
        'Need marks checked? The Grade Calculator works with zero login.',
      ],
    };
  }

  if (app === 'study') {
    if (clean.startsWith('/curriculum')) {
      return {
        mood: 'studying',
        propVariant: 'scholar',
        lines: [
          'Tick off one subtopic at a time—consistency beats cramming.',
          'Master a syllabus topic for +10 XP and clearer weak-spot tracking.',
        ],
      };
    }
    if (clean.startsWith('/past-papers')) {
      return {
        mood: 'studying',
        propVariant: 'pencil',
        lines: [
          'Every timed past paper logged builds real exam-hall pacing.',
          'Check UMS patterns across variants to spot high-yield chapters.',
        ],
      };
    }
    if (clean.startsWith('/flashcards')) {
      return {
        mood: 'happy',
        propVariant: 'scholar',
        lines: [
          'Active recall first—flip only after testing your memory!',
          'Clearing due cards keeps spaced-repetition intervals sharp.',
        ],
      };
    }
    if (clean.startsWith('/quizzes')) {
      return {
        mood: 'focus',
        propVariant: 'scholar',
        lines: [
          'Show your working cleanly—Milo’s cheering every step!',
          'Wrong answers are gold—retry mistakes right after grading.',
        ],
      };
    }
    if (clean.startsWith('/notes')) {
      return {
        mood: 'studying',
        propVariant: 'pencil',
        lines: [
          'Turn tricky formulas into quick checklists you can revise fast.',
          'Short, clear summary notes stick way better than wall-of-text copies.',
        ],
      };
    }
    if (clean.startsWith('/countdown')) {
      return {
        mood: 'nudge',
        propVariant: 'bell',
        lines: [
          'Pin your nearest sitting and sync it straight to Flow Timetable.',
          'Steady weekly sprints keep countdown nerves calm and focused.',
        ],
      };
    }
    if (clean.startsWith('/leaderboard')) {
      return {
        mood: 'celebrating',
        propVariant: 'pencil',
        lines: [
          'You vs. yesterday’s habit—every past paper & check-in adds XP.',
          'Prefer quiet study? Toggle Private Study Mode anytime.',
        ],
      };
    }
    if (clean.startsWith('/calculator')) {
      return {
        mood: 'studying',
        propVariant: 'pencil',
        lines: [
          'Test target paper marks and save snapshots straight to Study.',
          'Small mark gains across papers add up quickly in UMS!',
        ],
      };
    }
    return {
      mood: 'happy',
      propVariant: 'scholar',
      lines: [
        'Log one quick daily check-in to keep your Study streak glowing!',
        'Ready for a sprint? Pick an enrolled subject or past paper next.',
      ],
    };
  }

  // Flow
  if (clean.startsWith('/tasks')) {
    return {
      mood: 'focus',
      propVariant: 'pencil',
      lines: [
        'Tackle one P1 priority first—small wins unlock the whole day.',
        'Type !P1 #tag @today ~2p in Quick Add to sort tasks fast.',
      ],
    };
  }
  if (clean.startsWith('/timetable')) {
    return {
      mood: 'happy',
      propVariant: 'timer',
      lines: [
        'Leave 15-minute buffers between blocks so your day breathes.',
        'Click any block to arm a Telegram Cron ping or launch Pomodoro.',
      ],
    };
  }
  if (clean.startsWith('/focus')) {
    return {
      mood: 'focus',
      propVariant: 'headphones',
      lines: [
        'Pick one top priority, protect the block, and start your clock.',
        'Balance deep sprints with rest—Milo’s keeping time with you.',
      ],
    };
  }
  if (clean.startsWith('/settings')) {
    return {
      mood: 'nudge',
      propVariant: 'bell',
      lines: [
        'Link @TheANTsFlowBot once so timetable alerts reach Telegram automatically.',
        'Your Study & Flow preferences sync under one .the-ants.org account.',
      ],
    };
  }
  return {
    mood: 'focus',
    propVariant: 'headphones',
    lines: [
      'Headphones on—25 minutes of calm focus beats two hours of multitasking.',
      'Hit Space to start or pause your clock anytime.',
    ],
  };
}
