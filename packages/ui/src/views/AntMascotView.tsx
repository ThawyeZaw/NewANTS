'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../utils/cn';

/** Official name of The ANTs brand mascot */
export const ANT_MASCOT_NAME = 'Milo';

export type AntMascotMood =
  | 'idle'
  | 'happy'
  | 'celebrating'
  | 'studying'
  | 'focus'
  | 'nudge'
  | 'sleeping'
  | 'curious';

export type AntMascotApp = 'org' | 'study' | 'flow' | 'telegram';

export type AntMascotPropVariant =
  | 'pencil'
  | 'headphones'
  | 'scholar'
  | 'timer'
  | 'bell'
  | 'magnifier'
  | 'pillow'
  | 'none';

export type AntMascotVariant = 'full' | 'avatar';

export type AntMascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface AntMascotProps {
  /** Emotional expression & pose of Milo */
  mood?: AntMascotMood;
  /** Ecosystem app context used to infer signature accessories when propVariant is omitted */
  app?: AntMascotApp;
  /** Explicit signature prop override (defaults to smart pairing by app & mood) */
  propVariant?: AntMascotPropVariant;
  /** Visual presentation: full character illustration or compact head-only app-icon avatar */
  variant?: AntMascotVariant;
  /** Visual size preset or pixel dimension */
  size?: AntMascotSize;
  /** Optional Duolingo-style speech bubble message */
  speech?: string;
  /** Optional extra quips cycled when interactive is enabled and the user taps Milo */
  tapLines?: readonly string[];
  /** Speech bubble placement relative to the mascot */
  speechPosition?: 'top' | 'right' | 'left';
  /** Optional status pill badge rendered beneath the mascot (e.g. "14-day streak") */
  badge?: string;
  /** Enable gentle idle/celebration motion (automatically disabled under prefers-reduced-motion) */
  animated?: boolean;
  /** Enable playful hover/tap spring response */
  interactive?: boolean;
  /** Optional callback fired when Milo is tapped/clicked (when interactive is true) */
  onTap?: () => void;
  /** Accessible label for screen readers (set empty string for decorative usage) */
  ariaLabel?: string;
  /** Additional wrapper classes */
  className?: string;
}

const SIZE_MAP: Record<Exclude<AntMascotSize, number>, number> = {
  xs: 40,
  sm: 64,
  md: 104,
  lg: 148,
  xl: 204,
};

export interface AntMascotPreset {
  mood: AntMascotMood;
  app: AntMascotApp;
  propVariant: AntMascotPropVariant;
  speech: string;
  badge?: string;
}

export type AntMascotPresetKey =
  | 'studyStreak'
  | 'studyEmpty'
  | 'flowPomodoroStart'
  | 'flowPomodoroBreak'
  | 'telegramNudge'
  | 'authWelcome'
  | 'notFound'
  | 'orgHero'
  | 'emptySearch'
  | 'flashcardsCleared'
  | 'quizCelebration'
  | 'calculatorTop';

/**
 * Curated Duolingo-inspired warm, cheeky & encouraging presets
 * for Milo across The ANTs ecosystem.
 */
