"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine } from "@/lib/audio/AudioEngine";
import { CHANNEL_COUNT, type EngineSnapshot, type Waveform } from "@/types/audio";
import { quantizeToRatio } from "@/lib/dsp/harmony";

/** UI-level flags that the engine itself does not track. */
export interface ChannelFlags {
  muted: boolean;
  solo: boolean;
}

export interface AudioControls {
  /** Resume the AudioContext — must run inside a user gesture. */
  start: () => Promise<void>;
  setFader: (index: number, value: number) => void;
  /** Set a channel's harmonic ratio from a normalized 0..1 knob position. */
  setKnob: (index: number, normalized: number) => void;
  toggleMute: (index: number) => void;
  toggleSolo: (index: number) => void;
  setWaveform: (index: number, waveform: Waveform) => void;
  cycleWaveform: (index: number) => void;
  setBaseFrequency: (freq: number) => void;
  setMasterGain: (gain: number) => void;
  setBinauralEnabled: (enabled: boolean) => void;
  setBinauralLeft: (freq: number) => void;
  setBinauralRight: (freq: number) => void;
  setBinauralGain: (gain: number) => void;
}

export interface UseAudioEngineResult {
  started: boolean;
  snapshot: EngineSnapshot | null;
  channelFlags: ChannelFlags[];
  analyser: AnalyserNode | null;
  controls: AudioControls;
}

const emptyFlags = (): ChannelFlags[] =>
  Array.from({ length: CHANNEL_COUNT }, () => ({ muted: false, solo: false }));

/**
 * React adapter around {@link AudioEngine}.
 *
 * Centralises the mute / solo / fader orchestration that maps user intent onto
 * the engine's per-channel gains, and publishes an {@link EngineSnapshot} once
 * per animation frame for latency-free, render-friendly UI updates.
 */
export function useAudioEngine(): UseAudioEngineResult {
  const engineRef = useRef<AudioEngine | null>(null);

  // Source-of-truth refs for synchronous access from the MIDI hot path.
  const faderRef = useRef<number[]>(Array(CHANNEL_COUNT).fill(0));
  const mutedRef = useRef<boolean[]>(Array(CHANNEL_COUNT).fill(false));
  const soloRef = useRef<boolean[]>(Array(CHANNEL_COUNT).fill(false));

  const [started, setStarted] = useState(false);
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null);
  const [channelFlags, setChannelFlags] = useState<ChannelFlags[]>(emptyFlags);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  /** Recompute every channel's effective gain (respecting mute & solo). */
  const applyGains = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const anySolo = soloRef.current.some(Boolean);
    for (let i = 0; i < CHANNEL_COUNT; i++) {
      const silenced = mutedRef.current[i] || (anySolo && !soloRef.current[i]);
      engine.setChannelGain(i, silenced ? 0 : faderRef.current[i]);
    }
  }, []);

  const syncFlags = useCallback(() => {
    setChannelFlags(
      Array.from({ length: CHANNEL_COUNT }, (_, i) => ({
        muted: mutedRef.current[i],
        solo: soloRef.current[i],
      }))
    );
  }, []);

  const start = useCallback(async () => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
      setAnalyser(engineRef.current.analyser);
    }
    await engineRef.current.resume();
    setStarted(true);
  }, []);

  const setFader = useCallback(
    (index: number, value: number) => {
      faderRef.current[index] = Math.min(1, Math.max(0, value));
      applyGains();
    },
    [applyGains]
  );

  const toggleMute = useCallback(
    (index: number) => {
      mutedRef.current[index] = !mutedRef.current[index];
      applyGains();
      syncFlags();
    },
    [applyGains, syncFlags]
  );

  const toggleSolo = useCallback(
    (index: number) => {
      soloRef.current[index] = !soloRef.current[index];
      applyGains();
      syncFlags();
    },
    [applyGains, syncFlags]
  );

  const setWaveform = useCallback((index: number, waveform: Waveform) => {
    engineRef.current?.setChannelWaveform(index, waveform);
  }, []);

  const cycleWaveform = useCallback((index: number) => {
    engineRef.current?.cycleChannelWaveform(index);
  }, []);

  const setBaseFrequency = useCallback((freq: number) => {
    engineRef.current?.setBaseFrequency(freq);
  }, []);

  const setMasterGain = useCallback((gain: number) => {
    engineRef.current?.setMasterGain(gain);
  }, []);

  const setBinauralEnabled = useCallback((enabled: boolean) => {
    engineRef.current?.setBinauralEnabled(enabled);
  }, []);

  const setBinauralLeft = useCallback((freq: number) => {
    engineRef.current?.setBinauralLeft(freq);
  }, []);

  const setBinauralRight = useCallback((freq: number) => {
    engineRef.current?.setBinauralRight(freq);
  }, []);

  const setBinauralGain = useCallback((gain: number) => {
    engineRef.current?.setBinauralGain(gain);
  }, []);

  /** Snap a channel's ratio from a normalized 0..1 knob position. */
  const setKnob = useCallback((index: number, normalized: number) => {
    engineRef.current?.setChannelRatio(index, quantizeToRatio(normalized));
  }, []);

  // Publish a snapshot once per frame while running.
  useEffect(() => {
    if (!started) return;
    let raf = 0;
    const tick = () => {
      const engine = engineRef.current;
      if (engine) setSnapshot(engine.snapshot());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  // Dispose on unmount.
  useEffect(() => {
    return () => {
      void engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const controls: AudioControls = {
    start,
    setFader,
    setKnob,
    toggleMute,
    toggleSolo,
    setWaveform,
    cycleWaveform,
    setBaseFrequency,
    setMasterGain,
    setBinauralEnabled,
    setBinauralLeft,
    setBinauralRight,
    setBinauralGain,
  };

  return { started, snapshot, channelFlags, analyser, controls };
}
