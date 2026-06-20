"use client";

import type { ChannelSnapshot } from "@/types/audio";
import { WAVEFORMS, WAVEFORM_LABELS, type Waveform } from "@/types/audio";
import type { ChannelFlags } from "@/hooks/useAudioEngine";

interface ChannelStripProps {
  snapshot: ChannelSnapshot;
  flags: ChannelFlags;
  onFader: (value: number) => void;
  onWaveform: (waveform: Waveform) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
}

const WAVE_GLYPH: Record<Waveform, string> = {
  sine: "∿",
  triangle: "△",
  sawtooth: "◣",
  square: "⊓",
};

export function ChannelStrip({
  snapshot,
  flags,
  onFader,
  onWaveform,
  onToggleMute,
  onToggleSolo,
}: ChannelStripProps) {
  const { index, frequency, ratio, gain, waveform, active } = snapshot;

  return (
    <div className={`strip ${active ? "strip--active" : ""}`}>
      <div className="strip__head">
        <span className="strip__num">{String(index + 1).padStart(2, "0")}</span>
        <span className={`strip__dot ${active ? "is-on" : ""}`} aria-hidden />
      </div>

      {/* Primary readouts */}
      <div className="strip__freq">{frequency.toFixed(1)}</div>
      <div className="strip__unit">Hz</div>

      <div className="strip__ratio">
        <span className="strip__ratio-label">{ratio.label}</span>
        <span className="strip__ratio-name">{ratio.name}</span>
      </div>

      {/* Fader */}
      <div className="strip__fader">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={gain}
          onChange={(e) => onFader(Number(e.target.value))}
          aria-label={`Lautstärke Kanal ${index + 1}`}
        />
        <div className="strip__gain">{Math.round(gain * 100)}%</div>
      </div>

      {/* Waveform selector */}
      <div className="strip__waves" role="group" aria-label="Oszillator-Typ">
        {WAVEFORMS.map((w) => (
          <button
            key={w}
            type="button"
            className={`wave-btn ${w === waveform ? "is-active" : ""}`}
            onClick={() => onWaveform(w)}
            title={WAVEFORM_LABELS[w]}
            aria-pressed={w === waveform}
          >
            {WAVE_GLYPH[w]}
          </button>
        ))}
      </div>

      {/* Mute / Solo */}
      <div className="strip__ms">
        <button
          type="button"
          className={`ms-btn ${flags.muted ? "is-mute" : ""}`}
          onClick={onToggleMute}
          aria-pressed={flags.muted}
        >
          M
        </button>
        <button
          type="button"
          className={`ms-btn ${flags.solo ? "is-solo" : ""}`}
          onClick={onToggleSolo}
          aria-pressed={flags.solo}
        >
          S
        </button>
      </div>
    </div>
  );
}
