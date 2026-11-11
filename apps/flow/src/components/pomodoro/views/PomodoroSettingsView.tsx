'use client';

import React, { useState } from 'react';
import { Bell, BellOff, Image as ImageIcon, Minus, Monitor, Moon, Palette, Play, Plus, Shield, Sun, Timer, Volume2, VolumeX } from 'lucide-react';
import { Button, Modal, cn } from '@ants/ui';
import {
  DEFAULT_POMODORO_SETTINGS,
  DURATION_LIMITS,
  type AccentId,
  type FontId,
  type PomodoroSettings,
  type SoundId,
  type ThemeModePreference,
} from '../../../lib/pomodoro/engine';
import { AMBIENT_SOUNDS, FOCUS_SCENES } from '../../../lib/pomodoro/ambient';
import { SOUND_OPTIONS } from '../../../lib/pomodoro/sound';
import type { NotificationPermissionState } from '../../../lib/pomodoro/browser';

export type SettingsTab = 'timer' | 'atmosphere' | 'sound' | 'appearance' | 'focus';

export interface PomodoroSettingsViewProps {
  open?: boolean;
  onClose?: () => void;
  settings?: PomodoroSettings;
  onChange?: (settings: PomodoroSettings) => void;
  notificationPermission?: NotificationPermissionState;
  onRequestNotifications?: () => void;
  onTestSound?: (sound: SoundId, volume: number) => void;
  onTestTick?: (volume: number) => void;
  onOpenShortcuts?: () => void;
  initialTab?: SettingsTab;
}

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'timer', label: 'Timer', icon: <Timer className="h-4 w-4" aria-hidden="true" /> },
  { id: 'atmosphere', label: 'Atmosphere', icon: <ImageIcon className="h-4 w-4" aria-hidden="true" /> },
  { id: 'sound', label: 'Alerts', icon: <Volume2 className="h-4 w-4" aria-hidden="true" /> },
  { id: 'appearance', label: 'Theme', icon: <Palette className="h-4 w-4" aria-hidden="true" /> },
  { id: 'focus', label: 'Focus', icon: <Shield className="h-4 w-4" aria-hidden="true" /> },
];

