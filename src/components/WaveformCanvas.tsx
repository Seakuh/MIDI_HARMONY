"use client";

import { useEffect, useRef } from "react";

interface WaveformCanvasProps {
  analyser: AnalyserNode | null;
  /** Accent colour for the trace. */
  color?: string;
  height?: number;
}

/**
 * Time-domain oscilloscope. Reads the analyser's byte time-domain buffer and
 * draws the resulting summed waveform on a DPR-aware canvas.
 */
export function WaveformCanvas({
  analyser,
  color = "#7dd3fc",
  height = 180,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buffer = new Uint8Array(analyser.fftSize);
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

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      analyser.getByteTimeDomainData(buffer);

      ctx.clearRect(0, 0, w, h);

      // Zero-crossing baseline.
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Waveform trace.
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.beginPath();
      const slice = w / buffer.length;
      for (let i = 0; i < buffer.length; i++) {
        const v = buffer[i] / 128 - 1; // → −1..1
        const x = i * slice;
        const y = h / 2 + (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [analyser, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height, display: "block" }}
      aria-label="Wellenform-Visualisierung"
    />
  );
}
