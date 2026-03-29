import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { useFileStore } from "@/store/useFileStore";
import { useExportStore } from "@/store/useExportStore";
import {
  useTimelineStore,
  getTotalDurationMs,
  getSceneAtTime,
  getSceneStartMs,
} from "@/store/useTimelineStore";
import { useMenuEvents } from "@/hooks/useMenuEvents";
import { useGoogleFonts } from "@/hooks/useGoogleFonts";
import { usePlayback } from "@/hooks/usePlayback";
import { useAudioPeaks } from "@/hooks/useAudioPeaks";
import { resolveMediaSrc } from "@/utils/media";
import { basename } from "@/utils/path";
import { SceneRenderer } from "./SceneRenderer";
import { MediaPool } from "./MediaPool";
import { Inspector } from "./Inspector";
import { PreviewOverlay } from "./preview/PreviewOverlay";
import { EffectsLibrary } from "./EffectsLibrary";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { SceneThumbnail } from "./SceneThumbnail";
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

  const scene = useLumvasStore((s) => {
    const vc = selectVideoContent(s);
    return vc.scenes.find((sc) => sc.id === sceneId) ?? null;
  });
  const theme = useLumvasStore((s) => s.theme);
  const assets = useLumvasStore((s) => s.assets.items);
  const size = useLumvasStore((s) => s.documentSize);
  const projectDir = useFileStore((s) => s.currentFilePath);

  return (
    <div
      className={`${styles.sceneBlock} ${isActive ? styles.sceneBlockActive : ""}`}
      style={{ left, width: Math.max(width - 2, 4), position: "relative", overflow: "hidden" }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSeek(startMs);
        useTimelineStore.getState().setInspectorTarget({ type: "scene", sceneId });
      }}
    >
      {scene && (
        <SceneThumbnail
          scene={scene}
          theme={theme}
          assets={assets}
          size={size}
          projectDir={projectDir}
        />
      )}
      <span style={{ position: "relative", zIndex: 1 }}>Scene {sceneIndex + 1}</span>
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
        background: isActive ? `${color}cc` : `${color}88`,
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

/* ---------- Audio Waveform ---------- */

