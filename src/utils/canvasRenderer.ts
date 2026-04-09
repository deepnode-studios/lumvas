/**
 * Canvas2D scene renderer — draws scene elements directly to a canvas context.
 * No DOM, no html-to-image, no foreignObject. Pure canvas drawing.
 * Designed for real-time export: each frame renders in <5ms.
 */

import type {
  VideoScene,
  SceneElement,
  ThemeNode,
  AssetItem,
  DocumentSize,
  FlexAlign,
  FlexJustify,
  FlexDirection,
  TextSpan,
  MotionPath,
  PathMorphConfig,
  ParticleEmitterConfig,
  CameraTrack,
  CameraKeyframe,
  Easing,
  SpriteConfig,
} from "@/types/schema";
import { computeElementStyle, type ComputedElementStyle, lerpColor } from "@/utils/animation";
import { computeEffects } from "@/utils/effectsRenderer";
import { isVideoSrc, preloadVideo, drawVideoFrameToCanvas, computeVideoSeekTime, getVideoMeta } from "@/utils/videoCache";
import { log } from "@/utils/logger";

/* ─── Image cache ─── */

const imageCache = new Map<string, HTMLImageElement>();

export function preloadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

/* ─── SVG → data URL helper ─── */

export function svgMarkupToDataUrl(markup: string): string {
  // Ensure the markup has an SVG root — if not, wrap it
  const trimmed = markup.trim();
  const wrapped = trimmed.startsWith("<svg") ? trimmed : `<svg xmlns="http://www.w3.org/2000/svg">${trimmed}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(wrapped);
}

/* ─── Path length cache ─── */

const pathLengthCache = new Map<string, number>();

function getPathLength(d: string): number {
  if (pathLengthCache.has(d)) return pathLengthCache.get(d)!;
  try {
    const svgNS = "http://www.w3.org/2000/svg";
    const svgEl = document.createElementNS(svgNS, "svg") as SVGSVGElement;
    const pathEl = document.createElementNS(svgNS, "path") as SVGPathElement;
    pathEl.setAttribute("d", d);
    svgEl.appendChild(pathEl);
    svgEl.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
    document.body.appendChild(svgEl);
    const len = pathEl.getTotalLength();
    document.body.removeChild(svgEl);
    pathLengthCache.set(d, len);
    return len;
  } catch {
    return 1000; // safe fallback
  }
}

/* ─── Motion path: sample position along SVG path ─── */

/** Cached SVGPathElement instances for motion path sampling */
const motionPathCache = new Map<string, SVGPathElement>();

function getMotionPathElement(d: string): SVGPathElement {
  if (motionPathCache.has(d)) return motionPathCache.get(d)!;
  const svgNS = "http://www.w3.org/2000/svg";
  const svgEl = document.createElementNS(svgNS, "svg") as SVGSVGElement;
  const pathEl = document.createElementNS(svgNS, "path") as SVGPathElement;
  pathEl.setAttribute("d", d);
  svgEl.appendChild(pathEl);
  svgEl.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(svgEl);
  motionPathCache.set(d, pathEl);
  return pathEl;
}

/**
 * Sample a point on a motion path at a given progress (0–1).
 * Returns { x, y, angle } where angle is the tangent direction in degrees.
 */
export function sampleMotionPath(d: string, progress: number): { x: number; y: number; angle: number } {
  const pathEl = getMotionPathElement(d);
  const totalLength = pathEl.getTotalLength();
  const len = Math.max(0, Math.min(1, progress)) * totalLength;
  const pt = pathEl.getPointAtLength(len);
  // Compute tangent angle by sampling a tiny offset
  const dt = 0.5;
  const ptNext = pathEl.getPointAtLength(Math.min(totalLength, len + dt));
  const angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x) * (180 / Math.PI);
  return { x: pt.x, y: pt.y, angle };
}

/* ─── Path morphing: interpolate between two SVG path d-strings ─── */

/**
 * Normalize an SVG path to a series of points by sampling at regular intervals.
 * This allows interpolation between any two paths regardless of their segment types.
 */
function pathToPoints(d: string, count: number): { x: number; y: number }[] {
  const pathEl = getMotionPathElement(d);
  const totalLength = pathEl.getTotalLength();
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const len = (i / (count - 1)) * totalLength;
    const pt = pathEl.getPointAtLength(len);
    points.push({ x: pt.x, y: pt.y });
  }
  return points;
}

/** Cache for normalized path points */
const morphPointsCache = new Map<string, { x: number; y: number }[]>();

function getNormalizedPoints(d: string, count: number): { x: number; y: number }[] {
  const key = `${d}::${count}`;
  if (morphPointsCache.has(key)) return morphPointsCache.get(key)!;
  const pts = pathToPoints(d, count);
  morphPointsCache.set(key, pts);
  return pts;
}

/**
 * Interpolate between two SVG paths and return a new `d` string.
 * Both paths are resampled to `pointCount` points, then linearly interpolated.
 */
export function interpolatePaths(sourceD: string, targetD: string, progress: number, pointCount: number = 128): string {
  const srcPts = getNormalizedPoints(sourceD, pointCount);
  const tgtPts = getNormalizedPoints(targetD, pointCount);
  const t = Math.max(0, Math.min(1, progress));
  const parts: string[] = [];
  for (let i = 0; i < pointCount; i++) {
    const x = srcPts[i].x + (tgtPts[i].x - srcPts[i].x) * t;
    const y = srcPts[i].y + (tgtPts[i].y - srcPts[i].y) * t;
    parts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  return parts.join(" ") + " Z";
}

/* ─── Particle system ─── */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  birthMs: number;
  lifetimeMs: number;
  opacity: number;
  opacityEnd: number;
}

/** Per-emitter particle state — keyed by element ID */
const particleStates = new Map<string, {
  particles: Particle[];
  lastEmitMs: number;
  seed: number;
}>();

/** Seeded pseudo-random number generator */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

function tickParticles(
  elementId: string,
  config: ParticleEmitterConfig,
  sceneTimeMs: number,
  enterMs: number,
): Particle[] {
  let state = particleStates.get(elementId);
  if (!state) {
    state = { particles: [], lastEmitMs: enterMs, seed: 0 };
    particleStates.set(elementId, state);
  }

  const elapsedMs = sceneTimeMs - enterMs;
  const maxParticles = config.maxParticles ?? 200;

  // Emit new particles
  const emitInterval = 1000 / config.emitRate;
  while (state.lastEmitMs + emitInterval <= sceneTimeMs && state.particles.length < maxParticles) {
    state.lastEmitMs += emitInterval;
    state.seed++;
    const seed = state.seed;
    const angle = config.angle.min + seededRandom(seed * 1.1) * (config.angle.max - config.angle.min);
    const speed = config.velocity.min + seededRandom(seed * 2.2) * (config.velocity.max - config.velocity.min);
    const rad = (angle - 90) * Math.PI / 180; // -90 so 0deg = up
    const size = config.size.min + seededRandom(seed * 3.3) * (config.size.max - config.size.min);
    const color = config.colors[Math.floor(seededRandom(seed * 4.4) * config.colors.length)] ?? "#ffffff";

    state.particles.push({
      x: 0, y: 0,
      vx: Math.cos(rad) * speed,
      vy: Math.sin(rad) * speed,
      size,
      color,
      birthMs: state.lastEmitMs,
      lifetimeMs: config.particleLifetimeMs,
      opacity: config.opacity.start,
      opacityEnd: config.opacity.end,
    });
  }

  // Update existing particles
  const alive: Particle[] = [];
  for (const p of state.particles) {
    const age = sceneTimeMs - p.birthMs;
    if (age > p.lifetimeMs) continue;
    const t = age / p.lifetimeMs;
    const dtS = 1 / 60; // approximate dt
    p.x += p.vx * dtS;
    p.y += p.vy * dtS;
    p.vy += config.gravity * dtS;
    p.opacity = p.opacity + (p.opacityEnd - p.opacity) * t;
    alive.push(p);
  }
  state.particles = alive;
  return alive;
}

function drawParticleShape(
  ctx: CanvasRenderingContext2D,
  shape: string,
  x: number, y: number,
  size: number,
  color: string,
  opacity: number,
  customPath?: string,
) {
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.fillStyle = color;
  ctx.translate(x, y);

  switch (shape) {
    case "circle":
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "square":
      ctx.fillRect(-size / 2, -size / 2, size, size);
      break;
    case "heart": {
      const s = size / 2;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.4);
      ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.5, -s, 0, -s * 0.4);
      ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.3, 0, s * 0.4);
      ctx.fill();
      break;
    }
    case "star": {
      const s = size / 2;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * Math.PI / 180;
        const innerAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
        ctx.lineTo(Math.cos(outerAngle) * s, Math.sin(outerAngle) * s);
        ctx.lineTo(Math.cos(innerAngle) * s * 0.4, Math.sin(innerAngle) * s * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "custom":
      if (customPath) {
        const path = new Path2D(customPath);
        const scale = size / 24; // assume 24x24 viewbox
        ctx.scale(scale, scale);
        ctx.fill(path);
      }
      break;
  }
  ctx.restore();
}

/* ─── Glow rendering ─── */

/**
 * Draw a glow effect around an element by re-rendering it to an offscreen canvas
 * with blur + additive blending.
 */
function drawGlowEffect(
  ctx: CanvasRenderingContext2D,
  box: LayoutBox,
  glowColor: string,
  glowRadius: number,
  glowIntensity: number,
  passes: number,
) {
  if (glowIntensity <= 0 || glowRadius <= 0) return;
  const margin = glowRadius * 3;
  const ow = box.w + margin * 2;
  const oh = box.h + margin * 2;

  ctx.save();
  ctx.globalCompositeOperation = "lighter"; // additive blend
  ctx.globalAlpha *= glowIntensity;
  ctx.filter = `blur(${glowRadius}px)`;
  ctx.fillStyle = glowColor;

  for (let i = 0; i < passes; i++) {
    roundRect(ctx, box.x - margin / 4, box.y - margin / 4, box.w + margin / 2, box.h + margin / 2, 8);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── Sprite sheet rendering ─── */

function drawSpriteFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sprite: SpriteConfig,
  box: LayoutBox,
  sceneTimeMs: number,
  enterMs: number,
) {
  const elapsedMs = Math.max(0, sceneTimeMs - enterMs);
  const totalFrameTime = (sprite.frameCount / sprite.fps) * 1000;
  let frameIndex: number;

  switch (sprite.playMode) {
    case "once":
      frameIndex = Math.min(Math.floor((elapsedMs / 1000) * sprite.fps), sprite.frameCount - 1);
      break;
    case "hold-last":
      frameIndex = Math.min(Math.floor((elapsedMs / 1000) * sprite.fps), sprite.frameCount - 1);
      break;
    case "ping-pong": {
      const rawFrame = Math.floor((elapsedMs / 1000) * sprite.fps);
      const cycle = sprite.frameCount * 2 - 2;
      const pos = cycle > 0 ? rawFrame % cycle : 0;
      frameIndex = pos < sprite.frameCount ? pos : cycle - pos;
      break;
    }
    case "loop":
    default:
      frameIndex = Math.floor((elapsedMs / 1000) * sprite.fps) % sprite.frameCount;
      break;
  }

  const col = frameIndex % sprite.columns;
  const row = Math.floor(frameIndex / sprite.columns);
  const sx = col * sprite.frameWidth;
  const sy = row * sprite.frameHeight;

  ctx.drawImage(img, sx, sy, sprite.frameWidth, sprite.frameHeight, box.x, box.y, box.w, box.h);
}

/* ─── Camera transform ─── */

function cubicBezierEase(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  let x = t;
  for (let i = 0; i < 8; i++) {
    const xCalc = ((ax * x + bx) * x + cx) * x - t;
    const dx = (3 * ax * x + 2 * bx) * x + cx;
    if (Math.abs(dx) < 1e-6) break;
    x -= xCalc / dx;
  }
  return ((ay * x + by) * x + cy) * x;
}

function resolveCameraEasing(easing: Easing | undefined, t: number): number {
  if (!easing || easing === "linear") return t;
  if (typeof easing === "object" && easing.type === "cubic-bezier") {
    return cubicBezierEase(easing.x1, easing.y1, easing.x2, easing.y2, t);
  }
  switch (easing as string) {
    case "ease-in": return cubicBezierEase(0.42, 0, 1, 1, t);
    case "ease-out": return cubicBezierEase(0, 0, 0.58, 1, t);
    case "ease-in-out": return cubicBezierEase(0.42, 0, 0.58, 1, t);
    default: return t;
  }
}

/**
 * Interpolate camera state at a given time from a CameraTrack.
 * Returns { x, y, zoom, rotation } to apply as canvas transform.
 */
export function interpolateCamera(
  camera: CameraTrack,
  timeMs: number,
): { x: number; y: number; zoom: number; rotation: number } {
  const kfs = camera.keyframes;
  if (!kfs || kfs.length === 0) return { x: 0, y: 0, zoom: 1, rotation: 0 };
  if (kfs.length === 1 || timeMs <= kfs[0].timeMs) {
    const k = kfs[0];
    return { x: k.x, y: k.y, zoom: k.zoom, rotation: k.rotation ?? 0 };
  }
  if (timeMs >= kfs[kfs.length - 1].timeMs) {
    const k = kfs[kfs.length - 1];
    return { x: k.x, y: k.y, zoom: k.zoom, rotation: k.rotation ?? 0 };
  }

  // Find surrounding keyframes
  let before = kfs[0];
  let after = kfs[kfs.length - 1];
  for (let i = 0; i < kfs.length - 1; i++) {
    if (timeMs >= kfs[i].timeMs && timeMs <= kfs[i + 1].timeMs) {
      before = kfs[i];
      after = kfs[i + 1];
      break;
    }
  }

  const range = after.timeMs - before.timeMs;
  const raw = range > 0 ? (timeMs - before.timeMs) / range : 0;
  const t = resolveCameraEasing(after.easing, raw);

  return {
    x: before.x + (after.x - before.x) * t,
    y: before.y + (after.y - before.y) * t,
    zoom: before.zoom + (after.zoom - before.zoom) * t,
    rotation: (before.rotation ?? 0) + ((after.rotation ?? 0) - (before.rotation ?? 0)) * t,
  };
}

/* ─── Text stagger rendering ─── */

/**
 * Decompose text into units (chars/words/lines) and draw each with staggered animation.
 */
function drawTextStaggered(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: LayoutBox,
  stagger: NonNullable<ComputedElementStyle["textStagger"]>,
  sceneTimeMs: number,
  opts: {
    color: string;
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
    textAlign?: CanvasTextAlign;
    lineHeight?: number;
    language?: string;
  },
) {
  if (!text) return;

  // Split text into units
  let units: string[];
  if (stagger.unit === "character") {
    units = text.split("");
  } else if (stagger.unit === "line") {
    units = text.split("\n");
  } else {
    units = text.split(/\s+/).filter(Boolean);
  }

  if (units.length === 0) return;

  // Compute stagger order
  let order: number[];
  switch (stagger.staggerFrom) {
    case "end":
      order = units.map((_, i) => units.length - 1 - i);
      break;
    case "center": {
      const mid = (units.length - 1) / 2;
      order = units.map((_, i) => Math.abs(i - mid));
      // Normalize so center starts first
      const maxDist = Math.max(...order);
      order = order.map(d => d);
      break;
    }
    case "random":
      order = units.map((_, i) => {
        // Deterministic pseudo-random based on index
        return Math.floor(seededRandom(i * 127.1 + 42) * units.length);
      });
      break;
    case "start":
    default:
      order = units.map((_, i) => i);
      break;
  }

  ctx.save();
  ctx.font = `${opts.fontWeight} ${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const lh = opts.fontSize * (opts.lineHeight || 1.4);
  const align = opts.textAlign ?? "left";
  const enterMs = stagger.enterMs;
  const totalDur = stagger.durationMs;

  // Measure each unit
  const unitWidths = units.map(u => stagger.unit === "line" ? ctx.measureText(u).width : ctx.measureText(u + " ").width);

  // Word-wrap into lines for word/char mode
  let x = box.x;
  let y = box.y;

  if (align === "center") x = box.x + box.w / 2;
  else if (align === "right") x = box.x + box.w;

  // Simplified: draw units inline with word-wrap
  let lineX = 0;
  let lineY = 0;

  for (let i = 0; i < units.length; i++) {
    const unitDelay = order[i] * stagger.staggerMs;
    const unitEnter = enterMs + unitDelay;
    const unitDur = Math.max(100, totalDur - unitDelay);
    const elapsed = sceneTimeMs - unitEnter;

    if (elapsed < 0) continue; // not visible yet

    const progress = Math.min(1, elapsed / unitDur);
    // Apply per-unit easing
    const eased = progress; // simplified — full easing resolution available via cubicBezierEase

    // Compute per-unit animation state
    let unitOpacity = 1;
    let unitY = 0;
    let unitScale = 1;
    let unitBlur = 0;

    switch (stagger.animation) {
      case "fade-up":
        unitOpacity = eased;
        unitY = (1 - eased) * 20;
        break;
      case "fade-in":
        unitOpacity = eased;
        break;
      case "scale-in":
        unitOpacity = eased;
        unitScale = 0.5 + eased * 0.5;
        break;
      case "blur-in":
        unitOpacity = eased;
        unitBlur = (1 - eased) * 8;
        break;
      case "drop-in":
        unitOpacity = Math.min(1, eased * 2);
        unitY = (1 - eased) * -40;
        break;
    }

    // Word wrap
    const w = ctx.measureText(units[i]).width;
    const spacer = stagger.unit === "word" ? ctx.measureText(" ").width : 0;

    if (lineX + w > box.w && lineX > 0) {
      lineX = 0;
      lineY += lh;
    }

    const drawX = align === "center" ? box.x + (box.w - w) / 2 + lineX - (stagger.unit === "word" ? box.w / 2 : 0) : box.x + lineX;
    const drawY = box.y + lineY + unitY;

    ctx.save();
    ctx.globalAlpha *= unitOpacity;
    if (unitBlur > 0) ctx.filter = `blur(${unitBlur}px)`;
    if (unitScale !== 1) {
      ctx.translate(drawX + w / 2, drawY + opts.fontSize / 2);
      ctx.scale(unitScale, unitScale);
      ctx.translate(-(drawX + w / 2), -(drawY + opts.fontSize / 2));
    }
    ctx.fillStyle = opts.color;
    ctx.fillText(units[i], drawX, drawY);
    ctx.restore();

    lineX += w + spacer;
  }

  ctx.restore();
}

/** Pre-load all images/logos referenced in a scene */
export async function preloadSceneAssets(
  scene: VideoScene,
  assets: AssetItem[],
  projectDir: string | null | undefined,
): Promise<void> {
  const srcs = new Set<string>();

  function collectFromElement(el: SceneElement) {
    if (el.type === "image" && el.content) {
      srcs.add(resolveMediaSrcLocal(el.content, projectDir));
    }
    if (el.type === "logo") {
      const asset = el.assetId ? assets.find((a) => a.id === el.assetId) : assets[0];
      if (asset?.data) srcs.add(resolveMediaSrcLocal(asset.data, projectDir));
    }
    if (el.type === "svg" && el.content) {
      srcs.add(svgMarkupToDataUrl(el.content));
    }
    if (el.children) el.children.forEach(collectFromElement);
  }

  scene.elements.forEach(collectFromElement);

  const imageSrcs: string[] = [];
  const videoSrcs: string[] = [];
  for (const src of srcs) {
    if (!src) continue;
    if (isVideoSrc(src)) videoSrcs.push(src);
    else imageSrcs.push(src);
  }

  if (videoSrcs.length > 0) {
    log.info("canvas", "preloadSceneAssets: loading videos", { count: videoSrcs.length, srcs: videoSrcs.map(s => s.slice(-80)) });
  }

  await Promise.all([
    ...imageSrcs.map((src) => preloadImage(src).catch(() => { })),
    ...videoSrcs.map((src) => preloadVideo(src, projectDir).catch((e) => {
      log.error("canvas", "preloadSceneAssets: video preload failed", { src: src.slice(-80), error: String(e) });
    })),
  ]);
}

/** Pre-load all assets referenced in a composition tree (recursive) */
export async function preloadCompositionAssets(
  compositionId: string,
  compositions: Map<string, Composition>,
  assets: AssetItem[],
  projectDir: string | null | undefined,
  visited: Set<string> = new Set(),
): Promise<void> {
  if (visited.has(compositionId)) return;
  visited.add(compositionId);
  const comp = compositions.get(compositionId);
  if (!comp) return;

  const srcs = new Set<string>();

  function collectFromElement(el: SceneElement) {
    if (el.type === "image" && el.content) {
      srcs.add(resolveMediaSrcLocal(el.content, projectDir));
    }
    if (el.type === "logo") {
      const asset = el.assetId ? assets.find((a) => a.id === el.assetId) : assets[0];
      if (asset?.data) srcs.add(resolveMediaSrcLocal(asset.data, projectDir));
    }
    if (el.type === "svg" && el.content) {
      srcs.add(svgMarkupToDataUrl(el.content));
    }
    // Lottie: the src may be an asset ID or inline JSON — preload if it's a URL
    if (el.type === "lottie" && el.lottie?.src) {
      const lSrc = resolveMediaSrcLocal(el.lottie.src, projectDir);
      if (lSrc.startsWith("http") || lSrc.startsWith("data:") || lSrc.startsWith("asset:")) srcs.add(lSrc);
    }
    if (el.children) el.children.forEach(collectFromElement);
  }

  // Collect from all element layers
  const childCompIds: string[] = [];
  for (const layer of comp.layers) {
    if (layer.source.type === "element") {
      collectFromElement(layer.source.element);
    } else if (layer.source.type === "composition") {
      childCompIds.push(layer.source.compositionId);
    }
  }

  // Load images and videos
  const imageSrcs: string[] = [];
  const videoSrcs: string[] = [];
  for (const src of srcs) {
    if (!src) continue;
    if (isVideoSrc(src)) videoSrcs.push(src);
    else imageSrcs.push(src);
  }

  if (videoSrcs.length > 0) {
    log.info("canvas", "preloadCompositionAssets: loading videos", { compId: compositionId, count: videoSrcs.length });
  }

  await Promise.all([
    ...imageSrcs.map((src) => preloadImage(src).catch(() => {})),
    ...videoSrcs.map((src) => preloadVideo(src, projectDir).catch((e) => {
      log.error("canvas", "preloadCompositionAssets: video preload failed", { src: src.slice(-80), error: String(e) });
    })),
    // Recursively preload child compositions
    ...childCompIds.map((id) => preloadCompositionAssets(id, compositions, assets, projectDir, visited)),
  ]);
}

function resolveMediaSrcLocal(ref: string | undefined, projectDir: string | null | undefined): string {
  if (!ref) return "";
  if (ref.startsWith("data:") || ref.startsWith("http") || ref.startsWith("blob:") || ref.startsWith("asset:")) return ref;
  if (projectDir) {
    return `asset://localhost/${projectDir}/${ref}`;
  }
  return ref;
}

/* ─── Color resolution ─── */

/** Parse a CSS gradient string into a Canvas2D gradient */
function parseCssGradient(
  css: string,
  w: number,
  h: number,
  ctx: CanvasRenderingContext2D,
): CanvasGradient | null {
  try {
    // linear-gradient(angle, color1 stop1, color2 stop2, ...)
    const linearMatch = css.match(/linear-gradient\(\s*([^,]+)\s*,\s*(.+)\s*\)/i);
    if (linearMatch) {
      const angleStr = linearMatch[1].trim();
      const stopsStr = linearMatch[2];

      // Parse angle
      let angle = 180; // default: top to bottom
      if (angleStr.endsWith("deg")) {
        angle = parseFloat(angleStr);
      } else if (angleStr === "to right") angle = 90;
      else if (angleStr === "to left") angle = 270;
      else if (angleStr === "to bottom") angle = 180;
      else if (angleStr === "to top") angle = 0;
      else if (angleStr === "to bottom right") angle = 135;
      else if (angleStr === "to bottom left") angle = 225;
      else if (angleStr === "to top right") angle = 45;
      else if (angleStr === "to top left") angle = 315;

      // Convert angle to start/end points
      const rad = ((angle - 90) * Math.PI) / 180;
      const diag = Math.sqrt(w * w + h * h) / 2;
      const cx = w / 2, cy = h / 2;
      const dx = Math.cos(rad) * diag;
      const dy = Math.sin(rad) * diag;
      const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);

      // Parse color stops
      const stops = stopsStr.split(/,(?![^(]*\))/).map((s) => s.trim());
      for (let i = 0; i < stops.length; i++) {
        const parts = stops[i].match(/^(.+?)\s+([0-9.]+%?)$/);
        if (parts) {
          const color = parts[1].trim();
          const pos = parts[2].endsWith("%") ? parseFloat(parts[2]) / 100 : parseFloat(parts[2]);
          grad.addColorStop(Math.max(0, Math.min(1, pos)), color);
        } else {
          // No explicit stop position — distribute evenly
          grad.addColorStop(i / Math.max(1, stops.length - 1), stops[i].trim());
        }
      }
      return grad;
    }

    // radial-gradient(shape at position, color1 stop1, color2 stop2, ...)
    const radialMatch = css.match(/radial-gradient\(\s*([^,]+)\s*,\s*(.+)\s*\)/i);
    if (radialMatch) {
      const shapeStr = radialMatch[1].trim();
      const stopsStr = radialMatch[2];

      // Parse position
      let cx = w / 2, cy = h / 2;
      const atMatch = shapeStr.match(/at\s+([0-9.]+%?)\s+([0-9.]+%?)/);
      if (atMatch) {
        cx = atMatch[1].endsWith("%") ? (parseFloat(atMatch[1]) / 100) * w : parseFloat(atMatch[1]);
        cy = atMatch[2].endsWith("%") ? (parseFloat(atMatch[2]) / 100) * h : parseFloat(atMatch[2]);
      } else if (shapeStr.includes("at center")) {
        cx = w / 2; cy = h / 2;
      }

      // Radius: use distance to farthest corner
      const r = Math.max(
        Math.sqrt(cx * cx + cy * cy),
        Math.sqrt((w - cx) ** 2 + cy ** 2),
        Math.sqrt(cx ** 2 + (h - cy) ** 2),
        Math.sqrt((w - cx) ** 2 + (h - cy) ** 2),
      );
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);

      const stops = stopsStr.split(/,(?![^(]*\))/).map((s) => s.trim());
      for (let i = 0; i < stops.length; i++) {
        const parts = stops[i].match(/^(.+?)\s+([0-9.]+%?)$/);
        if (parts) {
          const color = parts[1].trim();
          const pos = parts[2].endsWith("%") ? parseFloat(parts[2]) / 100 : parseFloat(parts[2]);
          grad.addColorStop(Math.max(0, Math.min(1, pos)), color);
        } else {
          grad.addColorStop(i / Math.max(1, stops.length - 1), stops[i].trim());
        }
      }
      return grad;
    }
  } catch (e) {
    console.warn("[canvasRenderer] Failed to parse gradient:", css, e);
  }
  return null;
}