export const ANT_MASCOT_PRESETS: Record<AntMascotPresetKey, AntMascotPreset> = {
  studyStreak: {
    mood: 'celebrating',
    app: 'study',
    propVariant: 'pencil',
    speech: 'Streak secured! Milo says you’re one past paper closer to that A*.',
    badge: 'Streak Active',
  },
  studyEmpty: {
    mood: 'curious',
    app: 'study',
    propVariant: 'scholar',
    speech: 'No topics tracked yet—pick your first syllabus and sharpen up with Milo!',
  },
  flowPomodoroStart: {
    mood: 'focus',
    app: 'flow',
    propVariant: 'headphones',
    speech: 'Headphones on. 25 minutes of pure Flow—Milo’s guarding the clock.',
    badge: '25:00 Focus',
  },
  flowPomodoroBreak: {
    mood: 'sleeping',
    app: 'flow',
    propVariant: 'timer',
    speech: 'Nice session! Stretch, hydrate, and recharge with Milo for 5 minutes.',
    badge: 'Break Time',
  },
  telegramNudge: {
    mood: 'nudge',
    app: 'telegram',
    propVariant: 'bell',
    speech: 'Psst… your block starts in 15 mins. Milo’s tapping the glass!',
    badge: '@TheANTsFlowBot',
  },
  authWelcome: {
    mood: 'happy',
    app: 'org',
    propVariant: 'pencil',
    speech: 'Milo says welcome back! One sign-in unlocks Study and Flow together.',
  },
  notFound: {
    mood: 'curious',
    app: 'org',
    propVariant: 'pencil',
    speech: 'Hmm, Milo’s antennae can’t find this page. Let’s head back to the colony!',
  },
  orgHero: {
    mood: 'happy',
    app: 'org',
    propVariant: 'pencil',
    speech: 'Small daily habits, colony-sized results.',
  },
  emptySearch: {
    mood: 'curious',
    app: 'org',
    propVariant: 'magnifier',
    speech: 'Milo checked every trail, but nothing matched those filters.',
  },
  flashcardsCleared: {
    mood: 'celebrating',
    app: 'study',
    propVariant: 'pencil',
    speech: 'Deck cleared! Milo’s buzzing about that recall streak.',
    badge: 'Deck Cleared',
  },
  quizCelebration: {
    mood: 'celebrating',
    app: 'study',
    propVariant: 'scholar',
    speech: 'Graded and logged—great work sharpening those exam habits!',
  },
  calculatorTop: {
    mood: 'celebrating',
    app: 'org',
    propVariant: 'pencil',
    speech: 'Strong cushion above the top boundary—keep that momentum!',
  },
};

export function resolveMascotSize(size: AntMascotSize): number {
  return typeof size === 'number' ? size : SIZE_MAP[size];
}

export function resolveMascotPropVariant(
  app: AntMascotApp,
  mood: AntMascotMood,
  explicit?: AntMascotPropVariant
): AntMascotPropVariant {
  if (explicit) return explicit;
  if (mood === 'focus' || (app === 'flow' && mood !== 'sleeping')) return 'headphones';
  if (mood === 'sleeping' && app === 'flow') return 'timer';
  if (app === 'telegram' || mood === 'nudge') return 'bell';
  if (mood === 'studying' || (app === 'study' && mood === 'curious')) return 'scholar';
  return 'pencil';
}

