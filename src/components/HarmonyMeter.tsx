"use client";

interface HarmonyMeterProps {
  /** 0..100 consonance score. */
  score: number;
}

function scoreColor(score: number): string {
  // Red (dissonant) → amber → green (consonant).
  const hue = (score / 100) * 130; // 0 → 130
  return `hsl(${hue}, 70%, 55%)`;
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Rein";
  if (score >= 75) return "Konsonant";
  if (score >= 55) return "Stabil";
  if (score >= 35) return "Gespannt";
  return "Dissonant";
}

/**
 * Large radial harmony gauge. Renders the 0–100 % consonance score derived from
 * the pairwise frequency relationships of all active voices.
 */
export function HarmonyMeter({ score }: HarmonyMeterProps) {
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = scoreColor(score);

  return (
    <div className="harmony">
      <svg width={200} height={200} viewBox="0 0 200 200" className="harmony__svg">
        <circle
          cx={100}
          cy={100}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={12}
        />
        <circle
          cx={100}
          cy={100}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke-dashoffset 120ms linear, stroke 200ms" }}
        />
      </svg>
      <div className="harmony__center">
        <div className="harmony__score" style={{ color }}>
          {score}
          <span className="harmony__pct">%</span>
        </div>
        <div className="harmony__label">{scoreLabel(score)}</div>
      </div>
    </div>
  );
}