function resolveColor(token: string | undefined, theme: ThemeNode, scene: VideoScene): string {
  if (!token) return "";
  if (token === "primary") return scene.style?.primaryColor ?? theme.primaryColor;
  if (token === "secondary") return scene.style?.secondaryColor ?? theme.secondaryColor;
  if (token === "background") return scene.style?.backgroundColor ?? theme.backgroundColor;
  const pal = theme.palette?.find((c) => c.id === token);
  if (pal) return pal.value;
  return token;
}

/** Resolve fontId to CSS font-family. Checks theme tokens first, then treats as raw value. */
function resolveFont(fontId: string | undefined, theme: ThemeNode): string {
  if (!fontId) return theme.fontFamily;
  const token = theme.fonts?.find((f) => f.id === fontId);
  if (token) return token.value;
  return fontId; // raw CSS font-family
}

/* ─── Flex layout helper ─── */

export interface LayoutBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function measureTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
): number {
  const lh = fontSize * (lineHeight || 1.4);
  const words = text.split(/\s+/);
  let line = "";
  let lines = 1;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    const m = ctx.measureText(test);
    if (m.width > maxWidth && line) {
      lines++;
      line = word;
    } else {
      line = test;
    }
  }
  return lines * lh;
}

function estimateElementSize(
  ctx: CanvasRenderingContext2D,
  el: SceneElement,
  parentWidth: number,
  parentHeight: number,
  theme: ThemeNode,
  assets: AssetItem[],
  projectDir: string | null | undefined,
): { w: number; h: number } {
  const parseSizeW = (s: string | undefined, fallback: number): number => {
    if (!s || s === "auto") return fallback;
    if (s.endsWith("%")) return (parseFloat(s) / 100) * parentWidth;
    if (s.endsWith("px")) return parseFloat(s);
    return parseFloat(s) || fallback;
  };
  const parseSizeH = (s: string | undefined, fallback: number): number => {
    if (!s || s === "auto") return fallback;
    if (s.endsWith("%")) return (parseFloat(s) / 100) * parentHeight;
    if (s.endsWith("px")) return parseFloat(s);
    return parseFloat(s) || fallback;
  };

  // sceneWidth/sceneHeight take priority over width/height for scene elements
  const w = parseSizeW(el.sceneWidth ?? el.width, parentWidth);

  switch (el.type) {
    case "text": {
      const fs = el.fontSize ?? theme.fontSize;
      const lh = el.lineHeight || 1.4;
      const ff = resolveFont(el.fontId, theme);
      ctx.font = `${el.fontWeight ?? theme.fontWeight} ${fs}px ${ff}`;
      const maxW = parseSizeW(el.maxWidth, w);
      const h = measureTextHeight(ctx, el.content || " ", maxW, fs, lh);
      return { w: Math.min(w, maxW), h };
    }
    case "image": {
      const h = parseSizeH(el.sceneHeight ?? el.height, parentHeight);
      return { w, h };
    }
    case "logo":
      return { w: parseSizeW(el.maxWidth, 120), h: parseSizeH(el.height, 80) };
    case "divider":
      return { w, h: 1 };
    case "spacer":
      return { w, h: parseSizeH(el.height, 24) };
    case "button": {
      const fs = el.fontSize ?? theme.fontSize;
      ctx.font = `${el.fontWeight ?? 600} ${fs}px ${resolveFont(el.fontId, theme)}`;
      const tm = ctx.measureText(el.content || "Button");
      const px = el.paddingX ?? 32;
      const py = el.paddingY ?? 14;
      return { w: tm.width + px * 2, h: fs * 1.2 + py * 2 };
    }
    case "group": {
      const dir = el.direction ?? "row";
      const gap = el.gap ?? 12;
      const pad = el.padding ?? 0;
      let totalW = pad * 2, totalH = pad * 2;
      const childSizes = (el.children ?? []).map((c) =>
        estimateElementSize(ctx, c, w - pad * 2, parentHeight - pad * 2, theme, assets, projectDir),
      );
      if (dir === "row") {
        totalW += childSizes.reduce((s, c) => s + c.w, 0) + Math.max(0, childSizes.length - 1) * gap;
        totalH += Math.max(...childSizes.map((c) => c.h), 0);
      } else {
        totalW += Math.max(...childSizes.map((c) => c.w), 0);
        totalH += childSizes.reduce((s, c) => s + c.h, 0) + Math.max(0, childSizes.length - 1) * gap;
      }
      return { w: parseSizeW(el.width, totalW), h: totalH };
    }
    case "counter": {
      const fs = el.fontSize ?? theme.fontSize;
      ctx.font = `${el.fontWeight ?? theme.fontWeight} ${fs}px ${resolveFont(el.fontId, theme)}`;
      const sample = (el.counterPrefix ?? "") + String(Math.max(Math.abs(el.counterStart ?? 0), Math.abs(el.counterEnd ?? 100))) + (el.counterSuffix ?? "");
      return { w: Math.min(w, ctx.measureText(sample).width + 8), h: fs * 1.4 };
    }
    case "path":
      return { w, h: parseSizeH(el.sceneHeight ?? el.height, 100) };
    case "svg":
      return { w, h: parseSizeH(el.sceneHeight ?? el.height, w) };
    case "indicator": {
      const r = (el.indicatorRadius ?? 40) * 2 + 8;
      return { w: r, h: r };
    }
    case "lottie":
      return { w: parseSizeW(el.sceneWidth ?? el.width, 200), h: parseSizeH(el.sceneHeight ?? el.height, 200) };
    case "particle-emitter":
      return { w: parseSizeW(el.sceneWidth ?? el.width, parentWidth), h: parseSizeH(el.sceneHeight ?? el.height, parentHeight) };
    default:
      return { w, h: 24 };
  }
}

