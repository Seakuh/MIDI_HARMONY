# HARMONIE

Echtzeit-Controller für ein **harmonisches Frequenzsystem**, gesteuert über einen
**Korg nanoKONTROL2** via **Web MIDI API**, klangerzeugt über die **Web Audio API**.

Next.js 15 (App Router) · React 19 · TypeScript · keine externen Audio-Libraries.

---

## Features

- **8 unabhängige Oszillatoren** (Sinus, Dreieck, Sägezahn, Rechteck)
- **Fader → Lautstärke**, **Knob → Frequenzverhältnis** (intelligent quantisiert)
- Harmonische Verhältnisse: `1:1 · 6:5 · 5:4 · 4:3 · 3:2 · 8:5 · 15:8 · 2:1`
- Frei wählbare **Grundfrequenz** (Standard 110 Hz)
- Pro Kanal: aktuelle **Frequenz**, **Verhältnis**, **Lautstärke**, **Oszillator-Typ**
- **Wellenform** (Zeitbereich) + **Spektrum** (FFT) über `AnalyserNode` auf Canvas
- **Harmonie-Score 0–100 %** aus den paarweisen Frequenzverhältnissen
- **Binaural Beat Mode** mit getrennten L/R-Frequenzen und Beat-Anzeige
- Dunkles, minimalistisches, Apple-inspiriertes UI; Echtzeit-Updates ohne spürbare Latenz

---

## Schnellstart

```bash
npm install
npm run dev          # http://localhost:3000
```

1. **„System starten"** klicken (Browser verlangt eine Nutzergeste für Audio).
2. **„MIDI verbinden"** klicken und Web-MIDI-Zugriff erlauben.
3. nanoKONTROL2 bedienen.

> Web MIDI wird von Chrome, Edge und Opera unterstützt. Safari/Firefox bieten
> die UI inkl. Maussteuerung, aber keine MIDI-Hardware-Anbindung.

Weitere Skripte: `npm run build`, `npm run start`, `npm run typecheck`.

---

## nanoKONTROL2-Belegung (Werks-CC-Mapping)

| Control            | CC        | Wirkung                                   |
| ------------------ | --------- | ----------------------------------------- |
| Fader 1–8          | `0–7`     | Lautstärke des jeweiligen Oszillators     |
| Knob 1–8           | `16–23`   | Frequenzverhältnis (quantisiert)          |
| Solo 1–8           | `32–39`   | Solo                                      |
| Mute 1–8           | `48–55`   | Mute                                      |
| Record 1–8         | `64–71`   | Oszillator-Typ durchschalten              |
| Play               | `41`      | Audio-Engine starten                      |
| Cycle              | `46`      | Binaural Beat Mode umschalten             |

Abweichende Mappings (Korg Kontrol Editor) in
`src/lib/midi/nanokontrol2.ts` anpassen.

---

## Architektur

Saubere Trennung zwischen **MIDI**, **Audio-Engine**, **DSP**, **Visualisierung**
und **UI**. Der MIDI-Hot-Path schreibt direkt auf Web-Audio-`AudioParam`s; React
liest einmal pro Frame einen unveränderlichen `EngineSnapshot` — so bleibt die
Steuerung latenzfrei und der Audio-Pfad frei von Re-Renders.

```
HARMONIE/
├── app/
│   ├── layout.tsx              # Root-Layout + Metadaten
│   ├── page.tsx                # Orchestrierung: MIDI → Audio, Komposition der UI
│   └── globals.css             # Dunkles, Apple-inspiriertes Theme
├── src/
│   ├── types/                  # Vollständige TypeScript-Typen
│   │   ├── midi.ts
│   │   ├── audio.ts
│   │   └── harmony.ts
│   ├── lib/
│   │   ├── midi/
│   │   │   ├── nanokontrol2.ts  # CC-Mapping & Decoder
│   │   │   └── midiService.ts   # Web-MIDI-Wrapper (framework-agnostisch)
│   │   ├── audio/
│   │   │   └── AudioEngine.ts   # Web-Audio-Graph, 8 Voices + Binaural + Analyser
│   │   └── dsp/
│   │       ├── harmony.ts       # Ratios, Quantisierung, Konsonanz-Scoring
│   │       └── binaural.ts      # Beat-Frequenz, Brainwave-Bänder
│   ├── hooks/
│   │   ├── useMidi.ts           # React-Adapter für MidiService
│   │   └── useAudioEngine.ts    # React-Adapter für AudioEngine (+ Mute/Solo-Logik)
│   └── components/
│       ├── ChannelStrip.tsx
│       ├── WaveformCanvas.tsx
│       ├── SpectrumCanvas.tsx
│       ├── HarmonyMeter.tsx
│       ├── BinauralPanel.tsx
│       ├── BaseFrequencyControl.tsx
│       └── MidiStatus.tsx
```

### Signalfluss (Web Audio)

```
8 × (Oscillator → Gain) ┐
                         ├─→ masterGain → analyser → destination
Binaural L/R → merger ──┘
```

Ein einzelner `AnalyserNode` speist sowohl die Wellenform- (`getByteTimeDomainData`)
als auch die Spektrum-Darstellung (`getByteFrequencyData`).

### Harmonie-Score

Für jedes Frequenzpaar wird per Kettenbruch die beste kleine ganzzahlige
Näherung des Intervalls bestimmt. Die Konsonanz kombiniert **Tenney-Height**
(`log₂(p·q)` — einfache Verhältnisse = konsonanter) mit einer **Verstimmungs­strafe**
(Abweichung vom idealen Intervall). Der Score ist der gemittelte paarweise
Konsonanzwert, skaliert auf 0–100 %.

### Knob-Quantisierung

Der Knob-Weg (0–127) wird in gleich große Segmente unterteilt — eines pro
Verhältnis im Katalog. Kontinuierliche Eingaben rasten so immer auf ein
musikalisch sinnvolles Intervall statt auf eine irrationale Frequenz.

---

## Hinweis

Der „Binaural Beat Mode" dient der Klangexploration und erfordert Kopfhörer.
Es werden keine therapeutischen Wirkungen impliziert.
# MIDI_HARMONY
