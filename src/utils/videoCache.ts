/**
 * Video frame cache — pre-extracts video frames to JPEG files on disk
 * using a single FFmpeg call, then loads them as regular images.
 *
 * Pipeline:
 *   1. ffprobe → get duration, dimensions
 *   2. ffmpeg → extract ALL frames as JPEGs to temp dir (one-shot, fast)
 *   3. Load individual frame JPEGs via <img> (same as image cache, works with asset://)
 *   4. Draw to canvas via ctx.drawImage(img, ...)
 *
 * No <video> elements. No per-frame FFmpeg. No blob URLs. No IPC pixel transfer.
 */

import { invoke } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import { log } from "./logger";

/* ─── Extension detection ─── */

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|ogg|avi|mkv)$/i;

export function isVideoSrc(src: string | undefined): boolean {
  if (!src) return false;
  return VIDEO_EXTENSIONS.test(src);
}

/* ─── Video metadata ─── */

interface VideoMeta {
  durationMs: number;
  width: number;
  height: number;
  filePath: string;
  /** Directory containing extracted JPEG frames */
  framesDir: string | null;
  /** Total number of extracted frames */
  frameCount: number;
  /** FPS used for extraction */
  extractedFps: number;
  /** Scale used for extraction */
  extractedWidth: number;
  extractedHeight: number;
}

const metaCache = new Map<string, VideoMeta>();
const frameImageCache = new Map<string, HTMLImageElement>();
const pendingExtractions = new Map<string, Promise<VideoMeta>>();