/* ─── Drawing functions ─── */

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: LayoutBox,
  opts: {
    color: string;
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
    textAlign?: CanvasTextAlign;
    lineHeight?: number;
    opacity?: number;
    textTransform?: string;
    letterSpacing?: number;
    language?: string;
    textStrokeColor?: string;
    textStrokeWidth?: number;
    spans?: TextSpan[];
  },
) {
  if (!text) return;

  // If spans exist, delegate to span-aware renderer
  const hasSpans = opts.spans && opts.spans.length > 0 && opts.spans.some((s) => s.text);
  if (hasSpans) {
    drawTextWithSpans(ctx, box, opts, opts.spans!);
    return;
  }

  let displayText = text;
  if (opts.textTransform === "uppercase") displayText = text.toLocaleUpperCase(opts.language);
  else if (opts.textTransform === "lowercase") displayText = text.toLocaleLowerCase(opts.language);
  else if (opts.textTransform === "capitalize") displayText = text.replace(/\b\w/g, (c) => c.toLocaleUpperCase(opts.language));

  ctx.save();
  if (opts.opacity !== undefined && opts.opacity < 1) ctx.globalAlpha *= opts.opacity;
  ctx.fillStyle = opts.color;
  ctx.font = `${opts.fontWeight} ${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textAlign = opts.textAlign ?? "left";
  ctx.textBaseline = "top";

  // Canvas2D letterSpacing (Chrome 99+, Safari 17.4+, Firefox 115+)
  if ("letterSpacing" in ctx) {
    (ctx as any).letterSpacing = opts.letterSpacing ? `${opts.letterSpacing}px` : "0px";
  }

  // Text stroke (outline) setup
  const hasStroke = opts.textStrokeWidth && opts.textStrokeWidth > 0 && opts.textStrokeColor;
  if (hasStroke) {
    ctx.strokeStyle = opts.textStrokeColor!;
    ctx.lineWidth = opts.textStrokeWidth! * 2; // CSS stroke is half inside, half outside
    ctx.lineJoin = "round";
  }

  const lh = opts.fontSize * (opts.lineHeight || 1.4);
  let y = box.y;
  const xBase = opts.textAlign === "center" ? box.x + box.w / 2 : opts.textAlign === "right" ? box.x + box.w : box.x;

  // Split by explicit newlines first, then word-wrap each line
  const paragraphs = displayText.split("\n");
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      // Empty line (bare \n)
      y += lh;
      continue;
    }
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > box.w && line) {
        if (hasStroke) ctx.strokeText(line, xBase, y);
        ctx.fillText(line, xBase, y);
        y += lh;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      if (hasStroke) ctx.strokeText(line, xBase, y);
      ctx.fillText(line, xBase, y);
      y += lh;
    }
  }
  ctx.restore();
}

/**
 * Render text spans — each span is an independent styled segment.
 * Spans are drawn inline left-to-right with word-wrapping.
 */
function drawTextWithSpans(
  ctx: CanvasRenderingContext2D,
  box: LayoutBox,
  opts: {
    color: string;
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
    textAlign?: CanvasTextAlign;
    lineHeight?: number;
    opacity?: number;
    letterSpacing?: number;
    textTransform?: string;
    language?: string;
  },
  spans: TextSpan[],
) {
  ctx.save();
  if (opts.opacity !== undefined && opts.opacity < 1) ctx.globalAlpha *= opts.opacity;
  ctx.textBaseline = "top";

  const lh = opts.fontSize * (opts.lineHeight || 1.4);

  // Build a flat list of "tokens" (words and whitespace) with per-token style from spans
  interface Token { text: string; span: TextSpan; isSpace: boolean; isNewline: boolean }
  const tokens: Token[] = [];

  for (const span of spans) {
    let t = span.text;
    if (opts.textTransform === "uppercase") t = t.toLocaleUpperCase(opts.language);
    else if (opts.textTransform === "lowercase") t = t.toLocaleLowerCase(opts.language);
    else if (opts.textTransform === "capitalize") t = t.replace(/\b\w/g, (c) => c.toLocaleUpperCase(opts.language));

    // Split span text into words and whitespace, preserving newlines
    const parts = t.split(/(\n|\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (part === "\n") {
        tokens.push({ text: part, span, isSpace: false, isNewline: true });
      } else if (/^\s+$/.test(part)) {
        tokens.push({ text: part, span, isSpace: true, isNewline: false });
      } else {
        tokens.push({ text: part, span, isSpace: false, isNewline: false });
      }
    }
  }

  // Measure a token with its span style
  function measureToken(tok: Token): number {
    const fs = tok.span.fontSize ?? opts.fontSize;
    const fw = tok.span.fontWeight ?? opts.fontWeight;
    const fi = tok.span.fontStyle ?? "normal";
    ctx.font = `${fi === "italic" ? "italic " : ""}${fw} ${fs}px ${opts.fontFamily}`;
    return ctx.measureText(tok.text).width;
  }

  // Word-wrap into lines
  const lines: Token[][] = [];
  let currentLine: Token[] = [];
  let lineWidth = 0;

  for (const tok of tokens) {
    if (tok.isNewline) {
      lines.push(currentLine);
      currentLine = [];
      lineWidth = 0;
      continue;
    }
    const tokW = measureToken(tok);
    if (!tok.isSpace && lineWidth + tokW > box.w && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      lineWidth = 0;
    }
    currentLine.push(tok);
    lineWidth += tokW;
  }
  if (currentLine.length > 0) lines.push(currentLine);

  // Draw each line
  let y = box.y;
  const align = opts.textAlign ?? "left";

  for (const line of lines) {
    let fullW = 0;
    for (const tok of line) fullW += measureToken(tok);

    let x = align === "center"
      ? box.x + (box.w - fullW) / 2
      : align === "right"
        ? box.x + box.w - fullW
        : box.x;

    for (const tok of line) {
      const s = tok.span;
      const fs = s.fontSize ?? opts.fontSize;
      const fw = s.fontWeight ?? opts.fontWeight;
      const fi = s.fontStyle ?? "normal";
      const fillColor = s.color ?? opts.color;

      ctx.save();
      if (s.opacity !== undefined && s.opacity < 1) ctx.globalAlpha *= s.opacity;
      ctx.font = `${fi === "italic" ? "italic " : ""}${fw} ${fs}px ${opts.fontFamily}`;
      if ("letterSpacing" in ctx) {
        (ctx as any).letterSpacing = (s.letterSpacing ?? opts.letterSpacing) ? `${s.letterSpacing ?? opts.letterSpacing}px` : "0px";
      }
      ctx.fillStyle = fillColor;
      ctx.textAlign = "left";
      const tokW = ctx.measureText(tok.text).width;
      ctx.fillText(tok.text, x, y);
      ctx.restore();
      x += tokW;
    }
    y += lh;
  }
  ctx.restore();
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  src: string,
  box: LayoutBox,
  borderRadius: number,
  objectFit: string,
) {
  const img = imageCache.get(src);
  if (!img) return;

  ctx.save();
  if (borderRadius > 0) {
    roundRect(ctx, box.x, box.y, box.w, box.h, borderRadius);
    ctx.clip();
  }

  if (objectFit === "contain") {
    const scale = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
  } else {
    // cover
    const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
  }
  ctx.restore();
}

/**
 * Draw a pre-extracted video frame (JPEG on disk → image cache → canvas).
 * Fully synchronous once frames are extracted. No FFmpeg during playback.
 */
function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  el: SceneElement,
  src: string,
  box: LayoutBox,
  borderRadius: number,
  sceneTimeMs: number,
  sceneDurationMs: number,
) {
  ctx.save();
  if (borderRadius > 0) {
    roundRect(ctx, box.x, box.y, box.w, box.h, borderRadius);
    ctx.clip();
  }

  // Compute seek time with loop/trim
  const enterMs = el.timing.enterMs;
  const elapsedMs = Math.max(0, sceneTimeMs - enterMs);

  const meta = getVideoMeta(src);
  let seekTimeMs = elapsedMs;
  if (meta) {
    seekTimeMs = computeVideoSeekTime(
      elapsedMs, meta.durationMs,
      el.videoLoop ?? false, el.videoTrimLastFrame ?? false,
    );
  }

  const drawn = drawVideoFrameToCanvas(ctx, src, seekTimeMs, box.x, box.y, box.w, box.h);
  if (!drawn) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}


/**
 * Carve a concave (inward-curving) notch at the outer edge of a seam between
 * two adjacent line rects. Called on an offscreen canvas so destination-out
 * only affects the caption layer, not the underlying video frame.
 * `cx` is the X edge, `seamY` is the seam Y, `side` is which side of cx to clear.
 */
function drawConcaveCorner(
  ctx: CanvasRenderingContext2D,
  cx: number,
  seamY: number,
  r: number,
  side: "left" | "right",
) {
  ctx.save();
  ctx.beginPath();
  const sweep = side === "left" ? -1 : 1;

  ctx.moveTo(cx, seamY);

  // 2. Draw a line outward along the horizontal seam
  ctx.lineTo(cx + (r * sweep), seamY);

  // 3. Curve smoothly downward to the vertical edge
  // arcTo automatically handles the perfect rounded transition
  ctx.arcTo(cx, seamY, cx, seamY + r, r);

  // 4. Close the path back to the sharp corner, forming a solid wedge shape
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a merged background shape for stacked line-fill caption rects.
 * Adjacent rects are connected (no gap) and concave corners are carved
 * at the outer seam edges. Uses an offscreen canvas so destination-out
 * does not affect the underlying video content.
 */
export function drawMergedLineRects(
  ctx: CanvasRenderingContext2D,
  lineRects: { x: number; y: number; w: number; h: number }[],
  bgColor: string,
  bgOpacity: number,
  radius: number,
) {
  if (lineRects.length === 0) return;

  // Compute bounding box (with margin for the concave notch arcs)
  let minX = lineRects[0].x;
  let maxX = lineRects[0].x + lineRects[0].w;
  let minY = lineRects[0].y;
  let maxY = lineRects[lineRects.length - 1].y + lineRects[lineRects.length - 1].h;
  for (const r of lineRects) {
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x + r.w);
  }
  minX -= radius + 1;
  maxX += radius + 1;
  minY -= radius + 1;
  maxY += radius + 1;

  const offCanvas = document.createElement("canvas");
  offCanvas.width = Math.ceil(maxX - minX);
  offCanvas.height = Math.ceil(maxY - minY);
  const offCtx = offCanvas.getContext("2d")!;

  offCtx.fillStyle = bgColor;

  // Draw all line rects onto the offscreen canvas
  for (const r of lineRects) {
    roundRect(offCtx, r.x - minX, r.y - minY, r.w, r.h, radius);
    offCtx.fill();
  }

  // Connect adjacent rects and carve concave corners
  if (radius > 0) {
    for (let li = 0; li < lineRects.length - 1; li++) {
      const cur = lineRects[li];
      const next = lineRects[li + 1];
      const seamY = cur.y + cur.h;
      const overlapL = Math.max(cur.x, next.x);
      const overlapR = Math.min(cur.x + cur.w, next.x + next.w);
      if (overlapL >= overlapR) continue;

      // Fill the seam zone so the two rounded rects merge seamlessly
      offCtx.fillRect(overlapL - minX, seamY - minY - radius, overlapR - overlapL, radius * 2);

      // Carve concave notches at the outer seam edges
      drawConcaveCorner(offCtx, overlapL - minX, seamY - minY, radius, "left");
      drawConcaveCorner(offCtx, overlapR - minX, seamY - minY, radius, "right");
    }
  }

  // Composite onto main canvas with background opacity
  ctx.save();
  ctx.globalAlpha = bgOpacity;
  ctx.drawImage(offCanvas, minX, minY);
  ctx.restore();
}

/* ─── Element renderer ─── */

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: SceneElement,
  box: LayoutBox,
  theme: ThemeNode,
  scene: VideoScene,
  assets: AssetItem[],
  projectDir: string | null | undefined,
  anim?: ComputedElementStyle,
  sceneTimeMs?: number,
  language?: string,
) {
  const color = anim?.color ?? resolveColor(el.color, theme, scene) ?? theme.primaryColor;
  const bgColor = anim?.backgroundColor ?? resolveColor(el.backgroundColor, theme, scene);

  // Glow pre-pass: draw glow behind the element if glow is active
  if (anim?.glowColor && anim.glowRadius && anim.glowIntensity) {
    drawGlowEffect(ctx, box, anim.glowColor, anim.glowRadius, anim.glowIntensity, anim.glowPasses ?? 2);
  } else if (el.glow) {
    drawGlowEffect(ctx, box, el.glow.color, el.glow.radius, el.glow.intensity, el.glow.passes ?? 2);
  }

  switch (el.type) {
    case "text":
      // Per-word/char stagger animation
      if (anim?.textStagger && sceneTimeMs !== undefined) {
        drawTextStaggered(ctx, el.content || "", box, anim.textStagger, sceneTimeMs, {
          color,
          fontSize: el.fontSize ?? theme.fontSize,
          fontWeight: el.fontWeight ?? theme.fontWeight,
          fontFamily: resolveFont(el.fontId, theme),
          textAlign: (el.textAlign as CanvasTextAlign) ?? "left",
          lineHeight: el.lineHeight,
          language,
        });
        break;
      }
      drawText(ctx, el.content || "", box, {
        color,
        fontSize: el.fontSize ?? theme.fontSize,
        fontWeight: el.fontWeight ?? theme.fontWeight,
        fontFamily: resolveFont(el.fontId, theme),
        textAlign: (el.textAlign as CanvasTextAlign) ?? "left",
        lineHeight: el.lineHeight,
        opacity: el.opacity,
        textTransform: el.textTransform,
        letterSpacing: anim?.letterSpacing ?? el.letterSpacing,
        language,
        textStrokeColor: anim?.textStrokeColor ?? resolveColor(el.textStrokeColor, theme, scene),
        textStrokeWidth: anim?.textStrokeWidth ?? el.textStrokeWidth,
        spans: el.spans?.map((s) => ({
          ...s,
          color: s.color ? (resolveColor(s.color, theme, scene) ?? s.color) : undefined,
        })),
      });
      break;

    case "image": {
      const src = resolveMediaSrcLocal(el.content, projectDir);
      if (!src) break;

      // Sprite sheet animation
      if (el.sprite) {
        const img = imageCache.get(src);
        if (img) {
          ctx.save();
          if (el.borderRadius) {
            roundRect(ctx, box.x, box.y, box.w, box.h, el.borderRadius);
            ctx.clip();
          }
          drawSpriteFrame(ctx, img, el.sprite, box, sceneTimeMs ?? 0, el.timing?.enterMs ?? 0);
          ctx.restore();
        } else {
          preloadImage(src).catch(() => {});
        }
        break;
      }

      if (isVideoSrc(el.content)) {
        drawVideoFrame(ctx, el, src, box, el.borderRadius ?? theme.borderRadius, sceneTimeMs ?? 0, scene.durationMs);
      } else {
        drawImage(ctx, src, box, el.borderRadius ?? theme.borderRadius, el.objectFit ?? "cover");
      }
      break;
    }

    case "logo": {
      const asset = el.assetId ? assets.find((a) => a.id === el.assetId) : assets[0];
      const src = resolveMediaSrcLocal(asset?.data, projectDir);
      if (!src) break;
      if (asset?.tintable) {
        // Tint: draw image, then composite with color
        const img = imageCache.get(src);
        if (img) {
          // Draw to offscreen canvas, then apply tint via globalCompositeOperation
          const oc = document.createElement("canvas");
          oc.width = box.w;
          oc.height = box.h;
          const octx = oc.getContext("2d")!;
          // Draw image fitted to box (contain)
          const scale = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;
          const dx = (box.w - dw) / 2;
          const dy = (box.h - dh) / 2;
          octx.drawImage(img, dx, dy, dw, dh);
          // Apply tint: source-in composites color onto existing alpha
          octx.globalCompositeOperation = "source-in";
          const tintColor = anim?.color ?? (resolveColor(el.color, theme, scene) || theme.primaryColor);
          octx.fillStyle = tintColor;
          octx.fillRect(0, 0, box.w, box.h);
          ctx.drawImage(oc, box.x, box.y);
        } else {
          preloadImage(src).catch(() => {});
        }
      } else {
        drawImage(ctx, src, box, 0, "contain");
      }
      break;
    }

    case "divider":
      ctx.save();
      ctx.globalAlpha *= (el.opacity ?? 0.3);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(box.x, box.y);
      ctx.lineTo(box.x + box.w, box.y);
      ctx.stroke();
      ctx.restore();
      break;

    case "spacer":
      // Nothing to draw
      break;

    case "button": {
      const bgColor = el.backgroundColor ? color : (resolveColor(el.backgroundColor, theme, scene) || theme.secondaryColor);
      ctx.save();
      roundRect(ctx, box.x, box.y, box.w, box.h, el.borderRadius ?? theme.borderRadius);
      ctx.fillStyle = bgColor;
      ctx.fill();
      drawText(ctx, el.content || "Button", box, {
        color: el.textColor ?? "#ffffff",
        fontSize: el.fontSize ?? theme.fontSize,
        fontWeight: el.fontWeight ?? 600,
        fontFamily: resolveFont(el.fontId, theme),
        textAlign: "center",
        lineHeight: 1.2,
      });
      ctx.restore();
      break;
    }

    case "group": {
      const dir = el.direction ?? "row";
      const gap = el.gap ?? 12;
      const pad = el.padding ?? 0;
      const children = (el.repeatCount && el.repeatCount > 1 && el.children?.[0])
        ? Array.from({ length: el.repeatCount }, () => el.children![0])
        : (el.children ?? []);

      // Draw group background if present
      if (bgColor) {
        ctx.save();
        if (el.backgroundGradient) {
          // Basic linear gradient fallback — draw solid bg
        }
        roundRect(ctx, box.x, box.y, box.w, box.h, el.borderRadius ?? 0);
        ctx.fillStyle = bgColor;
        ctx.globalAlpha *= el.opacity ?? 1;
        ctx.fill();
        ctx.restore();
      }

      const childSizes = children.map((c) =>
        estimateElementSize(ctx, c, box.w - pad * 2, box.h - pad * 2, theme, assets, projectDir),
      );

      let cx = box.x + pad;
      let cy = box.y + pad;

      for (let i = 0; i < children.length; i++) {
        const cs = childSizes[i];
        const staggeredChild = (el.staggerMs && el.staggerMs > 0)
          ? { ...children[i], timing: { ...children[i].timing, enterMs: children[i].timing.enterMs + i * el.staggerMs } }
          : children[i];
        // Compute animation for each child independently
        const childAnim = (staggeredChild.timing.effects && staggeredChild.timing.effects.length > 0)
          ? computeEffects(staggeredChild, sceneTimeMs ?? 0, scene.durationMs)
          : computeElementStyle(staggeredChild, sceneTimeMs ?? 0, scene.durationMs);
        if (!childAnim.visible) {
          if (dir === "row") cx += cs.w + gap;
          else cy += cs.h + gap;
          continue;
        }
        drawElement(ctx, staggeredChild, { x: cx, y: cy, w: cs.w, h: cs.h }, theme, scene, assets, projectDir, childAnim, sceneTimeMs, language);
        if (dir === "row") cx += cs.w + gap;
        else cy += cs.h + gap;
      }
      break;
    }

    case "counter": {
      const start = el.counterStart ?? 0;
      const end = el.counterEnd ?? 100;
      // Use drawProgress from keyframes if set, else derive from element lifetime
      let progress: number;
      if (anim?.drawProgress !== undefined) {
        progress = anim.drawProgress;
      } else if (sceneTimeMs !== undefined) {
        const enterMs = el.timing.enterMs;
        const exitMs = el.timing.exitMs ?? scene.durationMs;
        progress = Math.max(0, Math.min(1, (sceneTimeMs - enterMs) / Math.max(1, exitMs - enterMs)));
      } else {
        progress = 0;
      }
      const value = start + (end - start) * progress;
      const decimals = el.counterDecimals ?? 0;
      const displayText = (el.counterPrefix ?? "") + value.toFixed(decimals) + (el.counterSuffix ?? "");
      drawText(ctx, displayText, box, {
        color,
        fontSize: el.fontSize ?? theme.fontSize,
        fontWeight: el.fontWeight ?? theme.fontWeight,
        fontFamily: resolveFont(el.fontId, theme),
        textAlign: (el.textAlign as CanvasTextAlign) ?? "center",
        lineHeight: el.lineHeight,
        opacity: el.opacity,
        letterSpacing: el.letterSpacing,
      });
      break;
    }

    case "path": {
      let d = el.content;
      if (!d) break;

      // Path morphing: interpolate between source and target path
      if (el.morph?.targetD && anim?.morphProgress !== undefined && anim.morphProgress > 0) {
        const pointCount = el.morph.pointCount ?? 128;
        d = interpolatePaths(d, el.morph.targetD, anim.morphProgress, pointCount);
      }

      const strokeColor = resolveColor(el.pathStroke ?? el.color, theme, scene) ?? color;
      const fillColor = el.pathFill ? resolveColor(el.pathFill, theme, scene) : "none";
      const sw = el.pathStrokeWidth ?? 2;
      const linecap = el.pathLinecap ?? "round";

      // drawProgress: 0 = nothing drawn, 1 = fully drawn
      const dp = anim?.drawProgress ?? 1;
      const totalLen = dp < 1 ? getPathLength(d) : 0;

      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = sw;
      ctx.lineCap = linecap;

      if (fillColor !== "none") {
        ctx.fillStyle = fillColor;
      }

      if (dp < 1 && totalLen > 0) {
        const drawn = totalLen * dp;
        ctx.setLineDash([totalLen, totalLen]);
        ctx.lineDashOffset = totalLen - drawn;
      }

      const path = new Path2D(d);
      ctx.stroke(path);
      if (fillColor !== "none") ctx.fill(path);

      ctx.setLineDash([]);
      ctx.restore();
      break;
    }

    case "svg": {
      const markup = el.content;
      if (!markup) break;
      const dataUrl = svgMarkupToDataUrl(markup);
      const img = imageCache.get(dataUrl);
      if (img) {
        ctx.save();
        if (el.opacity !== undefined && el.opacity < 1) ctx.globalAlpha *= el.opacity;
        ctx.drawImage(img, box.x, box.y, box.w, box.h);
        ctx.restore();
      } else {
        // Trigger async load for next frame
        preloadImage(dataUrl).catch(() => {});
      }
      break;
    }

    case "indicator": {
      const r = el.indicatorRadius ?? 40;
      const sw = el.pathStrokeWidth ?? 3;
      const ic = resolveColor(el.indicatorColor ?? el.color, theme, scene) ?? color;
      // Pulse: use drawProgress as pulse phase (0→1 scale pulse)
      const pulse = anim?.drawProgress !== undefined ? anim.drawProgress : 1;
      const pulseScale = 1 + pulse * 0.3;
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulseScale, pulseScale);
      ctx.strokeStyle = ic;
      ctx.lineWidth = sw;
      ctx.globalAlpha *= (1 - pulse * 0.5); // fade out as it expands
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case "lottie": {
      // Lottie elements render as placeholder + info text until a Lottie runtime is loaded.
      // The canvas renderer draws a styled placeholder box. A full lottie-web integration
      // can render frames to an offscreen canvas and drawImage here.
      ctx.save();
      ctx.globalAlpha *= el.opacity ?? 1;
      // Draw placeholder frame
      const lottieConf = el.lottie;
      if (lottieConf) {
        // Check for a cached rendered frame (lottie-web would populate imageCache)
        const lottieKey = `lottie:${lottieConf.src}`;
        const cachedFrame = imageCache.get(lottieKey);
        if (cachedFrame) {
          ctx.drawImage(cachedFrame, box.x, box.y, box.w, box.h);
        } else {
          // Placeholder: semi-transparent box with "Lottie" label
          ctx.fillStyle = "rgba(100,100,200,0.15)";
          roundRect(ctx, box.x, box.y, box.w, box.h, 8);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.font = `600 ${Math.min(14, box.h / 4)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("Lottie", box.x + box.w / 2, box.y + box.h / 2);
        }
      }
      ctx.restore();
      break;
    }

    case "particle-emitter": {
      const config = el.particles;
      if (!config) break;
      const particles = tickParticles(el.id, config, sceneTimeMs ?? 0, el.timing?.enterMs ?? 0);
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;

      ctx.save();
      if (config.blendMode && config.blendMode !== "normal") {
        ctx.globalCompositeOperation = config.blendMode as GlobalCompositeOperation;
      }
      for (const p of particles) {
        drawParticleShape(
          ctx, config.shape,
          cx + p.x, cy + p.y,
          p.size, p.color, p.opacity,
          config.customShapePath,
        );
      }
      ctx.restore();
      break;
    }

    default:
      if (el.content) {
        drawText(ctx, el.content, box, {
          color,
          fontSize: el.fontSize ?? theme.fontSize,
          fontWeight: el.fontWeight ?? theme.fontWeight,
          fontFamily: resolveFont(el.fontId, theme),
        });
      }
  }
}

