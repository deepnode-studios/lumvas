import { useEffect, useRef, useCallback, useMemo } from "react";
import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { useFileStore } from "@/store/useFileStore";
import {
  useTimelineStore,
  getTotalDurationMs,
  getSceneAtTime,
  getSceneStartMs,
} from "@/store/useTimelineStore";
import { useMenuEvents } from "@/hooks/useMenuEvents";
import { useGoogleFonts } from "@/hooks/useGoogleFonts";
import { usePlayback } from "@/hooks/usePlayback";
import { basename } from "@/utils/path";
import { SceneRenderer } from "./SceneRenderer";
import { MediaPool } from "./MediaPool";
import { Inspector } from "./Inspector";
import { PreviewOverlay } from "./preview/PreviewOverlay";
import styles from "./videoWorkspace.module.css";

/* ---------- helpers ---------- */

function formatTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const f = Math.floor((ms % 1000) / (1000 / 30)); // frame at 30fps
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

function formatRulerTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 4];

const ELEMENT_COLORS: Record<string, string> = {
  text: "#4ecdc4",
  image: "#ff6b6b",
  icon: "#ffe66d",
  button: "#a78bfa",
  divider: "#888",
  spacer: "#555",
  logo: "#ff9f43",
  group: "#6c5ce7",
};

const AUDIO_COLORS: Record<string, string> = {
  narration: "#4ecdc4",
  music: "#ff6b6b",
  sfx: "#ffe66d",
};

/* ---------- Shared: mousedown+drag scrubbing ---------- */

