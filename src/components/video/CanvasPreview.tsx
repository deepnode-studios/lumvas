/**
 * CanvasPreview — unified preview component that replaces SceneRenderer.
 * Uses the SAME canvasRenderer.ts for both preview and export.
 * Displays frames via WebGL texture upload or Canvas2D fallback.
 */

import { useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import type { VideoScene, ThemeNode, AssetItem, DocumentSize, CaptionTrack, Composition } from "@/types/schema";
import { createDisplayWithFallback, type GLDisplay } from "@/utils/glDisplay";
import {
  createFrameCache,
  type FrameCache,
  type PreviewQuality,
  type SceneContext,
  type CacheState,
} from "@/utils/frameCache";
import { preloadSceneAssets, preloadCompositionAssets, buildCompositionMap } from "@/utils/canvasRenderer";
import { SelectionOverlay } from "./SelectionOverlay";

/* ─── Quality options ─── */

export const QUALITY_OPTIONS: { value: PreviewQuality; label: string }[] = [
  { value: "quarter", label: "Quarter" },
  { value: "third", label: "Third" },
  { value: "half", label: "Half" },
  { value: "full", label: "Full" },
];

/* ─── Public handle ─── */

export interface CanvasPreviewHandle {
  getCache(): FrameCache | null;
  startRendering(): void;
  purgeAll(): void;
}

/* ─── Props ─── */

interface CanvasPreviewProps {
  scene: VideoScene;
  theme: ThemeNode;
  assets: AssetItem[];
  size: DocumentSize;
  language?: string;
  projectDir?: string | null;
  sceneTimeMs: number;
  sceneStartMs: number;
  previewScale: number;
  activeElementId?: string | null;
  captionTracks?: CaptionTrack[];
  fps?: number;
  quality: PreviewQuality;
  /** Composition-based rendering */
  compositionId?: string;
  compositions?: Composition[];
  onCacheStateChange?: (state: CacheState) => void;
  onElementClick?: (id: string) => void;
  onBackgroundClick?: () => void;
  onElementDragMove?: (id: string, dx: number, dy: number) => void;
}

export const CanvasPreview = forwardRef<CanvasPreviewHandle, CanvasPreviewProps>(function CanvasPreview({
  scene, theme, assets, size, language, projectDir,
  sceneTimeMs, sceneStartMs, previewScale, activeElementId,
  captionTracks, fps = 30, quality,
  compositionId, compositions,
  onCacheStateChange,
  onElementClick, onBackgroundClick, onElementDragMove,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayRef = useRef<GLDisplay | null>(null);
  const cacheRef = useRef<FrameCache | null>(null);
  const sceneVersionRef = useRef(0);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), displayFps: 0, isCacheHit: false });
  const fpsOverlayRef = useRef<HTMLDivElement>(null);

  const compMap = useMemo(() =>
    compositions ? buildCompositionMap({ compositions, audioTracks: [], captionTracks: [], settings: { fps: fps as any, format: "mp4", codec: "h264", quality: "high" } }) : undefined,
    [compositions],
  );

  const sceneCtx: SceneContext = useMemo(() => ({
    scene, theme, assets,
    projectDir: projectDir ?? null,
    language, captionTracks, sceneStartMs,
    compositionId, compositions: compMap,
  }), [scene, theme, assets, projectDir, language, captionTracks, sceneStartMs, compositionId, compMap]);

  const totalFrames = Math.ceil(scene.durationMs / (1000 / fps));

  useImperativeHandle(ref, () => ({
    getCache: () => cacheRef.current,
    startRendering: () => {
      const cache = cacheRef.current;
      if (!cache) return;
      const frameNum = Math.round(sceneTimeMs / (1000 / fps));
      cache.startRendering(sceneCtx, frameNum, totalFrames);
    },
    purgeAll: () => cacheRef.current?.purgeAll(),
  }), [sceneCtx, sceneTimeMs, fps, totalFrames]);

  // Init WebGL display (once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const display = createDisplayWithFallback(canvas);
    displayRef.current = display;
    return () => { display.dispose(); displayRef.current = null; };
  }, []);

  // Init frame cache (recreate on size/fps change)
  useEffect(() => {
    const cache = createFrameCache({ size, fps, quality });
    cacheRef.current = cache;
    const unsub = cache.subscribe((state) => {
      onCacheStateChange?.({ ...state, totalFrames });
    });
    return () => { unsub(); cache.dispose(); cacheRef.current = null; };
  }, [size.width, size.height, fps]);

  // Update quality
  useEffect(() => { cacheRef.current?.setConfig({ quality }); }, [quality]);

  // Resize WebGL viewport
  useEffect(() => {
    displayRef.current?.resize(
      Math.round(size.width * previewScale),
      Math.round(size.height * previewScale),
    );
  }, [size.width, size.height, previewScale]);

  // Preload assets on scene change (one-time video extraction happens here)
  useEffect(() => {
    sceneVersionRef.current++;
    cacheRef.current?.purgeAll();
    // Preload assets — use composition-aware preloader when compositions exist
    if (compositionId && compMap) {
      preloadCompositionAssets(compositionId, compMap, assets, projectDir ?? null).catch(() => {});
    } else {
      preloadSceneAssets(scene, assets, projectDir).catch(() => {});
    }
  }, [scene, assets, projectDir, compositionId, compMap]);

  // Render and display current frame — NO state updates here, only refs
  useEffect(() => {
    const display = displayRef.current;
    const cache = cacheRef.current;
    if (!display || !cache) return;

    const frameInterval = 1000 / fps;
    const frameNum = Math.round(sceneTimeMs / frameInterval);

    // Try cache first
    const cached = cache.getFrame(frameNum);
    if (cached) {
      display.displayFrame(cached);
      fpsRef.current.isCacheHit = true;
    } else {
      // Cache miss — render on demand
      const canvas = cache.renderFrameDirect(sceneCtx, sceneTimeMs);
      display.displayFrame(canvas);
      fpsRef.current.isCacheHit = false;

      // Async render (for video frames), update display when done
      const version = sceneVersionRef.current;
      cache.renderFrameAsync(sceneCtx, sceneTimeMs).then((bmp) => {
        if (sceneVersionRef.current !== version) { bmp.close(); return; }
        display.displayFrame(bmp);
        bmp.close();
      }).catch(() => {});
    }

    // FPS counting (no state updates — direct DOM mutation)
    const counter = fpsRef.current;
    counter.frames++;
    const now = performance.now();
    if (now - counter.lastTime >= 1000) {
      counter.displayFps = counter.frames;
      counter.frames = 0;
      counter.lastTime = now;
      // Update FPS overlay via DOM (avoids React re-render)
      if (fpsOverlayRef.current) {
        fpsOverlayRef.current.textContent = `${counter.displayFps} / ${fps} fps | ${counter.isCacheHit ? "RAM" : "LIVE"}`;
        fpsOverlayRef.current.style.color = counter.isCacheHit ? "#4ade80" : "#f59e0b";
      }
    }
  }, [sceneTimeMs, sceneCtx, fps]);

  return (
    <div style={{ position: "relative", width: size.width * previewScale, height: size.height * previewScale }}>
      <canvas
        ref={canvasRef}
        width={Math.round(size.width * previewScale)}
        height={Math.round(size.height * previewScale)}
        style={{
          width: size.width * previewScale,
          height: size.height * previewScale,
          display: "block",
          borderRadius: 4,
        }}
      />
      <SelectionOverlay
        scene={scene} theme={theme} assets={assets} size={size}
        projectDir={projectDir ?? null} sceneTimeMs={sceneTimeMs}
        previewScale={previewScale} activeElementId={activeElementId}
        onElementClick={onElementClick} onBackgroundClick={onBackgroundClick}
        onElementDragMove={onElementDragMove}
      />
      <div
        ref={fpsOverlayRef}
        style={{
          position: "absolute", bottom: 6, left: 6,
          background: "rgba(0,0,0,0.6)", borderRadius: 4,
          padding: "3px 8px", fontSize: 10,
          fontFamily: "var(--font-mono)", color: "#f59e0b",
          zIndex: 10, pointerEvents: "none",
        }}
      >
        0 / {fps} fps | LIVE
      </div>
    </div>
  );
});