/* ─── Glitch post-process ─── */

function applyGlitchEffect(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const rng = (s: number) => (Math.sin(s) * 43758.5453) % 1;

  // Horizontal row displacement
  const numSlices = 8 + Math.floor(Math.abs(rng(seed * 0.01)) * 12);
  for (let s = 0; s < numSlices; s++) {
    const y = Math.floor(Math.abs(rng(seed + s * 7.3)) * h);
    const sliceH = 1 + Math.floor(Math.abs(rng(seed + s * 3.1)) * 6);
    const shift = Math.floor((rng(seed + s * 1.7) * 2 - 1) * 30);
    if (shift === 0) continue;
    for (let row = y; row < Math.min(y + sliceH, h); row++) {
      const rowStart = row * w * 4;
      const rowData = data.slice(rowStart, rowStart + w * 4);
      const shifted = new Uint8ClampedArray(w * 4);
      for (let x = 0; x < w; x++) {
        const src = ((x - shift + w) % w) * 4;
        shifted[x * 4] = rowData[src];
        shifted[x * 4 + 1] = rowData[src + 1];
        shifted[x * 4 + 2] = rowData[src + 2];
        shifted[x * 4 + 3] = rowData[src + 3];
      }
      data.set(shifted, rowStart);
    }
  }

  // RGB channel split (chromatic aberration)
  const splitAmt = 4 + Math.floor(Math.abs(rng(seed * 0.7)) * 8);
  const copy = data.slice();
  for (let i = 0; i < w * h; i++) {
    const srcR = Math.min(i + splitAmt, w * h - 1);
    const srcB = Math.max(i - splitAmt, 0);
    data[i * 4] = copy[srcR * 4];       // red channel: shift right
    data[i * 4 + 2] = copy[srcB * 4 + 2]; // blue channel: shift left
  }

  ctx.putImageData(imageData, 0, 0);
}

