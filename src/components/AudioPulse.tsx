import { useEffect } from 'react';
import { usePlayer } from '@/components/GlobalPlayer';

/**
 * THE PULSE — Phase 1: the page dances.
 *
 * While a track plays, one requestAnimationFrame loop reads the player's
 * existing WebAudio analyser and writes three CSS variables on <html>:
 *
 *   --wk-bass  0..1  smoothed low-frequency energy   (aurora breathes)
 *   --wk-high  0..1  smoothed high-frequency energy  (starfield twinkles)
 *   --wk-beat  0..1  beat impulse with decay         (accents pulse)
 *
 * Pure compositor work — the variables drive opacity/filter/transform only,
 * so nothing re-renders and nothing re-layouts. No-ops entirely under
 * prefers-reduced-motion, and settles all vars to 0 when playback stops.
 */
export default function AudioPulse() {
  const { analyserNode, isPlaying } = usePlayer();

  useEffect(() => {
    const root = document.documentElement;
    const settle = () => {
      root.style.setProperty('--wk-bass', '0');
      root.style.setProperty('--wk-high', '0');
      root.style.setProperty('--wk-beat', '0');
    };

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!analyserNode || !isPlaying || reduced) { settle(); return; }

    const buf = new Uint8Array(analyserNode.frequencyBinCount);
    let raf = 0;
    let smoothBass = 0, smoothHigh = 0, beat = 0, avgBass = 0;
    let lastB = '', lastH = '', lastT = '';

    const tick = () => {
      raf = requestAnimationFrame(tick);
      analyserNode.getByteFrequencyData(buf);
      const n = buf.length;

      // Bass = bottom ~12% of bins; highs = top 40%
      const bassBins = Math.max(2, Math.floor(n * 0.12));
      let bass = 0;
      for (let i = 0; i < bassBins; i++) bass += buf[i];
      bass = bass / bassBins / 255;

      const hiStart = Math.floor(n * 0.6);
      let high = 0;
      for (let i = hiStart; i < n; i++) high += buf[i];
      high = high / (n - hiStart) / 255;

      // Smooth so the page breathes rather than flickers
      smoothBass += (bass - smoothBass) * 0.22;
      smoothHigh += (high - smoothHigh) * 0.3;

      // Beat = bass spiking above its own rolling average, with decay
      avgBass += (bass - avgBass) * 0.04;
      if (bass > avgBass * 1.35 && bass > 0.25) beat = 1;
      beat *= 0.9;

      const b = smoothBass.toFixed(3);
      const h = smoothHigh.toFixed(3);
      const t = beat.toFixed(3);
      if (b !== lastB) { root.style.setProperty('--wk-bass', b); lastB = b; }
      if (h !== lastH) { root.style.setProperty('--wk-high', h); lastH = h; }
      if (t !== lastT) { root.style.setProperty('--wk-beat', t); lastT = t; }
    };

    tick();
    return () => { cancelAnimationFrame(raf); settle(); };
  }, [analyserNode, isPlaying]);

  return null;
}
