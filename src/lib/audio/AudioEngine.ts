import {
  CHANNEL_COUNT,
  type BinauralSnapshot,
  type ChannelSnapshot,
  type EngineSnapshot,
  type Waveform,
} from "@/types/audio";
import type { HarmonicRatio } from "@/types/harmony";
import { HARMONIC_RATIOS, analyzeHarmony } from "@/lib/dsp/harmony";
import { beatFrequency } from "@/lib/dsp/binaural";

/** Below this linear gain a channel is treated as silent / inactive. */
const SILENCE_THRESHOLD = 0.001;

/** Smoothing time (s) for parameter ramps — long enough to avoid clicks. */
const RAMP_TIME = 0.02;

/** Internal live state for one harmonic oscillator voice. */
interface EngineChannel {
  osc: OscillatorNode;
  gainNode: GainNode;
  gain: number;
  ratio: HarmonicRatio;
  waveform: Waveform;
}

/**
 * The audio core. Owns a single `AudioContext` and all Web Audio nodes.
 *
 * Design goals:
 *  - The MIDI hot path writes directly to AudioParams (no React, no GC churn),
 *    so control changes are heard with no perceptible latency.
 *  - React reads a plain-object {@link EngineSnapshot} via {@link snapshot} on
 *    each animation frame, never touching the live nodes.
 *
 * Signal graph:
 *
 *   8 × (Oscillator → Gain) ┐
 *                            ├─→ masterGain → analyser → destination
 *   Binaural L/R → merger ──┘
 *
 * A single AnalyserNode taps the post-mix bus and serves both the time-domain
 * (waveform) and frequency-domain (FFT spectrum) visualizations.
 */