/* ─── Scene layout computation (used by hit-testing & selection overlay) ─── */

export interface SceneElementLayout {
  id: string;
  box: LayoutBox;
  visible: boolean;
  rotation: number;      // degrees (static + animated)
  scale: number;         // combined scale
  opacity: number;       // final opacity
}

/**
 * Compute the layout boxes and visibility of all elements in a scene
 * at a given time. Used for hit-testing in the preview and drawing
 * selection overlays. Requires a canvas context for text measurement.
 */
export function computeSceneLayout(
  measureCtx: CanvasRenderingContext2D,
  scene: VideoScene,
  theme: ThemeNode,
  assets: AssetItem[],
  size: DocumentSize,
  projectDir: string | null | undefined,
  sceneTimeMs: number,
): SceneElementLayout[] {
  const w = size.width;
  const h = size.height;
  const padding = scene.padding ?? 0;
  const results: SceneElementLayout[] = [];

  for (const el of scene.elements) {
    const anim = (el.timing.effects && el.timing.effects.length > 0)
      ? computeEffects(el, sceneTimeMs, scene.durationMs)
      : computeElementStyle(el, sceneTimeMs, scene.durationMs);

    if (!anim.visible) {
      results.push({ id: el.id, box: { x: 0, y: 0, w: 0, h: 0 }, visible: false, rotation: 0, scale: 1, opacity: 0 });
      continue;
    }

    const sz = estimateElementSize(measureCtx, el, w - padding * 2, h - padding * 2, theme, assets, projectDir);
    const needsAutoWidth = !el.sceneWidth && (
      el.type === "text" || el.type === "button" || el.type === "list" ||
      el.type === "counter" || el.type === "group"
    );
    if (needsAutoWidth && el.anchorX === 0.5) {
      sz.w = Math.round(w * 0.9);
    }

    const ax = el.anchorX ?? 0;
    const ay = el.anchorY ?? 0;
    const box: LayoutBox = { x: (el.x ?? 0) - ax * sz.w, y: (el.y ?? 0) - ay * sz.h, w: sz.w, h: sz.h };

    // Extract rotation and scale from anim transform string
    let rotation = el.rotation ?? 0;
    let totalScale = el.scale ?? 1;
    const rotMatch = anim.transform.match(/rotate\(([^)]+)deg\)/);
    if (rotMatch) rotation += parseFloat(rotMatch[1]);
    const scaleMatch = anim.transform.match(/scale\(([^,)]+)/);
    if (scaleMatch) totalScale *= parseFloat(scaleMatch[1]);

    results.push({
      id: el.id,
      box,
      visible: true,
      rotation,
      scale: totalScale,
      opacity: (el.opacity ?? 1) * anim.opacity,
    });
  }

  return results;
}