export const ACCENT_OPTIONS: { id: AccentId; label: string }[] = [
  { id: 'amber', label: 'Amber' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
  { id: 'rose', label: 'Rose' },
  { id: 'violet', label: 'Violet' },
];

export const FONT_OPTIONS: { id: FontId; label: string; sample: string }[] = [
  { id: 'jakarta', label: 'Plus Jakarta Sans', sample: 'Modern & friendly' },
  { id: 'inter', label: 'Inter', sample: 'Neutral & crisp' },
  { id: 'serif', label: 'Lora', sample: 'Calm & editorial' },
];

const MODE_OPTIONS: { id: ThemeModePreference; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <Sun className="h-4 w-4" aria-hidden="true" /> },
  { id: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" aria-hidden="true" /> },
  { id: 'system', label: 'System', icon: <Monitor className="h-4 w-4" aria-hidden="true" /> },
];

function NumberField({
  id,
  label,
  suffix,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  suffix: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-foreground-muted">
        {label}
      </label>
      <div className="flex h-11 items-center rounded-lg border border-border bg-surface-inset focus-within:border-primary focus-within:ring-2 focus-within:ring-ring">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="inline-flex h-full w-9 items-center justify-center text-foreground-muted hover:text-foreground disabled:opacity-30"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && e.target.value !== '') onChange(clamp(v));
          }}
          className="h-full w-full min-w-0 bg-transparent text-center font-mono text-base font-semibold tabular-nums text-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="pr-1 text-xs text-foreground-subtle">{suffix}</span>
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="inline-flex h-full w-9 items-center justify-center text-foreground-muted hover:text-foreground disabled:opacity-30"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface-card px-4 py-3 transition-colors hover:border-border-hover',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-foreground-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-border-hover transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface-card shadow-[var(--shadow-tier-1)] transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function SoundSelect({
  id,
  label,
  value,
  volume,
  onChange,
  onTest,
}: {
  id: string;
  label: string;
  value: SoundId;
  volume: number;
  onChange: (value: SoundId) => void;
  onTest?: (sound: SoundId, volume: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-foreground-muted">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as SoundId)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface-inset px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SOUND_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}: {opt.description}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11"
          disabled={value === 'none' || volume === 0}
          onClick={() => onTest?.(value, volume)}
          aria-label={`Preview ${label}`}
          title="Preview"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function PomodoroSettingsView({
  open = true,
  onClose,
  settings = DEFAULT_POMODORO_SETTINGS,
  onChange,
  notificationPermission = 'default',
  onRequestNotifications,
  onTestSound,
  onTestTick,
  onOpenShortcuts,
  initialTab = 'timer',
}: PomodoroSettingsViewProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const L = DURATION_LIMITS;
  const update = (patch: Partial<PomodoroSettings>) => onChange?.({ ...settings, ...patch });
  const updateSound = (patch: Partial<PomodoroSettings['sound']>) =>
    update({ sound: { ...settings.sound, ...patch } });
  const updateAmbient = (patch: Partial<PomodoroSettings['ambient']>) =>
    update({ ambient: { ...settings.ambient, ...patch } });
  const updateAppearance = (patch: Partial<PomodoroSettings['appearance']>) =>
    update({ appearance: { ...settings.appearance, ...patch } });
  const updateFocus = (patch: Partial<PomodoroSettings['focus']>) =>
    update({ focus: { ...settings.focus, ...patch } });

  return (
    <Modal
      open={open}
      onClose={() => onClose?.()}
      title="Settings"
      description="Saved automatically on this device."
      size="xl"
      footer={
        <>
          {onOpenShortcuts && (
            <Button variant="ghost" size="sm" onClick={onOpenShortcuts} className="mr-auto">
              Keyboard shortcuts
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange?.({
                ...DEFAULT_POMODORO_SETTINGS,
                appearance: settings.appearance,
              })
            }
          >
            Reset to defaults
          </Button>
          <Button size="sm" onClick={() => onClose?.()}>
            Done
          </Button>
        </>
      }
    >
      <div className="-mx-1 mb-5 flex gap-1 overflow-x-auto rounded-lg bg-surface-inset p-1" role="tablist" aria-label="Settings sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-colors',
              tab === t.id
                ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-h-[56vh] space-y-5 overflow-y-auto pr-1">
        {tab === 'timer' && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberField
                id="set-work"
                label="Focus"
                suffix="min"
                value={settings.workMinutes}
                min={L.workMinutes.min}
                max={L.workMinutes.max}
                onChange={(v) => update({ workMinutes: v })}
              />
              <NumberField
                id="set-short"
                label="Short break"
                suffix="min"
                value={settings.shortBreakMinutes}
                min={L.shortBreakMinutes.min}
                max={L.shortBreakMinutes.max}
                onChange={(v) => update({ shortBreakMinutes: v })}
              />
              <NumberField
                id="set-long"
                label="Long break"
                suffix="min"
                value={settings.longBreakMinutes}
                min={L.longBreakMinutes.min}
                max={L.longBreakMinutes.max}
                onChange={(v) => update({ longBreakMinutes: v })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberField
                id="set-interval"
                label="Long break every"
                suffix="focus"
                value={settings.longBreakInterval}
                min={L.longBreakInterval.min}
                max={L.longBreakInterval.max}
                onChange={(v) => update({ longBreakInterval: v })}
              />
              <NumberField
                id="set-goal"
                label="Daily goal"
                suffix="a day"
                value={settings.dailyGoal}
                min={L.dailyGoal.min}
                max={L.dailyGoal.max}
                onChange={(v) => update({ dailyGoal: v })}
              />
            </div>
            <div className="space-y-2">
              <ToggleRow
                label="Auto-start breaks"
                description="Begin the break as soon as a focus session ends."
                checked={settings.autoStartBreaks}
                onChange={(v) => update({ autoStartBreaks: v })}
              />
              <ToggleRow
                label="Auto-start focus"
                description="Begin the next focus session as soon as a break ends."
                checked={settings.autoStartWork}
                onChange={(v) => update({ autoStartWork: v })}
              />
            </div>
            <p className="text-xs text-foreground-muted">
              Changes to durations apply to the current interval if it hasn&apos;t started yet, otherwise to the next one.
            </p>
          </>
        )}

        {tab === 'atmosphere' && (
          <>
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-foreground-muted">Focus scene</legend>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {FOCUS_SCENES.map((item) => {
                  const selected = settings.ambient.scene === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateAmbient({ scene: item.id })}
                      className={cn(
                        'overflow-hidden rounded-xl border bg-surface-card text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-border-hover'
                      )}
                    >
                      {item.imageSrc ? (
                        <img src={item.imageSrc} alt="" className="h-16 w-full object-cover" />
                      ) : (
                        <div className="flex h-16 w-full items-center justify-center bg-surface-inset text-xs text-foreground-muted">
                          Solid canvas
                        </div>
                      )}
                      <span className="block px-3 py-2 text-xs font-semibold text-foreground">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-foreground-muted">Ambient focus sound</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AMBIENT_SOUNDS.map((item) => {
                  const selected = settings.ambient.sound === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateAmbient({ sound: item.id })}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'border-primary bg-primary-tint text-on-primary-tint'
                          : 'border-border bg-surface-card text-foreground hover:border-border-hover'
                      )}
                    >
                      <span className="block text-xs font-semibold">{item.label}</span>
                      <span className="mt-0.5 block text-[11px] opacity-75">{item.description}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="set-ambient-volume" className="text-xs font-semibold text-foreground-muted">
                  Ambient volume
                </label>
                <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                  {Math.round(settings.ambient.volume * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                <input
                  id="set-ambient-volume"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(settings.ambient.volume * 100)}
                  onChange={(e) => updateAmbient({ volume: Number(e.target.value) / 100 })}
                  className="h-2 w-full cursor-pointer accent-primary"
                />
                <Volume2 className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-2">
              <ToggleRow
                label="Play only while focusing"
                description="Automatically pause ambient sound during breaks or when the timer is stopped."
                checked={settings.ambient.playOnlyDuringWork}
                onChange={(v) => updateAmbient({ playOnlyDuringWork: v })}
              />
              <ToggleRow
                label="Show scene behind main timer"
                description="Display the chosen image softly on the Timer page as well as inside Focus mode."
                checked={settings.ambient.showSceneOnTimer}
                onChange={(v) => updateAmbient({ showSceneOnTimer: v })}
              />
            </div>
          </>
        )}

        {tab === 'sound' && (
          <>
            <ToggleRow
              label="Sound notifications"
              description="Play a tone when an interval ends. Works offline."
              checked={settings.sound.enabled}
              onChange={(v) => updateSound({ enabled: v })}
            />
            <div className={cn('space-y-5', !settings.sound.enabled && 'pointer-events-none opacity-50')}>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="set-volume" className="text-xs font-semibold text-foreground-muted">
                    Volume
                  </label>
                  <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                    {Math.round(settings.sound.volume * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                  <input
                    id="set-volume"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(settings.sound.volume * 100)}
                    onChange={(e) => updateSound({ volume: Number(e.target.value) / 100 })}
                    onPointerUp={() => onTestSound?.(settings.sound.workEndSound, settings.sound.volume)}
                    className="h-2 w-full cursor-pointer accent-primary"
                  />
                  <Volume2 className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                </div>
              </div>
              <SoundSelect
                id="set-sound-work"
                label="When focus ends"
                value={settings.sound.workEndSound}
                volume={settings.sound.volume}
                onChange={(v) => updateSound({ workEndSound: v })}
                onTest={onTestSound}
              />
              <SoundSelect
                id="set-sound-break"
                label="When a break ends"
                value={settings.sound.breakEndSound}
                volume={settings.sound.volume}
                onChange={(v) => updateSound({ breakEndSound: v })}
                onTest={onTestSound}
              />
            </div>

            <div className="space-y-4 border-t border-border pt-5">
              <ToggleRow
                label="Clock ticking"
                description="Gentle mechanical tick-tock every second while Focus is running."
                checked={settings.sound.ticking}
                onChange={(v) => {
                  updateSound({ ticking: v });
                  if (v) onTestTick?.(settings.sound.tickingVolume);
                }}
              />
              <div className={cn(!settings.sound.ticking && 'pointer-events-none opacity-50')}>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="set-ticking-volume" className="text-xs font-semibold text-foreground-muted">
                    Ticking volume
                  </label>
                  <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                    {Math.round(settings.sound.tickingVolume * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                  <input
                    id="set-ticking-volume"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(settings.sound.tickingVolume * 100)}
                    onChange={(e) => updateSound({ tickingVolume: Number(e.target.value) / 100 })}
                    onPointerUp={() => onTestTick?.(settings.sound.tickingVolume)}
                    className="h-2 w-full cursor-pointer accent-primary"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={settings.sound.tickingVolume === 0}
                    onClick={() => onTestTick?.(settings.sound.tickingVolume)}
                    aria-label="Preview clock ticking"
                    title="Preview tick-tock"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'appearance' && (
          <>
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-foreground-muted">Mode</legend>
              <div className="grid grid-cols-3 gap-2">
                {MODE_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={settings.appearance.mode === m.id}
                    onClick={() => updateAppearance({ mode: m.id })}
                    className={cn(
                      'flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors',
                      settings.appearance.mode === m.id
                        ? 'border-primary bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:text-foreground'
                    )}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-foreground-muted">Accent color</legend>
              <div className="grid grid-cols-5 gap-2">
                {ACCENT_OPTIONS.map((a) => {
                  const active = settings.appearance.accent === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      data-accent={a.id}
                      aria-pressed={active}
                      onClick={() => updateAppearance({ accent: a.id })}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-colors',
                        active ? 'border-primary bg-primary-tint' : 'border-border bg-surface-card hover:border-border-hover'
                      )}
                    >
                      <span className="relative h-8 w-8 rounded-full bg-primary shadow-[var(--shadow-tier-1)]">
                        {active && <span className="absolute inset-[10px] rounded-full bg-on-primary" />}
                      </span>
                      <span className="text-[11px] font-semibold text-foreground">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-foreground-muted">Font</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {FONT_OPTIONS.map((f) => {
                  const active = settings.appearance.font === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      data-font={f.id}
                      aria-pressed={active}
                      onClick={() => updateAppearance({ font: f.id })}
                      className={cn(
                        'rounded-xl border p-3 text-left font-sans transition-colors',
                        active ? 'border-primary bg-primary-tint' : 'border-border bg-surface-card hover:border-border-hover'
                      )}
                    >
                      <span className="block text-lg font-bold text-foreground">Aa</span>
                      <span className="block text-sm font-semibold text-foreground">{f.label}</span>
                      <span className="block text-xs text-foreground-muted">{f.sample}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}

        {tab === 'focus' && (
          <>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground-muted">Focus mode</h3>
              <ToggleRow
                label="Enter focus mode automatically"
                description="Hide tasks, stats and navigation whenever a focus session starts."
                checked={settings.focus.autoEnterOnWork}
                onChange={(v) => updateFocus({ autoEnterOnWork: v })}
              />
              <ToggleRow
                label="Go fullscreen"
                description="Fill the whole screen to shut out other apps and tabs."
                checked={settings.focus.fullscreen}
                onChange={(v) => updateFocus({ fullscreen: v })}
              />
              <ToggleRow
                label="Warn before leaving"
                description="Ask before closing or reloading the tab during a focus session."
                checked={settings.focus.warnOnLeave}
                onChange={(v) => updateFocus({ warnOnLeave: v })}
              />
              <ToggleRow
                label="Mini timer on Stats"
                description="Keep a small timer in the corner while you look at your stats."
                checked={settings.focus.miniTimer}
                onChange={(v) => updateFocus({ miniTimer: v })}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground-muted">System notifications</h3>
              <ToggleRow
                label="Desktop notifications"
                description={
                  notificationPermission === 'unsupported'
                    ? 'Your browser does not support notifications.'
                    : notificationPermission === 'denied'
                      ? 'Blocked in browser settings — allow notifications for this site to enable.'
                      : 'Get notified when an interval ends, even in another tab.'
                }
                checked={settings.notifications && notificationPermission === 'granted'}
                disabled={notificationPermission === 'unsupported' || notificationPermission === 'denied'}
                onChange={(v) => {
                  if (v && notificationPermission !== 'granted') onRequestNotifications?.();
                  update({ notifications: v });
                }}
              />
              <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
                {notificationPermission === 'granted' ? (
                  <Bell className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                ) : (
                  <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Permission: <span className="font-semibold text-foreground">{notificationPermission}</span>
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

