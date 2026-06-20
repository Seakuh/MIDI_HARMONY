import type {
  MidiConnectionState,
  MidiControlEvent,
  MidiInputInfo,
} from "@/types/midi";
import { parseNanoKontrol2 } from "./nanokontrol2";

export interface MidiServiceCallbacks {
  onControl: (event: MidiControlEvent) => void;
  onStateChange: (state: MidiConnectionState) => void;
  onInputsChange: (inputs: MidiInputInfo[]) => void;
}

/**
 * Thin wrapper around the Web MIDI API.
 *
 * Owns the `MIDIAccess` object, attaches listeners to every input, and forwards
 * decoded nanoKONTROL2 events through callbacks. Framework-agnostic — the React
 * `useMidi` hook adapts it to component state.
 */
export class MidiService {
  private access: WebMidi.MIDIAccess | null = null;
  private callbacks: MidiServiceCallbacks;
  private boundMessageHandler: (e: WebMidi.MIDIMessageEvent) => void;
  private boundStateHandler: () => void;

  constructor(callbacks: MidiServiceCallbacks) {
    this.callbacks = callbacks;
    this.boundMessageHandler = this.handleMessage.bind(this);
    this.boundStateHandler = this.refreshInputs.bind(this);
  }

  /** Request access and begin listening. Idempotent-ish; safe to call once. */
  async connect(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.requestMIDIAccess) {
      this.callbacks.onStateChange("unsupported");
      return;
    }

    this.callbacks.onStateChange("requesting");

    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch {
      this.callbacks.onStateChange("denied");
      return;
    }

    this.access.onstatechange = this.boundStateHandler;
    this.attachInputs();
    this.refreshInputs();
  }

  /** Detach all listeners and drop the access handle. */
  disconnect(): void {
    if (!this.access) return;
    const noop = () => {};
    this.access.inputs.forEach((input) => {
      input.onmidimessage = noop;
    });
    this.access.onstatechange = noop;
    this.access = null;
    this.callbacks.onStateChange("disconnected");
    this.callbacks.onInputsChange([]);
  }

  private attachInputs(): void {
    if (!this.access) return;
    this.access.inputs.forEach((input) => {
      input.onmidimessage = this.boundMessageHandler;
    });
  }

  private refreshInputs(): void {
    if (!this.access) return;

    // Re-attach in case devices were hot-plugged.
    this.attachInputs();

    const inputs: MidiInputInfo[] = [];
    this.access.inputs.forEach((input) => {
      inputs.push({
        id: input.id,
        name: input.name ?? "Unbekanntes Gerät",
        manufacturer: input.manufacturer ?? "",
      });
    });

    this.callbacks.onInputsChange(inputs);
    this.callbacks.onStateChange(inputs.length > 0 ? "connected" : "disconnected");
  }

  private handleMessage(event: WebMidi.MIDIMessageEvent): void {
    const parsed = parseNanoKontrol2(event.data);
    if (parsed) this.callbacks.onControl(parsed);
  }
}
