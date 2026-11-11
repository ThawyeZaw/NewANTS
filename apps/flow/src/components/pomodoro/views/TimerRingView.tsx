'use client';

import React, { useId, useState } from 'react';
import { cn } from '@ants/ui';
import type { PomodoroPhase, TimerStatus } from '../../../lib/pomodoro/engine';

export interface TimerRingViewProps {
  /** 0 -> 1 elapsed progress of the current interval */
  progress?: number;
  /** Pre-formatted clock, e.g. `24:59` or `1:25:00` */
  timeLabel?: string;
  /** Authoritative remaining milliseconds for lockstep 1s mechanical escapement ticks */
  remainingMs?: number;
  phase?: PomodoroPhase;
  status?: TimerStatus;
  /** Line shown under the clock (current task or break name) */
  caption?: string;
  /** Completed work intervals in the current cycle */
  cycleCount?: number;
  longBreakInterval?: number;
  size?: 'lg' | 'xl';
  /** Use `'photo'` when rendered over a darkened photographic backdrop */
  tone?: 'default' | 'photo';
  className?: string;
}

const VIEWBOX = 360;
const CENTER = VIEWBOX / 2;
const OUTER_RIM_RADIUS = 172;
const BEZEL_RADIUS = 158;
const BEZEL_STROKE = 26;
const PROGRESS_RADIUS = 159;
const PROGRESS_STROKE = 5;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;
const INNER_LIP_RADIUS = 144.5;
const DIAL_PLATE_RADIUS = 121.5;
const INNER_CALIBRATION_RADIUS = 114.5;

