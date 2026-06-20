"use client";

import type {
  MidiConnectionState,
  MidiControlEvent,
  MidiInputInfo,
} from "@/types/midi";

interface MidiStatusProps {
  state: MidiConnectionState;
  inputs: MidiInputInfo[];
  lastEvent: MidiControlEvent | null;
  onConnect: () => void;
}

const STATE_LABEL: Record<MidiConnectionState, string> = {
  unsupported: "Web MIDI nicht unterstützt",
  requesting: "Zugriff angefragt…",
  denied: "Zugriff verweigert",
  disconnected: "Kein Gerät",
  connected: "Verbunden",
};

/** Connection status banner + device list for the MIDI controller. */
export function MidiStatus({ state, inputs, lastEvent, onConnect }: MidiStatusProps) {
  const isConnected = state === "connected";
  const isBusy = state === "requesting";

  return (
    <div className="midi">
      <div className="midi__main">
        <span className={`midi__dot midi__dot--${state}`} aria-hidden />
        <div className="midi__text">
          <div className="midi__state">{STATE_LABEL[state]}</div>
          <div className="midi__device">
            {inputs.length > 0
              ? inputs.map((i) => i.name).join(", ")
              : "nanoKONTROL2 erwartet"}
          </div>
        </div>
      </div>

      {!isConnected && state !== "unsupported" && (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onConnect}
          disabled={isBusy}
        >
          MIDI verbinden
        </button>
      )}

      {lastEvent && (
        <div className="midi__activity" key={`${lastEvent.type}-${lastEvent.channel}-${lastEvent.value}`}>
          {lastEvent.type}
          {lastEvent.channel >= 0 ? ` ${lastEvent.channel + 1}` : ""} · {lastEvent.value}
        </div>
      )}
    </div>
  );
}
