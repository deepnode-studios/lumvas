import type {
  SceneElement,
  ElementTiming,
  AnimationConfig,
  AnimationPreset,
  Easing,
  EasingPreset,
  CubicBezierEasing,
  Keyframe,
  KeyframeProperties,
} from "@/types/schema";

/* ─── Easing functions ─── */

function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  // Newton-Raphson approximation for cubic bezier
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

function resolveEasing(easing: Easing | undefined, t: number): number {
  if (!easing || easing === "linear") return t;
  if (typeof easing === "object" && easing.type === "cubic-bezier") {
    return cubicBezier(easing.x1, easing.y1, easing.x2, easing.y2, t);
  }
  const preset = easing as EasingPreset;
  switch (preset) {
    case "ease-in": return cubicBezier(0.42, 0, 1, 1, t);
    case "ease-out": return cubicBezier(0, 0, 0.58, 1, t);
    case "ease-in-out": return cubicBezier(0.42, 0, 0.58, 1, t);
    case "spring": {
      const decay = Math.exp(-4 * t);
      return 1 - decay * Math.cos(6 * Math.PI * t);
    }
    case "bounce": {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) { const t2 = t - 1.5 / 2.75; return 7.5625 * t2 * t2 + 0.75; }
      if (t < 2.5 / 2.75) { const t2 = t - 2.25 / 2.75; return 7.5625 * t2 * t2 + 0.9375; }
      const t2 = t - 2.625 / 2.75;
      return 7.5625 * t2 * t2 + 0.984375;
    }
    default: return t;
  }
}

/* ─── Animation preset → property values ─── */

interface AnimState {
  x: number; y: number;
  scale: number; scaleX: number; scaleY: number;
  rotation: number;
  opacity: number;
  blur: number;
  color?: string;
  backgroundColor?: string;
  drawProgress?: number;
  letterSpacing?: number;
  textStrokeColor?: string;
  textStrokeWidth?: number;
}

const IDENTITY: AnimState = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, blur: 0 };

function presetStartState(preset: AnimationPreset): AnimState {
  switch (preset) {
    case "fade-in": return { ...IDENTITY, opacity: 0 };
    case "fade-out": return { ...IDENTITY, opacity: 0 };
    case "slide-up": return { ...IDENTITY, y: 60, opacity: 0 };
    case "slide-down": return { ...IDENTITY, y: -60, opacity: 0 };
    case "slide-left": return { ...IDENTITY, x: 60, opacity: 0 };
    case "slide-right": return { ...IDENTITY, x: -60, opacity: 0 };
    case "scale-in": return { ...IDENTITY, scale: 0, opacity: 0 };
    case "scale-out": return { ...IDENTITY, scale: 0, opacity: 0 };
    case "drop-in": return { ...IDENTITY, y: -120, opacity: 0 };
    case "pop-in": return { ...IDENTITY, scale: 0.5, opacity: 0 };
    case "blur-in": return { ...IDENTITY, blur: 20, opacity: 0 };
    case "blur-out": return { ...IDENTITY, blur: 20, opacity: 0 };
    case "zoom-in": return { ...IDENTITY, scale: 0.3, opacity: 0 };
    case "zoom-out": return { ...IDENTITY, scale: 1.5, opacity: 0 };
    case "wipe-left": return { ...IDENTITY, x: -100, opacity: 0 };
    case "wipe-right": return { ...IDENTITY, x: 100, opacity: 0 };
    case "typewriter": return { ...IDENTITY, opacity: 0 };
    case "glitch": return IDENTITY; // post-process effect — no transform offset
    default: return IDENTITY;
  }
}