interface DialTick {
  index: number;
  isMajor: boolean;
  isCardinal: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const DIAL_TICKS: DialTick[] = Array.from({ length: 60 }, (_, index) => {
  const angleRad = ((index * 6 - 90) * Math.PI) / 180;
  const isMajor = index % 5 === 0;
  const isCardinal = index % 15 === 0;
  const outerR = 142;
  const innerR = isCardinal ? 129.5 : isMajor ? 132.5 : 137;
  return {
    index,
    isMajor,
    isCardinal,
    x1: Number((CENTER + innerR * Math.cos(angleRad)).toFixed(2)),
    y1: Number((CENTER + innerR * Math.sin(angleRad)).toFixed(2)),
    x2: Number((CENTER + outerR * Math.cos(angleRad)).toFixed(2)),
    y2: Number((CENTER + outerR * Math.sin(angleRad)).toFixed(2)),
  };
});

/** Parse `MM:SS` or `H:MM:SS` strings into whole seconds for standalone fallback usage. */
export function parseClockSeconds(timeLabel: string): number {
  const parts = timeLabel
    .trim()
    .split(':')
    .map((part) => Number(part));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  if (parts.length === 2) {
    const [minutes = 0, seconds = 0] = parts;
    return Math.round(minutes * 60 + seconds);
  }
  if (parts.length === 3) {
    const [hours = 0, minutes = 0, seconds = 0] = parts;
    return Math.round(hours * 3600 + minutes * 60 + seconds);
  }
  return 0;
}

/** Map remaining countdown seconds to the 0..59 clockwise 1-second dial step (0 = 12 o'clock). */
export function getEscapementSecondStep(remainingMs: number | undefined, timeLabel: string): number {
  const secondsRemaining =
    typeof remainingMs === 'number' && Number.isFinite(remainingMs)
      ? Math.max(0, Math.ceil(remainingMs / 1000))
      : parseClockSeconds(timeLabel);
  return (60 - (secondsRemaining % 60)) % 60;
}

export function TimerRingView({
  progress = 0.32,
  timeLabel = '17:00',
  remainingMs,
  phase = 'work',
  status = 'running',
  caption = 'Focus',
  cycleCount = 1,
  longBreakInterval = 4,
  size = 'lg',
  tone = 'default',
  className,
}: TimerRingViewProps) {
  const uid = useId().replace(/:/g, '');
  const bezelGradientId = `${uid}-bezel`;
  const dialGradientId = `${uid}-dial`;

  const clamped = Math.min(1, Math.max(0, progress));
  const isBreak = phase !== 'work';
  const isPhoto = tone === 'photo';
  const isRunning = status === 'running';
  const secondStep = getEscapementSecondStep(remainingMs, timeLabel);

  // Track cumulative full turns so crossing :01 -> :00 steps clockwise (+6deg) instead of spinning backwards.
  const resetKey = `${phase}:${status === 'idle'}`;
  const [dialMotion, setDialMotion] = useState(() => ({
    step: secondStep,
    turns: 0,
    animate: false,
    resetKey,
  }));

  if (dialMotion.resetKey !== resetKey) {
    setDialMotion({
      step: secondStep,
      turns: 0,
      animate: false,
      resetKey,
    });
  } else if (dialMotion.step !== secondStep) {
    const delta = (secondStep - dialMotion.step + 60) % 60;
    const wrappedForward = delta > 0 && delta <= 5 && secondStep < dialMotion.step;
    setDialMotion({
      step: secondStep,
      turns: wrappedForward ? dialMotion.turns + 1 : dialMotion.turns,
      animate: isRunning && delta > 0 && delta <= 5,
      resetKey,
    });
  }

  const escapementDeg = (dialMotion.turns * 60 + dialMotion.step) * 6;
  const progressDeg = clamped * 360;
  const isLongClock = timeLabel.length > 5;

  const accentStrokeClass = isBreak ? 'stroke-success' : 'stroke-primary';
  const accentFillClass = isBreak ? 'fill-success' : 'fill-primary';

  return (
    <div
      className={cn(
        'relative mx-auto aspect-square w-full select-none',
        size === 'xl' ? 'max-w-[min(70vh,480px)]' : 'max-w-[308px] sm:max-w-[332px]',
        className
      )}
      role="timer"
      aria-live="off"
      aria-label={`${caption}: ${timeLabel} remaining`}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="h-full w-full overflow-visible drop-shadow-[var(--shadow-tier-2)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bezelGradientId} x1="15%" y1="10%" x2="85%" y2="90%">
            <stop
              offset="0%"
              stopColor={isPhoto ? 'rgba(28, 30, 36, 0.86)' : 'var(--surface-elevated)'}
            />
            <stop
              offset="100%"
              stopColor={isPhoto ? 'rgba(10, 11, 15, 0.92)' : 'var(--surface-inset)'}
            />
          </linearGradient>
          <radialGradient id={dialGradientId} cx="50%" cy="42%" r="60%">
            <stop
              offset="0%"
              stopColor={isPhoto ? 'rgba(14, 16, 22, 0.72)' : 'var(--surface-card)'}
            />
            <stop
              offset="85%"
              stopColor={isPhoto ? 'rgba(9, 10, 14, 0.80)' : 'var(--surface-card)'}
            />
            <stop
              offset="100%"
              stopColor={isPhoto ? 'rgba(6, 7, 10, 0.86)' : 'var(--surface-inset)'}
            />
          </radialGradient>
        </defs>

        {/* Machined outer bezel band + chamfer rim */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={BEZEL_RADIUS}
          fill="none"
          stroke={`url(#${bezelGradientId})`}
          strokeWidth={BEZEL_STROKE}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={OUTER_RIM_RADIUS}
          fill="none"
          strokeWidth={1.5}
          className={isPhoto ? 'stroke-white/25' : 'stroke-border-hover'}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={INNER_LIP_RADIUS}
          fill="none"
          strokeWidth={1}
          className={isPhoto ? 'stroke-white/15' : 'stroke-border'}
        />

        {/* Recessed outer chrono track + interval sweep arc */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={PROGRESS_RADIUS}
          fill="none"
          strokeWidth={PROGRESS_STROKE}
          className={isPhoto ? 'stroke-white/15' : 'stroke-border'}
          strokeOpacity={isPhoto ? 1 : 0.75}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={PROGRESS_RADIUS}
          fill="none"
          strokeWidth={PROGRESS_STROKE}
          strokeLinecap="round"
          strokeDasharray={PROGRESS_CIRCUMFERENCE}
          strokeDashoffset={PROGRESS_CIRCUMFERENCE * (1 - clamped)}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          className={cn(
            'motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300 motion-safe:ease-linear',
            accentStrokeClass,
            clamped === 0 && 'opacity-0'
          )}
        />

        {/* Recessed ceramic/matte center dial plate */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={DIAL_PLATE_RADIUS}
          fill={`url(#${dialGradientId})`}
          strokeWidth={1}
          className={isPhoto ? 'stroke-white/15' : 'stroke-border'}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={INNER_CALIBRATION_RADIUS}
          fill="none"
          strokeWidth={0.75}
          className={isPhoto ? 'stroke-white/10' : 'stroke-border'}
          strokeOpacity={isPhoto ? 1 : 0.65}
        />

        {/* Precision 60-tick chapter ring (twin-baton at 12, bold at 5m/cardinal, crisp hairline seconds) */}
        <g>
          {DIAL_TICKS.map((tick) => {
            const passed = clamped > 0 && tick.index / 60 <= clamped;
            const isCurrentSecond = isRunning && tick.index === secondStep;

            if (tick.index === 0) {
              const strokeClass =
                isCurrentSecond || passed
                  ? accentStrokeClass
                  : isPhoto
                    ? 'stroke-white/85'
                    : 'stroke-foreground-muted';
              return (
                <g key={tick.index}>
                  <line
                    x1={CENTER - 2.4}
                    y1={CENTER - 142}
                    x2={CENTER - 2.4}
                    y2={CENTER - 129.5}
                    strokeWidth={2}
                    strokeLinecap="butt"
                    className={cn('transition-colors duration-150', strokeClass)}
                  />
                  <line
                    x1={CENTER + 2.4}
                    y1={CENTER - 142}
                    x2={CENTER + 2.4}
                    y2={CENTER - 129.5}
                    strokeWidth={2}
                    strokeLinecap="butt"
                    className={cn('transition-colors duration-150', strokeClass)}
                  />
                </g>
              );
            }

            const defaultStrokeClass = tick.isCardinal
              ? isPhoto
                ? 'stroke-white/80'
                : 'stroke-foreground-muted'
              : tick.isMajor
                ? isPhoto
                  ? 'stroke-white/60'
                  : 'stroke-foreground-muted'
                : isPhoto
                  ? 'stroke-white/30'
                  : 'stroke-foreground-subtle';

            const opacity = isCurrentSecond
              ? 1
              : passed
                ? tick.isMajor
                  ? 0.95
                  : 0.72
                : tick.isMajor
                  ? 0.85
                  : 0.55;

            return (
              <line
                key={tick.index}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                strokeWidth={tick.isCardinal ? 2.4 : tick.isMajor ? 1.8 : 1.1}
                strokeLinecap="butt"
                strokeOpacity={opacity}
                className={cn(
                  'transition-colors duration-150',
                  isCurrentSecond || passed ? accentStrokeClass : defaultStrokeClass
                )}
              />
            );
          })}
        </g>

        {/* Mechanical 1-second escapement pointer stepping clockwise tick-by-tick on the inner dial perimeter */}
        <g
          data-testid="escapement-hand"
          data-second-step={secondStep}
          className={cn(
            status === 'paused' && 'opacity-55',
            dialMotion.animate
              ? 'motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.22,1.35,0.36,1)]'
              : 'transition-none'
          )}
          style={{
            transform: `rotate(${escapementDeg}deg)`,
            transformOrigin: `${CENTER}px ${CENTER}px`,
            transformBox: 'view-box',
          }}
        >
          <path
            d={`M ${CENTER} ${CENTER - 131} L ${CENTER + 3.6} ${CENTER - 121.5} L ${CENTER} ${CENTER - 123.2} L ${CENTER - 3.6} ${CENTER - 121.5} Z`}
            strokeWidth={0.9}
            strokeLinejoin="round"
            className={cn(accentFillClass, isPhoto ? 'stroke-black/60' : 'stroke-surface-card')}
          />
          <circle
            cx={CENTER}
            cy={CENTER - 118.5}
            r={1.4}
            className={isPhoto ? 'fill-white/85' : 'fill-foreground-muted'}
          />
        </g>

        {/* Machined bezel progress rider tracking total elapsed session progress */}
        <g
          data-testid="bezel-progress-rider"
          className={cn(
            'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-linear',
            status === 'paused' && 'opacity-70'
          )}
          style={{
            transform: `rotate(${progressDeg}deg)`,
            transformOrigin: `${CENTER}px ${CENTER}px`,
            transformBox: 'view-box',
          }}
        >
          <polygon
            points={`${CENTER - 4.2},${CENTER - 168} ${CENTER + 4.2},${CENTER - 168} ${CENTER},${CENTER - 154}`}
            strokeWidth={1}
            strokeLinejoin="round"
            className={cn(
              clamped > 0 ? accentFillClass : isPhoto ? 'fill-white/80' : 'fill-foreground-muted',
              isPhoto ? 'stroke-black/70' : 'stroke-surface-card'
            )}
          />
          {clamped > 0 && (
            <circle
              cx={CENTER}
              cy={CENTER - PROGRESS_RADIUS}
              r={3.2}
              strokeWidth={1.25}
              className={cn(accentFillClass, isPhoto ? 'stroke-black/70' : 'stroke-surface-card')}
            />
          )}
        </g>
      </svg>

      {/* Center digital readout framed inside the recessed dial plate */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
        <span
          className={cn(
            'font-mono font-semibold tabular-nums tracking-[-0.03em] transition-opacity',
            isPhoto ? 'text-white' : 'text-foreground',
            size === 'xl'
              ? isLongClock
                ? 'text-5xl sm:text-6xl'
                : 'text-6xl sm:text-7xl'
              : isLongClock
                ? 'text-4xl sm:text-[2.75rem]'
                : 'text-5xl sm:text-[3.5rem]',
            status === 'paused' && 'opacity-60'
          )}
        >
          {timeLabel}
        </span>
        <span
          className={cn(
            'mt-2 line-clamp-2 max-w-[78%] text-xs sm:text-sm',
            isPhoto ? 'text-white/80' : 'text-foreground-muted'
          )}
        >
          {status === 'paused' ? `Paused · ${caption}` : caption}
        </span>
        <div
          className="mt-3.5 flex items-center gap-1.5"
          aria-label={`Session ${Math.min(cycleCount + 1, longBreakInterval)} of ${longBreakInterval} before a long break`}
        >
          {Array.from({ length: longBreakInterval }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors',
                i < cycleCount
                  ? isPhoto
                    ? 'bg-white'
                    : isBreak
                      ? 'bg-success'
                      : 'bg-primary'
                  : isPhoto
                    ? 'bg-white/30'
                    : 'bg-border-hover'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