/* ─── Main render function ─── */

/**
 * Render a scene at a given time directly to a canvas.
 * Returns in <5ms for typical scenes.
 */
/**
 * Seek all video elements in a scene to the correct frame time.
 * Must be called (and awaited) before renderSceneToCanvas for each frame
 * when the scene contains video elements.
 */
/**
 * Ensure all video frames are extracted to disk for this scene.
 * This is a no-op after the first call (frames stay on disk).
 * No per-frame work — just ensures preloadVideo completed.
 */
export async function seekSceneVideos(
  scene: VideoScene,
  _sceneTimeMs: number,
  projectDir: string | null | undefined,
  _fps: number = 30,
): Promise<void> {
  // preloadVideo extracts all frames in one FFmpeg call — no per-frame work needed
  // This is just an alias to ensure videos are preloaded. Called by export pipeline.
  const promises: Promise<void>[] = [];
  for (const el of scene.elements) {
    if (el.type !== "image" || !isVideoSrc(el.content)) continue;
    const src = resolveMediaSrcLocal(el.content, projectDir);
    if (!src) continue;
    promises.push(preloadVideo(src, projectDir).then(() => {}).catch(() => {}));
  }
  if (promises.length > 0) await Promise.all(promises);
}

/* ─── Composition renderer ─── */

