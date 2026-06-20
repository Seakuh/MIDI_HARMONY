/**
 * A musical interval expressed as a small-integer frequency ratio.
 */
export interface HarmonicRatio {
  /** Display label, e.g. "3:2". */
  label: string;
  /** Short name of the interval, e.g. "Quinte". */
  name: string;
  numerator: number;
  denominator: number;
  /** Decimal value (numerator / denominator). */
  value: number;
}

/** Result of evaluating the overall harmonic relationship between voices. */
export interface HarmonyAnalysis {
  /** 0..100 consonance score. */
  score: number;
  /** Per-pair consonance contributions, for optional detailed display. */
  pairs: HarmonyPair[];
}

export interface HarmonyPair {
  a: number;
  b: number;
  /** Best simple-integer approximation of the interval. */
  ratioLabel: string;
  /** 0..1 consonance of this pair. */
  consonance: number;
}