function useScrubbing(
  ref: React.RefObject<HTMLDivElement | null>,
  zoomLevel: number,
  totalDuration: number,
  onSeek: (ms: number) => void,
) {
  const scrubbing = useRef(false);

  const xToMs = useCallback(
    (clientX: number) => {
      if (!ref.current) return 0;
      const rect = ref.current.getBoundingClientRect();
      const x = clientX - rect.left + ref.current.scrollLeft;
      return Math.max(0, Math.min(totalDuration, (x / zoomLevel) * 1000));
    },
    [ref, zoomLevel, totalDuration],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start scrubbing from left-click on the background (not on blocks)
      if (e.button !== 0) return;
      scrubbing.current = true;
      onSeek(xToMs(e.clientX));

      const onMove = (ev: MouseEvent) => {
        if (!scrubbing.current) return;
        onSeek(xToMs(ev.clientX));
      };
      const onUp = () => {
        scrubbing.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [xToMs, onSeek],
  );

  return onMouseDown;
}

/* ---------- Timeline Ruler ---------- */

function TimeRuler({
  totalDuration,
  zoomLevel,
  currentTimeMs,
  onSeek,
}: {
  totalDuration: number;
  zoomLevel: number;
  currentTimeMs: number;
  onSeek: (ms: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const totalWidth = (totalDuration / 1000) * zoomLevel;
  const onScrubDown = useScrubbing(ref, zoomLevel, totalDuration, onSeek);

  // Compute ruler marks
  const marks = useMemo(() => {
    const result: { ms: number; major: boolean }[] = [];
    let interval = 1000;
    if (zoomLevel < 40) interval = 5000;
    else if (zoomLevel < 80) interval = 2000;
    else if (zoomLevel >= 200) interval = 500;

    const majorEvery = zoomLevel < 80 ? 1 : 2;
    let idx = 0;
    for (let ms = 0; ms <= totalDuration; ms += interval) {
      result.push({ ms, major: idx % majorEvery === 0 });
      idx++;
    }
    return result;
  }, [totalDuration, zoomLevel]);

  const playheadX = (currentTimeMs / 1000) * zoomLevel;

  return (
    <div className={styles.timeRuler}>
      <div className={styles.timeRulerOffset} />
      <div
        className={styles.timeRulerTrack}
        ref={ref}
        onMouseDown={onScrubDown}
        style={{ cursor: "pointer" }}
      >
        <div style={{ position: "relative", width: Math.max(totalWidth, 1), height: "100%" }}>
          {marks.map((mark) => (
            <div
              key={mark.ms}
              className={styles.rulerMark}
              style={{ left: (mark.ms / 1000) * zoomLevel }}
            >
              <span className={styles.rulerMarkLabel}>
                {mark.major ? formatRulerTime(mark.ms) : ""}
              </span>
              <div
                className={`${styles.rulerMarkLine} ${mark.major ? styles.rulerMarkLineMajor : ""}`}
              />
            </div>
          ))}
          {/* Playhead on ruler */}
          <div className={styles.playheadRuler} style={{ left: playheadX }}>
            <div className={styles.playheadRulerHead} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Scene Block with drag handle ---------- */

function SceneBlockDraggable({
  sceneId,
  sceneIndex,
  durationMs,
  startMs,
  isActive,
  zoomLevel,
  onSeek,
}: {
  sceneId: string;
  sceneIndex: number;
  durationMs: number;
  startMs: number;
  isActive: boolean;
  zoomLevel: number;
  onSeek: (ms: number) => void;
}) {
  const left = (startMs / 1000) * zoomLevel;
  const width = (durationMs / 1000) * zoomLevel;

  const handleRightEdge = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const origDuration = durationMs;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const deltaMs = (dx / zoomLevel) * 1000;
        const newDuration = Math.max(100, Math.round(origDuration + deltaMs));
        useLumvasStore.getState().updateScene(sceneId, { durationMs: newDuration });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sceneId, durationMs, zoomLevel],
  );

  return (
    <div
      className={`${styles.sceneBlock} ${isActive ? styles.sceneBlockActive : ""}`}
      style={{ left, width: Math.max(width - 2, 4) }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSeek(startMs);
        useTimelineStore.getState().setInspectorTarget({ type: "scene", sceneId });
      }}
    >
      Scene {sceneIndex + 1}
      <div className={styles.dragHandleRight} onMouseDown={handleRightEdge} />
    </div>
  );
}

/* ---------- Element Bar with move + resize ---------- */

function ElementBarDraggable({
  el,
  sceneId,
  sceneDurationMs,
  sceneStartMs,
  zoomLevel,
  isActive,
  onSeek,
}: {
  el: { id: string; type: string; content?: string; timing: { enterMs: number; exitMs?: number } };
  sceneId: string;
  sceneDurationMs: number;
  sceneStartMs: number;
  zoomLevel: number;
  isActive: boolean;
  onSeek: (ms: number) => void;
}) {
  const enterMs = el.timing.enterMs ?? 0;
  const exitMs = el.timing.exitMs ?? sceneDurationMs;
  const absEnter = sceneStartMs + enterMs;
  const absExit = sceneStartMs + exitMs;
  const left = (absEnter / 1000) * zoomLevel;
  const width = ((absExit - absEnter) / 1000) * zoomLevel;
  const color = ELEMENT_COLORS[el.type] ?? "#888";

  // Does the element extend outside its scene?
  const overflowsLeft = enterMs < 0;
  const overflowsRight = exitMs > sceneDurationMs;

  // Scene boundary positions relative to element bar (for indicators)
  const sceneBoundaryLeftX = overflowsLeft ? (-enterMs / 1000) * zoomLevel : -1;
  const sceneBoundaryRightX = overflowsRight
    ? ((sceneDurationMs - enterMs) / 1000) * zoomLevel
    : -1;

  // Left edge drag: resize enterMs
  const handleLeftEdge = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const origEnter = enterMs;
      const origExit = exitMs;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const deltaMs = (dx / zoomLevel) * 1000;
        const newEnter = Math.round(Math.min(origExit - 50, origEnter + deltaMs));
        useLumvasStore.getState().updateElementTiming(sceneId, el.id, { enterMs: newEnter });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sceneId, el.id, enterMs, exitMs, zoomLevel],
  );

  // Right edge drag: resize exitMs
  const handleRightEdge = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const origEnter = enterMs;
      const origExit = exitMs;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const deltaMs = (dx / zoomLevel) * 1000;
        const newExit = Math.round(Math.max(origEnter + 50, origExit + deltaMs));
        useLumvasStore.getState().updateElementTiming(sceneId, el.id, { exitMs: newExit });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sceneId, el.id, enterMs, exitMs, zoomLevel],
  );

  // Body drag: move the whole element (shift both enterMs and exitMs)
  const handleBodyDrag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const origEnter = enterMs;
      const origExit = exitMs;
      let moved = false;

      useLumvasStore.getState().setActiveElement(el.id);
      useTimelineStore.getState().setInspectorTarget({ type: "element", sceneId, elementId: el.id });

      const onMove = (ev: MouseEvent) => {
        moved = true;
        const dx = ev.clientX - startX;
        const deltaMs = Math.round((dx / zoomLevel) * 1000);
        const duration = origExit - origEnter;
        const newEnter = origEnter + deltaMs;
        useLumvasStore.getState().updateElementTiming(sceneId, el.id, {
          enterMs: newEnter,
          exitMs: newEnter + duration,
        });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        if (!moved) onSeek(absEnter);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sceneId, el.id, enterMs, exitMs, absEnter, zoomLevel, onSeek],
  );

  return (
    <div
      className={`${styles.elementBar} ${isActive ? styles.elementBarActive : ""}`}
      style={{
        left,
        width: Math.max(width, 4),
        background: `${color}88`,
        borderLeft: `2px solid ${color}`,
        top: 6,
        height: 30,
        borderRadius: 3,
        fontSize: 9,
        cursor: "grab",
      }}
      onMouseDown={handleBodyDrag}
      title={`${el.type}: ${el.content?.slice(0, 20) || "(empty)"}`}
    >
      {/* Scene boundary indicators */}
      {overflowsLeft && sceneBoundaryLeftX > 0 && (
        <div className={styles.sceneBoundary} style={{ left: sceneBoundaryLeftX }} />
      )}
      {overflowsRight && sceneBoundaryRightX > 0 && sceneBoundaryRightX < width && (
        <div className={styles.sceneBoundary} style={{ left: sceneBoundaryRightX }} />
      )}

      <div className={styles.dragHandleLeft} onMouseDown={handleLeftEdge} />
      <span className={styles.elementBarLabel}>{el.content?.slice(0, 12) || el.type}</span>
      <div className={styles.dragHandleRight} onMouseDown={handleRightEdge} />
    </div>
  );
}

