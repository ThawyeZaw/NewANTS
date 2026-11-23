'use client';

import React, { useMemo } from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Info,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  EDEXCEL_MATHS_UNITS,
  EDEXCEL_MATHS_UNIT_BY_CODE,
  type EdexcelMathsCashInCode,
  type EdexcelMathsSuiteAwardMode,
  type EdexcelMathsUnitCategory,
  type EdexcelMathsUnitCode,
} from '@ants/shared-types';
import { AntMascot, Button, cn, type EcosystemAppId } from '@ants/ui';
import {
  EDEXCEL_IAL_NO_OCT_NOV_UNITS,
  calculateEdexcelMathsSuite,
  hasFurtherMathsUnits,
  isOctNovSeriesId,
  type EdexcelMathsAwardSummary,
} from '../engine/edexcel-maths-suite';
import type { EngineSubjectInput } from '../engine/calculator-engine';
import {
  CALCULATOR_FOCUS_RING,
  GradeTierProgressBar,
  MiloGradeSpotlight,
  PearsonConverterLink,
  isPeakGradeLabel,
} from './CalculatorMiloSpotlight';
import type {
  CalculatorSaveFeedback,
  CalculatorSeriesOption,
  GradeCalculationSnapshot,
} from './GradeCalculatorView';

export interface EdexcelMathsSuiteViewProps {
  /** Kept optional for backwards compatibility; renders unified 14-unit workspace directly */
  step?: 2 | 3;
  suiteSubject: EngineSubjectInput;
  seriesOptions: CalculatorSeriesOption[];
  defaultSeriesId: string;
  selectedUnits: EdexcelMathsUnitCode[];
  onSelectedUnitsChange: (units: EdexcelMathsUnitCode[]) => void;
  awardMode: EdexcelMathsSuiteAwardMode;
  onAwardModeChange: (mode: EdexcelMathsSuiteAwardMode) => void;
  inputMode: 'raw' | 'ums';
  onInputModeChange: (mode: 'raw' | 'ums') => void;
  rawMarksByUnit: Record<string, number>;
  onRawMarksByUnitChange: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  umsMarksByUnit: Record<string, number>;
  onUmsMarksByUnitChange: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  seriesOverrides: Record<string, string>;
  onSeriesOverridesChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onDefaultSeriesChange: (seriesId: string) => void;
  onBackStep: () => void;
  onContinueStep?: () => void;
  hostApp: EcosystemAppId;
  onSaveSnapshot?: (snapshot: GradeCalculationSnapshot) => void | Promise<void>;
  saveFeedback?: CalculatorSaveFeedback | null;
  isSaving?: boolean;
}

const UNIT_GROUPS: Array<{
  category: EdexcelMathsUnitCategory;
  label: string;
}> = [
  { category: 'pure', label: 'Core Pure' },
  { category: 'further_pure', label: 'Further Pure' },
  { category: 'mechanics', label: 'Mechanics' },
  { category: 'statistics', label: 'Statistics' },
  { category: 'decision', label: 'Decision' },
];

export const EDEXCEL_MATHS_SUITE_PRESETS: Array<{
  id: string;
  label: string;
  sublabel: string;
  units: EdexcelMathsUnitCode[];
  awardMode: EdexcelMathsSuiteAwardMode;
}> = [
  {
    id: '3u',
    label: 'AS (3)',
    sublabel: 'XMA01 · P1, P2, M1',
    units: ['WMA11', 'WMA12', 'WME01'],
    awardMode: 'auto',
  },
  {
    id: '6u',
    label: 'IAL Maths (6)',
    sublabel: 'YMA01 · P1–P4, M1, S1',
    units: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'],
    awardMode: 'auto',
  },
  {
    id: '9u',
    label: 'Maths + AS FM (9)',
    sublabel: 'YMA01 + XFM01',
    units: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01', 'WFM01', 'WFM02', 'WME02'],
    awardMode: 'auto',
  },
  {
    id: '12u',
    label: 'Maths + FM (12)',
    sublabel: 'YMA01 + YFM01',
    units: [
      'WMA11',
      'WMA12',
      'WMA13',
      'WMA14',
      'WFM01',
      'WFM02',
      'WFM03',
      'WME01',
      'WME02',
      'WST01',
      'WST02',
      'WDM11',
    ],
    awardMode: 'auto',
  },
];

