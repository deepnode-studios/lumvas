import type { CaptionTrack, CaptionWord, ThemeNode } from "@/types/schema";

interface PreviewOverlayProps {
  captionTracks: CaptionTrack[];
  currentTimeMs: number;
  theme: ThemeNode;
  width: number;
  height: number;
}

/** Find the active segment at a given time */
function getActiveCaption(track: CaptionTrack, timeMs: number) {
  for (const seg of track.segments) {
    if (seg.words.length === 0) continue;
    const segStart = seg.words[0].startMs;
    const segEnd = seg.words[seg.words.length - 1].endMs;
    if (timeMs >= segStart && timeMs <= segEnd) {
      return { segment: seg, words: seg.words };
    }
  }
  return null;
}

/** Render caption text with style effects */
function renderCaptionText(
  words: CaptionWord[],
  timeMs: number,
  style: CaptionTrack["style"],
  highlightColor: string,
) {
  switch (style) {
    case "karaoke":
      return words.map((w, i) => {
        const active = timeMs >= w.startMs && timeMs <= w.endMs;
        const past = timeMs > w.endMs;
        return (
          <span
            key={i}
            style={{
              color: active || past ? highlightColor : "inherit",
              transition: "color 0.1s",
            }}
          >
            {w.text}{" "}
          </span>
        );
      });

    case "word-reveal":
      return words.map((w, i) => {
        const visible = timeMs >= w.startMs;
        return (
          <span key={i} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s" }}>
            {w.text}{" "}
          </span>
        );
      });

    case "bounce":
      return words.map((w, i) => {
        const visible = timeMs >= w.startMs;
        const justAppeared = timeMs >= w.startMs && timeMs < w.startMs + 200;
        return (
          <span
            key={i}
            style={{
              opacity: visible ? 1 : 0,
              transform: justAppeared ? "scale(1.2)" : "scale(1)",
              display: "inline-block",
              transition: "transform 0.2s ease-out, opacity 0.1s",
            }}
          >
            {w.text}{" "}
          </span>
        );
      });

    case "typewriter": {
      let charCount = 0;
      for (const w of words) {
        if (timeMs < w.startMs) break;
        const progress = Math.min(1, (timeMs - w.startMs) / Math.max(1, w.endMs - w.startMs));
        charCount += Math.floor(w.text.length * progress) + 1;
      }
      const fullText = words.map((w) => w.text).join(" ");
      return <span>{fullText.slice(0, charCount)}</span>;
    }

    default:
      return <span>{words.map((w) => w.text).join(" ")}</span>;
  }
}

export function PreviewOverlay({ captionTracks, currentTimeMs, theme, width, height }: PreviewOverlayProps) {
  if (captionTracks.length === 0) return null;

  // The overlay is inside a transform:scale() container.
  // Use explicit pixel positions based on the full canvas dimensions
  // so positioning works correctly regardless of scale.
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {captionTracks.map((track) => {
        const active = getActiveCaption(track, currentTimeMs);
        if (!active) return null;

        const a = track.appearance;

        // Position in pixels relative to the full canvas
        const posTop =
          a.position === "top"
            ? height * 0.05
            : a.position === "center"
              ? height * 0.4
              : undefined;
        const posBottom = a.position === "bottom" ? height * 0.08 : undefined;

        return (
          <div
            key={track.id}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              ...(posTop !== undefined ? { top: posTop } : {}),
              ...(posBottom !== undefined ? { bottom: posBottom } : {}),
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: a.fontSize ?? 32,
                fontWeight: a.fontWeight ?? 700,
                color: a.color ?? "#ffffff",
                backgroundColor: a.backgroundColor
                  ? `${a.backgroundColor}${Math.round((a.backgroundOpacity ?? 0.7) * 255).toString(16).padStart(2, "0")}`
                  : "rgba(0,0,0,0.7)",
                padding: a.padding ?? 12,
                borderRadius: 8,
                textAlign: "center",
                maxWidth: width * 0.8,
                lineHeight: 1.4,
              }}
            >
              {renderCaptionText(
                active.words,
                currentTimeMs,
                track.style,
                a.highlightColor ?? "#FFD700",
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
