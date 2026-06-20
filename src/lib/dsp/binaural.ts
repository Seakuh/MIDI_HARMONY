/**
 * Binaural-beat DSP helpers.
 *
 * A binaural beat is the perceived low-frequency pulse that arises when each
 * ear receives a slightly different pure tone. The brain perceives a "beat" at
 * the difference frequency, even though no such frequency is physically present
 * in either channel.
 */

/** The beat frequency perceived from two ear-specific carrier frequencies. */
export function beatFrequency(left: number, right: number): number {
  return Math.abs(left - right);
}

/** Named ranges commonly associated with brain-wave entrainment research. */
export type BrainwaveBand = "delta" | "theta" | "alpha" | "beta" | "gamma" | "—";

/**
 * Classify a beat frequency into a conventional brain-wave band. Provided for
 * display only — no therapeutic claims are implied.
 */
export function classifyBeat(beat: number): BrainwaveBand {
  if (beat <= 0) return "—";
  if (beat < 4) return "delta";
  if (beat < 8) return "theta";
  if (beat < 13) return "alpha";
  if (beat < 30) return "beta";
  return "gamma";
}