function getAssignedBadgeClass(award: EdexcelMathsCashInCode | 'unused'): string {
  if (award === 'XMA01' || award === 'YMA01') {
    return 'bg-primary-tint text-on-primary-tint border border-primary/25';
  }
  if (award === 'XFM01' || award === 'YFM01') {
    return 'bg-success-tint text-on-success-tint border border-success-border';
  }
  return 'bg-surface-inset text-foreground-muted border border-border';
}

function AwardSummaryCard({
  award,
  inputMode,
  seriesLabel,
  isSaving,
  onSave,
}: {
  award: EdexcelMathsAwardSummary;
  inputMode: 'raw' | 'ums';
  seriesLabel: string;
  isSaving: boolean;
  onSave?: () => void;
}) {
  const isTop = award.finalGrade === 'A*' || award.finalGrade === 'A';
  const isPeak = isPeakGradeLabel(award.finalGrade);

  return (
    <div className="rounded-2xl border border-border bg-surface-card p-3.5 sm:p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-primary-tint px-1.5 py-0.5 font-mono text-[11px] font-bold text-on-primary-tint">
              {award.cashInCode}
            </span>
            <h3 className="truncate text-xs sm:text-sm font-semibold text-foreground">
              {award.shortTitle}
            </h3>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-foreground">
              {award.totalUms}
            </span>
            <span className="font-mono tabular-nums text-[11px] text-foreground-muted">
              / {award.maxTotalUms} UMS ({award.percentage}%)
            </span>
            <span className="text-[11px] text-foreground-muted">
              · {inputMode === 'ums' ? 'Direct UMS' : seriesLabel}
            </span>
          </div>
        </div>

        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-extrabold transition-colors',
            isTop
              ? 'bg-primary text-on-primary'
              : 'border border-border bg-surface-inset text-foreground'
          )}
          aria-label={`${award.cashInCode} grade ${award.finalGrade}`}
        >
          {award.finalGrade}
        </div>
      </div>

      <GradeTierProgressBar
        maxScore={award.maxTotalUms}
        percentage={award.percentage}
        boundaries={award.boundaries}
        isPeakGrade={isPeak}
      />

      {/* Compact units + A2 requirement + save row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
        <div className="flex flex-wrap items-center gap-1">
          {award.unitCodes.map((code) => (
            <span
              key={code}
              className="rounded bg-surface-inset px-1.5 py-0.5 font-mono font-semibold text-foreground"
            >
              {EDEXCEL_MATHS_UNIT_BY_CODE[code].shortCode}
            </span>
          ))}
        </div>

        {award.aStarRuleStatus && (
          <span
            className={cn(
              'font-mono tabular-nums font-semibold',
              award.aStarRuleStatus.actualA2Ums >= award.aStarRuleStatus.requiredA2Ums
                ? 'text-primary'
                : 'text-foreground-muted'
            )}
          >
            {award.cashInCode === 'YMA01' ? 'P3+P4:' : 'Best 3 A2:'}{' '}
            {award.aStarRuleStatus.actualA2Ums}/{award.aStarRuleStatus.requiredA2Ums}
          </span>
        )}
      </div>

      {award.nextBoundary && (
        <p className="text-[11px] text-foreground-muted">
          {award.nextBoundary.a2UmsNeeded && award.nextBoundary.a2UmsNeeded > 0
            ? `Need ${award.nextBoundary.a2UmsNeeded} more A2 UMS for Grade ${award.nextBoundary.grade}.`
            : `Need ${award.nextBoundary.needed} more UMS for Grade ${award.nextBoundary.grade}.`}
        </p>
      )}

      {onSave && (
        <Button
          variant="outline"
          size="sm"
          fullWidth
          disabled={isSaving}
          className={CALCULATOR_FOCUS_RING}
          leftIcon={<BookmarkCheck className="h-3.5 w-3.5" />}
          onClick={onSave}
        >
          {isSaving ? 'Saving...' : `Save ${award.cashInCode} (${award.finalGrade})`}
        </Button>
      )}
    </div>
  );
}

export function EdexcelMathsSuiteView({
  suiteSubject,
  seriesOptions,
  defaultSeriesId,
  selectedUnits,
  onSelectedUnitsChange,
  awardMode,
  onAwardModeChange,
  inputMode,
  onInputModeChange,
  rawMarksByUnit,
  onRawMarksByUnitChange,
  umsMarksByUnit,
  onUmsMarksByUnitChange,
  seriesOverrides,
  onSeriesOverridesChange,
  onDefaultSeriesChange,
  onBackStep,
  hostApp,
  onSaveSnapshot,
  saveFeedback,
  isSaving = false,
}: EdexcelMathsSuiteViewProps) {
  const hasFmSelected = useMemo(
    () =>
      hasFurtherMathsUnits(selectedUnits) ||
      selectedUnits.some((u) => EDEXCEL_IAL_NO_OCT_NOV_UNITS.includes(u)),
    [selectedUnits]
  );

  const suiteSeriesOptions = useMemo(() => {
    const unionIds = new Set<string>();
    for (const p of suiteSubject.papers) {
      for (const sId of p.availableSeriesIds ?? Object.keys(p.seriesThresholds ?? {})) {
        unionIds.add(sId);
      }
    }
    const base =
      unionIds.size === 0
        ? seriesOptions
        : seriesOptions.filter((s) => unionIds.has(s.id));
    const nonEmpty = base.length > 0 ? base : seriesOptions;
    // Further Mathematics & M3/S3/D1 are never examined in Oct/Nov
    return hasFmSelected ? nonEmpty.filter((s) => !isOctNovSeriesId(s.id)) : nonEmpty;
  }, [suiteSubject.papers, seriesOptions, hasFmSelected]);

  const effectiveDefaultSeries = useMemo(() => {
    if (suiteSeriesOptions.some((s) => s.id === defaultSeriesId)) {
      return defaultSeriesId;
    }
    return suiteSeriesOptions[0]?.id ?? 'mj-2025';
  }, [suiteSeriesOptions, defaultSeriesId]);

  const activeDefaultSeriesLabel =
    suiteSeriesOptions.find((s) => s.id === effectiveDefaultSeries)?.label ??
    effectiveDefaultSeries;

  const seriesByUnit = useMemo(() => {
    const map: Record<string, string> = {};
    for (const code of selectedUnits) {
      const chosen = seriesOverrides[code] ?? effectiveDefaultSeries;
      if (EDEXCEL_IAL_NO_OCT_NOV_UNITS.includes(code) && isOctNovSeriesId(chosen)) {
        map[code] = suiteSeriesOptions.find((s) => !isOctNovSeriesId(s.id))?.id ?? 'mj-2025';
      } else {
        map[code] = chosen;
      }
    }
    return map;
  }, [selectedUnits, seriesOverrides, effectiveDefaultSeries, suiteSeriesOptions]);

  const calculation = useMemo(
    () =>
      calculateEdexcelMathsSuite({
        suiteSubject,
        selectedUnitCodes: selectedUnits,
        inputMode,
        rawMarksByUnit,
        umsMarksByUnit,
        seriesByUnit,
        defaultSeriesId: effectiveDefaultSeries,
        awardMode,
      }),
    [
      suiteSubject,
      selectedUnits,
      inputMode,
      rawMarksByUnit,
      umsMarksByUnit,
      seriesByUnit,
      effectiveDefaultSeries,
      awardMode,
    ]
  );

  const unitEvalByCode = useMemo(() => {
    const map = new Map<EdexcelMathsUnitCode, (typeof calculation.unitResults)[number]>();
    for (const item of calculation.unitResults) {
      map.set(item.unitCode, item);
    }
    return map;
  }, [calculation.unitResults]);

  const toggleUnit = (code: EdexcelMathsUnitCode) => {
    if (selectedUnits.includes(code)) {
      if (selectedUnits.length <= 1) return;
      onSelectedUnitsChange(selectedUnits.filter((u) => u !== code));
    } else {
      const next = [...selectedUnits, code];
      onSelectedUnitsChange(next);
      if (EDEXCEL_IAL_NO_OCT_NOV_UNITS.includes(code) && isOctNovSeriesId(defaultSeriesId)) {
        const safeSeries =
          seriesOptions.find((s) => !isOctNovSeriesId(s.id))?.id ?? 'mj-2025';
        onDefaultSeriesChange(safeSeries);
      }
    }
  };

  const handlePresetSelect = (preset: (typeof EDEXCEL_MATHS_SUITE_PRESETS)[number]) => {
    onSelectedUnitsChange([...preset.units]);
    onAwardModeChange(preset.awardMode);
    if (
      preset.units.some((u) => EDEXCEL_IAL_NO_OCT_NOV_UNITS.includes(u)) &&
      isOctNovSeriesId(defaultSeriesId)
    ) {
      const safeSeries =
        seriesOptions.find((s) => !isOctNovSeriesId(s.id))?.id ?? 'mj-2025';
      onDefaultSeriesChange(safeSeries);
    }
  };

  const handleToggleInputMode = (nextMode: 'raw' | 'ums') => {
    if (nextMode === inputMode) return;
    if (nextMode === 'ums') {
      const rawCalc = calculateEdexcelMathsSuite({
        suiteSubject,
        selectedUnitCodes: selectedUnits,
        inputMode: 'raw',
        rawMarksByUnit,
        seriesByUnit,
        defaultSeriesId: effectiveDefaultSeries,
        awardMode,
      });
      onUmsMarksByUnitChange((prev) => {
        const next = { ...prev };
        for (const u of rawCalc.unitResults) {
          if (next[u.unitCode] === undefined) {
            next[u.unitCode] = u.ums;
          }
        }
        return next;
      });
    }
    onInputModeChange(nextMode);
  };

  const applyMarkPreset = (mode: 'zero' | 'top') => {
    if (inputMode === 'ums') {
      onUmsMarksByUnitChange((prev) => {
        const next = { ...prev };
        for (const code of selectedUnits) {
          const paper = suiteSubject.papers.find((p) => p.code === code);
          const maxUms = paper?.maxUms ?? 100;
          next[code] = mode === 'zero' ? 0 : Math.round(maxUms * 0.92);
        }
        return next;
      });
      return;
    }

    onRawMarksByUnitChange((prev) => {
      const next = { ...prev };
      for (const code of selectedUnits) {
        if (mode === 'zero') {
          next[code] = 0;
        } else {
          const paper = suiteSubject.papers.find((p) => p.code === code);
          const uSeries = seriesByUnit[code] ?? effectiveDefaultSeries;
          const cutoff =
            paper?.seriesPaperCutoffs[uSeries]?.topGrade ??
            paper?.seriesThresholds?.[uSeries]?.['A*'] ??
            paper?.seriesThresholds?.[uSeries]?.A ??
            64;
          next[code] = Math.min(75, Math.max(cutoff, 66));
        }
      }
      return next;
    });
  };

  const handleSaveAward = (award: EdexcelMathsAwardSummary) => {
    if (!onSaveSnapshot) return;
    const rawMarksByPaper: Record<string, number> = {};
    const umsMarksByPaper: Record<string, number> = {};
    const perPaperSeriesById: Record<string, string> = {};
    for (const u of calculation.unitResults) {
      if (u.assignedAward === award.cashInCode) {
        if (inputMode === 'ums') {
          umsMarksByPaper[u.unitCode] = u.ums;
        } else {
          rawMarksByPaper[u.unitCode] = u.raw;
          perPaperSeriesById[u.unitCode] = u.seriesId;
        }
      }
    }
    void onSaveSnapshot({
      boardId: 'edexcel-ial',
      subjectId: suiteSubject.id,
      subjectCode: award.cashInCode,
      subjectTitle: award.title,
      seriesId: inputMode === 'ums' ? 'direct-ums' : effectiveDefaultSeries,
      routeId: award.cashInCode,
      routeLabel: `${award.cashInCode} (${award.unitCodes
        .map((c) => EDEXCEL_MATHS_UNIT_BY_CODE[c].shortCode)
        .join('+')})`,
      inputMode,
      ...(inputMode === 'raw' ? { perPaperSeriesById } : {}),
      rawMarksByPaper,
      ...(inputMode === 'ums' ? { umsMarksByPaper } : {}),
      totalRaw: award.totalRaw,
      maxTotalRaw: award.maxTotalRaw,
      totalUms: award.totalUms,
      maxTotalUms: award.maxTotalUms,
      percentage: award.percentage,
      finalGrade: award.finalGrade,
    });
  };

  const primaryAward = calculation.mathsAward ?? calculation.furtherMathsAward;
  const secondaryAward =
    calculation.mathsAward && calculation.furtherMathsAward
      ? calculation.furtherMathsAward
      : null;

  return (
    <div className="space-y-4">
      {/* Compact Header Strip: Back, Quick Tracks, Direct UMS/Raw Toggle & Fill/Converter */}
      <div className="rounded-2xl border border-border bg-surface-card p-3.5 sm:px-4 sm:py-3 space-y-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className={CALCULATOR_FOCUS_RING}
              leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
              onClick={onBackStep}
            >
              Subjects
            </Button>
            <span className="rounded-md bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint">
              YMA01 / YFM01
            </span>
            <h2 className="text-sm font-semibold text-foreground truncate">
              Mathematics &amp; Further Mathematics
            </h2>
            <span className="rounded-full bg-surface-inset px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground-muted">
              {selectedUnits.length} / 14 units
            </span>
          </div>

          <div
            role="group"
            aria-label="Score input mode"
            className="inline-flex self-start sm:self-auto rounded-xl border border-border bg-background p-0.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => handleToggleInputMode('ums')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                CALCULATOR_FOCUS_RING,
                inputMode === 'ums'
                  ? 'bg-primary text-on-primary'
                  : 'text-foreground-muted hover:text-foreground'
              )}
            >
              Direct UMS
            </button>
            <button
              type="button"
              onClick={() => handleToggleInputMode('raw')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                CALCULATOR_FOCUS_RING,
                inputMode === 'raw'
                  ? 'bg-primary text-on-primary'
                  : 'text-foreground-muted hover:text-foreground'
              )}
            >
              Raw Marks
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {EDEXCEL_MATHS_SUITE_PRESETS.map((preset) => {
              const isMatch =
                selectedUnits.length === preset.units.length &&
                preset.units.every((u) => selectedUnits.includes(u));
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.sublabel}
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    'rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors',
                    CALCULATOR_FOCUS_RING,
                    isMatch
                      ? 'bg-primary-tint text-on-primary-tint border border-primary/30'
                      : 'bg-surface-inset text-foreground-muted hover:text-foreground border border-transparent'
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                onSelectedUnitsChange(EDEXCEL_MATHS_UNITS.map((u) => u.code));
                onAwardModeChange('auto');
              }}
              className={cn(
                'rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors',
                CALCULATOR_FOCUS_RING,
                selectedUnits.length === 14
                  ? 'bg-primary-tint text-on-primary-tint border border-primary/30'
                  : 'bg-surface-inset text-foreground-muted hover:text-foreground border border-transparent'
              )}
            >
              All 14
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between lg:justify-end">
            {inputMode === 'ums' ? (
              <PearsonConverterLink compact />
            ) : (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="suite-session-inline"
                  className="text-xs font-medium text-foreground-muted shrink-0"
                >
                  Session:
                </label>
                <select
                  id="suite-session-inline"
                  value={effectiveDefaultSeries}
                  onChange={(e) => onDefaultSeriesChange(e.target.value)}
                  className={cn(
                    'rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground',
                    CALCULATOR_FOCUS_RING
                  )}
                >
                  {suiteSeriesOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => applyMarkPreset('top')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-tint/50 transition-colors',
                  CALCULATOR_FOCUS_RING
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{inputMode === 'ums' ? 'Fill 92 UMS' : 'Fill A*'}</span>
              </button>
              <button
                type="button"
                onClick={() => applyMarkPreset('zero')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground-muted hover:text-foreground',
                  CALCULATOR_FOCUS_RING
                )}
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {inputMode === 'raw' && hasFmSelected && (
          <p className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
            <Info className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              Further Mathematics (FP1–FP3), M3, S3 &amp; D1 are examined in January and May/June
              only (Oct/Nov excluded).
            </span>
          </p>
        )}
      </div>

      {/* Main Split: All 14 Units Compact Matrix (Left 7) + Sticky Simultaneous Grades (Right 5) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left 7 Cols: All 14 Units Visible Simultaneously Without Heavy Scrolling */}
        <div className="lg:col-span-7 space-y-3">
          {UNIT_GROUPS.map((group) => {
            const units = EDEXCEL_MATHS_UNITS.filter((u) => u.category === group.category);
            return (
              <section key={group.category} className="space-y-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted px-0.5">
                  {group.label}
                </h3>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {units.map((unit) => {
                    const evalRes = unitEvalByCode.get(unit.code);
                    const isSelected = Boolean(evalRes);

                    if (!isSelected || !evalRes) {
                      return (
                        <button
                          key={unit.code}
                          type="button"
                          onClick={() => toggleUnit(unit.code)}
                          aria-pressed={false}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-background/60 px-3 py-2 text-left opacity-70 transition-all hover:opacity-100 hover:border-border-hover',
                            CALCULATOR_FOCUS_RING
                          )}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {unit.shortCode}
                            </span>
                            <span className="truncate font-mono text-[10px] text-foreground-muted">
                              {unit.code}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-0.5 rounded bg-surface-inset px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted shrink-0">
                            <Plus className="h-2.5 w-2.5" />
                            <span>Add</span>
                          </span>
                        </button>
                      );
                    }

                    const paper = suiteSubject.papers.find((p) => p.code === unit.code);
                    const isNoOctNovUnit = EDEXCEL_IAL_NO_OCT_NOV_UNITS.includes(unit.code);
                    const unitSeriesIds =
                      paper?.availableSeriesIds && paper.availableSeriesIds.length > 0
                        ? paper.availableSeriesIds
                        : seriesOptions.map((s) => s.id);
                    const unitSeriesOptions = seriesOptions
                      .filter((s) => unitSeriesIds.includes(s.id))
                      .filter((s) => (isNoOctNovUnit ? !isOctNovSeriesId(s.id) : true));

                    const currentVal = inputMode === 'ums' ? evalRes.ums : evalRes.raw;
                    const maxVal = inputMode === 'ums' ? evalRes.maxUms : evalRes.maxRaw;
                    const canDeselect = selectedUnits.length > 1;

                    return (
                      <div
                        key={unit.code}
                        className="rounded-xl border border-primary/35 bg-surface-card px-2.5 py-2 space-y-1.5 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            aria-pressed={true}
                            disabled={!canDeselect}
                            onClick={() => toggleUnit(unit.code)}
                            title={
                              canDeselect
                                ? `Click to remove ${unit.shortCode} (${unit.code})`
                                : 'Keep at least 1 unit'
                            }
                            className={cn(
                              'flex items-center gap-1.5 rounded text-left min-w-0 group disabled:cursor-default',
                              CALCULATOR_FOCUS_RING
                            )}
                          >
                            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-primary text-on-primary">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                            <span className="font-mono text-xs font-bold text-primary">
                              {unit.shortCode}
                            </span>
                            <span className="truncate font-mono text-[10px] text-foreground-muted group-hover:text-foreground">
                              {unit.code}
                            </span>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={cn(
                                'rounded px-1 py-0.5 font-mono text-[9px] font-bold leading-none',
                                getAssignedBadgeClass(evalRes.assignedAward)
                              )}
                            >
                              {evalRes.assignedAward === 'unused'
                                ? 'Extra'
                                : evalRes.assignedAward}
                            </span>
                            <span className="font-mono tabular-nums text-[11px] font-bold text-foreground">
                              {evalRes.unitGrade}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={maxVal}
                            value={currentVal}
                            aria-label={`${unit.code} ${unit.title} slider`}
                            onChange={(e) => {
                              const clamped = Math.max(
                                0,
                                Math.min(maxVal, Math.round(Number(e.target.value) || 0))
                              );
                              if (inputMode === 'ums') {
                                onUmsMarksByUnitChange((prev) => ({
                                  ...prev,
                                  [unit.code]: clamped,
                                }));
                              } else {
                                onRawMarksByUnitChange((prev) => ({
                                  ...prev,
                                  [unit.code]: clamped,
                                }));
                              }
                            }}
                            className={cn(
                              'h-1.5 flex-1 min-w-0 cursor-pointer appearance-none rounded-lg bg-surface-inset accent-[var(--primary)]',
                              CALCULATOR_FOCUS_RING
                            )}
                          />

                          <div className="flex items-center gap-0.5 shrink-0">
                            <input
                              id={`suite-mark-${unit.code}`}
                              type="number"
                              min={0}
                              max={maxVal}
                              value={currentVal}
                              aria-label={`${unit.code} score`}
                              onFocus={(e) => e.currentTarget.select()}
                              onClick={(e) => e.currentTarget.select()}
                              onChange={(e) => {
                                const clamped = Math.max(
                                  0,
                                  Math.min(maxVal, Math.round(Number(e.target.value) || 0))
                                );
                                if (inputMode === 'ums') {
                                  onUmsMarksByUnitChange((prev) => ({
                                    ...prev,
                                    [unit.code]: clamped,
                                  }));
                                } else {
                                  onRawMarksByUnitChange((prev) => ({
                                    ...prev,
                                    [unit.code]: clamped,
                                  }));
                                }
                              }}
                              className={cn(
                                'w-11 rounded-md border border-border bg-background px-1 py-0.5 text-center font-mono tabular-nums text-xs font-semibold text-foreground focus:border-primary',
                                CALCULATOR_FOCUS_RING
                              )}
                            />
                            <span className="font-mono tabular-nums text-[10px] text-foreground-muted">
                              /{maxVal}
                            </span>
                          </div>
                        </div>

                        {inputMode === 'raw' && (
                          <div className="flex items-center justify-between gap-1.5 text-[10px]">
                            <select
                              aria-label={`${unit.code} exam session`}
                              value={evalRes.seriesId}
                              onChange={(e) =>
                                onSeriesOverridesChange((prev) => ({
                                  ...prev,
                                  [unit.code]: e.target.value,
                                }))
                              }
                              className={cn(
                                'min-w-0 rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground',
                                CALCULATOR_FOCUS_RING
                              )}
                            >
                              {(unitSeriesOptions.length > 0
                                ? unitSeriesOptions
                                : suiteSeriesOptions
                              ).map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <span className="font-mono tabular-nums text-foreground-muted shrink-0">
                              {evalRes.ums} UMS
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Right 5 Cols: Compact Milo Spotlight + Both Simultaneous Grades Visible Together */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-3">
          <div className="rounded-2xl border border-border bg-surface-card p-3.5 space-y-2.5">
            <MiloGradeSpotlight
              finalGrade={primaryAward?.finalGrade ?? 'U'}
              secondaryGrade={secondaryAward?.finalGrade}
              nextBoundary={primaryAward?.nextBoundary ?? null}
              bufferAboveTop={primaryAward?.bufferAboveTop ?? 0}
              metricUnit="UMS"
              hostApp={hostApp}
              incompleteMessage={
                calculation.resolvedMode === 'incomplete'
                  ? calculation.missingGuidance[0] ??
                    'Toggle in enough matching units on the left to form XMA01/YMA01 or XFM01/YFM01.'
                  : undefined
              }
            />

            {saveFeedback && (
              <div
                role="status"
                className={cn(
                  'flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs font-medium',
                  saveFeedback.tone === 'success' && 'bg-success-tint text-on-success-tint',
                  saveFeedback.tone === 'info' &&
                    'border border-border bg-primary-tint/50 text-foreground',
                  saveFeedback.tone === 'error' &&
                    'border border-destructive-border bg-destructive-tint text-destructive'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{saveFeedback.message}</span>
                </div>
                {saveFeedback.actionHref && saveFeedback.actionLabel && (
                  <a
                    href={saveFeedback.actionHref}
                    className="shrink-0 font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
                  >
                    {saveFeedback.actionLabel}
                  </a>
                )}
              </div>
            )}
          </div>

          {calculation.mathsAward && (
            <AwardSummaryCard
              award={calculation.mathsAward}
              inputMode={inputMode}
              seriesLabel={activeDefaultSeriesLabel}
              isSaving={isSaving}
              onSave={
                onSaveSnapshot ? () => handleSaveAward(calculation.mathsAward!) : undefined
              }
            />
          )}

          {calculation.furtherMathsAward && (
            <AwardSummaryCard
              award={calculation.furtherMathsAward}
              inputMode={inputMode}
              seriesLabel={activeDefaultSeriesLabel}
              isSaving={isSaving}
              onSave={
                onSaveSnapshot
                  ? () => handleSaveAward(calculation.furtherMathsAward!)
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom Live Grade Strip */}
      <div className="sticky bottom-0 z-40 -mx-4 border-t border-border-hover bg-surface-elevated/95 px-4 py-3 backdrop-blur-md shadow-[var(--shadow-tier-3)] lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AntMascot
              variant="avatar"
              size={30}
              mood={
                isPeakGradeLabel(primaryAward?.finalGrade) ||
                isPeakGradeLabel(secondaryAward?.finalGrade)
                  ? 'celebrating'
                  : 'happy'
              }
              app={hostApp === 'study' ? 'study' : 'org'}
              animated={false}
              ariaLabel=""
              className="shrink-0"
            />
            {calculation.mathsAward && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-bold text-foreground-muted">
                  {calculation.mathsAward.cashInCode}
                </span>
                <span className="rounded-lg bg-primary px-2 py-0.5 font-mono text-sm font-extrabold text-on-primary">
                  {calculation.mathsAward.finalGrade}
                </span>
                <span className="font-mono text-xs text-foreground-muted">
                  {calculation.mathsAward.totalUms}
                </span>
              </div>
            )}
            {calculation.furtherMathsAward && (
              <div className="flex items-center gap-1.5 pl-1 border-l border-border">
                <span className="font-mono text-[11px] font-bold text-foreground-muted">
                  {calculation.furtherMathsAward.cashInCode}
                </span>
                <span className="rounded-lg bg-success-tint px-2 py-0.5 font-mono text-sm font-extrabold text-on-success-tint">
                  {calculation.furtherMathsAward.finalGrade}
                </span>
                <span className="font-mono text-xs text-foreground-muted">
                  {calculation.furtherMathsAward.totalUms}
                </span>
              </div>
            )}
          </div>
          {primaryAward && onSaveSnapshot && (
            <Button
              variant="primary"
              size="sm"
              disabled={isSaving}
              className={cn('shrink-0', CALCULATOR_FOCUS_RING)}
              leftIcon={<BookmarkCheck className="h-3.5 w-3.5" />}
              onClick={() => handleSaveAward(primaryAward)}
            >
              {isSaving ? 'Saving...' : `Save ${primaryAward.cashInCode}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
