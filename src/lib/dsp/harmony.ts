import type {
  HarmonicRatio,
  HarmonyAnalysis,
  HarmonyPair,
} from "@/types/harmony";

/**
 * The catalogue of supported harmonic ratios, ordered from the most consonant
 * (unison) outward. Knob values are quantized onto this list.
 */
export const HARMONIC_RATIOS: HarmonicRatio[] = [
  { label: "1:1", name: "Unisono", numerator: 1, denominator: 1, value: 1 },
  { label: "6:5", name: "kleine Terz", numerator: 6, denominator: 5, value: 6 / 5 },
  { label: "5:4", name: "große Terz", numerator: 5, denominator: 4, value: 5 / 4 },
  { label: "4:3", name: "Quarte", numerator: 4, denominator: 3, value: 4 / 3 },
  { label: "3:2", name: "Quinte", numerator: 3, denominator: 2, value: 3 / 2 },
  { label: "8:5", name: "kleine Sexte", numerator: 8, denominator: 5, value: 8 / 5 },
  { label: "15:8", name: "große Septime", numerator: 15, denominator: 8, value: 15 / 8 },
  { label: "2:1", name: "Oktave", numerator: 2, denominator: 1, value: 2 },
];

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/**
 * Quantize a normalized knob position (0..1) onto the harmonic ratio catalogue.
 *
 * The knob travel is divided into equal segments — one per ratio — so each
 * ratio is reachable with a comfortable amount of detent room. This is the
 * "intelligent" quantization: arbitrary continuous input always snaps to a
 * musically meaningful interval instead of an irrational frequency.
 */
export function quantizeToRatio(normalized: number): HarmonicRatio {
  const n = HARMONIC_RATIOS.length;
  const index = Math.min(n - 1, Math.max(0, Math.round(clamp01(normalized) * (n - 1))));
  return HARMONIC_RATIOS[index];
}

/** Convenience: quantize a raw 7-bit MIDI value (0..127) to a ratio. */
export function quantizeMidiToRatio(value: number): HarmonicRatio {
  return quantizeToRatio(value / 127);
}

/**
 * Best small-integer approximation of a positive real number via the
 * continued-fraction algorithm, bounded by a maximum denominator.
 *
 * Returns the convergent p/q closest to `x` with `q <= maxDenominator`, along
 * with the absolute error. Used to estimate how "simple" an arbitrary interval
 * is when scoring harmony.
 */
export function bestRational(
  x: number,
  maxDenominator = 16
): { p: number; q: number; error: number } {
  if (!Number.isFinite(x) || x <= 0) return { p: 0, q: 1, error: Infinity };

  // Continued-fraction expansion with convergent tracking.
  let h0 = 0;
  let h1 = 1;
  let k0 = 1;
  let k1 = 0;
  let value = x;

  let best = { p: Math.round(x), q: 1, error: Math.abs(x - Math.round(x)) };

  for (let i = 0; i < 32; i++) {
    const a = Math.floor(value);
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;

    if (k2 > maxDenominator) break;

    const approx = h2 / k2;
    const error = Math.abs(x - approx);
    if (error < best.error) best = { p: h2, q: k2, error };

    h0 = h1;
    h1 = h2;
    k0 = k1;
    k1 = k2;

    const frac = value - a;
    if (frac < 1e-9) break;
    value = 1 / frac;
  }

  return best;
}

/**
 * Consonance of the interval between two frequencies, in 0..1.
 *
 * Combines two psychoacoustic intuitions:
 *  1. Simple ratios are more consonant — measured by Tenney height
 *     (log2(p·q)) of the best rational approximation.
 *  2. Mistuned intervals beat against the ideal — penalized by the
 *     approximation error.
 */
export function pairConsonance(f1: number, f2: number): { consonance: number; label: string } {
  if (f1 <= 0 || f2 <= 0) return { consonance: 0, label: "—" };

  const ratio = Math.max(f1, f2) / Math.min(f1, f2);
  const { p, q, error } = bestRational(ratio, 16);

  // Tenney height normalized against the worst case in our denominator bound.
  const complexity = Math.log2(p * q);
  const maxComplexity = Math.log2(16 * 15); // ~7.9, just above our richest ratio
  const simplicity = clamp01(1 - complexity / maxComplexity);

  // Deviation from the ideal interval (in ratio units) → beating penalty.
  const detune = clamp01(error / 0.04);
  const purity = 1 - detune;

  return { consonance: clamp01(simplicity * purity), label: `${p}:${q}` };
}

/**
 * Evaluate the overall harmony of a set of simultaneously sounding voices.
 *
 * Only voices with meaningful amplitude should be passed in. The score is the
 * mean pairwise consonance, scaled to 0..100. A single voice (or none) is
 * trivially "perfectly consonant" → 100.
 */
export function analyzeHarmony(frequencies: number[]): HarmonyAnalysis {
  const active = frequencies.filter((f) => f > 0);

  if (active.length < 2) {
    return { score: 100, pairs: [] };
  }

  const pairs: HarmonyPair[] = [];
  let sum = 0;

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const { consonance, label } = pairConsonance(active[i], active[j]);
      pairs.push({ a: active[i], b: active[j], ratioLabel: label, consonance });
      sum += consonance;
    }
  }

  const score = Math.round((sum / pairs.length) * 100);
  return { score, pairs };
}
