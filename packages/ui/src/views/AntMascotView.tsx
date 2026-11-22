'use client';

import React from 'react';
import { cn } from '../utils/cn';

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
  | 'none';

export type AntMascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface AntMascotProps {
  /** Emotional expression & pose of the mascot */
  mood?: AntMascotMood;
  /** Ecosystem app context used to infer signature accessories when propVariant is omitted */
  app?: AntMascotApp;
  /** Explicit signature prop override (defaults to smart pairing by app & mood) */
  propVariant?: AntMascotPropVariant;
  /** Visual size preset or pixel dimension */
  size?: AntMascotSize;
  /** Optional Duolingo-style speech bubble message */
  speech?: string;
  /** Speech bubble placement relative to the mascot */
  speechPosition?: 'top' | 'right' | 'left';
  /** Optional status pill badge rendered beneath the mascot (e.g. "14-day streak") */
  badge?: string;
  /** Enable gentle idle/celebration motion (automatically disabled under prefers-reduced-motion) */
  animated?: boolean;
  /** Enable playful hover/tap spring response */
  interactive?: boolean;
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

/**
 * Curated Duolingo-inspired warm, cheeky & encouraging presets
 * for key touchpoints across The ANTs ecosystem.
 */
export const ANT_MASCOT_PRESETS: Record<
  | 'studyStreak'
  | 'studyEmpty'
  | 'flowPomodoroStart'
  | 'flowPomodoroBreak'
  | 'telegramNudge'
  | 'authWelcome'
  | 'notFound'
  | 'orgHero',
  AntMascotPreset
> = {
  studyStreak: {
    mood: 'celebrating',
    app: 'study',
    propVariant: 'pencil',
    speech: 'Streak secured! One past paper closer to that A*.',
    badge: 'Streak Active',
  },
  studyEmpty: {
    mood: 'curious',
    app: 'study',
    propVariant: 'scholar',
    speech: 'No topics tracked yet—pick your first syllabus and let’s sharpen up!',
  },
  flowPomodoroStart: {
    mood: 'focus',
    app: 'flow',
    propVariant: 'headphones',
    speech: 'Headphones on. 25 minutes of pure Flow—I’ll guard the clock.',
    badge: '25:00 Focus',
  },
  flowPomodoroBreak: {
    mood: 'sleeping',
    app: 'flow',
    propVariant: 'timer',
    speech: 'Nice session! Stretch, hydrate, and recharge for 5 minutes.',
    badge: 'Break Time',
  },
  telegramNudge: {
    mood: 'nudge',
    app: 'telegram',
    propVariant: 'bell',
    speech: 'Psst… your timetable starts in 15 mins. Don’t make me tap the glass.',
    badge: '@TheANTsFlowBot',
  },
  authWelcome: {
    mood: 'happy',
    app: 'org',
    propVariant: 'pencil',
    speech: 'Welcome back! One sign-in unlocks Study and Flow together.',
  },
  notFound: {
    mood: 'curious',
    app: 'org',
    propVariant: 'pencil',
    speech: 'Hmm, my antennae can’t find this page. Let’s head back to the colony!',
  },
  orgHero: {
    mood: 'happy',
    app: 'org',
    propVariant: 'pencil',
    speech: 'Small daily habits, colony-sized results.',
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

export function AntMascotView({
  mood = 'idle',
  app = 'org',
  propVariant,
  size = 'md',
  speech,
  speechPosition = 'top',
  badge,
  animated = true,
  interactive = false,
  ariaLabel,
  className,
}: AntMascotProps) {
  const px = resolveMascotSize(size);
  const resolvedProp = resolveMascotPropVariant(app, mood, propVariant);
  const label = ariaLabel ?? `The ANTs mascot (${mood})`;
  const isDecorative = ariaLabel === '';

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

  return (
    <div
      data-testid="ant-mascot"
      data-mood={mood}
      data-app={app}
      data-prop-variant={resolvedProp}
      className={cn('inline-flex select-none', layoutClass, className)}
    >
      {speech && (
        <div
          data-testid="ant-mascot-speech"
          className={cn(
            'relative max-w-[260px] rounded-2xl border border-border bg-surface-card px-3.5 py-2 text-xs font-semibold leading-relaxed text-foreground shadow-sm',
            speechPosition === 'top' && 'text-center',
            speechPosition === 'right' && 'text-left',
            speechPosition === 'left' && 'text-right'
          )}
        >
          <span>{speech}</span>
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
        <div
          className={cn(
            'relative inline-flex items-center justify-center',
            interactive &&
              'cursor-pointer transition-transform duration-200 hover:scale-105 hover:-rotate-2 active:scale-95'
          )}
        >
          <svg
            width={px}
            height={px}
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role={isDecorative ? undefined : 'img'}
            aria-label={isDecorative ? undefined : label}
            aria-hidden={isDecorative ? 'true' : undefined}
            className={cn('overflow-visible', motionClass)}
          >
            {/* Ground shadow */}
            <ellipse
              cx="96"
              cy="182"
              rx={mood === 'celebrating' ? '34' : '42'}
              ry="7.5"
              fill="#0F172A"
              fillOpacity="0.1"
            />

            {/* Positive ambient sparkles for celebrating, happy & idle */}
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
                    <circle cx="152" cy="70" r="3.5" fill="#FB7185" />
                    <circle cx="44" cy="90" r="3.2" fill="#34D399" />
                  </>
                )}
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

            {/* Striped Abdomen (lighter sunlit honey-amber) */}
            <g transform="rotate(-14 66 138)">
              <ellipse cx="64" cy="136" rx="30" ry="24" fill="#F59E0B" />
              {/* Warm honey stripes */}
              <path
                d="M42 127 Q54 134 66 125"
                stroke="#D97706"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.6"
              />
              <path
                d="M39 140 Q55 148 72 138"
                stroke="#D97706"
                strokeWidth="5.5"
                strokeLinecap="round"
                opacity="0.6"
              />
              {/* Bright buttercream gloss highlight */}
              <ellipse
                cx="56"
                cy="122"
                rx="12"
                ry="5"
                fill="#FEF08A"
                fillOpacity="0.65"
              />
            </g>

            {/* Compact Rounded Thorax */}
            <ellipse cx="96" cy="134" rx="22" ry="21" fill="#FBBF24" />
            {/* Warm sunny belly highlight */}
            <ellipse cx="99" cy="135" rx="13" ry="13.5" fill="#FEF08A" fillOpacity="0.55" />

            {/* Iconic Oversized Golden Pencil */}
            {(resolvedProp === 'pencil' || resolvedProp === 'scholar') && (
              <g transform="translate(128, 38) rotate(22)">
                {/* Pencil wood tip cone */}
                <polygon points="10,0 20,22 0,22" fill="#FEF3C7" />
                {/* Graphite point */}
                <polygon points="10,0 13.5,8 6.5,8" fill="#1E293B" />
                {/* Bright golden barrel */}
                <rect x="0" y="22" width="20" height="86" rx="2" fill="#F59E0B" />
                {/* Center sunlit stripe */}
                <rect x="6" y="22" width="8" height="86" fill="#FBBF24" />
                {/* Highlight stripe */}
                <rect x="15" y="22" width="3" height="86" fill="#FEF08A" fillOpacity="0.7" />
                {/* Metallic ferrule */}
                <rect x="0" y="108" width="20" height="10" rx="1.5" fill="#E2E8F0" />
                <line x1="0" y1="111.5" x2="20" y2="111.5" stroke="#94A3B8" strokeWidth="1.5" />
                <line x1="0" y1="115" x2="20" y2="115" stroke="#94A3B8" strokeWidth="1.5" />
                {/* Rosy coral eraser */}
                <rect x="0" y="118" width="20" height="12" rx="4" fill="#FDA4AF" />
              </g>
            )}

            {/* Flow Timer Prop */}
            {resolvedProp === 'timer' && (
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
                {/* Notification dot */}
                <circle cx="27" cy="7" r="5" fill="#FB7185" />
              </g>
            )}

            {/* Front Arms (pose adapts to mood) */}
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
                {/* Upbeat beckoning left arm + playful right hip */}
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
                {/* Left energetic waving arm */}
                <path
                  d="M78 124 Q56 116 48 98"
                  stroke="#F59E0B"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Right arm holding prop */}
                <path
                  d="M114 126 Q130 124 138 112"
                  stroke="#F59E0B"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Expressive Head Group (tilts slightly when curious) */}
            <g transform={mood === 'curious' ? 'rotate(-7 98 84)' : undefined}>
              {/* Expressive Bendable Antennae */}
              <g className={animated ? 'ants-mascot-antenna' : undefined}>
                <path
                  d={
                    mood === 'sleeping'
                      ? 'M82 50 Q70 38 60 44'
                      : mood === 'nudge'
                        ? 'M82 50 Q74 24 62 22'
                        : 'M82 50 Q72 20 58 26'
                  }
                  stroke="#D97706"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle
                  cx={mood === 'sleeping' ? '60' : mood === 'nudge' ? '62' : '58'}
                  cy={mood === 'sleeping' ? '44' : mood === 'nudge' ? '22' : '26'}
                  r="4.8"
                  fill="#FBBF24"
                />

                <path
                  d={
                    mood === 'sleeping'
                      ? 'M114 50 Q126 38 136 44'
                      : mood === 'celebrating'
                        ? 'M114 50 Q126 18 140 20'
                        : 'M114 50 Q124 20 138 26'
                  }
                  stroke="#D97706"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle
                  cx={mood === 'sleeping' ? '136' : mood === 'celebrating' ? '140' : '138'}
                  cy={mood === 'sleeping' ? '44' : mood === 'celebrating' ? '20' : '26'}
                  r="4.8"
                  fill="#FBBF24"
                />
              </g>

              {/* Big Chibi Geometric Ant Head (Bright Sunlit Gold) */}
              <ellipse cx="98" cy="84" rx="40" ry="34" fill="#FBBF24" />
              {/* Luminous Crown Highlight */}
              <ellipse
                cx="98"
                cy="61"
                rx="23"
                ry="8.5"
                fill="#FEF08A"
                fillOpacity="0.65"
              />

              {/* Warm Rosy Cheeks */}
              <ellipse cx="70" cy="95" rx="7.5" ry="4.2" fill="#FDA4AF" fillOpacity="0.55" />
              <ellipse cx="126" cy="95" rx="7.5" ry="4.2" fill="#FDA4AF" fillOpacity="0.55" />

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

              {/* Eyes by Mood */}
              {mood === 'celebrating' ? (
                <g stroke="#0F172A" strokeWidth="4.5" strokeLinecap="round" fill="none">
                  <path d="M74 84 Q83 73 92 84" />
                  <path d="M104 84 Q113 73 122 84" />
                </g>
              ) : mood === 'sleeping' ? (
                <g stroke="#0F172A" strokeWidth="4" strokeLinecap="round" fill="none">
                  <path d="M74 84 Q83 91 92 84" />
                  <path d="M104 84 Q113 91 122 84" />
                </g>
              ) : mood === 'nudge' ? (
                /* Playful friendly wink */
                <g>
                  <circle cx="83" cy="82" r="11.8" fill="#FFFFFF" />
                  <circle cx="84.5" cy="82" r="6.2" fill="#0F172A" />
                  <circle cx="86.8" cy="79" r="2.5" fill="#FFFFFF" />
                  <circle cx="81.5" cy="85" r="1.2" fill="#FFFFFF" />
                  <path
                    d="M104 83 Q113 75 122 83"
                    stroke="#0F172A"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              ) : (
                <g>
                  {/* Left Eye with twin energetic catchlights */}
                  <circle cx="83" cy="82" r={mood === 'curious' ? '12.5' : '11.8'} fill="#FFFFFF" />
                  <circle cx="84.5" cy="82" r="6.2" fill="#0F172A" />
                  <circle cx="86.8" cy="79" r="2.5" fill="#FFFFFF" />
                  <circle cx="81.5" cy="85" r="1.2" fill="#FFFFFF" />

                  {/* Right Eye with twin energetic catchlights */}
                  <circle cx="113" cy="82" r="11.8" fill="#FFFFFF" />
                  <circle cx="114.5" cy="82" r="6.2" fill="#0F172A" />
                  <circle cx="116.8" cy="79" r="2.5" fill="#FFFFFF" />
                  <circle cx="111.5" cy="85" r="1.2" fill="#FFFFFF" />

                  {/* Upbeat determined focus eyebrows */}
                  {mood === 'focus' && (
                    <>
                      <path
                        d="M73 68 Q83 65 92 69"
                        stroke="#B45309"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <path
                        d="M123 68 Q113 65 104 69"
                        stroke="#B45309"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </>
                  )}
                </g>
              )}

              {/* Study Scholar Glasses Accessory */}
              {resolvedProp === 'scholar' && (
                <g stroke="#334155" strokeWidth="3" fill="none">
                  <circle cx="83" cy="82" r="14" />
                  <circle cx="113" cy="82" r="14" />
                  <line x1="97" y1="82" x2="99" y2="82" />
                </g>
              )}

              {/* Mouth by Mood (lighter & more joyful across the board) */}
              {mood === 'celebrating' || mood === 'happy' || mood === 'idle' ? (
                <path
                  d="M86 98 Q98 112 110 98 Z"
                  fill="#92400E"
                  stroke="#92400E"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              ) : mood === 'nudge' ? (
                <path
                  d="M87 99 Q98 109 111 98"
                  stroke="#92400E"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : mood === 'curious' ? (
                <path
                  d="M89 100 Q98 107 107 100"
                  stroke="#92400E"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : mood === 'sleeping' ? (
                <path
                  d="M92 100 Q98 105 104 100"
                  stroke="#92400E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : (
                <path
                  d="M88 99 Q98 108 108 99"
                  stroke="#92400E"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </g>
          </svg>
        </div>

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