function lerpState(from: AnimState, to: AnimState, t: number): AnimState {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    scale: from.scale + (to.scale - from.scale) * t,
    scaleX: from.scaleX + (to.scaleX - from.scaleX) * t,
    scaleY: from.scaleY + (to.scaleY - from.scaleY) * t,
    rotation: from.rotation + (to.rotation - from.rotation) * t,
    opacity: from.opacity + (to.opacity - from.opacity) * t,
    blur: from.blur + (to.blur - from.blur) * t,
    color: from.color && to.color ? lerpColor(from.color, to.color, t) : (to.color ?? from.color),
    backgroundColor: from.backgroundColor && to.backgroundColor
      ? lerpColor(from.backgroundColor, to.backgroundColor, t)
      : (to.backgroundColor ?? from.backgroundColor),
    drawProgress: from.drawProgress !== undefined || to.drawProgress !== undefined
      ? ((from.drawProgress ?? 0) + ((to.drawProgress ?? 1) - (from.drawProgress ?? 0)) * t)
      : undefined,
    letterSpacing: from.letterSpacing !== undefined || to.letterSpacing !== undefined
      ? ((from.letterSpacing ?? 0) + ((to.letterSpacing ?? 0) - (from.letterSpacing ?? 0)) * t)
      : undefined,
    textStrokeColor: from.textStrokeColor && to.textStrokeColor
      ? lerpColor(from.textStrokeColor, to.textStrokeColor, t)
      : (to.textStrokeColor ?? from.textStrokeColor),
    textStrokeWidth: from.textStrokeWidth !== undefined || to.textStrokeWidth !== undefined
      ? ((from.textStrokeWidth ?? 0) + ((to.textStrokeWidth ?? 0) - (from.textStrokeWidth ?? 0)) * t)
      : undefined,
  };
}

/* ─── Keyframe interpolation ─── */

function interpolateKeyframes(keyframes: Keyframe[], progress: number): Partial<AnimState> {
  if (keyframes.length === 0) return {};
  // Find surrounding keyframes
  let before = keyframes[0];
  let after = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (progress >= keyframes[i].progress && progress <= keyframes[i + 1].progress) {
      before = keyframes[i];
      after = keyframes[i + 1];
      break;
    }
  }
  if (progress <= before.progress) return keyframeToState(before.properties);
  if (progress >= after.progress) return keyframeToState(after.properties);
  const range = after.progress - before.progress;
  const t = range > 0 ? (progress - before.progress) / range : 0;
  const eased = resolveEasing(after.easing, t);
  return lerpKeyframeProperties(before.properties, after.properties, eased);
}

function keyframeToState(p: KeyframeProperties): Partial<AnimState> {
  return {
    x: p.x, y: p.y,
    scale: p.scale, scaleX: p.scaleX, scaleY: p.scaleY,
    rotation: p.rotation, opacity: p.opacity, blur: p.blur,
    color: p.color, backgroundColor: p.backgroundColor, drawProgress: p.drawProgress,
    letterSpacing: p.letterSpacing, textStrokeColor: p.textStrokeColor, textStrokeWidth: p.textStrokeWidth,
  };
}

