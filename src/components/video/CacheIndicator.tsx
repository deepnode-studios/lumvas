/**
 * CacheIndicator — thin bar above the timeline ruler showing which frames
 * are cached in RAM. Green = cached, empty = uncached.
 */

import type { CacheState } from "@/utils/frameCache";

interface CacheIndicatorProps {
  cacheState: CacheState | null;
  totalDurationMs: number;
  zoomLevel: number;
}

export function CacheIndicator({ cacheState, totalDurationMs, zoomLevel }: CacheIndicatorProps) {
  const totalWidth = (totalDurationMs / 1000) * zoomLevel;

  if (!cacheState || totalDurationMs <= 0) {
    return (
      <div style={{ display: "flex", height: 4 }}>
        <div style={{ width: 120, flexShrink: 0 }} />
        <div style={{ flex: 1, overflowX: "hidden" }}>
          <div style={{ width: Math.max(totalWidth, 1), height: 4, background: "#1a1a1e" }} />
        </div>
      </div>
    );
  }

  const { cachedFrames, frameIntervalMs, isRendering } = cacheState;

  // Build segments: consecutive cached frame ranges → green bars
  // We render onto a canvas-like div using absolute positioned spans
  const segments: { startMs: number; endMs: number }[] = [];
  const sortedFrames = [...cachedFrames].sort((a, b) => a - b);

  if (sortedFrames.length > 0) {
    let segStart = sortedFrames[0] * frameIntervalMs;
    let segEnd = segStart + frameIntervalMs;

    for (let i = 1; i < sortedFrames.length; i++) {
      const frameMs = sortedFrames[i] * frameIntervalMs;
      if (frameMs <= segEnd + frameIntervalMs * 0.5) {
        // Contiguous — extend segment
        segEnd = frameMs + frameIntervalMs;
      } else {
        // Gap — push segment and start new one
        segments.push({ startMs: segStart, endMs: segEnd });
        segStart = frameMs;
        segEnd = frameMs + frameIntervalMs;
      }
    }
    segments.push({ startMs: segStart, endMs: segEnd });
  }

  return (
    <div style={{ display: "flex", height: 4 }}>
      {/* Left offset matching timeline label column */}
      <div style={{ width: 120, flexShrink: 0, display: "flex", alignItems: "center", paddingLeft: 6 }}>
        {isRendering && (
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#4ade80",
            animation: "pulse 1s infinite",
          }} />
        )}
      </div>
      {/* Scrollable track area */}
      <div style={{ flex: 1, overflowX: "hidden" }}>
        <div style={{ position: "relative", width: Math.max(totalWidth, 1), height: 4, background: "#1a1a1e" }}>
          {segments.map((seg, i) => {
            const left = (seg.startMs / 1000) * zoomLevel;
            const width = ((seg.endMs - seg.startMs) / 1000) * zoomLevel;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left,
                  top: 0,
                  width: Math.max(width, 1),
                  height: 4,
                  background: "#4ade80",
                  borderRadius: 1,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
