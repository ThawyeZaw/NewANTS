'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Minimize2, Pause, Play, RotateCcw, Settings, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@ants/ui';
import {
  PHASE_LABELS,
  type AmbientSoundId,
  type FocusSceneId,
  type PomodoroPhase,
  type TimerStatus,
} from '../../../lib/pomodoro/engine';
import {
  AMBIENT_SOUNDS,
  FOCUS_SCENES,
  getAmbientSound,
  getFocusScene,
} from '../../../lib/pomodoro/ambient';
import { TimerRingView } from './TimerRingView';

export interface FocusModeViewProps {
  phase?: PomodoroPhase;
  status?: TimerStatus;
  timeLabel?: string;
  remainingMs?: number;
  progress?: number;
  taskTitle?: string | null;
  cycleCount?: number;
  longBreakInterval?: number;
  /** Tab switches counted during the current focus interval */
  interruptions?: number;
  scene?: FocusSceneId;
  ambientSound?: AmbientSoundId;
  ambientVolume?: number;
  playOnlyDuringWork?: boolean;
  ticking?: boolean;
  tickingVolume?: number;
  onChangeScene?: (scene: FocusSceneId) => void;
  onChangeAmbientSound?: (sound: AmbientSoundId) => void;
  onChangeAmbientVolume?: (volume: number) => void;
  onChangePlayOnlyDuringWork?: (value: boolean) => void;
  onChangeTicking?: (ticking: boolean) => void;
  onChangeTickingVolume?: (volume: number) => void;
  onPreviewTick?: (volume: number) => void;
  onSoundMenuOpenChange?: (open: boolean) => void;
  onOpenSettings?: () => void;
  onToggle?: () => void;
  onReset?: () => void;
  onSkip?: () => void;
  onExit?: () => void;
}

