import { useEffect, useState } from "react";

// Global cache keyed by resolved audio URL
const peaksCache = new Map<string, Float32Array>();
const pendingCache = new Map<string, Promise<Float32Array | null>>();

/**
 * Decodes an audio file and extracts amplitude peaks for waveform display.
 * Returns a Float32Array of length `numBuckets` with values in [0, 1],
 * or null while loading / if decoding fails.
 */
export function useAudioPeaks(audioUrl: string | null, numBuckets: number): Float32Array | null {
  const [peaks, setPeaks] = useState<Float32Array | null>(() =>
    audioUrl ? peaksCache.get(audioUrl) ?? null : null
  );

  useEffect(() => {
    if (!audioUrl) return;
    const cached = peaksCache.get(audioUrl);
    if (cached) { setPeaks(cached); return; }

    let cancelled = false;

    const load = pendingCache.get(audioUrl) ?? (async () => {
      try {
        const resp = await fetch(audioUrl);
        if (!resp.ok) return null;
        const arrayBuffer = await resp.arrayBuffer();
        const ctx = new OfflineAudioContext(1, 1, 44100);
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        const raw = decoded.getChannelData(0);
        const bucketSize = Math.floor(raw.length / numBuckets);
        const result = new Float32Array(numBuckets);
        let max = 0;
        for (let i = 0; i < numBuckets; i++) {
          let sum = 0;
          const start = i * bucketSize;
          const end = Math.min(start + bucketSize, raw.length);
          for (let j = start; j < end; j++) sum += Math.abs(raw[j]);
          result[i] = sum / (end - start);
          if (result[i] > max) max = result[i];
        }
        // Normalize to [0, 1]
        if (max > 0) for (let i = 0; i < numBuckets; i++) result[i] /= max;
        return result;
      } catch {
        return null;
      }
    })();

    if (!pendingCache.has(audioUrl)) pendingCache.set(audioUrl, load);

    load.then((result) => {
      if (result) peaksCache.set(audioUrl, result);
      pendingCache.delete(audioUrl);
      if (!cancelled) setPeaks(result);
    });

    return () => { cancelled = true; };
  // numBuckets intentionally excluded — we decode once per URL
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  return peaks;
}
