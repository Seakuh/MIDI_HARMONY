"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MidiService } from "@/lib/midi/midiService";
import type {
  MidiConnectionState,
  MidiControlEvent,
  MidiInputInfo,
} from "@/types/midi";

export interface UseMidiResult {
  state: MidiConnectionState;
  inputs: MidiInputInfo[];
  /** The most recent decoded control event (for activity indicators). */
  lastEvent: MidiControlEvent | null;
  /** Request Web MIDI access and start listening. */
  connect: () => Promise<void>;
}

/**
 * React hook wrapping {@link MidiService}.
 *
 * The `onControl` callback is held in a ref so the underlying service always
 * invokes the latest handler without re-subscribing — keeping the MIDI → audio
 * path free of React re-render overhead.
 */
export function useMidi(
  onControl: (event: MidiControlEvent) => void
): UseMidiResult {
  const onControlRef = useRef(onControl);
  onControlRef.current = onControl;

  const serviceRef = useRef<MidiService | null>(null);

  const [state, setState] = useState<MidiConnectionState>("disconnected");
  const [inputs, setInputs] = useState<MidiInputInfo[]>([]);
  const [lastEvent, setLastEvent] = useState<MidiControlEvent | null>(null);

  // Throttle the `lastEvent` state update so a stream of fader moves doesn't
  // flood React; the audio path is driven directly via the ref, unthrottled.
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const service = new MidiService({
      onControl: (event) => {
        onControlRef.current(event);
        const now = performance.now();
        if (now - lastUpdateRef.current > 40) {
          lastUpdateRef.current = now;
          setLastEvent(event);
        }
      },
      onStateChange: setState,
      onInputsChange: setInputs,
    });
    serviceRef.current = service;
    return () => service.disconnect();
  }, []);

  const connect = useCallback(async () => {
    await serviceRef.current?.connect();
  }, []);

  return { state, inputs, lastEvent, connect };
}