export function FocusModeView({
  phase = 'work',
  status = 'running',
  timeLabel = '18:42',
  remainingMs,
  progress = 0.25,
  taskTitle = 'WMA11 — Differentiation past paper (Jan 2024)',
  cycleCount = 1,
  longBreakInterval = 4,
  interruptions = 0,
  scene = 'none',
  ambientSound = 'off',
  ambientVolume = 0.45,
  playOnlyDuringWork = true,
  ticking = true,
  tickingVolume = 0.35,
  onChangeScene,
  onChangeAmbientSound,
  onChangeAmbientVolume,
  onChangePlayOnlyDuringWork,
  onChangeTicking,
  onChangeTickingVolume,
  onPreviewTick,
  onSoundMenuOpenChange,
  onOpenSettings,
  onToggle,
  onReset,
  onSkip,
  onExit,
}: FocusModeViewProps) {
  const [confirmExit, setConfirmExit] = useState(false);
  const [openMenu, setOpenMenu] = useState<'scene' | 'sound' | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isWork = phase === 'work';
  const isRunning = status === 'running';
  const activeScene = getFocusScene(scene);
  const activeSound = getAmbientSound(ambientSound);
  const hasPhoto = Boolean(activeScene.imageSrc);

  useEffect(() => {
    if (!confirmExit) return;
    const id = window.setTimeout(() => setConfirmExit(false), 3000);
    return () => window.clearTimeout(id);
  }, [confirmExit]);

  useEffect(() => {
    onSoundMenuOpenChange?.(openMenu === 'sound');
    return () => onSoundMenuOpenChange?.(false);
  }, [openMenu, onSoundMenuOpenChange]);

  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKeyCapture = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyCapture, true);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyCapture, true);
    };
  }, [openMenu]);

  const handleExit = () => {
    if (isWork && isRunning && !confirmExit) {
      setConfirmExit(true);
      return;
    }
    onExit?.();
  };

  const primaryLabel = isRunning ? 'Pause' : status === 'paused' ? 'Resume' : 'Start';

  const pillClass = hasPhoto
    ? 'border-white/20 bg-black/45 text-white/90 hover:bg-black/65 hover:text-white backdrop-blur-md'
    : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:text-foreground';

  const roundButton = cn(
    'inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    hasPhoto
      ? 'text-white/80 hover:bg-white/15 hover:text-white'
      : 'text-foreground-muted hover:bg-surface-inset hover:text-foreground'
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
      className={cn(
        'fixed inset-0 z-40 flex flex-col overflow-y-auto motion-safe:animate-[flow-fade-in_200ms_ease-out]',
        hasPhoto ? 'bg-zinc-950 text-white' : 'bg-background text-foreground'
      )}
    >
      {/* Background photograph + contrast scrim */}
      {activeScene.imageSrc && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <img
            src={activeScene.imageSrc}
            alt=""
            className="h-full w-full object-cover object-center transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75" />
        </div>
      )}

      <header className="relative z-30 mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <span className={cn('text-sm font-medium', hasPhoto ? 'text-white/85' : 'text-foreground-muted')}>
          {isWork ? 'Focus mode' : `${PHASE_LABELS[phase]} · step away`}
        </span>

        <div ref={menuRef} className="relative flex items-center gap-2">
          {onChangeScene && (
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === 'scene' ? null : 'scene'))}
              aria-expanded={openMenu === 'scene'}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                pillClass
              )}
            >
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{activeScene.id === 'none' ? 'Scene' : activeScene.label}</span>
            </button>
          )}

          {onChangeAmbientSound && (
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === 'sound' ? null : 'sound'))}
              aria-expanded={openMenu === 'sound'}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                pillClass
              )}
            >
              {ambientSound !== 'off' ? (
                <Volume2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              ) : ticking && tickingVolume > 0 ? (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{ambientSound === 'off' ? 'Sound' : activeSound.label}</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                onOpenSettings();
              }}
              aria-label="Settings"
              title="Settings (,)"
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                pillClass
              )}
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={handleExit}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              confirmExit
                ? 'border-destructive-border bg-destructive text-on-destructive'
                : pillClass
            )}
          >
            <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{confirmExit ? 'Click again to exit' : 'Exit'}</span>
            <kbd
              className={cn(
                'hidden rounded border px-1 font-mono text-[10px] sm:inline',
                hasPhoto ? 'border-white/25' : 'border-border'
              )}
            >
              Esc
            </kbd>
          </button>

          {/* Scene popover */}
          {openMenu === 'scene' && onChangeScene && (
            <div className="absolute right-0 top-11 z-30 max-h-[75vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-surface-elevated p-3 text-foreground shadow-[var(--shadow-tier-3)]">
              <p className="mb-2 text-xs font-semibold text-foreground-muted">Background scene</p>
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_SCENES.map((item) => {
                  const selected = item.id === scene;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onChangeScene(item.id);
                        setOpenMenu(null);
                      }}
                      className={cn(
                        'overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-border-hover',
                        item.id === 'none' && 'col-span-2'
                      )}
                    >
                      {item.imageSrc && (
                        <img src={item.imageSrc} alt="" className="h-14 w-full object-cover" />
                      )}
                      <span className="block px-2.5 py-1.5 text-xs font-semibold text-foreground">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sound popover */}
          {openMenu === 'sound' && onChangeAmbientSound && (
            <div className="absolute right-0 top-11 z-30 max-h-[75vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-surface-elevated p-3 text-foreground shadow-[var(--shadow-tier-3)]">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground-muted">Focus sound</p>
                <span className="font-mono text-xs tabular-nums text-foreground">
                  {Math.round(ambientVolume * 100)}%
                </span>
              </div>
              {onChangeAmbientVolume && (
                <input
                  type="range"
                  aria-label="Ambient sound volume"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(ambientVolume * 100)}
                  onChange={(e) => onChangeAmbientVolume(Number(e.target.value) / 100)}
                  className="mb-3 h-1.5 w-full cursor-pointer accent-primary"
                />
              )}
              <div className="space-y-1">
                {AMBIENT_SOUNDS.map((item) => {
                  const selected = item.id === ambientSound;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onChangeAmbientSound(item.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                        selected
                          ? 'bg-primary-tint font-semibold text-on-primary-tint'
                          : 'text-foreground hover:bg-surface-inset'
                      )}
                    >
                      <span>{item.label}</span>
                      <span className="text-[11px] text-foreground-muted">{item.description}</span>
                    </button>
                  );
                })}
              </div>
              {onChangePlayOnlyDuringWork && (
                <div className="mt-3 border-t border-border pt-2.5">
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1 text-xs">
                    <span className="font-medium text-foreground">Only while focusing</span>
                    <span className="relative inline-flex shrink-0">
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label="Play sound only while focusing"
                        className="peer sr-only"
                        checked={playOnlyDuringWork}
                        onChange={(e) => onChangePlayOnlyDuringWork(e.target.checked)}
                      />
                      <span className="h-5 w-9 rounded-full bg-border-hover transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
                      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface-card shadow-[var(--shadow-tier-1)] transition-transform peer-checked:translate-x-4" />
                    </span>
                  </label>
                  {ambientSound !== 'off' && playOnlyDuringWork && (!isRunning || !isWork) && (
                    <p className="mt-1 px-1 text-[11px] text-foreground-muted">
                      Previewing while open — plays automatically when Focus is running.
                    </p>
                  )}
                </div>
              )}
              {onChangeTicking && (
                <div className="mt-2.5 border-t border-border pt-2.5">
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1 text-xs">
                    <span className="font-medium text-foreground">Clock ticking</span>
                    <span className="relative inline-flex shrink-0">
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label="Clock ticking"
                        className="peer sr-only"
                        checked={ticking}
                        onChange={(e) => onChangeTicking(e.target.checked)}
                      />
                      <span className="h-5 w-9 rounded-full bg-border-hover transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
                      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface-card shadow-[var(--shadow-tier-1)] transition-transform peer-checked:translate-x-4" />
                    </span>
                  </label>
                  {ticking && onChangeTickingVolume && (
                    <div className="mt-2 px-1">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] text-foreground-muted">Tick volume</span>
                        <span className="font-mono text-[11px] tabular-nums text-foreground">
                          {Math.round(tickingVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Clock ticking volume"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round(tickingVolume * 100)}
                        onChange={(e) => onChangeTickingVolume(Number(e.target.value) / 100)}
                        onPointerUp={() => onPreviewTick?.(tickingVolume)}
                        className="h-1.5 w-full cursor-pointer accent-primary"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-12">
        <TimerRingView
          size="xl"
          tone={hasPhoto ? 'photo' : 'default'}
          progress={progress}
          timeLabel={timeLabel}
          remainingMs={remainingMs}
          phase={phase}
          status={status}
          caption={isWork ? taskTitle ?? 'No task selected' : 'Take a break'}
          cycleCount={cycleCount}
          longBreakInterval={longBreakInterval}
        />

        <div className="mt-10 flex items-center gap-6">
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset"
            title="Reset (R)"
            className={roundButton}
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggle}
            className={cn(
              'inline-flex h-14 min-w-40 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-on-primary transition-[background-color,transform] hover:bg-primary-hover active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              hasPhoto ? 'focus-visible:ring-offset-black' : 'focus-visible:ring-offset-background'
            )}
          >
            {isRunning ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
            <span>{primaryLabel}</span>
          </button>

          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip to next interval"
            title="Skip (S)"
            className={roundButton}
          >
            <SkipForward className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {isWork && interruptions > 0 && (
          <p className={cn('mt-6 text-xs', hasPhoto ? 'text-white/75' : 'text-foreground-muted')}>
            <span className={cn('font-mono tabular-nums', hasPhoto ? 'text-white' : 'text-foreground')}>
              {interruptions}
            </span>{' '}
            tab switch{interruptions === 1 ? '' : 'es'} during this session
          </p>
        )}
      </main>
    </div>
  );
}
