import type { HarmonicRatio } from "./harmony";

/** Supported oscillator waveforms. Mirrors the Web Audio `OscillatorType`. */
export type Waveform = "sine" | "triangle" | "sawtooth" | "square";

export const WAVEFORMS: Waveform[] = ["sine", "triangle", "sawtooth", "square"];

/** Human-readable labels for the waveform selector. */
export const WAVEFORM_LABELS: Record<Waveform, string> = {
  sine: "Sinus",
  triangle: "Dreieck",
  sawtooth: "Sägezahn",
  square: "Rechteck",
};

/** Number of independent harmonic oscillators / channel strips. */
export const CHANNEL_COUNT = 8;

/**
 * Immutable snapshot of a single channel's state, produced by the AudioEngine
 * for rendering. Decoupled from the live Web Audio nodes so React never touches
 * the audio hot path.
 */
export interface ChannelSnapshot {
  index: number;
  /** Linear gain 0..1. */
  gain: number;
  ratio: HarmonicRatio;
  /** Resulting frequency in Hz (= base frequency × ratio). */
  frequency: number;
  waveform: Waveform;
  /** True when the channel is audible (gain above the silence threshold). */
  active: boolean;
}

/** Snapshot of the binaural beat module. */
export interface BinauralSnapshot {
  enabled: boolean;
  leftFrequency: number;
  rightFrequency: number;
  /** |left − right| in Hz. */
  beatFrequency: number;
  gain: number;
}

/** Full engine snapshot consumed by the UI on each animation frame. */
export interface EngineSnapshot {
  baseFrequency: number;
  masterGain: number;
  channels: ChannelSnapshot[];
  binaural: BinauralSnapshot;
  harmonyScore: number;
  running: boolean;
}
