"use client";

import { useEffect, useRef } from "react";

interface SpectrumCanvasProps {
  analyser: AnalyserNode | null;
  height?: number;
  /** Upper frequency bound to display, in Hz. */
  maxFrequency?: number;
}

/**
 * Frequency-domain (FFT) spectrum analyser. Visualises the superposition of all
 * active oscillators as a logarithmic-amplitude bar graph, with a frequency
 * axis truncated to the musically relevant range.
 */
export function SpectrumCanvas({
  analyser,
  height = 180,
  maxFrequency = 4000,
}: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bins = analyser.frequencyBinCount;
    const buffer = new Uint8Array(bins);
    let raf = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const sampleRate = analyser.context.sampleRate;
    const nyquist = sampleRate / 2;
    // Restrict to the displayed frequency range.
    const usableBins = Math.min(bins, Math.ceil((maxFrequency / nyquist) * bins));

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      analyser.getByteFrequencyData(buffer);
      ctx.clearRect(0, 0, w, h);

      const barWidth = w / usableBins;
      for (let i = 0; i < usableBins; i++) {
        const magnitude = buffer[i] / 255; // 0..1
        const barHeight = magnitude * h;
        const x = i * barWidth;

        // Hue sweeps cyan → violet across the spectrum.
        const hue = 190 + (i / usableBins) * 80;
        ctx.fillStyle = `hsl(${hue}, 85%, ${30 + magnitude * 35}%)`;
        ctx.fillRect(x, h - barHeight, Math.max(1, barWidth - 0.5), barHeight);
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [analyser, maxFrequency]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height, display: "block" }}
      aria-label="Frequenzspektrum-Visualisierung"
    />
  );
}
