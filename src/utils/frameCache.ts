/**
 * RAM Frame Cache — sequential pre-rendering of scene frames as uncompressed
 * RGBA bitmaps for real-time playback.
 *
 * Follows the industry-standard compositing preview model:
 *   1. Render Phase: sequentially compute frames from the playhead forward
 *   2. Commit to RAM: store as ImageBitmap (GPU-backed, zero-copy display)
 *   3. Playback Phase: cached frames are blitted directly (<1ms), uncached stutter
 *   4. Invalidation: edits flush only the affected time range
 *
 * Memory per frame at 1080x1920 8-bit RGBA = ~8.3 MB
 * A 2-second cache at 30fps = 60 frames = ~500 MB
 */

import type { VideoScene, ThemeNode, AssetItem, DocumentSize, CaptionTrack, Composition } from "@/types/schema";
import { renderSceneToCanvas, renderCaptionsToCanvas, renderComposition, preloadSceneAssets } from "./canvasRenderer";

/* ─── Types ─── */

export type PreviewQuality = "quarter" | "third" | "half" | "full";

const QUALITY_SCALES: Record<PreviewQuality, number> = {
  quarter: 0.25,
  third: 1 / 3,
  half: 0.5,
  full: 1,
};

export interface FrameCacheConfig {
  size: DocumentSize;
  fps: number;
  quality: PreviewQuality;
  /** Maximum RAM in bytes to use for cached frames. Default 2 GB. */
  maxBytes?: number;
}

export interface SceneContext {
  scene: VideoScene;
  theme: ThemeNode;
  assets: AssetItem[];
  projectDir: string | null | undefined;
  language?: string;
  captionTracks?: CaptionTrack[];
  /** Composition-based rendering (new architecture) */
  compositionId?: string;
  compositions?: Map<string, Composition>;
  /** Absolute time offset where this scene starts in the video timeline */
  sceneStartMs: number;
}

/** Subscribe to cache state changes (for UI indicators) */
export type CacheListener = (state: CacheState) => void;

export interface CacheState {
  /** Bitset of which frames are cached — true = green on indicator bar */
  cachedFrames: Set<number>;
  /** Total frames in the current scene */
  totalFrames: number;
  /** Frame interval in ms */
  frameIntervalMs: number;
  /** Bytes currently used */
  usedBytes: number;
  /** Max bytes budget */
  maxBytes: number;
  /** Render scale factor */
  renderScale: number;
  /** True if currently rendering frames in the background */
  isRendering: boolean;
  /** Current render FPS (frames rendered per second, 0 if idle) */
  renderFps: number;
}

export interface FrameCache {
  /** Get a cached frame. Returns null on cache miss. */
  getFrame(frameNum: number): ImageBitmap | null;
  /** Render a single frame to the off-screen canvas (synchronous, no video seek). */
  renderFrameDirect(ctx: SceneContext, sceneTimeMs: number): HTMLCanvasElement;
  /** Render a single frame with full asset loading + video seeking (async). */
  renderFrameAsync(ctx: SceneContext, sceneTimeMs: number): Promise<ImageBitmap>;
  /** Begin sequential rendering from a frame number forward. */
  startRendering(ctx: SceneContext, fromFrame: number, totalFrames: number): void;
  /** Stop background rendering. */
  stopRendering(): void;
  /** Invalidate frames in a time range (ms). Pass no args to purge all. */
  invalidate(startMs?: number, endMs?: number): void;
  /** Purge all cached frames and release memory. */
  purgeAll(): void;
  /** Update config. Purges cache if quality/size/fps changes. */
  setConfig(config: Partial<FrameCacheConfig>): void;
  /** Get current config. */
  getConfig(): Readonly<FrameCacheConfig>;
  /** Subscribe to cache state changes. Returns unsubscribe function. */
  subscribe(listener: CacheListener): () => void;
  /** Get current state snapshot. */
  getState(): CacheState;
  /** Release all resources. */
  dispose(): void;
}

/* ─── Implementation ─── */