export class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private analyserNode: AnalyserNode;

  private channels: EngineChannel[] = [];
  private baseFrequency = 110;
  private masterLevel = 0.8;

  // Binaural module.
  private binauralLeft: OscillatorNode;
  private binauralRight: OscillatorNode;
  private binauralLeftGain: GainNode;
  private binauralRightGain: GainNode;
  private binauralMerger: ChannelMergerNode;
  private binauralEnabled = false;
  private binauralLeftFreq = 110;
  private binauralRightFreq = 117;
  private binauralLevel = 0.5;

  constructor() {
    const Ctx: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterLevel;

    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;

    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);

    this.buildChannels();

    // ── Binaural graph ────────────────────────────────────────────────
    this.binauralMerger = this.ctx.createChannelMerger(2);

    this.binauralLeft = this.ctx.createOscillator();
    this.binauralLeftGain = this.ctx.createGain();
    this.binauralLeftGain.gain.value = 0;
    this.binauralLeft.type = "sine";
    this.binauralLeft.frequency.value = this.binauralLeftFreq;
    this.binauralLeft.connect(this.binauralLeftGain);
    this.binauralLeftGain.connect(this.binauralMerger, 0, 0); // → left

    this.binauralRight = this.ctx.createOscillator();
    this.binauralRightGain = this.ctx.createGain();
    this.binauralRightGain.gain.value = 0;
    this.binauralRight.type = "sine";
    this.binauralRight.frequency.value = this.binauralRightFreq;
    this.binauralRight.connect(this.binauralRightGain);
    this.binauralRightGain.connect(this.binauralMerger, 0, 1); // → right

    this.binauralMerger.connect(this.masterGain);

    this.binauralLeft.start();
    this.binauralRight.start();
  }

  private buildChannels(): void {
    for (let i = 0; i < CHANNEL_COUNT; i++) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      const ratio = HARMONIC_RATIOS[0]; // 1:1 by default
      osc.type = "sine";
      osc.frequency.value = this.baseFrequency * ratio.value;
      gainNode.gain.value = 0;

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);
      osc.start();

      this.channels.push({ osc, gainNode, gain: 0, ratio, waveform: "sine" });
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  /** Resume the context (must be called from a user gesture). */
  async resume(): Promise<void> {
    if (this.ctx.state !== "running") {
      await this.ctx.resume();
    }
  }

  get running(): boolean {
    return this.ctx.state === "running";
  }

  /** Tear down the context and free hardware resources. */
  async dispose(): Promise<void> {
    try {
      await this.ctx.close();
    } catch {
      /* already closed */
    }
  }

  /** The analyser tap, for visualization components. */
  get analyser(): AnalyserNode {
    return this.analyserNode;
  }

  // ── Per-channel control (MIDI hot path) ────────────────────────────

  /** Set channel gain from a linear 0..1 value. */
  setChannelGain(index: number, gain: number): void {
    const ch = this.channels[index];
    if (!ch) return;
    ch.gain = clamp01(gain);
    this.ramp(ch.gainNode.gain, ch.gain);
  }

  /** Snap a channel to a harmonic ratio and update its frequency. */
  setChannelRatio(index: number, ratio: HarmonicRatio): void {
    const ch = this.channels[index];
    if (!ch) return;
    ch.ratio = ratio;
    this.ramp(ch.osc.frequency, this.baseFrequency * ratio.value);
  }

  setChannelWaveform(index: number, waveform: Waveform): void {
    const ch = this.channels[index];
    if (!ch) return;
    ch.waveform = waveform;
    ch.osc.type = waveform;
  }

  /** Cycle a channel's waveform — handy for a single button press. */
  cycleChannelWaveform(index: number): void {
    const order: Waveform[] = ["sine", "triangle", "sawtooth", "square"];
    const ch = this.channels[index];
    if (!ch) return;
    const next = order[(order.indexOf(ch.waveform) + 1) % order.length];
    this.setChannelWaveform(index, next);
  }

  /** Mute/unmute by snapping gain to 0 (mute remembers nothing — UI does). */
  setChannelMuted(index: number, muted: boolean, restoreGain: number): void {
    this.setChannelGain(index, muted ? 0 : restoreGain);
  }

  // ── Global control ─────────────────────────────────────────────────

  setBaseFrequency(freq: number): void {
    this.baseFrequency = clamp(freq, 20, 2000);
    // Re-tune every channel to preserve its harmonic ratio.
    for (const ch of this.channels) {
      this.ramp(ch.osc.frequency, this.baseFrequency * ch.ratio.value);
    }
  }

  setMasterGain(gain: number): void {
    this.masterLevel = clamp01(gain);
    this.ramp(this.masterGain.gain, this.masterLevel);
  }

  // ── Binaural module ────────────────────────────────────────────────

  setBinauralEnabled(enabled: boolean): void {
    this.binauralEnabled = enabled;
    const level = enabled ? this.binauralLevel : 0;
    this.ramp(this.binauralLeftGain.gain, level);
    this.ramp(this.binauralRightGain.gain, level);
  }

  setBinauralLeft(freq: number): void {
    this.binauralLeftFreq = clamp(freq, 20, 2000);
    this.ramp(this.binauralLeft.frequency, this.binauralLeftFreq);
  }

  setBinauralRight(freq: number): void {
    this.binauralRightFreq = clamp(freq, 20, 2000);
    this.ramp(this.binauralRight.frequency, this.binauralRightFreq);
  }

  setBinauralGain(gain: number): void {
    this.binauralLevel = clamp01(gain);
    if (this.binauralEnabled) {
      this.ramp(this.binauralLeftGain.gain, this.binauralLevel);
      this.ramp(this.binauralRightGain.gain, this.binauralLevel);
    }
  }

  // ── Snapshot for the UI ────────────────────────────────────────────

  snapshot(): EngineSnapshot {
    const channels: ChannelSnapshot[] = this.channels.map((ch, index) => ({
      index,
      gain: ch.gain,
      ratio: ch.ratio,
      frequency: this.baseFrequency * ch.ratio.value,
      waveform: ch.waveform,
      active: ch.gain > SILENCE_THRESHOLD,
    }));

    const activeFreqs = channels
      .filter((c) => c.active)
      .map((c) => c.frequency);

    const binaural: BinauralSnapshot = {
      enabled: this.binauralEnabled,
      leftFrequency: this.binauralLeftFreq,
      rightFrequency: this.binauralRightFreq,
      beatFrequency: beatFrequency(this.binauralLeftFreq, this.binauralRightFreq),
      gain: this.binauralLevel,
    };

    return {
      baseFrequency: this.baseFrequency,
      masterGain: this.masterLevel,
      channels,
      binaural,
      harmonyScore: analyzeHarmony(activeFreqs).score,
      running: this.running,
    };
  }

  // ── Internals ──────────────────────────────────────────────────────

  /** Click-free parameter change via a short linear ramp. */
  private ramp(param: AudioParam, target: number): void {
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + RAMP_TIME);
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function clamp01(x: number): number {
  return clamp(x, 0, 1);
}
