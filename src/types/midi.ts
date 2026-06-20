/**
 * MIDI domain types.
 *
 * These describe the normalized, hardware-agnostic representation of a
 * nanoKONTROL2 control event that the rest of the app consumes. The mapping
 * from raw MIDI Control-Change numbers to these semantic controls lives in
 * `lib/midi/nanokontrol2.ts`.
 */

/** Semantic class of a physical control on the nanoKONTROL2. */
export type MidiControlType =
  | "fader"
  | "knob"
  | "solo"
  | "mute"
  | "rec"
  | "transport";

/** Transport / global buttons that are not tied to a single channel strip. */
export type TransportControl =
  | "play"
  | "stop"
  | "rewind"
  | "forward"
  | "record"
  | "cycle"
  | "trackPrev"
  | "trackNext"
  | "markerSet"
  | "markerPrev"
  | "markerNext";

/**
 * A control event after it has been decoded from a raw MIDI message.
 *
 * - `channel` is the 0-based strip index (0..7) for per-channel controls,
 *   and `-1` for transport / global controls.
 * - `value` is the raw 7-bit MIDI value (0..127).
 * - `normalized` is `value / 127` for convenience (0..1).
 */
export interface MidiControlEvent {
  type: MidiControlType;
  channel: number;
  transport?: TransportControl;
  value: number;
  normalized: number;
  /** Raw [status, data1, data2] triple, useful for debugging. */
  raw: [number, number, number];
}

/** Connection state surfaced to the UI. */
export type MidiConnectionState =
  | "unsupported"
  | "requesting"
  | "denied"
  | "disconnected"
  | "connected";

/** Lightweight description of a connected input device. */
export interface MidiInputInfo {
  id: string;
  name: string;
  manufacturer: string;
}