function lerpKeyframeProperties(a: KeyframeProperties, b: KeyframeProperties, t: number): Partial<AnimState> {
  const result: Partial<AnimState> = {};
  if (a.x !== undefined || b.x !== undefined) result.x = (a.x ?? 0) + ((b.x ?? 0) - (a.x ?? 0)) * t;
  if (a.y !== undefined || b.y !== undefined) result.y = (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * t;
  if (a.scale !== undefined || b.scale !== undefined) result.scale = (a.scale ?? 1) + ((b.scale ?? 1) - (a.scale ?? 1)) * t;
  if (a.scaleX !== undefined || b.scaleX !== undefined) result.scaleX = (a.scaleX ?? 1) + ((b.scaleX ?? 1) - (a.scaleX ?? 1)) * t;
  if (a.scaleY !== undefined || b.scaleY !== undefined) result.scaleY = (a.scaleY ?? 1) + ((b.scaleY ?? 1) - (a.scaleY ?? 1)) * t;
  if (a.rotation !== undefined || b.rotation !== undefined) result.rotation = (a.rotation ?? 0) + ((b.rotation ?? 0) - (a.rotation ?? 0)) * t;
  if (a.opacity !== undefined || b.opacity !== undefined) result.opacity = (a.opacity ?? 1) + ((b.opacity ?? 1) - (a.opacity ?? 1)) * t;
  if (a.blur !== undefined || b.blur !== undefined) result.blur = (a.blur ?? 0) + ((b.blur ?? 0) - (a.blur ?? 0)) * t;
  if (a.color !== undefined || b.color !== undefined) result.color = lerpColor(a.color ?? b.color!, b.color ?? a.color!, t);
  if (a.backgroundColor !== undefined || b.backgroundColor !== undefined) result.backgroundColor = lerpColor(a.backgroundColor ?? b.backgroundColor!, b.backgroundColor ?? a.backgroundColor!, t);
  if (a.drawProgress !== undefined || b.drawProgress !== undefined) result.drawProgress = (a.drawProgress ?? 0) + ((b.drawProgress ?? 1) - (a.drawProgress ?? 0)) * t;
  if (a.letterSpacing !== undefined || b.letterSpacing !== undefined) result.letterSpacing = (a.letterSpacing ?? 0) + ((b.letterSpacing ?? 0) - (a.letterSpacing ?? 0)) * t;
  if (a.textStrokeColor !== undefined || b.textStrokeColor !== undefined) result.textStrokeColor = lerpColor(a.textStrokeColor ?? b.textStrokeColor!, b.textStrokeColor ?? a.textStrokeColor!, t);
  if (a.textStrokeWidth !== undefined || b.textStrokeWidth !== undefined) result.textStrokeWidth = (a.textStrokeWidth ?? 0) + ((b.textStrokeWidth ?? 0) - (a.textStrokeWidth ?? 0)) * t;
  return result;
}

/* ─── Color interpolation ─── */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

export function lerpColor(a: string, b: string, t: number): string {
  const ra = hexToRgb(a), rb = hexToRgb(b);
  if (!ra || !rb) return t < 0.5 ? a : b;
  const r = Math.round(ra[0] + (rb[0] - ra[0]) * t);
  const g = Math.round(ra[1] + (rb[1] - ra[1]) * t);
  const bl = Math.round(ra[2] + (rb[2] - ra[2]) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

/* ─── Main compute function ─── */

export interface ComputedElementStyle {
  transform: string;
  opacity: number;
  filter: string;
  visible: boolean;
  /** Interpolated text/stroke color from keyframes (undefined = use element's own color) */
  color?: string;
  /** Interpolated background color from keyframes */
  backgroundColor?: string;
  /** Draw progress 0–1 for path/stroke-draw animation */
  drawProgress?: number;
  /** True when the enter animation is a glitch preset */
  glitch?: boolean;
  /** Animated letter spacing in px */
  letterSpacing?: number;
  /** Animated text stroke (outline) color */
  textStrokeColor?: string;
  /** Animated text stroke (outline) width in px */
  textStrokeWidth?: number;
  /** Motion path progress 0–1 */
  motionProgress?: number;
  /** Path morph progress 0–1 */
  morphProgress?: number;
  /** Glow effect state */
  glowColor?: string;
  glowRadius?: number;
  glowIntensity?: number;
  glowPasses?: number;
  /** Text stagger animation state — consumed by canvas renderer */
  textStagger?: {
    unit: string;
    staggerMs: number;
    staggerFrom: string;
    animation: string;
    durationMs: number;
    easing: string;
    enterMs: number;
  };
}

/**
 * Compute the CSS style for a scene element at a given time.
 * @param element The scene element with timing
 * @param sceneTimeMs Current time relative to scene start
 * @param sceneDurationMs Total scene duration
 */
export function computeElementStyle(
  element: SceneElement,
  sceneTimeMs: number,
  sceneDurationMs: number,
): ComputedElementStyle {
  const { timing } = element;
  const enterMs = timing.enterMs;
  const exitMs = timing.exitMs ?? sceneDurationMs;

  // Not visible yet or already gone
  if (sceneTimeMs < enterMs || sceneTimeMs > exitMs) {
    return { transform: "", opacity: 0, filter: "", visible: false };
  }

  let state: AnimState = { ...IDENTITY };

  // Enter animation
  if (timing.enterAnimation && timing.enterAnimation.preset !== "none") {
    const anim = timing.enterAnimation;
    const animStart = enterMs + (anim.delayMs ?? 0);
    const animEnd = animStart + anim.durationMs;
    if (sceneTimeMs < animEnd) {
      const t = sceneTimeMs <= animStart ? 0 : (sceneTimeMs - animStart) / anim.durationMs;
      const eased = resolveEasing(anim.easing ?? "ease-out", Math.min(1, t));
      const from = presetStartState(anim.preset);
      state = lerpState(from, IDENTITY, eased);
    }
  }

  // Exit animation
  if (timing.exitAnimation && timing.exitAnimation.preset !== "none") {
    const anim = timing.exitAnimation;
    const animStart = exitMs - anim.durationMs;
    if (sceneTimeMs >= animStart) {
      const t = (sceneTimeMs - animStart) / anim.durationMs;
      const eased = resolveEasing(anim.easing ?? "ease-in", Math.min(1, t));
      const to = presetStartState(anim.preset);
      state = lerpState(IDENTITY, to, eased);
    }
  }

  // Keyframes (override enter/exit if in the middle)
  if (timing.keyframes && timing.keyframes.length > 0) {
    const elementDuration = exitMs - enterMs;
    const progress = elementDuration > 0 ? (sceneTimeMs - enterMs) / elementDuration : 0;
    const kfState = interpolateKeyframes(timing.keyframes, Math.min(1, Math.max(0, progress)));
    if (kfState.x !== undefined) state.x = kfState.x;
    if (kfState.y !== undefined) state.y = kfState.y;
    if (kfState.scale !== undefined) state.scale = kfState.scale;
    if (kfState.scaleX !== undefined) state.scaleX = kfState.scaleX;
    if (kfState.scaleY !== undefined) state.scaleY = kfState.scaleY;
    if (kfState.rotation !== undefined) state.rotation = kfState.rotation;
    if (kfState.opacity !== undefined) state.opacity = kfState.opacity;
    if (kfState.blur !== undefined) state.blur = kfState.blur;
    if (kfState.color !== undefined) state.color = kfState.color;
    if (kfState.backgroundColor !== undefined) state.backgroundColor = kfState.backgroundColor;
    if (kfState.drawProgress !== undefined) state.drawProgress = kfState.drawProgress;
    if (kfState.letterSpacing !== undefined) state.letterSpacing = kfState.letterSpacing;
    if (kfState.textStrokeColor !== undefined) state.textStrokeColor = kfState.textStrokeColor;
    if (kfState.textStrokeWidth !== undefined) state.textStrokeWidth = kfState.textStrokeWidth;
  }

  // Detect glitch preset (signals canvas renderer to apply post-process)
  const isGlitch =
    (timing.enterAnimation?.preset === "glitch" && sceneTimeMs < enterMs + (timing.enterAnimation.durationMs ?? 600)) ||
    (timing.exitAnimation?.preset === "glitch" && sceneTimeMs >= exitMs - (timing.exitAnimation.durationMs ?? 600));

  // Build CSS
  const transforms: string[] = [];
  if (state.x !== 0 || state.y !== 0) transforms.push(`translate(${state.x}px, ${state.y}px)`);
  if (state.scale !== 1) transforms.push(`scale(${state.scale})`);
  else if (state.scaleX !== 1 || state.scaleY !== 1) transforms.push(`scale(${state.scaleX}, ${state.scaleY})`);
  if (state.rotation !== 0) transforms.push(`rotate(${state.rotation}deg)`);

  const filters: string[] = [];
  if (state.blur > 0) filters.push(`blur(${state.blur}px)`);

  return {
    transform: transforms.join(" "),
    opacity: state.opacity,
    filter: filters.join(" "),
    visible: true,
    color: state.color,
    backgroundColor: state.backgroundColor,
    drawProgress: state.drawProgress,
    glitch: isGlitch || undefined,
    letterSpacing: state.letterSpacing,
    textStrokeColor: state.textStrokeColor,
    textStrokeWidth: state.textStrokeWidth,
  };
}