import type { Composition, CompLayer, VideoContentNode } from "@/types/schema";

/** Build a composition lookup map from VideoContentNode */
export function buildCompositionMap(vc: VideoContentNode): Map<string, Composition> {
  const map = new Map<string, Composition>();
  if (vc.compositions) {
    for (const comp of vc.compositions) map.set(comp.id, comp);
  }
  return map;
}

/**
 * Render a composition at a given time. Supports recursive nesting.
 * This is the single entry point for ALL rendering — preview, export, thumbnails.
 */
export function renderComposition(
  ctx: CanvasRenderingContext2D,
  compositionId: string,
  compositions: Map<string, Composition>,
  theme: ThemeNode,
  assets: AssetItem[],
  size: DocumentSize,
  projectDir: string | null | undefined,
  timeMs: number,
  language?: string,
  depth: number = 0,
): void {
  if (depth > 10) return; // recursion guard

  const comp = compositions.get(compositionId);
  if (!comp) return;

  const w = comp.width ?? size.width;
  const h = comp.height ?? size.height;

  // Background
  if (depth === 0 || comp.style) {
    ctx.save();
    const bgColor = comp.style?.backgroundColor ?? theme.backgroundColor;
    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }
    const gradientCss = comp.style?.backgroundGradient;
    if (gradientCss) {
      const grad = parseCssGradient(gradientCss, w, h, ctx);
      if (grad) { ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h); }
    }
    ctx.restore();
  }

  // Apply virtual camera transform
  if (comp.camera && comp.camera.keyframes.length > 0) {
    const cam = interpolateCamera(comp.camera, timeMs);
    const cxCam = w / 2;
    const cyCam = h / 2;
    ctx.save();
    ctx.translate(cxCam, cyCam);
    ctx.scale(cam.zoom, cam.zoom);
    if (cam.rotation) ctx.rotate((cam.rotation * Math.PI) / 180);
    ctx.translate(-cxCam - cam.x, -cyCam - cam.y);
  }

  // Render layers bottom to top
  for (const layer of comp.layers) {
    if (layer.enabled === false) continue;
    if (timeMs < layer.startMs || timeMs > layer.startMs + layer.durationMs) continue;

    const layerLocalTime = timeMs - layer.startMs;

    ctx.save();
    if (layer.opacity !== undefined && layer.opacity < 1) ctx.globalAlpha *= layer.opacity;
    if (layer.blendMode && layer.blendMode !== "normal") {
      ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
    }

    switch (layer.source.type) {
      case "element": {
        // Render element — remap timing so enterMs=0 within the layer
        // (the layer itself handles start/duration positioning)
        const origEl = layer.source.element;
        const el = {
          ...origEl,
          timing: {
            ...origEl.timing,
            enterMs: 0,
            exitMs: layer.durationMs,
          },
        };
        const anim = (el.timing.effects && el.timing.effects.length > 0)
          ? computeEffects(el as SceneElement, layerLocalTime, layer.durationMs)
          : computeElementStyle(el as SceneElement, layerLocalTime, layer.durationMs);

        if (anim.visible) {
          const sz = estimateElementSize(ctx, el, w, h, theme, assets, projectDir);
          // Auto-width for text-based elements
          if (!el.sceneWidth && (el.type === "text" || el.type === "button" || el.type === "list" || el.type === "counter" || el.type === "group")) {
            if (el.anchorX === 0.5) sz.w = Math.round(w * 0.9);
          }
          const ax = el.anchorX ?? 0;
          const ay = el.anchorY ?? 0;
          let box: LayoutBox = { x: (el.x ?? 0) - ax * sz.w, y: (el.y ?? 0) - ay * sz.h, w: sz.w, h: sz.h };

          // Motion path: override position based on path progress
          if (el.motionPath && anim.motionProgress !== undefined) {
            const mp = sampleMotionPath(el.motionPath.d, anim.motionProgress);
            const origin = el.motionPath.alignOrigin ?? [0.5, 0.5];
            box = { x: mp.x - origin[0] * sz.w, y: mp.y - origin[1] * sz.h, w: sz.w, h: sz.h };
          }

          ctx.save();
          // Apply animation transforms
          const { transform, opacity: animOpacity, filter } = anim;
          ctx.globalAlpha *= (el.opacity ?? 1) * animOpacity;
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;
          ctx.translate(cx, cy);
          if (el.scale != null && el.scale !== 1) ctx.scale(el.scale, el.scale);
          else if (el.scaleX != null || el.scaleY != null) ctx.scale(el.scaleX ?? 1, el.scaleY ?? 1);
          if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
          // Motion path auto-rotation
          if (el.motionPath?.autoRotate && anim.motionProgress !== undefined) {
            const mp = sampleMotionPath(el.motionPath.d, anim.motionProgress);
            ctx.rotate((mp.angle * Math.PI) / 180);
          }
          const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
          if (translateMatch) ctx.translate(parseFloat(translateMatch[1]), parseFloat(translateMatch[2]));
          const scaleMatch = transform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
          if (scaleMatch) { const sx = parseFloat(scaleMatch[1]); ctx.scale(sx, scaleMatch[2] ? parseFloat(scaleMatch[2]) : sx); }
          const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
          if (rotateMatch) ctx.rotate((parseFloat(rotateMatch[1]) * Math.PI) / 180);
          ctx.translate(-cx, -cy);
          const blurMatch = filter.match(/blur\(([^)]+)px\)/);
          if (blurMatch) ctx.filter = `blur(${blurMatch[1]}px)`;

          // Element blend mode
          if (el.blendMode && el.blendMode !== "normal") {
            ctx.globalCompositeOperation = el.blendMode as GlobalCompositeOperation;
          }

          drawElement(ctx, el, box, theme, { id: comp.id, durationMs: comp.durationMs, elements: [], style: comp.style } as any, assets, projectDir, anim, layerLocalTime, language);
          ctx.restore();
        }
        break;
      }

      case "composition": {
        // Recurse into nested composition
        const nestedComp = compositions.get(layer.source.compositionId);
        if (nestedComp) {
          // Map layer local time to nested comp time (clamp to nested duration)
          const nestedTime = Math.min(layerLocalTime, nestedComp.durationMs);
          renderComposition(ctx, layer.source.compositionId, compositions, theme, assets, size, projectDir, nestedTime, language, depth + 1);
        }
        break;
      }

      case "audio":
      case "caption":
        // Audio/caption layers are not rendered visually here
        break;

      case "symbol":
        // Symbol instance: resolve from symbols library (handled at document level)
        // TODO: resolve symbol elements and render with overrides
        break;
    }

    ctx.restore();
  }

  // Close camera transform
  if (comp.camera && comp.camera.keyframes.length > 0) {
    ctx.restore();
  }
}

/* ─── Legacy wrapper ─── */

