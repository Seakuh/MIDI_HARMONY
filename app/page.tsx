"use client";

import { useCallback, useState } from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useMidi } from "@/hooks/useMidi";
import { isButtonPress } from "@/lib/midi/nanokontrol2";
import type { MidiControlEvent } from "@/types/midi";
import { ChannelStrip } from "@/components/ChannelStrip";
import { WaveformCanvas } from "@/components/WaveformCanvas";
import { SpectrumCanvas } from "@/components/SpectrumCanvas";
import { HarmonyMeter } from "@/components/HarmonyMeter";
import { BinauralPanel } from "@/components/BinauralPanel";
import { BaseFrequencyControl } from "@/components/BaseFrequencyControl";
import { MidiStatus } from "@/components/MidiStatus";

export default function Home() {
  const { started, snapshot, channelFlags, analyser, controls } = useAudioEngine();

  const [baseFreq, setBaseFreq] = useState(110);
  const [masterGain, setMasterGain] = useState(0.8);

  // ── MIDI → audio routing ─────────────────────────────────────────────
  // Held in a ref by useMidi, so this can close over the latest `controls`
  // without re-subscribing the device on every render.
  const handleMidi = useCallback(
    (event: MidiControlEvent) => {
      switch (event.type) {
        case "fader":
          controls.setFader(event.channel, event.normalized);
          break;
        case "knob":
          controls.setKnob(event.channel, event.normalized);
          break;
        case "mute":
          if (isButtonPress(event)) controls.toggleMute(event.channel);
          break;
        case "solo":
          if (isButtonPress(event)) controls.toggleSolo(event.channel);
          break;
        case "rec":
          // Record button cycles the channel's oscillator waveform.
          if (isButtonPress(event)) controls.cycleWaveform(event.channel);
          break;
        case "transport":
          if (!isButtonPress(event)) break;
          if (event.transport === "play") void controls.start();
          if (event.transport === "cycle")
            controls.setBinauralEnabled(!(snapshot?.binaural.enabled ?? false));
          break;
      }
    },
    [controls, snapshot]
  );

  const midi = useMidi(handleMidi);

  const handleBaseFreq = useCallback(
    (freq: number) => {
      setBaseFreq(freq);
      controls.setBaseFrequency(freq);
    },
    [controls]
  );

  const handleMaster = useCallback(
    (gain: number) => {
      setMasterGain(gain);
      controls.setMasterGain(gain);
    },
    [controls]
  );

  return (
    <main className="app">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="brand">
          <h1 className="brand__title">HARMONIE</h1>
          <span className="brand__sub">Harmonisches Frequenzsystem</span>
        </div>

        <div className="topbar__right">
          <div className="master">
            <span className="panel__label">Master</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={masterGain}
              onChange={(e) => handleMaster(Number(e.target.value))}
              aria-label="Master-Lautstärke"
              className="master__slider"
            />
          </div>
          <MidiStatus
            state={midi.state}
            inputs={midi.inputs}
            lastEvent={midi.lastEvent}
            onConnect={midi.connect}
          />
        </div>
      </header>

      {/* ── Start gate ─────────────────────────────────────────────── */}
      {!started && (
        <div className="gate">
          <div className="gate__card">
            <h2 className="gate__title">Audio-Engine starten</h2>
            <p className="gate__text">
              Aus Browser-Sicherheitsgründen muss die Klangerzeugung per Klick
              aktiviert werden. Danach den nanoKONTROL2 verbinden.
            </p>
            <button type="button" className="btn btn--primary" onClick={() => void controls.start()}>
              System starten
            </button>
          </div>
        </div>
      )}

      {/* ── Base frequency ─────────────────────────────────────────── */}
      <section className="panel">
        <BaseFrequencyControl value={baseFreq} onChange={handleBaseFreq} />
      </section>

      {/* ── Channel strips ─────────────────────────────────────────── */}
      <section className="channels">
        {snapshot?.channels.map((ch) => (
          <ChannelStrip
            key={ch.index}
            snapshot={ch}
            flags={channelFlags[ch.index] ?? { muted: false, solo: false }}
            onFader={(v) => controls.setFader(ch.index, v)}
            onWaveform={(w) => controls.setWaveform(ch.index, w)}
            onToggleMute={() => controls.toggleMute(ch.index)}
            onToggleSolo={() => controls.toggleSolo(ch.index)}
          />
        ))}
        {!snapshot &&
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="strip strip--ghost" />
          ))}
      </section>

      {/* ── Visualization ──────────────────────────────────────────── */}
      <section className="viz">
        <div className="panel viz__card">
          <div className="panel__label">Wellenform · Zeitbereich</div>
          <WaveformCanvas analyser={analyser} />
        </div>
        <div className="panel viz__card">
          <div className="panel__label">Spektrum · FFT</div>
          <SpectrumCanvas analyser={analyser} />
        </div>
      </section>

      {/* ── Harmony + Binaural ─────────────────────────────────────── */}
      <section className="bottom">
        <div className="panel harmony-panel">
          <div className="panel__label">Harmonie-Score</div>
          <HarmonyMeter score={snapshot?.harmonyScore ?? 100} />
        </div>

        {snapshot && (
          <BinauralPanel
            snapshot={snapshot.binaural}
            onToggle={controls.setBinauralEnabled}
            onLeft={controls.setBinauralLeft}
            onRight={controls.setBinauralRight}
            onGain={controls.setBinauralGain}
          />
        )}
      </section>

      <footer className="footer">
        Web MIDI · Web Audio · 8 Oszillatoren · keine externen Audio-Libraries
      </footer>
    </main>
  );
}
