/**
 * Flow Pomodoro — Focus scenes (background imagery) & offline Web Audio ambient soundscapes.
 */
import type { AmbientSoundId, FocusSceneId } from './engine';
import { unlockAudio } from './sound';

export interface FocusSceneOption {
  id: FocusSceneId;
  label: string;
  imageSrc: string | null;
  suggestedSound: AmbientSoundId;
}

export interface AmbientSoundOption {
  id: AmbientSoundId;
  label: string;
  description: string;
}

export const FOCUS_SCENES: FocusSceneOption[] = [
  { id: 'none', label: 'Clean', imageSrc: null, suggestedSound: 'off' },
  {
    id: 'rainy-study',
    label: 'Rainy Study',
    imageSrc: '/scenes/rainy-study.jpg',
    suggestedSound: 'rain',
  },
  {
    id: 'quiet-library',
    label: 'Quiet Library',
    imageSrc: '/scenes/quiet-library.jpg',
    suggestedSound: 'cafe',
  },
  {
    id: 'misty-forest',
    label: 'Misty Forest',
    imageSrc: '/scenes/misty-forest.jpg',
    suggestedSound: 'forest',
  },
  {
    id: 'warm-fireplace',
    label: 'Warm Fireplace',
    imageSrc: '/scenes/warm-fireplace.jpg',
    suggestedSound: 'fireplace',
  },
];

export const AMBIENT_SOUNDS: AmbientSoundOption[] = [
  { id: 'off', label: 'Off', description: 'Silence' },
  { id: 'rain', label: 'Rain', description: 'Steady rain on glass' },
  { id: 'fireplace', label: 'Fireplace', description: 'Warm hearth & soft crackle' },
  { id: 'forest', label: 'Forest wind', description: 'Soft breeze through pines' },
  { id: 'cafe', label: 'Study room', description: 'Quiet ambient murmur' },
  { id: 'brown-noise', label: 'Brown noise', description: 'Deep low-frequency blanket' },
];

export function getFocusScene(id: FocusSceneId): FocusSceneOption {
  return FOCUS_SCENES.find((s) => s.id === id) ?? FOCUS_SCENES[0]!;
}

export function getAmbientSound(id: AmbientSoundId): AmbientSoundOption {
  return AMBIENT_SOUNDS.find((s) => s.id === id) ?? AMBIENT_SOUNDS[0]!;
}

