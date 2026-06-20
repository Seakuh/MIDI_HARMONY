import type {
  MidiControlEvent,
  MidiControlType,
  TransportControl,
} from "@/types/midi";

/**
 * Korg nanoKONTROL2 — default ("factory") Control-Change map.
 *
 * The device ships in CC mode with the following assignments. Each of the 8
 * channel strips has a fader, a knob, and Solo / Mute / Record buttons. The
 * transport row sends its own fixed CC numbers.
 *
 * If your unit has been re-mapped with the Korg Kontrol Editor, adjust the
 * tables below to match.
 */

// Channel-strip controls: base CC + channel index (0..7).
const FADER_BASE = 0; //  CC 0..7
const KNOB_BASE = 16; //  CC 16..23
const SOLO_BASE = 32; //  CC 32..39
const MUTE_BASE = 48; //  CC 48..55
const REC_BASE = 64; //   CC 64..71

// Transport / global controls (fixed CC numbers).
const TRANSPORT_CC: Record<number, TransportControl> = {
  41: "play",
  42: "stop",
  43: "rewind",
  44: "forward",
  45: "record",
  46: "cycle",
  58: "trackPrev",
  59: "trackNext",
  60: "markerSet",
  61: "markerPrev",
  62: "markerNext",
};

interface Decoded {
  type: MidiControlType;
  channel: number;
  transport?: TransportControl;
}

/** Map a CC number to its semantic control, or null if unrecognised. */
function decodeController(cc: number): Decoded | null {
  if (cc >= FADER_BASE && cc < FADER_BASE + 8) {
    return { type: "fader", channel: cc - FADER_BASE };
  }
  if (cc >= KNOB_BASE && cc < KNOB_BASE + 8) {
    return { type: "knob", channel: cc - KNOB_BASE };
  }
  if (cc >= SOLO_BASE && cc < SOLO_BASE + 8) {
    return { type: "solo", channel: cc - SOLO_BASE };
  }
  if (cc >= MUTE_BASE && cc < MUTE_BASE + 8) {
    return { type: "mute", channel: cc - MUTE_BASE };
  }
  if (cc >= REC_BASE && cc < REC_BASE + 8) {
    return { type: "rec", channel: cc - REC_BASE };
  }
  const transport = TRANSPORT_CC[cc];
  if (transport) {
    return { type: "transport", channel: -1, transport };
  }
  return null;
}

const CONTROL_CHANGE_STATUS = 0xb0; // 0xB0..0xBF across MIDI channels 1..16

/**
 * Parse a raw MIDI message into a normalized {@link MidiControlEvent}.
 *
 * Returns null for messages that are not Control-Change events or that map to
 * controls outside the known nanoKONTROL2 layout.
 */
export function parseNanoKontrol2(
  data: Uint8Array | number[]
): MidiControlEvent | null {
  if (data.length < 3) return null;

  const [status, cc, value] = data;

  // Accept Control-Change on any MIDI channel (high nibble 0xB).
  if ((status & 0xf0) !== CONTROL_CHANGE_STATUS) return null;

  const decoded = decodeController(cc);
  if (!decoded) return null;

  return {
    type: decoded.type,
    channel: decoded.channel,
    transport: decoded.transport,
    value,
    normalized: value / 127,
    raw: [status, cc, value],
  };
}

/** True when a button event represents a press (buttons send 127 on press). */
export function isButtonPress(event: MidiControlEvent): boolean {
  return event.value >= 64;
}