export function renderSceneToCanvas(
  ctx: CanvasRenderingContext2D,
  scene: VideoScene,
  theme: ThemeNode,
  assets: AssetItem[],
  size: DocumentSize,
  projectDir: string | null | undefined,
  sceneTimeMs: number,
  language?: string,
) {
  const w = size.width;
  const h = size.height;

  // Background
  ctx.save();
  const bgColor = scene.style?.backgroundColor ?? theme.backgroundColor;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  // Background gradient
  const gradientCss = scene.style?.backgroundGradient;
  if (gradientCss) {
    const grad = parseCssGradient(gradientCss, w, h, ctx);
    if (grad) {
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Layout: simple flex layout
  const padding = scene.padding ?? 0;
  const gap = scene.gap ?? 24;
  const dir: FlexDirection = scene.direction ?? "column";
  const alignItems: FlexAlign = scene.alignItems ?? "center";
  const justifyContent: FlexJustify = scene.justifyContent ?? "center";

  let hasGlitch = false;

  // Measure visible elements
  const visibleElements: { el: SceneElement; size: { w: number; h: number }; anim: ReturnType<typeof computeElementStyle> }[] = [];

  for (const el of scene.elements) {
    const anim = (el.timing.effects && el.timing.effects.length > 0)
      ? computeEffects(el, sceneTimeMs, scene.durationMs)
      : computeElementStyle(el, sceneTimeMs, scene.durationMs);
    if (!anim.visible) continue;
    const sz = estimateElementSize(ctx, el, w - padding * 2, h - padding * 2, theme, assets, projectDir);
    visibleElements.push({ el, size: sz, anim });
  }

  // Compute total content size
  const contentArea = { x: padding, y: padding, w: w - padding * 2, h: h - padding * 2 };
  const isRow = dir === "row";

  const totalMain = visibleElements.reduce(
    (sum, e) => sum + (isRow ? e.size.w : e.size.h),
    0,
  ) + Math.max(0, visibleElements.length - 1) * gap;

  const mainSpace = isRow ? contentArea.w : contentArea.h;

  // Justify content
  let mainOffset: number;
  let mainGap = gap;
  switch (justifyContent) {
    case "flex-start": mainOffset = 0; break;
    case "flex-end": mainOffset = mainSpace - totalMain; break;
    case "center": mainOffset = (mainSpace - totalMain) / 2; break;
    case "space-between":
      mainOffset = 0;
      mainGap = visibleElements.length > 1 ? (mainSpace - totalMain + (visibleElements.length - 1) * gap) / (visibleElements.length - 1) : gap;
      break;
    case "space-evenly":
      mainGap = (mainSpace - totalMain + (visibleElements.length - 1) * gap) / (visibleElements.length + 1);
      mainOffset = mainGap;
      break;
    default: mainOffset = (mainSpace - totalMain) / 2;
  }

  let cursor = mainOffset;

  // Build a map of element id → computed box for masking lookups
  const elementBoxMap = new Map<string, LayoutBox>();

  // First pass: compute all boxes (needed for maskElementId references)
  for (const { el, size: sz } of visibleElements) {
    const needsAutoWidth = !el.sceneWidth && (
      el.type === "text" || el.type === "button" || el.type === "list" ||
      el.type === "counter" || el.type === "group"
    );
    const elSzW = (needsAutoWidth && el.anchorX === 0.5) ? Math.round(w * 0.9) : sz.w;
    const ax = el.anchorX ?? 0;
    const ay = el.anchorY ?? 0;
    elementBoxMap.set(el.id, { x: (el.x ?? 0) - ax * elSzW, y: (el.y ?? 0) - ay * sz.h, w: elSzW, h: sz.h });
  }

  for (const { el, size: sz, anim } of visibleElements) {
    // Absolute positioning: use el.x/el.y with anchor offset
    // Auto-width for text-based elements without explicit sceneWidth (match DOM renderer)
    const needsAutoWidth = !el.sceneWidth && (
      el.type === "text" || el.type === "button" || el.type === "list" ||
      el.type === "counter" || el.type === "group"
    );
    if (needsAutoWidth && (el.anchorX === 0.5)) {
      sz.w = Math.round(w * 0.9);
    }

    const ax = el.anchorX ?? 0;
    const ay = el.anchorY ?? 0;
    let box: LayoutBox = { x: (el.x ?? 0) - ax * sz.w, y: (el.y ?? 0) - ay * sz.h, w: sz.w, h: sz.h };

    // Motion path: override position based on path progress
    if (el.motionPath && anim.motionProgress !== undefined) {
      const mp = sampleMotionPath(el.motionPath.d, anim.motionProgress);
      const origin = el.motionPath.alignOrigin ?? [0.5, 0.5];
      box = { x: mp.x - origin[0] * sz.w, y: mp.y - origin[1] * sz.h, w: sz.w, h: sz.h };
    }

    // Apply transforms
    ctx.save();

    // Blend mode (Canvas globalCompositeOperation)
    if (el.blendMode && el.blendMode !== "normal") {
      ctx.globalCompositeOperation = el.blendMode as GlobalCompositeOperation;
    }

    // Mask: clip to another element's bounding box
    if (el.maskElementId) {
      const maskBox = elementBoxMap.get(el.maskElementId);
      if (maskBox) {
        ctx.beginPath();
        ctx.rect(maskBox.x, maskBox.y, maskBox.w, maskBox.h);
        ctx.clip();
      }
    }

    const { transform, opacity: animOpacity, filter } = anim;
    ctx.globalAlpha *= (el.opacity ?? 1) * animOpacity;

    // Apply at element center
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;

    ctx.translate(cx, cy);

    // Motion path auto-rotation
    if (el.motionPath?.autoRotate && anim.motionProgress !== undefined) {
      const mp = sampleMotionPath(el.motionPath.d, anim.motionProgress);
      ctx.rotate((mp.angle * Math.PI) / 180);
    }

    // Static element transforms (scale, rotation)
    if (el.scale != null && el.scale !== 1) {
      ctx.scale(el.scale, el.scale);
    } else if (el.scaleX != null || el.scaleY != null) {
      ctx.scale(el.scaleX ?? 1, el.scaleY ?? 1);
    }
    if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);

    // Animation transforms
    const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    if (translateMatch) {
      ctx.translate(parseFloat(translateMatch[1]), parseFloat(translateMatch[2]));
    }
    const scaleMatch = transform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
    if (scaleMatch) {
      const sx = parseFloat(scaleMatch[1]);
      const sy = scaleMatch[2] ? parseFloat(scaleMatch[2]) : sx;
      ctx.scale(sx, sy);
    }
    const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
    if (rotateMatch) {
      ctx.rotate((parseFloat(rotateMatch[1]) * Math.PI) / 180);
    }

    ctx.translate(-cx, -cy);

    // Apply blur via filter (Canvas2D supports filter property)
    const blurMatch = filter.match(/blur\(([^)]+)px\)/);
    if (blurMatch) {
      ctx.filter = `blur(${blurMatch[1]}px)`;
    }

    drawElement(ctx, el, box, theme, scene, assets, projectDir, anim, sceneTimeMs, language);

    ctx.restore();

    if (anim.glitch) hasGlitch = true;
  }

  ctx.restore();

  // Glitch post-process: RGB split + horizontal row displacement
  if (hasGlitch) {
    applyGlitchEffect(ctx, w, h, sceneTimeMs);
  }
}

/* ─── Caption renderer ─── */

import type { CaptionTrack, CaptionWord } from "@/types/schema";

/**
 * Draw captions onto the canvas at the given absolute time.
 */
export function renderCaptionsToCanvas(
  ctx: CanvasRenderingContext2D,
  captionTracks: CaptionTrack[],
  currentTimeMs: number,
  width: number,
  height: number,
) {
  for (const track of captionTracks) {
    // Find active segment
    let activeWords: CaptionWord[] | null = null;
    for (const seg of track.segments) {
      if (seg.words.length === 0) continue;
      const segStart = seg.words[0].startMs;
      const segEnd = seg.words[seg.words.length - 1].endMs;
      if (currentTimeMs >= segStart && currentTimeMs <= segEnd) {
        activeWords = seg.words;
        break;
      }
    }
    if (!activeWords) continue;

    const a = track.appearance;
    const fontSize = a.fontSize ?? 32;
    const fontWeight = a.fontWeight ?? 700;
    const fontFamily = a.fontId ?? "sans-serif";
    const textColor = a.color ?? "#ffffff";
    const highlightColor = a.highlightColor ?? "#FFD700";
    const bgColor = a.backgroundColor ?? "#000000";
    const bgOpacity = a.backgroundOpacity ?? 0.7;
    const pad = a.padding ?? 12;
    const radius = a.borderRadius ?? 8;
    const fillMode = a.fillMode ?? "box";
    const maxW = width * 0.8;

    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = "middle";

    // Word wrap
    const lines: { text: string; words: { text: string; startMs: number; endMs: number }[]; measuredWidth: number }[] = [];
    let currentLine = "";
    let currentLineWords: { text: string; startMs: number; endMs: number }[] = [];
    for (const w of activeWords) {
      const test = currentLine ? `${currentLine} ${w.text}` : w.text;
      if (ctx.measureText(test).width > maxW && currentLine) {
        lines.push({ text: currentLine, words: [...currentLineWords], measuredWidth: ctx.measureText(currentLine).width });
        currentLine = w.text;
        currentLineWords = [w];
      } else {
        currentLine = test;
        currentLineWords.push(w);
      }
    }
    if (currentLine) lines.push({ text: currentLine, words: currentLineWords, measuredWidth: ctx.measureText(currentLine).width });

    const lineH = fontSize * 1.4;
    const totalH = lines.length * lineH;

    // Y position
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

    // X anchor for custom positioning
    const anchorX = (a.position === "custom" && a.positionX != null)
      ? (a.positionX / 100) * width
      : width / 2;

    // Build line rects — touching, no gap
    const lineRects: { x: number; y: number; w: number; h: number }[] = [];
    {
      const lh = lineH + pad * 0.6;
      let ly = anchorY;
      for (const line of lines) {
        const lw = line.measuredWidth + pad * 2;
        lineRects.push({ x: anchorX - lw / 2, y: ly, w: lw, h: lh });
        ly += lh; // no gap — rects touch
      }
    }

    if (fillMode === "line") {
      drawMergedLineRects(ctx, lineRects, bgColor, bgOpacity, radius);
    } else {
      // Box fill: single rectangle (same for word-reveal — full size, text fades in)
      const boxW2 = Math.min(maxW + pad * 2, width);
      const boxH = totalH + pad * 2;
      const boxX = anchorX - boxW2 / 2;
      ctx.save();
      ctx.globalAlpha = bgOpacity;
      ctx.fillStyle = bgColor;
      roundRect(ctx, boxX, anchorY, boxW2, boxH, radius);
      ctx.fill();
      ctx.restore();
    }

    // Draw text lines — position text centered vertically within each line rect
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const rect = lineRects[li];
      // Text Y: middle of each line slot (textBaseline = "middle")
      const textY = fillMode === "line"
        ? rect.y + rect.h / 2
        : anchorY + pad + li * lineH + lineH / 2;
      const lineX = anchorX - line.measuredWidth / 2;

      if (track.style === "karaoke") {
        let textX = lineX;
        for (const w of line.words) {
          const isActive = currentTimeMs >= w.startMs && currentTimeMs <= w.endMs;
          const past = currentTimeMs > w.endMs;
          ctx.fillStyle = (isActive || past) ? highlightColor : textColor;
          ctx.fillText(w.text, textX, textY);
          textX += ctx.measureText(w.text + " ").width;
        }
      } else if (track.style === "word-reveal") {
        let textX = lineX;
        for (const w of line.words) {
          ctx.globalAlpha = currentTimeMs >= w.startMs ? 1 : 0;
          ctx.fillStyle = textColor;
          ctx.fillText(w.text, textX, textY);
          textX += ctx.measureText(w.text + " ").width;
        }
        ctx.globalAlpha = 1;
      } else if (track.style === "typewriter") {
        let charCount = 0;
        for (const w of activeWords) {
          if (currentTimeMs < w.startMs) break;
          const progress = Math.min(1, (currentTimeMs - w.startMs) / Math.max(1, w.endMs - w.startMs));
          charCount += Math.floor(w.text.length * progress) + 1;
        }
        const full = activeWords.map((w) => w.text).join(" ");
        const slice = full.slice(0, charCount);
        ctx.fillStyle = textColor;
        ctx.fillText(slice, anchorX - ctx.measureText(slice).width / 2, textY);
      } else {
        ctx.fillStyle = textColor;
        ctx.fillText(line.text, lineX, textY);
      }
    }

    ctx.restore();
  }
}
