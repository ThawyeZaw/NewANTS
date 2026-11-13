'use client';

import React, { useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Lock,
  X,
} from 'lucide-react';
import { Badge, Button, cn } from '@ants/ui';
import {
  EDEXCEL_YMA01_APPLIED_PAIRS,
  isCompulsoryUnitForCashIn,
  isUnitAllowedInCashInPool,
  toggleUnitInCashIn,
  validateMathsSuiteSelection,
  type EdexcelMathsCashInCode,
  type EdexcelMathsCashInDefinition,
  type EdexcelMathsPathwayPreset,
  type EdexcelMathsUnitCategory,
  type EdexcelMathsUnitCode,
  type EdexcelMathsUnitDefinition,
} from '../../../lib/study/curriculum';
import {
  EDEXCEL_MATHS_14_UNITS,
  EDEXCEL_MATHS_CASH_IN_AWARDS,
  MATHS_SUITE_PATHWAY_PRESETS,
} from '../../../mocks/study-curriculum.mock';

export interface EdexcelMathsSuiteSelectorViewProps {
  /** Currently inspected cash-in award tab (`XMA01` | `YMA01` | `XFM01` | `YFM01`) */
  activeCashIn?: EdexcelMathsCashInCode;
  /** Enrolled cash-in awards (e.g. `['YMA01']` or `['YMA01', 'YFM01']`) */
  enrolledCashIns?: EdexcelMathsCashInCode[];
  /** Selected unit codes keyed by cash-in award */
  unitsByCashIn?: Record<EdexcelMathsCashInCode, EdexcelMathsUnitCode[]>;
  /** 14-unit catalog definitions */
  unitDefinitions?: EdexcelMathsUnitDefinition[];
  /** 4 cash-in award definitions */
  cashInAwards?: EdexcelMathsCashInDefinition[];
  /** Curated 1-click pathway presets */
  presets?: EdexcelMathsPathwayPreset[];
  /** Render inline inside `/curriculum` (true) or as a slide-over drawer (false) */
  embedded?: boolean;
  /** Controls slide-over drawer visibility when `embedded` is false */
  open?: boolean;
  /** Closes slide-over drawer */
  onClose?: () => void;
  /** Fired when user switches the active cash-in tab */
  onChangeActiveCashIn?: (cashInCode: EdexcelMathsCashInCode) => void;
  /** Fired when user toggles whether a cash-in award is enrolled */
  onToggleEnrolledCashIn?: (cashInCode: EdexcelMathsCashInCode) => void;
  /** Fired when units for a cash-in award are updated */
  onChangeUnitsForCashIn?: (
    cashInCode: EdexcelMathsCashInCode,
    units: EdexcelMathsUnitCode[]
  ) => void;
  /** Fired when user applies a 1-click pathway preset */
  onApplyPreset?: (preset: EdexcelMathsPathwayPreset) => void;
}

const DEFAULT_UNITS_BY_CASH_IN: Record<EdexcelMathsCashInCode, EdexcelMathsUnitCode[]> = {
  XMA01: ['WMA11', 'WMA12', 'WME01'],
  YMA01: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'],
  XFM01: ['WFM01', 'WME02', 'WST02'],
  YFM01: ['WFM01', 'WFM02', 'WFM03', 'WME02', 'WME03', 'WST02'],
};

const CATEGORY_GROUPS: Array<{
  id: EdexcelMathsUnitCategory;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'pure',
    title: 'Pure Mathematics (WMA11–WMA14)',
    subtitle: 'Compulsory spine for XMA01 (P1–P2) and YMA01 (P1–P4)',
  },
  {
    id: 'further_pure',
    title: 'Further Pure Mathematics (WFM01–WFM03)',
    subtitle: 'Core spine for AS Further (XFM01) and IAL Further (YFM01)',
  },
  {
    id: 'mechanics',
    title: 'Mechanics (WME01–WME03)',
    subtitle: 'Kinematics, forces, projectiles, work-energy, and SHM',
  },
  {
    id: 'statistics',
    title: 'Statistics (WST01–WST03)',
    subtitle: 'Probability, Normal/Poisson distributions, and hypothesis testing',
  },
  {
    id: 'decision',
    title: 'Decision Mathematics (WDM11)',
    subtitle: 'Graph theory algorithms, critical path analysis, and linear programming',
  },
];