/* ---------- Timeline Tracks ---------- */

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function TimelineTracks({
  zoomLevel,
  currentTimeMs,
  totalDuration,
  onSeek,
}: {
  zoomLevel: number;
  currentTimeMs: number;
  totalDuration: number;
  onSeek: (ms: number) => void;
}) {
  const videoContent = useLumvasStore((s) => selectVideoContent(s));
  const addSceneElement = useLumvasStore((s) => s.addSceneElement);
  const currentSceneId = getSceneAtTime(currentTimeMs);
  const totalWidth = (totalDuration / 1000) * zoomLevel;
  const tracksRef = useRef<HTMLDivElement>(null);
  const onScrubDown = useScrubbing(tracksRef, zoomLevel, totalDuration, onSeek);

  // Handle drop from media pool onto the video/elements track
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const mediaType = e.dataTransfer.getData("application/x-media-type");
      if (!mediaType) return;

      const targetSceneId = currentSceneId;
      if (!targetSceneId) return;

      const scene = videoContent.scenes.find((s) => s.id === targetSceneId);
      if (!scene) return;

      if (mediaType === "image") {
        const assetId = e.dataTransfer.getData("application/x-asset-id");
        const label = e.dataTransfer.getData("application/x-asset-label");
        const el = {
          id: uid(),
          type: "image" as const,
          content: assetId,
          timing: { enterMs: 0, enterAnimation: { preset: "fade-in" as const, durationMs: 500 } },
        };
        addSceneElement(targetSceneId, el);
      } else if (mediaType === "text") {
        const label = e.dataTransfer.getData("application/x-text-label") || "New Text";
        const fontSize = Number(e.dataTransfer.getData("application/x-text-fontSize")) || 24;
        const fontWeight = Number(e.dataTransfer.getData("application/x-text-fontWeight")) || 400;
        const el = {
          id: uid(),
          type: "text" as const,
          content: label,
          fontSize,
          fontWeight,
          timing: { enterMs: 0, enterAnimation: { preset: "fade-in" as const, durationMs: 500 } },
        };
        addSceneElement(targetSceneId, el);
      }
    },
    [currentSceneId, videoContent.scenes, addSceneElement],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const playheadX = (currentTimeMs / 1000) * zoomLevel;

  const hasElements = videoContent.scenes.some((s) => s.elements.length > 0);

  return (
    <div className={styles.timelineContent}>
      {/* Track labels */}
      <div className={styles.trackLabels}>
        <div className={styles.trackLabel}>
          <span className={styles.trackLabelDot} style={{ background: "#0a84ff" }} />
          Video
        </div>
        {hasElements && (
          <div className={styles.trackLabel}>
            <span className={styles.trackLabelDot} style={{ background: "#4ecdc4" }} />
            Elements
          </div>
        )}
        {videoContent.audioTracks.map((track) => (
          <div key={track.id} className={styles.trackLabel}>
            <span
              className={styles.trackLabelDot}
              style={{ background: AUDIO_COLORS[track.type] ?? "#888" }}
            />
            {track.label.length > 10 ? track.label.slice(0, 10) + "..." : track.label}
          </div>
        ))}
        {videoContent.captionTracks.map((track) => (
          <div key={track.id} className={styles.trackLabel}>
            <span className={styles.trackLabelDot} style={{ background: "#8a2be2" }} />
            {track.label}
          </div>
        ))}
      </div>

      {/* Tracks area */}
      <div className={styles.tracksArea} ref={tracksRef}>
        <div
          className={styles.tracksScroll}
          style={{ width: Math.max(totalWidth + 100, 1) }}
          onMouseDown={onScrubDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Video track: scene blocks */}
          <div className={styles.trackRow}>
            {videoContent.scenes.map((scene, idx) => (
              <SceneBlockDraggable
                key={scene.id}
                sceneId={scene.id}
                sceneIndex={idx}
                durationMs={scene.durationMs}
                startMs={getSceneStartMs(scene.id)}
                isActive={scene.id === currentSceneId}
                zoomLevel={zoomLevel}
                onSeek={onSeek}
              />
            ))}
          </div>

          {/* Elements track */}
          {hasElements && (
            <div className={styles.trackRow}>
              {videoContent.scenes.map((scene) => {
                const sceneStartMs = getSceneStartMs(scene.id);
                return scene.elements.map((el) => (
                  <ElementBarDraggable
                    key={el.id}
                    el={el}
                    sceneId={scene.id}
                    sceneDurationMs={scene.durationMs}
                    sceneStartMs={sceneStartMs}
                    zoomLevel={zoomLevel}
                    isActive={el.id === useLumvasStore.getState().activeElementId}
                    onSeek={onSeek}
                  />
                ));
              })}
            </div>
          )}

          {/* Audio tracks */}
          {videoContent.audioTracks.map((track) => {
            const left = ((track.startMs ?? 0) / 1000) * zoomLevel;
            const rawWidth = ((track.durationMs ?? totalDuration) / 1000) * zoomLevel;
            const width = Number.isFinite(rawWidth) ? rawWidth : 0;
            const color = AUDIO_COLORS[track.type] ?? "#888";
            return (
              <div key={track.id} className={styles.trackRow}>
                <div
                  className={styles.audioBlock}
                  style={{
                    left,
                    width: Math.max(width, 4),
                    background: `${color}22`,
                    borderLeft: `3px solid ${color}`,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    useTimelineStore.getState().setInspectorTarget({ type: "audio", trackId: track.id });
                  }}
                >
                  <div className={styles.audioWaveform} style={{ color }} />
                  {track.label}
                </div>
              </div>
            );
          })}

          {/* Caption tracks */}
          {videoContent.captionTracks.map((track) =>
            track.segments.length > 0 ? (
              <div key={track.id} className={styles.trackRow}>
                {track.segments.map((seg) => {
                  if (seg.words.length === 0) return null;
                  const segStart = seg.words[0].startMs;
                  const segEnd = seg.words[seg.words.length - 1].endMs;
                  const left = (segStart / 1000) * zoomLevel;
                  const width = ((segEnd - segStart) / 1000) * zoomLevel;
                  return (
                    <div
                      key={seg.id}
                      className={styles.captionBlock}
                      style={{ left, width: Math.max(width, 4) }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onSeek(segStart);
                        useTimelineStore.getState().setInspectorTarget({ type: "caption", trackId: track.id });
                      }}
                    >
                      {seg.words.map((w) => w.text).join(" ").slice(0, 20)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                key={track.id}
                className={styles.trackRow}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  useTimelineStore.getState().setInspectorTarget({ type: "caption", trackId: track.id });
                }}
                style={{ cursor: "pointer" }}
              />
            ),
          )}

          {/* Playhead line */}
          <div className={styles.playhead} style={{ left: playheadX }}>
            <div className={styles.playheadHead} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- MAIN WORKSPACE ---------- */

export function VideoWorkspace() {
  useGoogleFonts();
  useMenuEvents();
  const engineRef = usePlayback();

  const theme = useLumvasStore((s) => s.theme);
  const assets = useLumvasStore((s) => s.assets.items);
  const size = useLumvasStore((s) => s.documentSize);
  const language = useLumvasStore((s) => s.language);
  const videoContent = useLumvasStore((s) => selectVideoContent(s));
  const projectDir = useFileStore((s) => s.currentFilePath);
  const isDirty = useFileStore((s) => s.isDirty);
  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const fileName = currentFilePath ? basename(currentFilePath) : "Untitled";

  const currentTimeMs = useTimelineStore((s) => s.currentTimeMs);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed);
  const zoomLevel = useTimelineStore((s) => s.zoomLevel);
  const snapEnabled = useTimelineStore((s) => s.snapEnabled);
  const seekTo = useTimelineStore((s) => s.seekTo);

  const totalDuration = getTotalDurationMs();
  const currentSceneId = getSceneAtTime(currentTimeMs);
  const currentScene = videoContent.scenes.find((s) => s.id === currentSceneId);
  const sceneTime = currentSceneId ? currentTimeMs - getSceneStartMs(currentSceneId) : 0;

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let lastTime = performance.now();
    const speed = useTimelineStore.getState().playbackSpeed;

    const tick = (now: number) => {
      const delta = (now - lastTime) * speed;
      lastTime = now;
      const next = useTimelineStore.getState().currentTimeMs + delta;
      if (next >= totalDuration) {
        useTimelineStore.getState().pause();
        seekTo(totalDuration);
      } else {
        seekTo(next);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration, seekTo]);

  // Auto-save on beforeunload
  useEffect(() => {
    const handler = () => useFileStore.getState().saveAutoSave();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (isPlaying) useTimelineStore.getState().pause();
          else useTimelineStore.getState().play();
          break;
        case "Home":
          e.preventDefault();
          seekTo(0);
          break;
        case "End":
          e.preventDefault();
          seekTo(totalDuration);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekTo(Math.max(0, currentTimeMs - (e.shiftKey ? 1000 : 100)));
          break;
        case "ArrowRight":
          e.preventDefault();
          seekTo(Math.min(totalDuration, currentTimeMs + (e.shiftKey ? 1000 : 100)));
          break;
        case "KeyJ":
          seekTo(Math.max(0, currentTimeMs - 5000));
          break;
        case "KeyL":
          seekTo(Math.min(totalDuration, currentTimeMs + 5000));
          break;
        case "KeyK":
          if (isPlaying) useTimelineStore.getState().pause();
          else useTimelineStore.getState().play();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPlaying, currentTimeMs, totalDuration, seekTo]);

  // Compute preview scale to fit
  const centerRef = useRef<HTMLDivElement>(null);
  const previewScale = 0.4;

  const handlePlayPause = useCallback(() => {
    if (isPlaying) useTimelineStore.getState().pause();
    else useTimelineStore.getState().play();
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    useTimelineStore.getState().stop();
  }, []);

  const handleSpeedChange = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(playbackSpeed);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    useTimelineStore.getState().setPlaybackSpeed(next);
  }, [playbackSpeed]);

  const handleSkipBack = useCallback(() => {
    // Skip to previous scene start
    const scenes = videoContent.scenes;
    let elapsed = 0;
    let prevStart = 0;
    for (const scene of scenes) {
      if (elapsed >= currentTimeMs - 50) break;
      prevStart = elapsed;
      elapsed += scene.durationMs;
    }
    seekTo(prevStart);
  }, [videoContent.scenes, currentTimeMs, seekTo]);

  const handleSkipForward = useCallback(() => {
    // Skip to next scene start
    const scenes = videoContent.scenes;
    let elapsed = 0;
    for (const scene of scenes) {
      elapsed += scene.durationMs;
      if (elapsed > currentTimeMs + 50) {
        seekTo(Math.min(elapsed, totalDuration));
        return;
      }
    }
    seekTo(totalDuration);
  }, [videoContent.scenes, currentTimeMs, totalDuration, seekTo]);

  return (
    <div className={styles.layout}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {isDirty && <span className={styles.dirtyDot}>●</span>}
          <span className={styles.headerFile}>{fileName}</span>
          <span className={styles.modeBadge}>VIDEO</span>
        </div>
      </header>

      {/* Left panel: Media Pool */}
      <aside className={styles.leftPanel}>
        <MediaPool />
      </aside>

      {/* Center: preview + transport */}
      <main className={styles.center} ref={centerRef}>
        <div className={styles.previewArea}>
          {currentScene ? (
            <div className={styles.canvasWrapper}>
              <div
                className={styles.canvasScale}
                style={{
                  width: size.width * previewScale,
                  height: size.height * previewScale,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <SceneRenderer
                    scene={currentScene}
                    theme={theme}
                    assets={assets}
                    size={size}
                    language={language}
                    projectDir={projectDir}
                    currentTimeMs={sceneTime}
                  />
                  <PreviewOverlay
                    captionTracks={videoContent.captionTracks}
                    currentTimeMs={currentTimeMs}
                    theme={theme}
                    width={size.width}
                    height={size.height}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No scenes yet. Add one from the right panel.</p>
            </div>
          )}
        </div>

        {/* Transport controls below preview */}
        <div className={styles.previewTransport}>
          <span className={styles.timecodeDisplay}>{formatTimecode(currentTimeMs)}</span>
          <span className={styles.timecodeSeparator}>/</span>
          <span className={styles.timecodeDisplay} style={{ color: "#777" }}>
            {formatTimecode(totalDuration)}
          </span>

          <div style={{ width: 16 }} />

          <button className={styles.transportBtn} onClick={handleSkipBack} title="Previous scene">
            ⏮
          </button>
          <button
            className={styles.transportBtn}
            onClick={() => seekTo(Math.max(0, currentTimeMs - 5000))}
            title="Rewind 5s (J)"
          >
            ⏪
          </button>
          <button
            className={styles.transportBtnPlay}
            onClick={handlePlayPause}
            title="Play/Pause (Space)"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            className={styles.transportBtn}
            onClick={() => seekTo(Math.min(totalDuration, currentTimeMs + 5000))}
            title="Forward 5s (L)"
          >
            ⏩
          </button>
          <button className={styles.transportBtn} onClick={handleSkipForward} title="Next scene">
            ⏭
          </button>
          <button className={styles.transportBtn} onClick={handleStop} title="Stop">
            ⏹
          </button>

          <div style={{ width: 8 }} />

          <button
            className={styles.speedSelector}
            onClick={handleSpeedChange}
            title="Playback speed"
          >
            {playbackSpeed}x
          </button>
        </div>
      </main>

      {/* Right panel: context-sensitive inspector */}
      <aside className={styles.rightPanel}>
        <Inspector />
      </aside>

      {/* Bottom: Timeline */}
      <div className={styles.timeline}>
        {/* Timeline toolbar */}
        <div className={styles.timelineToolbar}>
          <button
            className={`${styles.snapToggle} ${snapEnabled ? styles.snapToggleOn : styles.snapToggleOff}`}
            onClick={() => useTimelineStore.getState().toggleSnap()}
          >
            Snap
          </button>

          <div className={styles.zoomControl}>
            <span className={styles.zoomLabel}>-</span>
            <input
              type="range"
              className={styles.zoomSlider}
              min={20}
              max={400}
              value={zoomLevel}
              onChange={(e) => useTimelineStore.getState().setZoomLevel(Number(e.target.value))}
            />
            <span className={styles.zoomLabel}>+</span>
          </div>
        </div>

        {/* Time ruler */}
        <TimeRuler
          totalDuration={totalDuration}
          zoomLevel={zoomLevel}
          currentTimeMs={currentTimeMs}
          onSeek={seekTo}
        />

        {/* Multi-track area */}
        <TimelineTracks
          zoomLevel={zoomLevel}
          currentTimeMs={currentTimeMs}
          totalDuration={totalDuration}
          onSeek={seekTo}
        />
      </div>
    </div>
  );
}
