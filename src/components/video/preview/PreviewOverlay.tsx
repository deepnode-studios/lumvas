import { useRef, useEffect, useMemo } from "react";
import { useLumvasStore } from "@/store/useLumvasStore";
import { drawMergedLineRects } from "@/utils/canvasRenderer";
import type { CaptionTrack, CaptionWord, CaptionAppearance, ThemeNode } from "@/types/schema";

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
      return seg.words;
    }
  }
  return null;
}

/** Resolve fontId to CSS font-family */
function resolveFont(fontId: string | undefined): string | undefined {
  if (!fontId) return undefined;
  const fonts = useLumvasStore.getState().theme.fonts;
  const token = fonts.find((f) => f.id === fontId);
  return token?.value;
}

/** Build background color with opacity */
function bgWithOpacity(a: CaptionAppearance): string {
  if (!a.backgroundColor) return "rgba(0,0,0,0.7)";
  const hex = a.backgroundColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a.backgroundOpacity ?? 0.7})`;
}

/** Render per-line caption words with style effects */
function renderCaptionWords(
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
          <span key={i} style={{ color: active || past ? highlightColor : "inherit", transition: "color 0.1s" }}>
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

/** Line fill mode: canvas background (merged rects + concave corners) + HTML text */
function LineFillCaption({
  track,
  activeWords,
  currentTimeMs,
  theme,
  width,
  height,
}: {
  track: CaptionTrack;
  activeWords: CaptionWord[];
  currentTimeMs: number;
  theme: ThemeNode;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const a = track.appearance;
  const radius = a.borderRadius ?? 8;
  const fontSize = a.fontSize ?? 32;
  const fontWeight = a.fontWeight ?? 700;
  const fontFamily = resolveFont(a.fontId) ?? theme.fontFamily;
  const bgColor = a.backgroundColor ?? "#000000";
  const bgOpacity = a.backgroundOpacity ?? 0.7;
  const pad = a.padding ?? 12;
  const highlightColor = a.highlightColor ?? "#FFD700";
  const maxW = width * 0.8;
  const lineH = fontSize * 1.4;
  const lh = lineH + pad * 0.6;

  // Word-wrap measured with canvas API (matches canvasRenderer logic)
  const lines = useMemo(() => {
    const tmp = document.createElement("canvas").getContext("2d")!;
    tmp.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const result: { text: string; words: CaptionWord[]; measuredWidth: number }[] = [];
    let cur = "";
    let curWords: CaptionWord[] = [];
    for (const w of activeWords) {
      const test = cur ? `${cur} ${w.text}` : w.text;
      if (tmp.measureText(test).width > maxW && cur) {
        result.push({ text: cur, words: [...curWords], measuredWidth: tmp.measureText(cur).width });
        cur = w.text;
        curWords = [w];
      } else {
        cur = test;
        curWords.push(w);
      }
    }
    if (cur) result.push({ text: cur, words: curWords, measuredWidth: tmp.measureText(cur).width });
    return result;
  }, [activeWords, fontSize, fontWeight, fontFamily, maxW]);

  // Anchor position (same formula as canvasRenderer)
  const totalH = lines.length * lineH;
  const anchorX =
    a.position === "custom" && a.positionX != null ? (a.positionX / 100) * width : width / 2;
  let anchorY: number;
  if (a.position === "custom" && a.positionY != null) {
    anchorY = (a.positionY / 100) * height - (totalH + pad * 2) / 2;
  } else if (a.position === "top") {
    anchorY = height * 0.05;
  } else if (a.position === "center") {
    anchorY = (height - totalH - pad * 2) / 2;
  } else {
    anchorY = height - totalH - pad * 2 - height * 0.08;
  }

  // Line rects (touching, no gap — same as canvasRenderer)
  const lineRects = useMemo(() => {
    let ly = anchorY;
    return lines.map((line) => {
      const lw = line.measuredWidth + pad * 2;
      const rect = { x: anchorX - lw / 2, y: ly, w: lw, h: lh };
      ly += lh;
      return rect;
    });
  }, [lines, anchorX, anchorY, pad, lh]);

  // Draw the merged background shape on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    if (lineRects.length === 0) return;
    drawMergedLineRects(ctx, lineRects, bgColor, bgOpacity, radius);
  }, [lineRects, bgColor, bgOpacity, radius, width, height]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      />
      {lines.map((line, i) => {
        const rect = lineRects[i];
        const textY = rect.y + (rect.h - lineH) / 2 + (lineH - fontSize) / 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: rect.x + pad,
              top: textY,
              fontSize,
              fontWeight,
              fontFamily,
              color: a.color ?? "#ffffff",
              whiteSpace: "nowrap",
              lineHeight: 1,
              pointerEvents: "none",
            }}
          >
            {renderCaptionWords(line.words, currentTimeMs, track.style, highlightColor)}
          </div>
        );
      })}
    </>
  );
}

export function PreviewOverlay({ captionTracks, currentTimeMs, theme, width, height }: PreviewOverlayProps) {
  if (captionTracks.length === 0) return null;

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
        const activeWords = getActiveCaption(track, currentTimeMs);
        if (!activeWords) return null;

        const a = track.appearance;
        const radius = a.borderRadius ?? 8;
        const fillMode = a.fillMode ?? "box";
        const bg = bgWithOpacity(a);
        const fontFamily = resolveFont(a.fontId) ?? theme.fontFamily;

        // Line fill: canvas background + per-line HTML text
        if (fillMode === "line") {
          return (
            <LineFillCaption
              key={track.id}
              track={track}
              activeWords={activeWords}
              currentTimeMs={currentTimeMs}
              theme={theme}
              width={width}
              height={height}
            />
          );
        }

        // Position style for box and word-reveal modes
        let posStyle: React.CSSProperties;
        if (a.position === "custom" && a.positionX != null && a.positionY != null) {
          posStyle = {
            position: "absolute",
            left: `${a.positionX}%`,
            top: `${a.positionY}%`,
            transform: "translate(-50%, -50%)",
          };
        } else {
          const posTop =
            a.position === "top"
              ? height * 0.05
              : a.position === "center"
                ? height * 0.4
                : undefined;
          const posBottom = a.position === "bottom" ? height * 0.08 : undefined;
          posStyle = {
            position: "absolute",
            left: 0,
            right: 0,
            ...(posTop !== undefined ? { top: posTop } : {}),
            ...(posBottom !== undefined ? { bottom: posBottom } : {}),
            display: "flex",
            justifyContent: "center",
          };
        }

        // Word-reveal: render all words (hidden ones have opacity 0) for stable layout
        if (track.style === "word-reveal") {
          return (
            <div key={track.id} style={posStyle}>
              <div
                style={{
                  fontSize: a.fontSize ?? 32,
                  fontWeight: a.fontWeight ?? 700,
                  fontFamily,
                  color: a.color ?? "#ffffff",
                  backgroundColor: bg,
                  padding: a.padding ?? 12,
                  borderRadius: radius,
                  textAlign: "center",
                  maxWidth: width * 0.8,
                  lineHeight: 1.4,
                }}
              >
                {activeWords.map((w, i) => {
                  const visible = currentTimeMs >= w.startMs;
                  return (
                    <span key={i} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s" }}>
                      {w.text}{" "}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        }

        // Box fill
        return (
          <div key={track.id} style={posStyle}>
            <div
              style={{
                fontSize: a.fontSize ?? 32,
                fontWeight: a.fontWeight ?? 700,
                fontFamily,
                color: a.color ?? "#ffffff",
                backgroundColor: bg,
                padding: a.padding ?? 12,
                borderRadius: radius,
                textAlign: "center",
                maxWidth: width * 0.8,
                lineHeight: 1.4,
              }}
            >
              {renderCaptionWords(activeWords, currentTimeMs, track.style, a.highlightColor ?? "#FFD700")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