/**
 * Interactive Edexcel IAL Modular Mathematics Suite (`WMA11-SET`) 14-Unit & 4-Cash-In Selector (`[ZYY-4.2]`).
 */
export function EdexcelMathsSuiteSelectorView({
  activeCashIn = 'YMA01',
  enrolledCashIns = ['YMA01'],
  unitsByCashIn = DEFAULT_UNITS_BY_CASH_IN,
  unitDefinitions = EDEXCEL_MATHS_14_UNITS,
  cashInAwards = EDEXCEL_MATHS_CASH_IN_AWARDS,
  presets = MATHS_SUITE_PATHWAY_PRESETS,
  embedded = true,
  open = false,
  onClose,
  onChangeActiveCashIn,
  onToggleEnrolledCashIn,
  onChangeUnitsForCashIn,
  onApplyPreset,
}: EdexcelMathsSuiteSelectorViewProps) {
  useEffect(() => {
    if (embedded || !open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [embedded, open, onClose]);

  const currentAward =
    cashInAwards.find((a) => a.code === activeCashIn) ??
    cashInAwards[0] ??
    EDEXCEL_MATHS_CASH_IN_AWARDS[1]!;
  const selectedUnits = unitsByCashIn[activeCashIn] ?? DEFAULT_UNITS_BY_CASH_IN[activeCashIn];

  // Primary Mathematics units used to prevent double-counting in XFM01 / YFM01
  const primaryMathsUnits = useMemo(() => {
    if (activeCashIn === 'XFM01' || activeCashIn === 'YFM01') {
      return enrolledCashIns.includes('XMA01') && !enrolledCashIns.includes('YMA01')
        ? unitsByCashIn.XMA01
        : unitsByCashIn.YMA01;
    }
    return [];
  }, [activeCashIn, enrolledCashIns, unitsByCashIn]);

  const validation = useMemo(
    () => validateMathsSuiteSelection(activeCashIn, selectedUnits, primaryMathsUnits),
    [activeCashIn, selectedUnits, primaryMathsUnits]
  );

  if (!embedded && !open) return null;

  const handleUnitClick = (unitCode: EdexcelMathsUnitCode) => {
    const nextUnits = toggleUnitInCashIn(activeCashIn, selectedUnits, unitCode);
    onChangeUnitsForCashIn?.(activeCashIn, nextUnits);
  };

  const handleApplyAppliedPair = (pairUnits: [EdexcelMathsUnitCode, EdexcelMathsUnitCode]) => {
    const nextUnits: EdexcelMathsUnitCode[] = [
      'WMA11',
      'WMA12',
      'WMA13',
      'WMA14',
      pairUnits[0],
      pairUnits[1],
    ];
    onChangeActiveCashIn?.('YMA01');
    onChangeUnitsForCashIn?.('YMA01', nextUnits);
  };

  const isAwardEnrolled = enrolledCashIns.includes(activeCashIn);

  const workbenchContent = (
    <div className="space-y-6">
      {/* 1. Cash-In Award Selector Tabs (XMA01 · YMA01 · XFM01 · YFM01) */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Cash-In Qualification &amp; 14-Unit Combination Builder
            </h3>
          </div>

          <button
            type="button"
            onClick={() => onToggleEnrolledCashIn?.(activeCashIn)}
            aria-pressed={isAwardEnrolled}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isAwardEnrolled
                ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {isAwardEnrolled
                ? `${activeCashIn} Active in Study Plan`
                : `Add ${activeCashIn} to Study Plan`}
            </span>
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Edexcel IAL Mathematics Cash-In Awards"
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          {cashInAwards.map((award) => {
            const selected = award.code === activeCashIn;
            const enrolled = enrolledCashIns.includes(award.code);
            const awardUnits = unitsByCashIn[award.code] ?? [];
            const awardValid = validateMathsSuiteSelection(
              award.code,
              awardUnits,
              award.code === 'XFM01' || award.code === 'YFM01' ? unitsByCashIn.YMA01 : []
            ).isValid;

            return (
              <button
                key={award.code}
                type="button"
                role="tab"
                aria-selected={selected}
                data-cashin-tab={award.code}
                onClick={() => onChangeActiveCashIn?.(award.code)}
                className={cn(
                  'flex flex-col justify-between rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-primary bg-primary-tint/40 text-foreground'
                    : 'border-border bg-background text-foreground-muted hover:border-border-hover hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {award.code}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-foreground-muted">
                    {award.requiredUnits}u · {award.totalUms} UMS
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {award.shortTitle}
                  </span>
                  {enrolled && (
                    <span
                      className={cn(
                        'font-mono text-[10px] font-semibold',
                        awardValid ? 'text-success' : 'text-warning'
                      )}
                    >
                      {awardValid ? 'Valid' : 'Incomplete'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Quick Pathway Presets + YMA01 Official Pair Selector */}
      <div className="space-y-2.5 border-y border-border py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground">
            Official Pathway Presets
          </span>
          <span className="text-xs text-foreground-muted">
            {currentAward.ruleSummary}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const isCurrentPreset =
              preset.cashInCode === activeCashIn &&
              preset.units.length === selectedUnits.length &&
              preset.units.every((u) => selectedUnits.includes(u));

            return (
              <button
                key={preset.id}
                type="button"
                data-preset-id={preset.id}
                aria-pressed={isCurrentPreset}
                onClick={() => onApplyPreset?.(preset)}
                title={preset.description}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isCurrentPreset
                    ? 'border-primary bg-primary-solid text-on-primary font-semibold'
                    : 'border-border bg-surface-card text-foreground hover:border-border-hover hover:bg-surface-inset'
                )}
              >
                <span className="font-mono text-[11px] font-bold">{preset.cashInCode}</span>
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {activeCashIn === 'YMA01' && (
          <div className="pt-2 space-y-1.5">
            <span className="block text-[11px] font-semibold text-foreground-muted">
              Official YMA01 Applied Pairs (<span className="font-mono">EXACT_COMBINATION_PAIRS</span>):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EDEXCEL_YMA01_APPLIED_PAIRS.map((pair) => {
                const pairActive =
                  selectedUnits.includes(pair.units[0]) &&
                  selectedUnits.includes(pair.units[1]) &&
                  selectedUnits.length === 6;

                return (
                  <button
                    key={pair.id}
                    type="button"
                    aria-pressed={pairActive}
                    onClick={() => handleApplyAppliedPair(pair.units)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-xs transition-colors',
                      pairActive
                        ? 'border-primary-tint-border bg-primary-tint font-bold text-on-primary-tint'
                        : 'border-border bg-background text-foreground-muted hover:text-foreground'
                    )}
                  >
                    <span>{pair.shortLabel}</span>
                    <span className="font-sans text-[11px] text-foreground-subtle">
                      ({pair.units.join('+')})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Live Rule Engine Validation Status Strip */}
      <div
        key={activeCashIn}
        data-testid="maths-suite-validation-banner"
        className={cn(
          'ants-panel-enter rounded-lg border p-4 space-y-3',
          validation.isValid
            ? 'border-border bg-surface-inset/60'
            : 'border-warning/50 bg-warning-tint/30'
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            )}
            <span className="text-sm font-bold text-foreground">
              {validation.summaryMessage}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
            <Badge variant={validation.isValid ? 'verified' : 'active-filter'} mono>
              {validation.selectedUnitCount}/{validation.requiredUnitCount} units
            </Badge>
            <span className="rounded border border-border bg-surface-card px-2 py-0.5 font-semibold text-foreground">
              {validation.totalUms} / {validation.targetUms} UMS
            </span>
          </div>
        </div>

        <div className="divide-y divide-border-subtle border-t border-border-subtle pt-2">
          {validation.ruleChecks.map((check) => (
            <div
              key={check.id}
              className="flex flex-col gap-1 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    check.passed ? 'bg-success' : 'bg-warning'
                  )}
                  aria-hidden="true"
                />
                <span className="font-semibold text-foreground">{check.label}</span>
                <span className="rounded bg-surface-card px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted border border-border">
                  {check.ruleType}
                </span>
              </div>
              <span className="text-foreground-muted">{check.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Interactive 14-Unit Matrix Grouped by Discipline */}
      <div className="space-y-5">
        {CATEGORY_GROUPS.map((group) => {
          const groupUnits = unitDefinitions.filter((u) => u.category === group.id);
          return (
            <div key={group.id} className="space-y-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {group.title}
                </h4>
                <span className="text-xs text-foreground-muted">{group.subtitle}</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {groupUnits.map((unit) => {
                  const isSelected = selectedUnits.includes(unit.code);
                  const isCompulsory = isCompulsoryUnitForCashIn(activeCashIn, unit.code);
                  const isAllowed = isUnitAllowedInCashInPool(activeCashIn, unit.code);
                  const isUsedInPrimaryMaths =
                    (activeCashIn === 'XFM01' || activeCashIn === 'YFM01') &&
                    primaryMathsUnits.includes(unit.code);

                  return (
                    <button
                      key={unit.code}
                      type="button"
                      data-unit-card={unit.code}
                      disabled={!isAllowed}
                      aria-pressed={isSelected}
                      onClick={() => handleUnitClick(unit.code)}
                      className={cn(
                        'flex flex-col justify-between rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        !isAllowed && 'cursor-not-allowed opacity-45 bg-surface-inset/40 border-border',
                        isAllowed && isSelected
                          ? 'border-primary bg-primary-tint/35 text-foreground'
                          : isAllowed &&
                              'border-border bg-background text-foreground hover:border-border-hover hover:bg-surface-inset/50'
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-surface-card px-1.5 py-0.5 font-mono text-xs font-bold text-foreground border border-border">
                              {unit.shortCode}
                            </span>
                            <span className="font-mono text-xs font-semibold text-foreground-muted">
                              {unit.code}
                            </span>
                          </div>

                          {isCompulsory ? (
                            <span
                              title={`Compulsory for ${activeCashIn}`}
                              className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-on-primary-tint"
                            >
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              <span>Core</span>
                            </span>
                          ) : isSelected ? (
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-on-primary">
                              <Check className="h-2.5 w-2.5" aria-hidden="true" />
                            </span>
                          ) : isUsedInPrimaryMaths ? (
                            <span className="font-mono text-[10px] text-warning">
                              In YMA01
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs font-bold text-foreground leading-snug">
                          {unit.title}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2 font-mono text-[10px] tabular-nums text-foreground-muted">
                        <span>{unit.level}</span>
                        <span>
                          {unit.maxUms} UMS · {unit.maxRaw}m · {unit.durationMinutes}min
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (embedded) {
    return workbenchContent;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Edexcel IAL Modular Mathematics Suite 14-Unit Selector"
    >
      <div
        className="ants-modal-backdrop-in fixed inset-0 bg-black/55 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="ants-drawer-right-in relative z-10 flex h-full w-full max-w-4xl flex-col overflow-hidden border-l border-border-hover bg-surface-elevated text-foreground shadow-[var(--shadow-tier-3)]">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              WMA11-SET · Edexcel Modular Mathematics Suite
            </h2>
            <p className="text-xs text-foreground-muted">
              14 modular units · 4 official cash-in awards (XMA01, YMA01, XFM01, YFM01)
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Maths Suite drawer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">{workbenchContent}</div>

        <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-inset px-6 py-3.5">
          <span className="font-mono text-xs text-foreground-muted">
            {validation.summaryMessage}
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done &amp; Save Combination
          </Button>
        </div>
      </aside>
    </div>
  );
}