function StarCatchlight({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const inner = r * 0.34;
  return (
    <path
      d={`M ${cx} ${cy - r} Q ${cx + inner} ${cy - inner} ${cx + r} ${cy} Q ${cx + inner} ${cy + inner} ${cx} ${cy + r} Q ${cx - inner} ${cy + inner} ${cx - r} ${cy} Q ${cx - inner} ${cy - inner} ${cx} ${cy - r} Z`}
      fill="#FFFFFF"
    />
  );
}

function MiloCurledAntennae({
  mood,
  animated,
  yOffset = 0,
}: {
  mood: AntMascotMood;
  animated: boolean;
  yOffset?: number;
}) {
  const isSleep = mood === 'sleeping';
  return (
    <g className={animated ? 'ants-mascot-antenna' : undefined} transform={`translate(0 ${yOffset})`}>
      {/* Left curled spiral antenna */}
      <path
        d={
          isSleep
            ? 'M81 49 C72 34, 54 34, 52 44 C50 51, 60 52, 62 46'
            : mood === 'nudge'
              ? 'M81 49 C74 22, 54 17, 50 28 C47 36, 59 40, 62 32'
              : 'M81 49 C73 24, 52 21, 49 32 C47 40, 58 43, 61 36'
        }
        stroke="#D97706"
        strokeWidth="5.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle
        cx={isSleep ? '62' : mood === 'nudge' ? '62' : '61'}
        cy={isSleep ? '46' : mood === 'nudge' ? '32' : '36'}
        r="3.2"
        fill="#FBBF24"
      />

      {/* Right curled spiral antenna */}
      <path
        d={
          isSleep
            ? 'M115 49 C124 34, 142 34, 144 44 C146 51, 136 52, 134 46'
            : mood === 'celebrating'
              ? 'M115 49 C124 20, 146 18, 149 29 C151 37, 139 41, 137 33'
              : 'M115 49 C123 24, 144 21, 147 32 C149 40, 138 43, 135 36'
        }
        stroke="#D97706"
        strokeWidth="5.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle
        cx={isSleep ? '134' : mood === 'celebrating' ? '137' : '135'}
        cy={isSleep ? '46' : mood === 'celebrating' ? '33' : '36'}
        r="3.2"
        fill="#FBBF24"
      />
    </g>
  );
}

function MiloEyesAndMouth({
  mood,
  resolvedProp,
  animated = true,
}: {
  mood: AntMascotMood;
  resolvedProp: AntMascotPropVariant;
  animated?: boolean;
}) {
  const showOpenSmile =
    mood === 'celebrating' ||
    mood === 'happy' ||
    mood === 'idle' ||
    mood === 'studying' ||
    mood === 'curious' ||
    mood === 'nudge';

  return (
    <>
      {/* Warm Rosy Cheeks */}
      <ellipse cx="69" cy="95" rx="7.8" ry="4.5" fill="#FB7185" fillOpacity="0.52" />
      <ellipse cx="127" cy="95" rx="7.8" ry="4.5" fill="#FB7185" fillOpacity="0.52" />

      {/* Eyes by Mood */}
      {mood === 'celebrating' ? (
        <g stroke="#1E293B" strokeWidth="4.4" strokeLinecap="round" fill="none">
          <path d="M74 84 Q83 72 92 84" />
          <path d="M104 84 Q113 72 122 84" />
        </g>
      ) : mood === 'sleeping' ? (
        <g stroke="#1E293B" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M74 84 Q83 91 92 84" />
          <path d="M104 84 Q113 91 122 84" />
        </g>
      ) : mood === 'nudge' ? (
        /* Playful Cheerful Wink */
        <g>
          <ellipse cx="83" cy="82" rx="11.5" ry="12.2" fill="#FFFFFF" />
          <circle cx="84.2" cy="82.5" r="8.2" fill="#1E293B" />
          <StarCatchlight cx={86.8} cy={79.5} r={3.6} />
          <circle cx="80.8" cy="86.2" r="1.5" fill="#FFFFFF" />
          <path
            d="M104 83 Q113 74 122 83"
            stroke="#1E293B"
            strokeWidth="4.2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ) : (
        <g>
          <g className={animated ? 'ants-mascot-blink' : undefined}>
            {/* Left glossy eye with 4-point star catchlight */}
            <ellipse
              cx="83"
              cy="82"
              rx={mood === 'curious' ? '12.2' : '11.4'}
              ry={mood === 'curious' ? '12.8' : '12.2'}
              fill="#FFFFFF"
            />
            <circle cx="84.2" cy="82.5" r="8.2" fill="#1E293B" />
            <StarCatchlight cx={86.8} cy={79.5} r={3.6} />
            <circle cx="80.8" cy="86.2" r="1.5" fill="#FFFFFF" />

            {/* Right glossy eye with 4-point star catchlight */}
            <ellipse cx="113" cy="82" rx="11.4" ry="12.2" fill="#FFFFFF" />
            <circle cx="111.8" cy="82.5" r="8.2" fill="#1E293B" />
            <StarCatchlight cx={114.4} cy={79.5} r={3.6} />
            <circle cx="108.4" cy="86.2" r="1.5" fill="#FFFFFF" />
          </g>

          {/* Focused gentle eyebrows stay still during eye blinks */}
          {mood === 'focus' && (
            <>
              <path
                d="M73 67.5 Q83 64.5 92 68.5"
                stroke="#B45309"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M123 67.5 Q113 64.5 104 68.5"
                stroke="#B45309"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}
        </g>
      )}

      {/* Study Scholar Glasses Accessory */}
      {resolvedProp === 'scholar' && (
        <g stroke="#334155" strokeWidth="3.2" fill="none">
          <circle cx="83" cy="82" r="14" />
          <circle cx="113" cy="82" r="14" />
          <line x1="97" y1="82" x2="99" y2="82" />
          <path d="M62 80 L69 81" strokeLinecap="round" />
          <path d="M127 81 L134 80" strokeLinecap="round" />
        </g>
      )}

      {/* Mouth by Mood */}
      {showOpenSmile ? (
        <g>
          <path d="M87 98 Q98 113 109 98 Z" fill="#78350F" />
          <path d="M91 104 Q98 101 105 104 Q98 109 91 104 Z" fill="#FB7185" />
          <path
            d="M87 98 Q98 100 109 98"
            stroke="#78350F"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ) : mood === 'sleeping' ? (
        <path
          d="M93 100 Q98 105 103 100"
          stroke="#78350F"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        /* Upbeat confident smile for Focus */
        <path
          d="M87 99 Q98 108 109 99"
          stroke="#78350F"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </>
  );
}

export function AntMascotView({
  mood = 'idle',
  app = 'org',
  propVariant,
  variant = 'full',
  size = 'md',
  speech,
  tapLines,
  speechPosition = 'top',
  badge,
  animated = true,
  interactive = false,
  onTap,
  ariaLabel,
  className,
}: AntMascotProps) {
  const gradientUid = useId().replace(/:/g, '');
  const [tapIndex, setTapIndex] = useState(0);
  const [isHopping, setIsHopping] = useState(false);
  const hopTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hopTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(hopTimeoutRef.current);
      }
    };
  }, []);

  const px = resolveMascotSize(size);
  const resolvedProp = resolveMascotPropVariant(app, mood, propVariant);
  const isDecorative = ariaLabel === '';
  const label = ariaLabel ?? `${ANT_MASCOT_NAME}, The ANTs mascot (${mood})`;

  const speechCycle =
    speech && tapLines && tapLines.length > 0 ? [speech, ...tapLines] : speech ? [speech] : [];
  const activeSpeech =
    speechCycle.length > 0 ? speechCycle[tapIndex % speechCycle.length] : undefined;

  const handleMascotTap = () => {
    if (interactive) {
      setIsHopping(false);
      if (typeof window !== 'undefined') {
        if (hopTimeoutRef.current !== null) {
          window.clearTimeout(hopTimeoutRef.current);
        }
        window.requestAnimationFrame(() => setIsHopping(true));
        hopTimeoutRef.current = window.setTimeout(() => {
          setIsHopping(false);
          hopTimeoutRef.current = null;
        }, 400);
      }
      if (speechCycle.length > 1) {
        setTapIndex((prev) => prev + 1);
      }
    }
    onTap?.();
  };

  const motionClass = !animated
    ? ''
    : mood === 'celebrating'
      ? 'ants-mascot-celebrate'
      : 'ants-mascot-float';

  const layoutClass =
    speechPosition === 'right'
      ? 'flex-row items-center gap-3.5'
      : speechPosition === 'left'
        ? 'flex-row-reverse items-center gap-3.5'
        : 'flex-col items-center gap-2.5';

  const svgNode =
    variant === 'avatar' ? (
      <svg
        width={px}
        height={px}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role={isDecorative ? undefined : 'img'}
        aria-label={isDecorative ? undefined : label}
        aria-hidden={isDecorative ? 'true' : undefined}
        className={cn('overflow-visible', motionClass, isHopping && 'ants-mascot-hop')}
      >
        <defs>
          <linearGradient id={`milo-badge-bg-${gradientUid}`} x1="20" y1="16" x2="180" y2="188" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="55%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Rounded App-Icon Badge Backdrop */}
        <rect
          x="10"
          y="10"
          width="180"
          height="180"
          rx="44"
          fill={`url(#milo-badge-bg-${gradientUid})`}
          stroke="#F59E0B"
          strokeWidth="4"
        />
        <rect
          x="18"
          y="18"
          width="164"
          height="164"
          rx="38"
          stroke="#FEF08A"
          strokeOpacity="0.6"
          strokeWidth="2.5"
          fill="none"
        />

        <g transform="translate(2, 22)">
          <MiloCurledAntennae mood={mood} animated={animated} yOffset={0} />

          {/* Sunlit Head Silhouette */}
          <ellipse cx="98" cy="84" rx="46" ry="39" fill="#FBBF24" stroke="#FEF08A" strokeWidth="2.5" />
          <ellipse cx="98" cy="59" rx="25" ry="9" fill="#FEF08A" fillOpacity="0.65" />

          {/* Compact Headphones Arc */}
          {resolvedProp === 'headphones' && (
            <g>
              <path
                d="M52 82 C52 38 144 38 144 82"
                stroke="#334155"
                strokeWidth="7.5"
                strokeLinecap="round"
                fill="none"
              />
              <rect x="44" y="72" width="12" height="24" rx="6" fill="#334155" />
              <rect x="140" y="72" width="12" height="24" rx="6" fill="#334155" />
            </g>
          )}

          <MiloEyesAndMouth mood={mood} resolvedProp={resolvedProp} animated={animated} />
        </g>

        {/* Tiny Telegram Alert Badge Dot */}
        {resolvedProp === 'bell' && (
          <circle cx="164" cy="36" r="14" fill="#FB7185" stroke="#FFFFFF" strokeWidth="4" />
        )}
      </svg>
    ) : (
      <svg
        width={px}
        height={px}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role={isDecorative ? undefined : 'img'}
        aria-label={isDecorative ? undefined : label}
        aria-hidden={isDecorative ? 'true' : undefined}
        className={cn('overflow-visible', motionClass, isHopping && 'ants-mascot-hop')}
      >
        {/* Ground shadow */}
        <ellipse
          cx="96"
          cy="182"
          rx={mood === 'celebrating' ? '34' : '44'}
          ry="7.5"
          fill="#0F172A"
          fillOpacity="0.1"
        />

        {/* Blissful Rest Cushion Prop behind Milo */}
        {resolvedProp === 'pillow' && (
          <g>
            <rect
              x="28"
              y="124"
              width="126"
              height="52"
              rx="22"
              transform="rotate(-7 91 150)"
              fill="#FEF3C7"
              stroke="#FDE68A"
              strokeWidth="3"
            />
            <path
              d="M36 140 Q60 148 84 142"
              stroke="#FCD34D"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* Positive ambient sparkles & confetti for celebrating / happy */}
        {(mood === 'celebrating' || mood === 'happy') && (
          <g className={animated ? 'ants-mascot-sparkle' : undefined}>
            <path
              d="M34 44 L37 52 L45 55 L37 58 L34 66 L31 58 L23 55 L31 52 Z"
              fill="#FBBF24"
            />
            <path
              d="M166 36 L168.5 42 L175 44.5 L168.5 47 L166 53 L163.5 47 L157 44.5 L163.5 42 Z"
              fill="#FDE047"
            />
            {mood === 'celebrating' && (
              <>
                <circle cx="152" cy="70" r="3.6" fill="#FB7185" />
                <circle cx="44" cy="90" r="3.4" fill="#34D399" />
                <path
                  d="M28 74 Q22 68 29 63"
                  stroke="#F59E0B"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M166 72 Q173 66 168 59"
                  stroke="#38BDF8"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  fill="none"
                />
              </>
            )}
          </g>
        )}

        {/* Scholar Lightbulb Idea Spark */}
        {mood === 'studying' && (
          <g transform="translate(150, 26)" className={animated ? 'ants-mascot-sparkle' : undefined}>
            <circle cx="12" cy="12" r="9" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2" />
            <rect x="8.5" y="21" width="7" height="4" rx="1.5" fill="#94A3B8" />
            <line x1="12" y1="-2" x2="12" y2="1" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
            <line x1="23" y1="12" x2="26" y2="12" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* Sleeping Zzz */}
        {mood === 'sleeping' && (
          <g
            className={animated ? 'ants-mascot-zzz' : undefined}
            fill="#F59E0B"
            fontFamily="var(--font-sans, sans-serif)"
            fontWeight="800"
          >
            <text x="136" y="64" fontSize="14">
              z
            </text>
            <text x="148" y="50" fontSize="18">
              Z
            </text>
            <text x="163" y="34" fontSize="13" opacity="0.8">
              z
            </text>
          </g>
        )}

        {/* Back Legs */}
        <path
          d="M78 148 Q66 164 62 175"
          stroke="#D97706"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M108 148 Q116 164 122 175"
          stroke="#D97706"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Striped Honey Teardrop Abdomen */}
        <g transform="rotate(-14 64 138)">
          <ellipse cx="62" cy="138" rx="31" ry="24.5" fill="#F59E0B" />
          <path
            d="M41 128 Q53 135 66 126"
            stroke="#D97706"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M36 141 Q53 149 71 139"
            stroke="#D97706"
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M44 153 Q57 158 70 151"
            stroke="#D97706"
            strokeWidth="4.5"
            strokeLinecap="round"
            opacity="0.55"
          />
          <ellipse cx="55" cy="123" rx="12" ry="5" fill="#FEF08A" fillOpacity="0.65" />
        </g>

        {/* Compact Rounded Thorax & Buttercream Belly */}
        <ellipse cx="96" cy="134" rx="22" ry="21" fill="#FBBF24" />
        <ellipse cx="99" cy="135" rx="13" ry="13.5" fill="#FEF3C7" fillOpacity="0.72" />

        {/* Iconic Oversized Golden Pencil */}
        {(resolvedProp === 'pencil' ||
          resolvedProp === 'scholar' ||
          resolvedProp === 'magnifier') && (
          <g transform="translate(144, 52) rotate(18)">
            <polygon points="10,0 20,22 0,22" fill="#FEF3C7" />
            <polygon points="10,0 13.5,8 6.5,8" fill="#1E293B" />
            <rect x="0" y="22" width="20" height="86" rx="2" fill="#F59E0B" />
            <rect x="6" y="22" width="8" height="86" fill="#FBBF24" />
            <rect x="15" y="22" width="3" height="86" fill="#FEF08A" fillOpacity="0.7" />
            <rect x="0" y="108" width="20" height="10" rx="1.5" fill="#E2E8F0" />
            <line x1="0" y1="111.5" x2="20" y2="111.5" stroke="#94A3B8" strokeWidth="1.5" />
            <line x1="0" y1="115" x2="20" y2="115" stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="0" y="118" width="20" height="12" rx="4" fill="#FDA4AF" />
          </g>
        )}

        {/* Flow Timer Prop (paired with timer variant OR Flow focus headphones) */}
        {(resolvedProp === 'timer' || (app === 'flow' && mood === 'focus' && resolvedProp === 'headphones')) && (
          <g transform="translate(132, 108)">
            <circle cx="18" cy="20" r="17" fill="#334155" />
            <circle cx="18" cy="20" r="13.5" fill="#FEF9C3" />
            <rect x="14" y="0" width="8" height="4" rx="2" fill="#F59E0B" />
            <path
              d="M18 20 L18 11 M18 20 L25 22"
              stroke="#F59E0B"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <circle cx="18" cy="20" r="2.2" fill="#0F172A" />
          </g>
        )}

        {/* Cozy Steaming Mug for Pillow Rest */}
        {resolvedProp === 'pillow' && (
          <g transform="translate(142, 146)">
            <rect x="0" y="6" width="22" height="22" rx="5" fill="#64748B" />
            <path
              d="M22 11 C28 11, 28 22, 22 22"
              stroke="#64748B"
              strokeWidth="3.2"
              fill="none"
            />
            <path d="M7 2 Q5 -3 8 -6" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M14 2 Q12 -3 15 -6" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* Telegram / Nudge Bell Prop */}
        {resolvedProp === 'bell' && (
          <g transform="translate(136, 98) rotate(14)">
            <path
              d="M16 4 C9 4 5 10 5 18 L2 24 L30 24 L27 18 C27 10 23 4 16 4 Z"
              fill="#FBBF24"
              stroke="#D97706"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="27" r="3.5" fill="#D97706" />
            <circle cx="27" cy="7" r="5" fill="#FB7185" />
          </g>
        )}

        {/* Front Arms (pose adapts to mood & prop) */}
        {mood === 'celebrating' ? (
          <>
            <path
              d="M78 124 Q58 102 52 84"
              stroke="#F59E0B"
              strokeWidth="8.5"
              strokeLinecap="round"
            />
            <path
              d="M114 124 Q134 102 142 84"
              stroke="#F59E0B"
              strokeWidth="8.5"
              strokeLinecap="round"
            />
          </>
        ) : mood === 'nudge' ? (
          <>
            <path
              d="M78 124 Q56 112 52 94"
              stroke="#F59E0B"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M114 126 Q132 132 124 144"
              stroke="#F59E0B"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M78 124 Q56 116 48 98"
              stroke="#F59E0B"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M114 126 Q130 124 138 112"
              stroke="#F59E0B"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Discoverer Magnifying Glass in Left Hand */}
        {resolvedProp === 'magnifier' && (
          <g transform="translate(24, 68) rotate(-18)">
            <line
              x1="21"
              y1="30"
              x2="26"
              y2="46"
              stroke="#475569"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <circle cx="17" cy="17" r="14" fill="#BAE6FD" fillOpacity="0.72" stroke="#475569" strokeWidth="4" />
            <path
              d="M11 11 Q14 8 20 10"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* Scholar Mini Cream Notepad */}
        {resolvedProp === 'scholar' && mood === 'studying' && (
          <g transform="translate(26, 98) rotate(-12)">
            <rect x="0" y="0" width="26" height="32" rx="4" fill="#FEF9C3" stroke="#D97706" strokeWidth="2" />
            <line x1="6" y1="10" x2="20" y2="10" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="17" x2="18" y2="17" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="24" x2="14" y2="24" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* Expressive Head Group (tilts slightly when curious) */}
        <g transform={mood === 'curious' ? 'rotate(-7 98 84)' : undefined}>
          <MiloCurledAntennae mood={mood} animated={animated} />

          {/* Big Chibi Geometric Ant Head (Bright Sunlit Gold) */}
          <ellipse cx="98" cy="84" rx="40" ry="34" fill="#FBBF24" />
          <ellipse cx="98" cy="61" rx="23" ry="8.5" fill="#FEF08A" fillOpacity="0.65" />

          {/* Flow Headphones Accessory */}
          {resolvedProp === 'headphones' && (
            <g>
              <path
                d="M57 82 C57 42 139 42 139 82"
                stroke="#334155"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              <rect x="49" y="72" width="12" height="24" rx="6" fill="#334155" />
              <rect x="52" y="76" width="5" height="16" rx="2.5" fill="#FBBF24" />
              <rect x="135" y="72" width="12" height="24" rx="6" fill="#334155" />
              <rect x="139" y="76" width="5" height="16" rx="2.5" fill="#FBBF24" />
            </g>
          )}

          <MiloEyesAndMouth mood={mood} resolvedProp={resolvedProp} animated={animated} />
        </g>
      </svg>
    );

  return (
    <div
      data-testid="ant-mascot"
      data-mood={mood}
      data-app={app}
      data-prop-variant={resolvedProp}
      data-variant={variant}
      className={cn('inline-flex select-none', layoutClass, className)}
    >
      {activeSpeech && (
        <div
          data-testid="ant-mascot-speech"
          className={cn(
            'relative max-w-[260px] rounded-2xl border border-border bg-surface-card px-3.5 py-2 text-xs font-semibold leading-relaxed text-foreground shadow-sm',
            speechPosition === 'top' && 'text-center',
            speechPosition === 'right' && 'text-left',
            speechPosition === 'left' && 'text-right'
          )}
        >
          <span>{activeSpeech}</span>
          {/* Subtle speech tail */}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute h-2.5 w-2.5 rotate-45 border-border bg-surface-card',
              speechPosition === 'top' &&
                '-bottom-[6px] left-1/2 -translate-x-1/2 border-r border-b',
              speechPosition === 'right' &&
                'top-1/2 -left-[6px] -translate-y-1/2 border-b border-l',
              speechPosition === 'left' &&
                'top-1/2 -right-[6px] -translate-y-1/2 border-t border-r'
            )}
          />
        </div>
      )}

      <div className="inline-flex flex-col items-center gap-1.5">
        {interactive ? (
          <button
            type="button"
            onClick={handleMascotTap}
            aria-label={isDecorative ? `Tap ${ANT_MASCOT_NAME}` : `${label} — tap to bounce`}
            title={`Say hi to ${ANT_MASCOT_NAME}`}
            className={cn(
              'relative inline-flex items-center justify-center rounded-2xl transition-transform duration-200 hover:scale-105 hover:-rotate-2 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            {svgNode}
          </button>
        ) : (
          <div className="relative inline-flex items-center justify-center">{svgNode}</div>
        )}

        {badge && (
          <span
            data-testid="ant-mascot-badge"
            className="inline-flex items-center rounded-full border border-primary-tint-border bg-primary-tint px-2.5 py-0.5 font-mono text-[11px] font-semibold text-on-primary-tint"
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

/** Ergonomic alias for ecosystem usage */
export const AntMascot = AntMascotView;
