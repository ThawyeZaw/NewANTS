/**
 * Flow Pomodoro — offline-safe notification tones synthesised with the Web Audio API.
 * No audio assets are required, so sounds work with the PWA fully offline.
 */
import type { SoundId } from './engine';

export const SOUND_OPTIONS: { id: SoundId; label: string; description: string }[] = [
  { id: 'bell', label: 'Bell', description: 'Warm double bell strike' },
  { id: 'chime', label: 'Chime', description: 'Bright rising arpeggio' },
  { id: 'digital', label: 'Digital', description: 'Classic triple beep' },
  { id: 'soft', label: 'Soft', description: 'Gentle low swell' },
  { id: 'none', label: 'Silent', description: 'No sound' },
];

type AudioContextCtor = typeof AudioContext;

let sharedContext: AudioContext | null = null;
let tickNoiseBuffer: AudioBuffer | null = null;

function getTickNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (tickNoiseBuffer && tickNoiseBuffer.sampleRate === ctx.sampleRate) return tickNoiseBuffer;
  const length = Math.max(256, Math.round(ctx.sampleRate * 0.025));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    // Decay noise inside the buffer itself for a snappy mechanical escapement snap.
    const env = Math.exp((-6 * i) / length);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  tickNoiseBuffer = buffer;
  return buffer;
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedContext) return sharedContext;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    sharedContext = new Ctor();
  } catch {
    sharedContext = null;
  }
  return sharedContext;
}

/** Call from a user gesture (e.g. Start button) so later automatic tones are allowed to play. */
export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }
}

interface ToneSpec {
  frequency: number;
  start: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  attack?: number;
}

function scheduleTone(ctx: AudioContext, master: GainNode, spec: ToneSpec) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t0 = ctx.currentTime + spec.start;
  const attack = spec.attack ?? 0.01;
  osc.type = spec.type;
  osc.frequency.setValueAtTime(spec.frequency, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, spec.gain), t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + spec.duration + 0.05);
}

function tonesFor(sound: SoundId): ToneSpec[] {
  switch (sound) {
    case 'bell': {
      const strike = (start: number): ToneSpec[] => [
        { frequency: 880, start, duration: 1.6, type: 'sine', gain: 0.5 },
        { frequency: 1760, start, duration: 0.9, type: 'sine', gain: 0.18 },
        { frequency: 2637, start, duration: 0.5, type: 'sine', gain: 0.08 },
      ];
      return [...strike(0), ...strike(0.7)];
    }
    case 'chime':
      return [1047, 1319, 1568, 2093].map((frequency, i) => ({
        frequency,
        start: i * 0.14,
        duration: 0.9,
        type: 'triangle' as OscillatorType,
        gain: 0.35,
      }));
    case 'digital':
      return [0, 0.22, 0.44].map((start) => ({
        frequency: 1000,
        start,
        duration: 0.12,
        type: 'square' as OscillatorType,
        gain: 0.12,
        attack: 0.005,
      }));
    case 'soft':
      return [
        { frequency: 392, start: 0, duration: 1.4, type: 'sine', gain: 0.4, attack: 0.25 },
        { frequency: 523.25, start: 0.35, duration: 1.6, type: 'sine', gain: 0.35, attack: 0.3 },
      ];
    case 'none':
    default:
      return [];
  }
}

/** Play a notification tone at `volume` (0 – 1). Safe to call during SSR / unsupported browsers. */
export function playSound(sound: SoundId, volume: number): void {
  if (sound === 'none' || volume <= 0) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const master = ctx.createGain();
    // Perceptual (squared) volume curve feels more natural on a linear slider.
    master.gain.value = Math.min(1, Math.max(0, volume)) ** 2;
    master.connect(ctx.destination);
    for (const spec of tonesFor(sound)) scheduleTone(ctx, master, spec);
  } catch {
    // Audio failures must never break the timer.
  }
}

/** Subtle tactile start/pause click for timer controls. */
export function playFocusCue(kind: 'start' | 'pause', volume: number): void {
  if (volume <= 0) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const master = ctx.createGain();
    master.gain.value = Math.min(1, Math.max(0, volume)) ** 2 * 0.25;
    master.connect(ctx.destination);
    scheduleTone(ctx, master, {
      frequency: kind === 'start' ? 587.33 : 440,
      start: 0,
      duration: 0.09,
      type: 'sine',
      gain: 0.45,
      attack: 0.004,
    });
  } catch {
    // ignore
  }
}

function scheduleClockImpulse(
  ctx: AudioContext,
  master: GainNode,
  kind: 'tick' | 'tock',
  offsetSeconds = 0
): void {
  const t0 = ctx.currentTime + offsetSeconds;
  const isTick = kind === 'tick';

  // 1. Crisp damped escapement pallet snap (filtered white noise transient)
  const noise = ctx.createBufferSource();
  noise.buffer = getTickNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(isTick ? 2750 : 2050, t0);
  bp.Q.setValueAtTime(4.2, t0);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t0);
  noiseGain.gain.linearRampToValueAtTime(isTick ? 0.92 : 0.84, t0 + 0.0015);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + (isTick ? 0.015 : 0.019));

  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(t0);
  noise.stop(t0 + 0.025);

  // 2. Subtle damped watch-case resonance drop (`tick` brighter than `tock`)
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(isTick ? 1480 : 1120, t0);
  osc.frequency.exponentialRampToValueAtTime(isTick ? 480 : 340, t0 + 0.014);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.0001, t0);
  oscGain.gain.linearRampToValueAtTime(isTick ? 0.26 : 0.22, t0 + 0.0015);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.016);

  osc.connect(oscGain);
  oscGain.connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.022);
}

/** Play a classic mechanical wristwatch tick (`even`) or tock (`odd`) calibrated cleanly for focus. */
export function playClockTick(kind: 'tick' | 'tock', volume: number): void {
  if (volume <= 0) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    // Skip rather than queuing ticks while the AudioContext is still blocked by autoplay policy.
    if (ctx.state !== 'running') {
      void ctx.resume().catch(() => undefined);
      return;
    }
    const master = ctx.createGain();
    master.gain.setValueAtTime(Math.min(1, Math.max(0, volume)) ** 2 * 0.45, ctx.currentTime);
    master.connect(ctx.destination);
    scheduleClockImpulse(ctx, master, kind, 0);
  } catch {
    // Audio failures must never break the timer.
  }
}

/** Play a brief 2-beat tick-tock preview sample on a direct user interaction (Settings / Focus Mode). */
export function playClockTickSample(volume: number): void {
  if (volume <= 0) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const master = ctx.createGain();
    master.gain.setValueAtTime(Math.min(1, Math.max(0, volume)) ** 2 * 0.45, ctx.currentTime);
    master.connect(ctx.destination);
    scheduleClockImpulse(ctx, master, 'tick', 0);
    scheduleClockImpulse(ctx, master, 'tock', 0.45);
  } catch {
    // ignore
  }
}