function AudioWaveformSvg({
  audioUrl,
  width,
  color,
}: {
  audioUrl: string | null;
  width: number;
  color: string;
}) {
  const numBuckets = Math.max(4, Math.round(width / 2));
  const peaks = useAudioPeaks(audioUrl, numBuckets);
  if (!peaks || width < 4) return null;

  const h = 28; // track height minus padding
  const mid = h / 2;
  const barW = Math.max(1, width / peaks.length);

  const points = Array.from(peaks).map((amp, i) => {
    const x = i * barW + barW / 2;
    const half = Math.max(1, amp * mid * 0.9);
    return { x, y1: mid - half, y2: mid + half };
  });

  return (
    <svg
      width={width}
      height={h}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      preserveAspectRatio="none"
    >
      {points.map(({ x, y1, y2 }, i) => (
        <line
          key={i}
          x1={x} y1={y1} x2={x} y2={y2}
          stroke={color}
          strokeWidth={Math.max(1, barW - 1)}
          strokeLinecap="round"
          opacity={0.55}
        />
      ))}
    </svg>
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
  projectDir,
  editingSceneId,
}: {
  zoomLevel: number;
  currentTimeMs: number;
  totalDuration: number;
  onSeek: (ms: number) => void;
  projectDir: string | null;
  editingSceneId?: string | null;
}) {
  const videoContent = useLumvasStore((s) => selectVideoContent(s));
  const addSceneElement = useLumvasStore((s) => s.addSceneElement);
  const inspectorTarget = useTimelineStore((s) => s.inspectorTarget);
  const currentSceneId = editingSceneId ?? getSceneAtTime(currentTimeMs);
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
        const assetData = e.dataTransfer.getData("application/x-asset-data");
        const el = {
          id: uid(),
          type: "image" as const,
          content: assetData,
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

  // Build a flat list of layers — each item is its own independent track row
  type Layer =
    | { kind: "video" }
    | { kind: "element"; el: (typeof videoContent.scenes)[0]["elements"][0]; sceneId: string; sceneDurationMs: number; sceneStartMs: number }
    | { kind: "audio"; track: (typeof videoContent.audioTracks)[0] }
    | { kind: "caption"; track: (typeof videoContent.captionTracks)[0] };

  const layers: Layer[] = [];

  // Video scenes — always first
  layers.push({ kind: "video" });

  if (editingSceneId) {
    // Isolation mode: show only the editing scene's elements
    const scene = videoContent.scenes.find((s) => s.id === editingSceneId);
    if (scene) {
      for (const el of scene.elements) {
        layers.push({ kind: "element", el, sceneId: scene.id, sceneDurationMs: scene.durationMs, sceneStartMs: 0 });
      }
    }
    // Show audio tracks that overlap with this scene's time range
    const absStart = getSceneStartMs(editingSceneId);
    const absEnd = absStart + (scene?.durationMs ?? 0);
    for (const track of videoContent.audioTracks) {
      const tEnd = track.startMs + track.durationMs;
      if (track.startMs < absEnd && tEnd > absStart) {
        // Remap audio to scene-relative time
        layers.push({
          kind: "audio",
          track: { ...track, startMs: track.startMs - absStart },
        });
      }
    }
  } else {
    // Master mode: show everything
    for (const scene of videoContent.scenes) {
      const sceneStartMs = getSceneStartMs(scene.id);
      for (const el of scene.elements) {
        layers.push({ kind: "element", el, sceneId: scene.id, sceneDurationMs: scene.durationMs, sceneStartMs });
      }
    }
    for (const track of videoContent.audioTracks) {
      layers.push({ kind: "audio", track });
    }
    for (const track of videoContent.captionTracks) {
      layers.push({ kind: "caption", track });
    }
  }

  return (
    <div className={styles.timelineContent}>
      {/* Track labels */}
      <div className={styles.trackLabels}>
        {layers.map((layer) => {
          switch (layer.kind) {
            case "video":
              return (
                <div key="video" className={styles.trackLabel}>
                  <span className={styles.trackLabelDot} style={{ background: "#0a84ff" }} />
                  Video
                </div>
              );
            case "element":
              return (
                <div key={layer.el.id} className={styles.trackLabel}>
                  <span className={styles.trackLabelDot} style={{ background: "#4ecdc4" }} />
                  {(layer.el.content || layer.el.type).slice(0, 12)}
                </div>
              );
            case "audio": {
              const color = AUDIO_COLORS[layer.track.type] ?? "#888";
              return (
                <div key={layer.track.id} className={styles.trackLabel}>
                  <span className={styles.trackLabelDot} style={{ background: color }} />
                  {layer.track.label.length > 10 ? layer.track.label.slice(0, 10) + "..." : layer.track.label}
                </div>
              );
            }
            case "caption":
              return (
                <div key={layer.track.id} className={styles.trackLabel}>
                  <span className={styles.trackLabelDot} style={{ background: "#8a2be2" }} />
                  {layer.track.label}
                </div>
              );
          }
        })}
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
          {layers.map((layer) => {
            switch (layer.kind) {
              case "video": {
                const scenesToShow = editingSceneId
                  ? videoContent.scenes.filter((s) => s.id === editingSceneId)
                  : videoContent.scenes;
                return (
                  <div key="video" className={styles.trackRow}>
                    {scenesToShow.map((scene, idx) => (
                      <SceneBlockDraggable
                        key={scene.id}
                        sceneId={scene.id}
                        sceneIndex={editingSceneId ? videoContent.scenes.findIndex((s) => s.id === scene.id) : idx}
                        durationMs={scene.durationMs}
                        startMs={editingSceneId ? 0 : getSceneStartMs(scene.id)}
                        isActive={inspectorTarget?.type === "scene" && inspectorTarget.sceneId === scene.id}
                        zoomLevel={zoomLevel}
                        onSeek={onSeek}
                      />
                    ))}
                  </div>
                );
              }

              case "element":
                return (
                  <div key={layer.el.id} className={styles.trackRow}>
                    <ElementBarDraggable
                      el={layer.el}
                      sceneId={layer.sceneId}
                      sceneDurationMs={layer.sceneDurationMs}
                      sceneStartMs={layer.sceneStartMs}
                      zoomLevel={zoomLevel}
                      isActive={layer.el.id === useLumvasStore.getState().activeElementId}
                      onSeek={onSeek}
                    />
                  </div>
                );

              case "audio": {
                const track = layer.track;
                const left = ((track.startMs ?? 0) / 1000) * zoomLevel;
                const rawWidth = ((track.durationMs ?? totalDuration) / 1000) * zoomLevel;
                const width = Number.isFinite(rawWidth) ? rawWidth : 0;
                const color = AUDIO_COLORS[track.type] ?? "#888";
                return (
                  <div key={track.id} className={styles.trackRow}>
                    <div
                      className={`${styles.audioBlock} ${inspectorTarget?.type === "audio" && inspectorTarget.trackId === track.id ? styles.audioBlockActive : ""}`}
                      style={{
                        left,
                        width: Math.max(width, 4),
                        background: inspectorTarget?.type === "audio" && inspectorTarget.trackId === track.id ? `${color}44` : `${color}22`,
                        borderLeft: `3px solid ${color}`,
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        useTimelineStore.getState().setInspectorTarget({ type: "audio", trackId: track.id });
                      }}
                    >
                      <AudioWaveformSvg
                        audioUrl={track.src ? resolveMediaSrc(track.src, projectDir) : null}
                        width={Math.max(width, 4)}
                        color={color}
                      />
                      <span style={{ position: "relative", zIndex: 1 }}>{track.label}</span>
                    </div>
                  </div>
                );
              }

              case "caption": {
                const track = layer.track;
                const isTrackActive = inspectorTarget?.type === "caption" && inspectorTarget.trackId === track.id;
                return (
                  <div key={track.id} className={styles.trackRow}>
                    {track.segments.map((seg, segIdx) => {
                      if (seg.words.length === 0) return null;
                      const segStart = seg.words[0].startMs;
                      const segEnd = seg.words[seg.words.length - 1].endMs;
                      const groupLeft = (segStart / 1000) * zoomLevel;
                      const groupWidth = ((segEnd - segStart) / 1000) * zoomLevel;
                      return (
                        <div key={seg.id}>
                          {/* Segment background connector */}
                          <div
                            className={`${styles.captionSegmentGroup} ${isTrackActive ? styles.captionSegmentGroupActive : ""}`}
                            style={{ left: groupLeft, width: Math.max(groupWidth, 4) }}
                          />
                          {/* Individual word blocks */}
                          {seg.words.map((word, wordIdx) => {
                            const wLeft = (word.startMs / 1000) * zoomLevel;
                            const wWidth = ((word.endMs - word.startMs) / 1000) * zoomLevel;
                            return (
                              <div
                                key={`${seg.id}-w${wordIdx}`}
                                className={`${styles.captionWord} ${isTrackActive ? styles.captionWordActive : ""}`}
                                style={{ left: wLeft, width: Math.max(wWidth, 4) }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  useTimelineStore.getState().setInspectorTarget({ type: "caption", trackId: track.id });
                                  // Drag to shift this word
                                  const startX = e.clientX;
                                  const origStart = word.startMs;
                                  const origEnd = word.endMs;
                                  let moved = false;
                                  const onMove = (ev: MouseEvent) => {
                                    moved = true;
                                    const dx = ev.clientX - startX;
                                    const deltaMs = Math.round((dx / zoomLevel) * 1000);
                                    const newStart = Math.max(0, origStart + deltaMs);
                                    const newEnd = Math.max(0, origEnd + deltaMs);
                                    const newSegs = track.segments.map((s, si) =>
                                      si !== segIdx ? s : {
                                        ...s,
                                        words: s.words.map((w, wi) =>
                                          wi !== wordIdx ? w : { ...w, startMs: newStart, endMs: newEnd },
                                        ),
                                      },
                                    );
                                    useLumvasStore.getState().setCaptionSegments(track.id, newSegs);
                                  };
                                  const onUp = () => {
                                    window.removeEventListener("mousemove", onMove);
                                    window.removeEventListener("mouseup", onUp);
                                    if (!moved) onSeek(word.startMs);
                                  };
                                  window.addEventListener("mousemove", onMove);
                                  window.addEventListener("mouseup", onUp);
                                }}
                              >
                                {/* Left handle - trim word start */}
                                <div
                                  className={styles.captionWordHandleLeft}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const origStart = word.startMs;
                                    const onMove = (ev: MouseEvent) => {
                                      const dx = ev.clientX - startX;
                                      const deltaMs = Math.round((dx / zoomLevel) * 1000);
                                      const newStart = Math.max(0, origStart + deltaMs);
                                      const newSegs = track.segments.map((s, si) =>
                                        si !== segIdx ? s : {
                                          ...s,
                                          words: s.words.map((w, wi) =>
                                            wi !== wordIdx ? w : { ...w, startMs: Math.min(newStart, w.endMs - 10) },
                                          ),
                                        },
                                      );
                                      useLumvasStore.getState().setCaptionSegments(track.id, newSegs);
                                    };
                                    const onUp = () => {
                                      window.removeEventListener("mousemove", onMove);
                                      window.removeEventListener("mouseup", onUp);
                                    };
                                    window.addEventListener("mousemove", onMove);
                                    window.addEventListener("mouseup", onUp);
                                  }}
                                />
                                <span style={{ pointerEvents: "none", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {word.text}
                                </span>
                                {/* Right handle - trim word end */}
                                <div
                                  className={styles.captionWordHandleRight}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const origEnd = word.endMs;
                                    const onMove = (ev: MouseEvent) => {
                                      const dx = ev.clientX - startX;
                                      const deltaMs = Math.round((dx / zoomLevel) * 1000);
                                      const newEnd = Math.max(0, origEnd + deltaMs);
                                      const newSegs = track.segments.map((s, si) =>
                                        si !== segIdx ? s : {
                                          ...s,
                                          words: s.words.map((w, wi) =>
                                            wi !== wordIdx ? w : { ...w, endMs: Math.max(w.startMs + 10, newEnd) },
                                          ),
                                        },
                                      );
                                      useLumvasStore.getState().setCaptionSegments(track.id, newSegs);
                                    };
                                    const onUp = () => {
                                      window.removeEventListener("mousemove", onMove);
                                      window.removeEventListener("mouseup", onUp);
                                    };
                                    window.addEventListener("mousemove", onMove);
                                    window.addEventListener("mouseup", onUp);
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              }
            }
          })}

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
  usePlayback();

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

  const editingSceneId = useTimelineStore((s) => s.editingSceneId);
  const editingScene = editingSceneId ? videoContent.scenes.find((s) => s.id === editingSceneId) ?? null : null;

  // In isolation mode, duration and scene are scoped to the single scene
  const totalDuration = editingScene ? editingScene.durationMs : getTotalDurationMs();
  const currentSceneId = editingSceneId ?? getSceneAtTime(currentTimeMs);
  const currentScene = editingSceneId
    ? editingScene
    : videoContent.scenes.find((s) => s.id === currentSceneId);
  const sceneTime = editingSceneId
    ? currentTimeMs // in isolation mode, time IS scene-relative
    : (currentSceneId ? currentTimeMs - getSceneStartMs(currentSceneId) : 0);

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

      const ctrl = e.ctrlKey || e.metaKey;

      // Copy/paste/duplicate
      if (ctrl && e.code === "KeyC") {
        e.preventDefault();
        const { activeElementId, activeSceneId } = useLumvasStore.getState();
        const vc = selectVideoContent(useLumvasStore.getState());
        const scene = vc.scenes.find((s) => s.id === activeSceneId);
        if (activeElementId && scene) {
          const el = scene.elements.find((el) => el.id === activeElementId);
          if (el) clipboardRef.current = { type: "element", sceneId: scene.id, element: JSON.parse(JSON.stringify(el)) };
        } else if (scene) {
          clipboardRef.current = { type: "scene", scene: JSON.parse(JSON.stringify(scene)) };
        }
        return;
      }
      if (ctrl && e.code === "KeyV") {
        e.preventDefault();
        const cb = clipboardRef.current;
        if (!cb) return;
        if (cb.type === "element") {
          const targetSceneId = cb.sceneId;
          const newEl = { ...JSON.parse(JSON.stringify(cb.element)), id: Math.random().toString(36).slice(2, 10) };
          newEl.timing = { ...newEl.timing, enterMs: (newEl.timing.enterMs ?? 0) + 200 };
          useLumvasStore.getState().addSceneElement(targetSceneId, newEl);
        } else {
          const newScene = { ...JSON.parse(JSON.stringify(cb.scene)), id: Math.random().toString(36).slice(2, 10) };
          newScene.elements = newScene.elements.map((el: import("@/types/schema").SceneElement) => ({ ...el, id: Math.random().toString(36).slice(2, 10) }));
          useLumvasStore.getState().addScene(newScene);
        }
        return;
      }
      if (ctrl && e.code === "KeyD") {
        e.preventDefault();
        const { activeElementId, activeSceneId } = useLumvasStore.getState();
        const vc = selectVideoContent(useLumvasStore.getState());
        const scene = vc.scenes.find((s) => s.id === activeSceneId);
        if (activeElementId && scene) {
          const el = scene.elements.find((el) => el.id === activeElementId);
          if (el) {
            const newEl = { ...JSON.parse(JSON.stringify(el)), id: Math.random().toString(36).slice(2, 10) };
            newEl.timing = { ...newEl.timing, enterMs: (newEl.timing.enterMs ?? 0) + 200 };
            useLumvasStore.getState().addSceneElement(scene.id, newEl);
          }
        } else if (scene) {
          const newScene = { ...JSON.parse(JSON.stringify(scene)), id: Math.random().toString(36).slice(2, 10) };
          newScene.elements = newScene.elements.map((el: import("@/types/schema").SceneElement) => ({ ...el, id: Math.random().toString(36).slice(2, 10) }));
          useLumvasStore.getState().addScene(newScene);
        }
        return;
      }

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
        case "Slash":
          if (e.shiftKey) {
            e.preventDefault();
            setShowShortcuts((x) => !x);
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPlaying, currentTimeMs, totalDuration, seekTo]);

  // Preview scale: auto-fit or manual
  const centerRef = useRef<HTMLDivElement>(null);
  const clipboardRef = useRef<{ type: "element"; sceneId: string; element: import("@/types/schema").SceneElement } | { type: "scene"; scene: import("@/types/schema").VideoScene } | null>(null);
  const [previewScaleMode, setPreviewScaleMode] = useState<"fit" | "manual">("fit");
  const [manualScale, setManualScale] = useState(0.4);
  const [fitScale, setFitScale] = useState(0.4);
  const [renderQuality, setRenderQuality] = useState<1 | 2>(1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const fxOpen = useTimelineStore((s) => s.fxOpen);

  // Compute fit scale based on available space
  useEffect(() => {
    const el = centerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: cw, height: ch } = entry.contentRect;
        // Reserve space for transport bar (~60px) and padding
        const availW = cw - 32;
        const availH = ch - 92;
        if (availW <= 0 || availH <= 0) return;
        const s = Math.min(availW / size.width, availH / size.height, 1);
        setFitScale(Math.max(0.05, s));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [size.width, size.height]);

  const previewScale = previewScaleMode === "fit" ? fitScale : manualScale;

  // Ctrl+scroll to zoom preview
  useEffect(() => {
    const el = centerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setPreviewScaleMode("manual");
      setManualScale((p) => Math.max(0.05, Math.min(2, p + delta)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

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
                    imageRendering: renderQuality === 2 ? "auto" : undefined,
                  }}
                >
                  <SceneRenderer
                    scene={currentScene}
                    theme={theme}
                    assets={assets}
                    size={renderQuality === 2 ? { ...size, width: size.width * 2, height: size.height * 2 } : size}
                    language={language}
                    projectDir={projectDir}
                    currentTimeMs={sceneTime}
                    activeElementId={useLumvasStore.getState().activeElementId}
                    onElementClick={(id) => useLumvasStore.getState().setActiveElement(id)}
                    previewScale={previewScale}
                    onElementDragMove={(id, dx, dy) => {
                      const el = currentScene.elements.find((e) => e.id === id);
                      if (!el) return;
                      useLumvasStore.getState().updateSceneElement(currentScene.id, id, {
                        x: (el.x ?? 0) + dx,
                        y: (el.y ?? 0) + dy,
                      });
                    }}
                    style={renderQuality === 2 ? { transform: "scale(0.5)", transformOrigin: "top left" } : undefined}
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

          <div style={{ width: 16 }} />

          <button
            className={styles.transportBtn}
            onClick={() => { setPreviewScaleMode("manual"); setManualScale((p) => Math.max(0.05, p - 0.1)); }}
            title="Zoom out"
          >
            −
          </button>
          <button
            className={styles.speedSelector}
            onClick={() => setPreviewScaleMode("fit")}
            title="Fit to view"
            style={previewScaleMode === "fit" ? { color: "#0a84ff", borderColor: "#0a84ff" } : undefined}
          >
            {Math.round(previewScale * 100)}%
          </button>
          <button
            className={styles.transportBtn}
            onClick={() => { setPreviewScaleMode("manual"); setManualScale((p) => Math.min(2, p + 0.1)); }}
            title="Zoom in"
          >
            +
          </button>

          <div style={{ width: 16 }} />

          <button
            className={styles.speedSelector}
            onClick={() => setRenderQuality((q) => (q === 1 ? 2 : 1))}
            title="Preview render quality (1x = fast, 2x = crisp)"
            style={renderQuality === 2 ? { color: "#4ecdc4", borderColor: "#4ecdc4" } : undefined}
          >
            {renderQuality}x
          </button>

          <button
            className={styles.transportBtn}
            onClick={() => useTimelineStore.getState().toggleFx()}
            title="Effects Library (FX)"
            style={fxOpen ? { color: "#a78bfa", borderColor: "#a78bfa" } : undefined}
          >
            ✦ FX
          </button>
        </div>
      </main>

      {/* Right panel: context-sensitive inspector */}
      <aside className={styles.rightPanel}>
        <Inspector />
      </aside>

      {/* Bottom: Timeline (includes FX drawer when open) */}
      <div className={styles.timeline}>
        {/* FX Drawer */}
        {fxOpen && <EffectsLibrary onClose={() => useTimelineStore.getState().toggleFx()} />}

        {/* Scene tabs */}
        <div className={styles.sceneTabs}>
          <button
            className={`${styles.sceneTab} ${!editingSceneId ? styles.sceneTabActive : ""}`}
            onClick={() => useTimelineStore.getState().setEditingScene(null)}
          >
            Master
          </button>
          {videoContent.scenes.map((sc, i) => (
            <button
              key={sc.id}
              className={`${styles.sceneTab} ${editingSceneId === sc.id ? styles.sceneTabActive : ""}`}
              onClick={() => useTimelineStore.getState().setEditingScene(sc.id)}
              title={`Scene ${i + 1} (${(sc.durationMs / 1000).toFixed(1)}s)`}
            >
              S{i + 1}
            </button>
          ))}
          {editingSceneId && (
            <span className={styles.isolationBadge}>
              Editing Scene {videoContent.scenes.findIndex((s) => s.id === editingSceneId) + 1}
            </span>
          )}
        </div>

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
          projectDir={projectDir}
          editingSceneId={editingSceneId}
        />
      </div>

      {/* Export progress overlay */}
      <ExportLayer size={size} />

      {/* Keyboard shortcuts modal */}
      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

/* ---------- EXPORT LAYER ---------- */

function ExportLayer({
  size,
}: {
  size: import("@/types/schema").DocumentSize;
}) {
  const currentPhase = useExportStore((s) => s.currentPhase);
  const isExporting = useExportStore((s) => s.isExporting);
  const progress = useExportStore((s) => s.progress);
  const renderedFrames = useExportStore((s) => s.renderedFrames);
  const totalFrames = useExportStore((s) => s.totalFrames);
  const errorMessage = useExportStore((s) => s.errorMessage);
  const exportFps = useExportStore((s) => s.exportFps);
  const exportScale = useExportStore((s) => s.exportScale);

  const showOverlay = currentPhase === "settings" || isExporting || currentPhase === "done" || currentPhase === "error";

  return (
    <>
      {/* Export overlay (settings / progress / done / error) */}
      {showOverlay && (
        <div className={styles.exportOverlay}>
          <div className={styles.exportDialog}>
            {currentPhase === "settings" ? (
              <ExportSettings size={size} fps={exportFps} scale={exportScale} />
            ) : currentPhase === "error" ? (
              <>
                <h3>Export failed</h3>
                <p style={{ color: "#ff453a", fontSize: 13 }}>{errorMessage}</p>
                <button className={styles.transportBtn} onClick={() => useExportStore.getState().reset()}>
                  Close
                </button>
              </>
            ) : currentPhase === "done" ? (
              <>
                <h3>Export complete</h3>
                <button className={styles.transportBtn} onClick={() => useExportStore.getState().reset()}>
                  Close
                </button>
              </>
            ) : (
              <>
                <h3>
                  {currentPhase === "rendering-frames" && "Rendering frames..."}
                  {currentPhase === "mixing-audio" && "Mixing audio..."}
                  {currentPhase === "encoding" && "Encoding video..."}
                </h3>
                {currentPhase === "rendering-frames" && (
                  <p style={{ fontSize: 12, color: "#888" }}>
                    Frame {renderedFrames} / {totalFrames}
                  </p>
                )}
                <div className={styles.exportProgressBar}>
                  <div className={styles.exportProgressFill} style={{ width: `${progress}%` }} />
                </div>
                <button
                  className={styles.transportBtn}
                  style={{ marginTop: 12 }}
                  onClick={() => useExportStore.getState().cancelExport()}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- EXPORT SETTINGS ---------- */

function ExportSettings({
  size,
  fps,
  scale,
}: {
  size: import("@/types/schema").DocumentSize;
  fps: number;
  scale: number;
}) {
  const outW = Math.round(size.width * scale);
  const outH = Math.round(size.height * scale);

  return (
    <>
      <h3>Export Video</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "16px 0", textAlign: "left" }}>
        {/* Frame rate */}
        <label style={{ fontSize: 13, color: "#aaa" }}>
          Frame rate
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {[12, 24, 30, 60].map((f) => (
              <button
                key={f}
                className={styles.transportBtn}
                style={{
                  padding: "4px 12px",
                  fontSize: 13,
                  background: fps === f ? "#0a84ff" : undefined,
                  color: fps === f ? "#fff" : undefined,
                }}
                onClick={() => useExportStore.getState().setExportFps(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </label>

        {/* Resolution scale */}
        <label style={{ fontSize: 13, color: "#aaa" }}>
          Resolution
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {[
              { label: "50%", value: 0.5 },
              { label: "75%", value: 0.75 },
              { label: "100%", value: 1 },
              { label: "150%", value: 1.5 },
              { label: "200%", value: 2 },
            ].map((opt) => (
              <button
                key={opt.value}
                className={styles.transportBtn}
                style={{
                  padding: "4px 12px",
                  fontSize: 13,
                  background: scale === opt.value ? "#0a84ff" : undefined,
                  color: scale === opt.value ? "#fff" : undefined,
                }}
                onClick={() => useExportStore.getState().setExportScale(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "#666", marginTop: 4, display: "block" }}>
            {outW} × {outH} px
          </span>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className={styles.transportBtn} onClick={() => useExportStore.getState().reset()}>
          Cancel
        </button>
        <button
          className={styles.transportBtn}
          style={{ background: "#0a84ff", color: "#fff", padding: "6px 20px" }}
          onClick={() => {
            import("@/utils/exportVideo").then((m) => m.confirmExport());
          }}
        >
          Export
        </button>
      </div>
    </>
  );
}