/** Extract the absolute file path from an asset:// URL or relative path */
function toFilePath(src: string, projectDir?: string | null): string {
  if (src.startsWith("asset://localhost/")) {
    return decodeURIComponent(src.replace("asset://localhost/", "/").replace(/^\/\//, "/"));
  }
  if (src.startsWith("http://asset.localhost/")) {
    return decodeURIComponent(src.replace("http://asset.localhost/", "/").replace(/^\/\//, "/"));
  }
  if (projectDir && !src.startsWith("/")) {
    return `${projectDir}/${src}`;
  }
  return src;
}

/**
 * Preload a video: get metadata via ffprobe, then extract ALL frames
 * as JPEG files in a single FFmpeg call. Fast — only runs once per video.
 */
export async function preloadVideo(
  src: string,
  projectDir?: string | null,
  extractFps: number = 30,
  scaleDown: number = 0.5,
): Promise<VideoMeta> {
  // Normalize key by resolving to absolute file path
  const normalizedKey = toFilePath(src, projectDir);
  if (metaCache.has(src)) return metaCache.get(src)!;
  if (metaCache.has(normalizedKey)) { const m = metaCache.get(normalizedKey)!; metaCache.set(src, m); return m; }
  if (pendingExtractions.has(normalizedKey)) return pendingExtractions.get(normalizedKey)!;

  const promise = (async (): Promise<VideoMeta> => {
    const filePath = toFilePath(src, projectDir);

    // 1. Get video info
    log.info("video", "Getting video info", { filePath: filePath.slice(-60) });
    const [durationMs, width, height] = await invoke<[number, number, number]>("get_video_info", {
      videoPath: filePath,
    });
    log.info("video", "Video info", { durationMs, width, height });

    // 2. Extract frames to temp dir
    const extractW = Math.round(width * scaleDown);
    const extractH = Math.round(height * scaleDown);
    const framesDir = `/tmp/lumvas-frames-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    log.info("video", "Extracting frames", { framesDir, fps: extractFps, scale: `${extractW}x${extractH}` });

    const frameCount = await invoke<number>("extract_video_frames", {
      videoPath: filePath,
      outputDir: framesDir,
      fps: extractFps,
      scaleWidth: extractW,
      scaleHeight: extractH,
    });

    log.info("video", "Frames extracted", { frameCount, framesDir });

    // Pre-warm: read first batch of frame files as blob URLs (same-origin, no CORS taint)
    const loadPromises: Promise<void>[] = [];
    for (let i = 1; i <= Math.min(frameCount, 60); i++) {
      const fileName = `frame_${String(i).padStart(5, "0")}.jpg`;
      const filePath = `${framesDir}/${fileName}`;
      const key = `${framesDir}/${i}`;
      const img = new Image();
      frameImageCache.set(key, img);

      const p = readFile(filePath).then((bytes) => {
        const blob = new Blob([bytes], { type: "image/jpeg" });
        img.src = URL.createObjectURL(blob);
        // Wait for the image to actually decode
        return new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) { resolve(); return; }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }).catch(() => {});

      // Wait for the first 5 frames before returning
      if (i <= 5) loadPromises.push(p);
    }
    log.info("video", "Pre-warming 60 frames via blob URLs...");
    await Promise.all(loadPromises);
    log.info("video", "Frame images ready");

    const meta: VideoMeta = {
      durationMs, width, height, filePath,
      framesDir, frameCount,
      extractedFps: extractFps,
      extractedWidth: extractW,
      extractedHeight: extractH,
    };
    metaCache.set(src, meta);
    metaCache.set(normalizedKey, meta);
    pendingExtractions.delete(normalizedKey);
    return meta;
  })();

  pendingExtractions.set(normalizedKey, promise);
  return promise;
}

/**
 * Get the image element for a specific video frame.
 * Loads the pre-extracted JPEG file via blob URL (same-origin, no canvas taint).
 */
function getFrameImage(meta: VideoMeta, frameNum: number): HTMLImageElement | null {
  if (!meta.framesDir || frameNum < 1 || frameNum > meta.frameCount) return null;
  const key = `${meta.framesDir}/${frameNum}`;
  if (frameImageCache.has(key)) return frameImageCache.get(key)!;

  // Create placeholder — async load will fill it
  const img = new Image();
  frameImageCache.set(key, img);

  // Read file and create blob URL (same-origin, won't taint canvas)
  const fileName = `frame_${String(frameNum).padStart(5, "0")}.jpg`;
  const filePath = `${meta.framesDir}/${fileName}`;
  readFile(filePath).then((bytes) => {
    const blob = new Blob([bytes], { type: "image/jpeg" });
    img.src = URL.createObjectURL(blob);
  }).catch(() => {
    log.warn("video", "Failed to read frame file", { filePath, frameNum });
  });

  return img;
}

/**
 * Draw a video frame to canvas. Synchronous — uses pre-extracted JPEG frames.
 * Returns true if drawn, false if frame not ready yet.
 */
export function drawVideoFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  src: string,
  seekTimeMs: number,
  x: number, y: number, w: number, h: number,
): boolean {
  const meta = metaCache.get(src) ?? metaCache.get(toFilePath(src));
  if (!meta || !meta.framesDir || meta.frameCount === 0) return false;

  // Convert seek time to frame number (1-based)
  const frameNum = Math.max(1, Math.min(
    meta.frameCount,
    Math.round((seekTimeMs / 1000) * meta.extractedFps) + 1,
  ));

  const img = getFrameImage(meta, frameNum);
  if (!img || !img.complete || img.naturalWidth === 0) {
    // Image not loaded yet — try loading nearby frames that might be ready
    for (const delta of [-1, 1, -2, 2]) {
      const alt = getFrameImage(meta, frameNum + delta);
      if (alt?.complete && alt.naturalWidth > 0) {
        ctx.drawImage(alt, x, y, w, h);
        return true;
      }
    }
    return false;
  }

  ctx.drawImage(img, x, y, w, h);
  return true;
}

/* ─── Loop time computation ─── */

export function computeVideoSeekTime(
  elapsedMs: number,
  videoDurationMs: number,
  loop: boolean,
  trimLastFrame: boolean,
  fps: number = 30,
): number {
  if (videoDurationMs <= 0) return 0;
  const frameDurationMs = 1000 / fps;
  const effectiveDuration = trimLastFrame
    ? Math.max(frameDurationMs, videoDurationMs - frameDurationMs)
    : videoDurationMs;
  if (!loop) return Math.min(elapsedMs, effectiveDuration);
  return elapsedMs % effectiveDuration;
}

/* ─── Cache management ─── */

export function clearVideoCache() {
  log.info("video", "Clearing video cache", { meta: metaCache.size, images: frameImageCache.size });
  metaCache.clear();
  frameImageCache.clear();
  pendingExtractions.clear();
}

/** Get cached video metadata (duration, dimensions). Returns null if not yet loaded. */
export function getVideoMeta(src: string): { durationMs: number; width: number; height: number } | null {
  return metaCache.get(src) ?? metaCache.get(toFilePath(src)) ?? null;
}

// Legacy exports for compatibility
export function decodeFrame(): Promise<ImageBitmap> { return Promise.reject("deprecated"); }
export function drawCachedFrame(): boolean { return false; }
export function getOrCreateVideo(): null { return null; }
export function seekVideo(): Promise<void> { return Promise.resolve(); }