type AudioContextCtor = typeof AudioContext;

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private activeSound: AmbientSoundId = 'off';
  private activeVolume = 0.45;
  private playing = false;
  private teardownGraph: (() => void) | null = null;
  private pinkBuffer: AudioBuffer | null = null;
  private brownBuffer: AudioBuffer | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext, kind: 'pink' | 'brown'): AudioBuffer {
    if (kind === 'pink' && this.pinkBuffer) return this.pinkBuffer;
    if (kind === 'brown' && this.brownBuffer) return this.brownBuffer;

    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (kind === 'brown') {
      let lastOut = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.2;
      }
      this.brownBuffer = buffer;
    } else {
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      this.pinkBuffer = buffer;
    }
    return buffer;
  }

  private buildGraph(sound: Exclude<AmbientSoundId, 'off'>): () => void {
    const ctx = this.ensureContext();
    if (!ctx) return () => undefined;

    unlockAudio();
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.connect(ctx.destination);
    this.master = master;

    const nodes: AudioNode[] = [master];
    const sources: AudioScheduledSourceNode[] = [];
    const timers: number[] = [];

    const makeLoop = (kind: 'pink' | 'brown', rate = 1) => {
      const src = ctx.createBufferSource();
      src.buffer = this.getNoiseBuffer(ctx, kind);
      src.loop = true;
      src.playbackRate.value = rate;
      src.start();
      sources.push(src);
      return src;
    };

    if (sound === 'brown-noise') {
      const src = makeLoop('brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 380;
      const g = ctx.createGain();
      g.gain.value = 0.85;
      src.connect(lp);
      lp.connect(g);
      g.connect(master);
      nodes.push(lp, g);
    } else if (sound === 'rain') {
      const bed = makeLoop('pink');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1350;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 260;
      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.52;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.11;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain);
      lfoGain.connect(lp.frequency);
      lfo.start();
      sources.push(lfo);

      bed.connect(hp);
      hp.connect(lp);
      lp.connect(bedGain);
      bedGain.connect(master);
      nodes.push(lp, hp, bedGain, lfoGain);

      // Gentle occasional raindrop taps
      const scheduleDrop = () => {
        if (this.activeSound !== 'rain' || !this.playing) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const t = ctx.currentTime;
        const freq = 750 + Math.random() * 900;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t + 0.045);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.025 + Math.random() * 0.025, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        osc.connect(g);
        g.connect(master);
        osc.start(t);
        osc.stop(t + 0.07);
        timers.push(window.setTimeout(scheduleDrop, 180 + Math.random() * 480));
      };
      timers.push(window.setTimeout(scheduleDrop, 200));
    } else if (sound === 'fireplace') {
      const rumble = makeLoop('brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 240;
      const rGain = ctx.createGain();
      rGain.gain.value = 0.9;
      rumble.connect(lp);
      lp.connect(rGain);
      rGain.connect(master);
      nodes.push(lp, rGain);

      // Soft sporadic wood crackles
      const crackle = () => {
        if (this.activeSound !== 'fireplace' || !this.playing) return;
        const src = ctx.createBufferSource();
        src.buffer = this.getNoiseBuffer(ctx, 'pink');
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1600 + Math.random() * 2400;
        bp.Q.value = 3.2;
        const g = ctx.createGain();
        const t = ctx.currentTime;
        const peak = 0.06 + Math.random() * 0.09;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random() * 0.03);
        src.connect(bp);
        bp.connect(g);
        g.connect(master);
        src.start(t, Math.random() * 3, 0.08);
        timers.push(window.setTimeout(crackle, 140 + Math.random() * 680));
      };
      timers.push(window.setTimeout(crackle, 180));
    } else if (sound === 'forest') {
      const breeze = makeLoop('pink', 0.85);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 460;
      bp.Q.value = 1.1;
      const g = ctx.createGain();
      g.gain.value = 0.65;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 190;
      lfo.connect(lfoGain);
      lfoGain.connect(bp.frequency);
      lfo.start();
      sources.push(lfo);

      const bed = makeLoop('brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 190;
      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.35;

      breeze.connect(bp);
      bp.connect(g);
      g.connect(master);
      bed.connect(lp);
      lp.connect(bedGain);
      bedGain.connect(master);
      nodes.push(bp, g, lfoGain, lp, bedGain);
    } else if (sound === 'cafe') {
      const murmur = makeLoop('brown');
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 340;
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.value = 0.72;

      const air = makeLoop('pink');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 620;
      const airGain = ctx.createGain();
      airGain.gain.value = 0.16;

      murmur.connect(bp);
      bp.connect(g);
      g.connect(master);
      air.connect(lp);
      lp.connect(airGain);
      airGain.connect(master);
      nodes.push(bp, g, lp, airGain);
    }

    return () => {
      for (const id of timers) window.clearTimeout(id);
      for (const src of sources) {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // ignore already stopped
        }
      }
      for (const n of nodes) {
        try {
          n.disconnect();
        } catch {
          // ignore
        }
      }
    };
  }

  public sync(sound: AmbientSoundId, volume: number, shouldPlay: boolean): void {
    const clampedVol = Math.min(1, Math.max(0, volume));
    const targetGain = shouldPlay && sound !== 'off' && clampedVol > 0 ? Math.max(0.0001, clampedVol ** 1.8 * 0.55) : 0;

    if (!shouldPlay || sound === 'off' || clampedVol === 0) {
      if (this.playing) {
        this.playing = false;
        this.activeSound = sound;
        this.fadeOutAndStop();
      } else {
        this.activeSound = sound;
      }
      return;
    }

    const needsRebuild = !this.playing || this.activeSound !== sound;
    this.activeSound = sound;
    this.activeVolume = clampedVol;

    if (needsRebuild) {
      if (this.teardownGraph) {
        this.teardownGraph();
        this.teardownGraph = null;
      }
      this.playing = true;
      this.teardownGraph = this.buildGraph(sound);
    }

    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), t);
      this.master.gain.exponentialRampToValueAtTime(targetGain, t + 0.35);
    }
  }

  private fadeOutAndStop(): void {
    const ctx = this.ctx;
    const master = this.master;
    const teardown = this.teardownGraph;
    this.master = null;
    this.teardownGraph = null;

    if (ctx && master && teardown) {
      try {
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
        master.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        window.setTimeout(teardown, 280);
        return;
      } catch {
        // fallback below
      }
    }
    teardown?.();
  }

  public stopAll(): void {
    this.playing = false;
    this.fadeOutAndStop();
  }
}

export const ambientAudio = new AmbientEngine();
