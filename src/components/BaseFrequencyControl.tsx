"use client";

interface BaseFrequencyControlProps {
  value: number;
  onChange: (freq: number) => void;
}

/** Common reference pitches offered as quick presets. */
const PRESETS = [
  { label: "55 Hz · A1", value: 55 },
  { label: "110 Hz · A2", value: 110 },
  { label: "220 Hz · A3", value: 220 },
  { label: "432 Hz", value: 432 },
];

/**
 * Control for the global base (fundamental) frequency. All channel ratios are
 * computed relative to this value, so changing it transposes the whole system.
 */
export function BaseFrequencyControl({ value, onChange }: BaseFrequencyControlProps) {
  return (
    <div className="base-freq">
      <div className="base-freq__row">
        <div>
          <div className="panel__label">Grundfrequenz</div>
          <div className="base-freq__value">
            {value.toFixed(1)}
            <span className="base-freq__unit">Hz</span>
          </div>
        </div>
        <div className="base-freq__presets">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`preset-btn ${value === p.value ? "is-active" : ""}`}
              onClick={() => onChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <input
        type="range"
        min={20}
        max={880}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Grundfrequenz"
        className="base-freq__slider"
      />
    </div>
  );
}