export function createFrameCache(initialConfig: FrameCacheConfig): FrameCache {
  const TWO_GB = 2 * 1024 * 1024 * 1024;
  let config: FrameCacheConfig = {
    ...initialConfig,
    maxBytes: initialConfig.maxBytes ?? TWO_GB,
  };
  let scale = QUALITY_SCALES[config.quality];

  // Off-screen render canvas (reused for every frame)
  const renderCanvas = document.createElement("canvas");
  const renderCtx = renderCanvas.getContext("2d", { willReadFrequently: false })!;
  updateCanvasSize();

  // Frame storage
  const frames = new Map<number, ImageBitmap>();
  let bytesPerFrame = 0;
  let usedBytes = 0;
  computeBytesPerFrame();

  // Render state
  let renderAbort: AbortController | null = null;
  let isRendering = false;
  let renderFps = 0;

  // Listeners
  const listeners = new Set<CacheListener>();

  function updateCanvasSize() {
    const w = Math.round(config.size.width * scale);
    const h = Math.round(config.size.height * scale);
    renderCanvas.width = w;
    renderCanvas.height = h;
  }

  function computeBytesPerFrame() {
    const w = Math.round(config.size.width * scale);
    const h = Math.round(config.size.height * scale);
    bytesPerFrame = w * h * 4; // RGBA 8-bit
  }

  function frameIntervalMs(): number {
    return 1000 / config.fps;
  }

  function maxFramesFitInBudget(): number {
    return bytesPerFrame > 0 ? Math.floor(config.maxBytes! / bytesPerFrame) : 0;
  }

  function notify() {
    const state = cache.getState();
    for (const l of listeners) l(state);
  }

  /** Render one frame to the off-screen canvas. */
  function renderToCanvas(ctx: SceneContext, sceneTimeMs: number) {
    renderCtx.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
    renderCtx.save();
    if (scale !== 1) renderCtx.scale(scale, scale);

    // Use composition renderer if available, fall back to legacy scene renderer
    if (ctx.compositionId && ctx.compositions) {
      renderComposition(
        renderCtx, ctx.compositionId, ctx.compositions,
        ctx.theme, ctx.assets, config.size, ctx.projectDir ?? null,
        sceneTimeMs, ctx.language,
      );
    } else {
      renderSceneToCanvas(
        renderCtx, ctx.scene, ctx.theme, ctx.assets,
        config.size, ctx.projectDir ?? null, sceneTimeMs, ctx.language,
      );
    }

    if (ctx.captionTracks && ctx.captionTracks.length > 0) {
      const absTimeMs = ctx.sceneStartMs + sceneTimeMs;
      renderCaptionsToCanvas(
        renderCtx, ctx.captionTracks, absTimeMs,
        config.size.width, config.size.height,
      );
    }
    renderCtx.restore();
  }

  /** Store a frame, evicting oldest if over budget. */
  function storeFrame(frameNum: number, bmp: ImageBitmap) {
    // Evict if over budget
    while (usedBytes + bytesPerFrame > config.maxBytes! && frames.size > 0) {
      // Evict the frame with the smallest frame number (oldest)
      const first = frames.keys().next().value;
      if (first === undefined) break;
      frames.get(first)?.close();
      frames.delete(first);
      usedBytes -= bytesPerFrame;
    }
    frames.set(frameNum, bmp);
    usedBytes += bytesPerFrame;
  }

  const cache: FrameCache = {
    getFrame(frameNum: number): ImageBitmap | null {
      return frames.get(frameNum) ?? null;
    },

    renderFrameDirect(ctx: SceneContext, sceneTimeMs: number): HTMLCanvasElement {
      renderToCanvas(ctx, sceneTimeMs);
      return renderCanvas;
    },

    async renderFrameAsync(ctx: SceneContext, sceneTimeMs: number): Promise<ImageBitmap> {
      // Assets (including video frame extraction) should already be preloaded
      // by CanvasPreview on scene change. No per-frame preloading.
      renderToCanvas(ctx, sceneTimeMs);
      return createImageBitmap(renderCanvas);
    },

    startRendering(ctx: SceneContext, fromFrame: number, totalFrames: number) {
      cache.stopRendering();
      const abort = new AbortController();
      renderAbort = abort;
      isRendering = true;
      notify();

      // Sequential rendering from fromFrame forward
      (async () => {
        // Pre-load all assets first
        await preloadSceneAssets(ctx.scene, ctx.assets, ctx.projectDir);
        if (abort.signal.aborted) return;

        const maxFrames = Math.min(totalFrames, maxFramesFitInBudget());
        let rendered = 0;
        let lastNotify = performance.now();
        let framesSinceNotify = 0;

        for (let f = fromFrame; f < fromFrame + maxFrames && f < totalFrames; f++) {
          if (abort.signal.aborted) break;
          if (frames.has(f)) { rendered++; continue; }

          const sceneTimeMs = f * frameIntervalMs();
          try {
            renderToCanvas(ctx, sceneTimeMs);
            if (abort.signal.aborted) break;
            const bmp = await createImageBitmap(renderCanvas);
            if (abort.signal.aborted) { bmp.close(); break; }
            storeFrame(f, bmp);
            rendered++;
            framesSinceNotify++;

            // Update render FPS and notify listeners periodically
            const now = performance.now();
            const elapsed = now - lastNotify;
            if (elapsed >= 500) {
              renderFps = Math.round((framesSinceNotify / elapsed) * 1000);
              framesSinceNotify = 0;
              lastNotify = now;
              notify();
            }
          } catch {
            // Frame render failed, skip
          }

          // Yield to main thread after each frame
          await new Promise((r) => setTimeout(r, 0));
        }

        if (!abort.signal.aborted) {
          isRendering = false;
          renderFps = 0;
          notify();
        }
      })();
    },

    stopRendering() {
      if (renderAbort) {
        renderAbort.abort();
        renderAbort = null;
      }
      isRendering = false;
      renderFps = 0;
    },

    invalidate(startMs?: number, endMs?: number) {
      cache.stopRendering();
      if (startMs === undefined || endMs === undefined) {
        // Purge all
        cache.purgeAll();
        return;
      }
      const fi = frameIntervalMs();
      const startFrame = Math.floor(startMs / fi);
      const endFrame = Math.ceil(endMs / fi);
      for (let f = startFrame; f <= endFrame; f++) {
        const bmp = frames.get(f);
        if (bmp) {
          bmp.close();
          frames.delete(f);
          usedBytes -= bytesPerFrame;
        }
      }
      notify();
    },

    purgeAll() {
      cache.stopRendering();
      for (const bmp of frames.values()) bmp.close();
      frames.clear();
      usedBytes = 0;
      notify();
    },

    setConfig(partial: Partial<FrameCacheConfig>) {
      const needsPurge =
        (partial.quality !== undefined && partial.quality !== config.quality) ||
        (partial.size !== undefined && (partial.size.width !== config.size.width || partial.size.height !== config.size.height)) ||
        (partial.fps !== undefined && partial.fps !== config.fps);

      Object.assign(config, partial);
      if (partial.quality !== undefined) scale = QUALITY_SCALES[config.quality];
      if (partial.maxBytes !== undefined) config.maxBytes = partial.maxBytes;
      updateCanvasSize();
      computeBytesPerFrame();
      if (needsPurge) cache.purgeAll();
      notify();
    },

    getConfig() { return { ...config }; },

    subscribe(listener: CacheListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getState(): CacheState {
      return {
        cachedFrames: new Set(frames.keys()),
        totalFrames: 0, // caller sets this based on scene duration
        frameIntervalMs: frameIntervalMs(),
        usedBytes,
        maxBytes: config.maxBytes!,
        renderScale: scale,
        isRendering,
        renderFps,
      };
    },

    dispose() {
      cache.purgeAll();
      listeners.clear();
    },
  };

  return cache;
}
