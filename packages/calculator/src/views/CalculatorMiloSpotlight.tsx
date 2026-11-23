'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import {
  AntMascot,
  type AntMascotMood,
  type AntMascotPropVariant,
  type EcosystemAppId,
  cn,
} from '@ants/ui';
import {
  PEARSON_UMS_CONVERTER_URL,
  type EngineGradeThreshold,
  type NextBoundaryHint,
} from '../engine/calculator-engine';

export const CALCULATOR_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function isPeakGradeLabel(grade: string | null | undefined): boolean {
  return grade === 'A*' || grade === '9';
}

export function isUpperGradeLabel(grade: string | null | undefined): boolean {
  return grade === 'A*' || grade === 'A' || grade === '9' || grade === '8' || grade === '7';
}

export function PearsonConverterLink({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <a
      href={PEARSON_UMS_CONVERTER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-primary hover:text-primary-hover underline-offset-4 hover:underline transition-colors',
        CALCULATOR_FOCUS_RING,
        className
      )}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      <span>
        {compact
          ? "Need UMS from raw marks? Pearson's converter"
          : "Need UMS from raw marks? Open Pearson's official Raw-to-UMS converter"}
      </span>
    </a>
  );
}

export function GradeTierProgressBar({
  maxScore,
  percentage,
  boundaries,
  isPeakGrade,
  className,
}: {
  maxScore: number;
  percentage: number;
  boundaries: readonly EngineGradeThreshold[];
  isPeakGrade: boolean;
  className?: string;
}) {
  const safeMax = Math.max(1, maxScore);
  const clampedPct = Math.max(0, Math.min(100, percentage));

  const ticks = useMemo(() => {
    const ascending = [...boundaries]
      .filter((b) => b.minScore > 0 && b.minScore < safeMax)
      .sort((a, b) => a.minScore - b.minScore)
      .map((b) => ({
        grade: b.grade,
        pct: Math.round((b.minScore / safeMax) * 100),
      }))
      .filter((t) => t.pct >= 12 && t.pct <= 95);

    const chosen: Array<{ grade: string; pct: number }> = [];
    for (const item of ascending) {
      const last = chosen[chosen.length - 1];
      if (!last || item.pct - last.pct >= 12) {
        chosen.push(item);
      }
    }
    return chosen.slice(-4);
  }, [boundaries, safeMax]);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-inset">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out motion-reduce:transition-none',
            isPeakGrade ? 'bg-primary' : 'bg-primary/90'
          )}
          style={{ width: `${clampedPct}%` }}
        />
        {ticks.map((tick) => (
          <span
            key={tick.grade}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-background/70"
            style={{ left: `${tick.pct}%` }}
          />
        ))}
      </div>
      {ticks.length > 0 && (
        <div className="relative h-3.5 text-[10px] font-mono tabular-nums text-foreground-muted">
          {ticks.map((tick) => (
            <span
              key={tick.grade}
              className="absolute -translate-x-1/2"
              style={{ left: `${tick.pct}%` }}
            >
              {tick.grade}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface MiloReaction {
  mood: AntMascotMood;
  propVariant: AntMascotPropVariant;
  speech: string;
  tapLines: string[];
}

function getMiloGradeReaction(params: {
  finalGrade: string;
  secondaryGrade?: string | null;
  nextBoundary: NextBoundaryHint | null;
  bufferAboveTop: number;
  metricUnit: 'UMS' | 'marks';
  incompleteMessage?: string;
}): MiloReaction {
  const {
    finalGrade,
    secondaryGrade,
    nextBoundary,
    bufferAboveTop,
    metricUnit,
    incompleteMessage,
  } = params;

  if (incompleteMessage) {
    return {
      mood: 'curious',
      propVariant: 'magnifier',
      speech: incompleteMessage,
      tapLines: [
        'Click any unit tile to add or remove it from your cash-in pool.',
        'Pearson non-overlapping rules automatically optimize both grades!',
      ],
    };
  }

  const unitWord = metricUnit === 'UMS' ? 'UMS' : 'marks';
  const bothPeak = isPeakGradeLabel(finalGrade) && isPeakGradeLabel(secondaryGrade);

  if (bothPeak) {
    return {
      mood: 'celebrating',
      propVariant: 'pencil',
      speech: `Double ${finalGrade}! Maths & Further Maths locked in — Milo is buzzing!`,
      tapLines: [
        'Tweak any slider to test exam headroom across both awards.',
        'Save these awards to track your target on Study.',
      ],
    };
  }

  if (isPeakGradeLabel(finalGrade) || isPeakGradeLabel(secondaryGrade)) {
    const peak = isPeakGradeLabel(finalGrade) ? finalGrade : secondaryGrade!;
    const bufferNote =
      bufferAboveTop > 0
        ? ` — ${bufferAboveTop} ${unitWord} past the ${peak} cutoff!`
        : ' — right at the summit!';
    return {
      mood: 'celebrating',
      propVariant: 'pencil',
      speech: `Grade ${peak} unlocked${bufferNote}`,
      tapLines: [
        'Small daily past-paper habits build Grade A* / 9 safety margins.',
        'Tap Save to log this target to your Study Tracker.',
      ],
    };
  }

  if (isUpperGradeLabel(finalGrade)) {
    if (nextBoundary) {
      const gap =
        nextBoundary.a2UmsNeeded && nextBoundary.a2UmsNeeded > 0
          ? `${nextBoundary.a2UmsNeeded} A2 UMS`
          : `${nextBoundary.needed} ${unitWord}`;
      return {
        mood: 'happy',
        propVariant: 'pencil',
        speech: `So close! Only ${gap} from Grade ${nextBoundary.grade} — you've got this!`,
        tapLines: [
          `Focusing on high-yield past paper questions easily swings ${gap}.`,
          'Drag any slider left or right to test what-if scenarios!',
        ],
      };
    }
    return {
      mood: 'happy',
      propVariant: 'pencil',
      speech: `Top Grade ${finalGrade} secured (+${bufferAboveTop} ${unitWord} cushion)!`,
      tapLines: [
        'Milo loves that safety cushion above the top boundary!',
        'Save your snapshot to benchmark future timed papers.',
      ],
    };
  }

  if (['B', 'C', '6', '5', '4'].includes(finalGrade)) {
    const nudge = nextBoundary
      ? ` ${nextBoundary.needed} ${unitWord} nudges you to Grade ${nextBoundary.grade}.`
      : '';
    return {
      mood: 'studying',
      propVariant: 'scholar',
      speech: `Solid Grade ${finalGrade} foundation.${nudge}`,
      tapLines: [
        'Every 2–3 extra marks on structured questions adds up fast!',
        'Check which paper gives you the easiest point gain.',
      ],
    };
  }

  if (finalGrade === 'U') {
    const targetNote = nextBoundary
      ? ` Need ${nextBoundary.needed} ${unitWord} for Grade ${nextBoundary.grade}.`
      : '';
    return {
      mood: 'curious',
      propVariant: 'magnifier',
      speech: `Warm-up mode! Slide any score up to map your target.${targetNote}`,
      tapLines: [
        'Use Fill top marks anytime to inspect full boundaries.',
        'Every A* journey starts with one timed paper!',
      ],
    };
  }

  const climbNote = nextBoundary
    ? ` Aim for +${nextBoundary.needed} ${unitWord} for Grade ${nextBoundary.grade}.`
    : '';
  return {
    mood: 'nudge',
    propVariant: 'scholar',
    speech: `Building momentum at Grade ${finalGrade}!${climbNote}`,
    tapLines: [
      'Spot weaker units quickly and target those topics first.',
      'Milo is cheering for your next jump!',
    ],
  };
}

export function MiloGradeSpotlight({
  finalGrade,
  secondaryGrade,
  nextBoundary,
  bufferAboveTop,
  metricUnit,
  hostApp,
  incompleteMessage,
  extraNote,
  className,
}: {
  finalGrade: string;
  secondaryGrade?: string | null;
  nextBoundary: NextBoundaryHint | null;
  bufferAboveTop: number;
  metricUnit: 'UMS' | 'marks';
  hostApp: EcosystemAppId;
  incompleteMessage?: string;
  extraNote?: string;
  className?: string;
}) {
  const isPeakNow =
    !incompleteMessage && (isPeakGradeLabel(finalGrade) || isPeakGradeLabel(secondaryGrade));
  const wasPeakRef = useRef(isPeakNow);
  const [burstTick, setBurstTick] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    if (!wasPeakRef.current && isPeakNow) {
      setBurstTick((n) => n + 1);
      setShowBurst(true);
      timer = window.setTimeout(() => setShowBurst(false), 700);
    }
    wasPeakRef.current = isPeakNow;
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [isPeakNow]);

  const reaction = useMemo(
    () =>
      getMiloGradeReaction({
        finalGrade,
        secondaryGrade,
        nextBoundary,
        bufferAboveTop,
        metricUnit,
        incompleteMessage,
      }),
    [finalGrade, secondaryGrade, nextBoundary, bufferAboveTop, metricUnit, incompleteMessage]
  );

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-xl bg-surface-inset/75 px-3 py-2.5',
        className
      )}
    >
      <div className="relative shrink-0">
        <AntMascot
          size={46}
          mood={reaction.mood}
          app={hostApp === 'study' ? 'study' : 'org'}
          propVariant={reaction.propVariant}
          interactive
          tapLines={reaction.tapLines}
          ariaLabel=""
        />
        {showBurst && (
          <div
            key={burstTick}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <Sparkles
              className="ants-mascot-burst absolute -top-1 -left-1 h-3 w-3 text-primary"
              style={{ '--burst-x': '-10px' } as React.CSSProperties}
            />
            <Sparkles
              className="ants-mascot-burst absolute -top-2 right-0 h-3 w-3 text-success"
              style={{ '--burst-x': '12px' } as React.CSSProperties}
            />
            <span
              className="ants-mascot-burst absolute top-1 right-2 h-1.5 w-1.5 rounded-full bg-primary"
              style={{ '--burst-x': '6px' } as React.CSSProperties}
            />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-0.5">
        <p className="text-xs sm:text-sm font-medium text-foreground leading-snug">
          {reaction.speech}
        </p>
        {extraNote && (
          <p className="text-[11px] text-foreground-muted leading-snug">{extraNote}</p>
        )}
      </div>
    </div>
  );
}
