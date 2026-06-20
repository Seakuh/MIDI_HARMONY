"use client";

import type { BinauralSnapshot } from "@/types/audio";
import { classifyBeat } from "@/lib/dsp/binaural";

interface BinauralPanelProps {
  snapshot: BinauralSnapshot;
  onToggle: (enabled: boolean) => void;
  onLeft: (freq: number) => void;
  onRight: (freq: number) => void;
  onGain: (gain: number) => void;
}

/**
 * Binaural-beat module UI. Independent left/right carrier frequencies feed the
 * two output channels; the perceived beat frequency and its brain-wave band are
 * displayed live. Requires headphones for the effect.
 */
export function BinauralPanel({
  snapshot,
  onToggle,
  onLeft,
  onRight,
  onGain,
}: BinauralPanelProps) {
  const { enabled, leftFrequency, rightFrequency, beatFrequency, gain } = snapshot;
  const band = classifyBeat(beatFrequency);

  return (
    <section className={`panel binaural ${enabled ? "is-on" : ""}`}>
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Binaural Beat Mode</h2>
          <p className="panel__sub">Kopfhörer erforderlich</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`switch ${enabled ? "is-on" : ""}`}
          onClick={() => onToggle(!enabled)}
        >
          <span className="switch__knob" />
        </button>
      </header>

      <div className="binaural__beat">
        <div className="binaural__beat-value">
          {beatFrequency.toFixed(2)}
          <span className="binaural__beat-unit">Hz</span>
        </div>
        <div className="binaural__band">{band !== "—" ? `${band}-Band` : "—"}</div>
      </div>

      <div className="binaural__channels">
        <div className="binaural__ch">
          <div className="panel__label">Links · L</div>
          <div className="binaural__ch-freq">{leftFrequency.toFixed(1)} Hz</div>
          <input
            type="range"
            min={40}
            max={500}
            step={0.1}
            value={leftFrequency}
            onChange={(e) => onLeft(Number(e.target.value))}
            disabled={!enabled}
            aria-label="Frequenz links"
          />
        </div>

        <div className="binaural__ch">
          <div className="panel__label">Rechts · R</div>
          <div className="binaural__ch-freq">{rightFrequency.toFixed(1)} Hz</div>
          <input
            type="range"
            min={40}
            max={500}
            step={0.1}
            value={rightFrequency}
            onChange={(e) => onRight(Number(e.target.value))}
            disabled={!enabled}
            aria-label="Frequenz rechts"
          />
        </div>
      </div>

      <div className="binaural__gain">
        <div className="panel__label">Pegel</div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={gain}
          onChange={(e) => onGain(Number(e.target.value))}
          disabled={!enabled}
          aria-label="Binaural-Pegel"
        />
      </div>
    </section>
  );
}
