import type { SceneElement, Effect, Keyframe, KeyframeProperties, Easing, EasingPreset, CubicBezierEasing, LoopMode } from "@/types/schema";
import type { ComputedElementStyle } from "./animation";
import { lerpColor } from "./animation";
import { getEffectDefinition } from "@/data/effectsLibrary";

/* ─── Easing (duplicated here to avoid circular dep) ─── */

function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
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
    case "spring": { const decay = Math.exp(-4 * t); return 1 - decay * Math.cos(6 * Math.PI * t); }
    case "bounce": {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) { const t2 = t - 1.5 / 2.75; return 7.5625 * t2 * t2 + 0.75; }
      if (t < 2.5 / 2.75) { const t2 = t - 2.25 / 2.75; return 7.5625 * t2 * t2 + 0.9375; }
      const t2 = t - 2.625 / 2.75; return 7.5625 * t2 * t2 + 0.984375;
    }
    default: return t;
  }
}

/* ─── Accumulated state ─── */

interface EffectState {
  x: number; y: number;
  scale: number; scaleX: number; scaleY: number;
  rotation: number;
  opacity: number;
  blur: number;
  color?: string;
  backgroundColor?: string;
  drawProgress?: number;
  glitch?: boolean;
  letterSpacing?: number;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  motionProgress?: number;
  morphProgress?: number;
  /** Glow state — accumulated from glow effects */
  glowColor?: string;
  glowRadius?: number;
  glowIntensity?: number;
  glowPasses?: number;
  /** Text stagger state — stored for canvas renderer to decompose text */
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

const IDENTITY: EffectState = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, blur: 0 };

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* ─── Keyframe interpolation ─── */

function interpolateKeyframes(keyframes: Keyframe[], progress: number): Partial<EffectState> {
  if (keyframes.length === 0) return {};
  let before = keyframes[0];
  let after = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (progress >= keyframes[i].progress && progress <= keyframes[i + 1].progress) {
      before = keyframes[i]; after = keyframes[i + 1]; break;
    }
  }
  if (progress <= before.progress) return propsToState(before.properties);
  if (progress >= after.progress) return propsToState(after.properties);
  const range = after.progress - before.progress;
  const t = range > 0 ? (progress - before.progress) / range : 0;
  const eased = resolveEasing(after.easing, t);
  return lerpProps(before.properties, after.properties, eased);
}

function propsToState(p: KeyframeProperties): Partial<EffectState> {
  return { x: p.x, y: p.y, scale: p.scale, scaleX: p.scaleX, scaleY: p.scaleY,
           rotation: p.rotation, opacity: p.opacity, blur: p.blur,
           color: p.color, backgroundColor: p.backgroundColor, drawProgress: p.drawProgress,
           letterSpacing: p.letterSpacing, textStrokeColor: p.textStrokeColor, textStrokeWidth: p.textStrokeWidth,
           motionProgress: p.motionProgress, morphProgress: p.morphProgress };
}

function lerpProps(a: KeyframeProperties, b: KeyframeProperties, t: number): Partial<EffectState> {
  const r: Partial<EffectState> = {};
  if (a.x !== undefined || b.x !== undefined) r.x = lerp(a.x ?? 0, b.x ?? 0, t);
  if (a.y !== undefined || b.y !== undefined) r.y = lerp(a.y ?? 0, b.y ?? 0, t);
  if (a.scale !== undefined || b.scale !== undefined) r.scale = lerp(a.scale ?? 1, b.scale ?? 1, t);
  if (a.scaleX !== undefined || b.scaleX !== undefined) r.scaleX = lerp(a.scaleX ?? 1, b.scaleX ?? 1, t);
  if (a.scaleY !== undefined || b.scaleY !== undefined) r.scaleY = lerp(a.scaleY ?? 1, b.scaleY ?? 1, t);
  if (a.rotation !== undefined || b.rotation !== undefined) r.rotation = lerp(a.rotation ?? 0, b.rotation ?? 0, t);
  if (a.opacity !== undefined || b.opacity !== undefined) r.opacity = lerp(a.opacity ?? 1, b.opacity ?? 1, t);
  if (a.blur !== undefined || b.blur !== undefined) r.blur = lerp(a.blur ?? 0, b.blur ?? 0, t);
  if (a.color !== undefined || b.color !== undefined) r.color = lerpColor(a.color ?? b.color!, b.color ?? a.color!, t);
  if (a.backgroundColor !== undefined || b.backgroundColor !== undefined)
    r.backgroundColor = lerpColor(a.backgroundColor ?? b.backgroundColor!, b.backgroundColor ?? a.backgroundColor!, t);
  if (a.drawProgress !== undefined || b.drawProgress !== undefined)
    r.drawProgress = lerp(a.drawProgress ?? 0, b.drawProgress ?? 1, t);
  if (a.letterSpacing !== undefined || b.letterSpacing !== undefined)
    r.letterSpacing = lerp(a.letterSpacing ?? 0, b.letterSpacing ?? 0, t);
  if (a.textStrokeColor !== undefined || b.textStrokeColor !== undefined)
    r.textStrokeColor = lerpColor(a.textStrokeColor ?? b.textStrokeColor!, b.textStrokeColor ?? a.textStrokeColor!, t);
  if (a.textStrokeWidth !== undefined || b.textStrokeWidth !== undefined)
    r.textStrokeWidth = lerp(a.textStrokeWidth ?? 0, b.textStrokeWidth ?? 0, t);
  if (a.motionProgress !== undefined || b.motionProgress !== undefined)
    r.motionProgress = lerp(a.motionProgress ?? 0, b.motionProgress ?? 1, t);
  if (a.morphProgress !== undefined || b.morphProgress !== undefined)
    r.morphProgress = lerp(a.morphProgress ?? 0, b.morphProgress ?? 1, t);
  return r;
}

/* ─── Apply a single effect onto state ─── */

function applyEffect(
  effect: Effect,
  state: EffectState,
  enterMs: number,
  exitMs: number,
  sceneTimeMs: number,
): void {
  const p = effect.params;
  const def = getEffectDefinition(effect.definitionId);

  // ── Enter effects ────────────────────────────────────────────────────────
  if (effect.trigger === "enter") {
    const dur = (p.durationMs as number | undefined) ?? effect.durationMs ?? def?.defaultDurationMs ?? 500;
    const delay = (p.delayMs as number | undefined) ?? effect.delayMs ?? 0;
    const animStart = enterMs + delay;
    const animEnd = animStart + dur;
    if (sceneTimeMs >= animEnd) return; // fully complete — identity
    const raw = Math.max(0, Math.min(1, sceneTimeMs <= animStart ? 0 : (sceneTimeMs - animStart) / dur));
    const easingKey = (p.easing as string | undefined) ?? (effect.easing as string | undefined) ?? "ease-out";
    const t = resolveEasing(easingKey as Easing, raw);

    switch (effect.definitionId) {
      case "fade-in":
        state.opacity *= lerp(0, 1, t);
        break;
      case "slide-up": {
        const dist = (p.distance as number | undefined) ?? 40;
        state.y += lerp(dist, 0, t);
        state.opacity *= lerp(0, 1, t);
        break;
      }
      case "slide-down": {
        const dist = (p.distance as number | undefined) ?? 40;
        state.y += lerp(-dist, 0, t);
        state.opacity *= lerp(0, 1, t);
        break;
      }
      case "slide-left": {
        const dist = (p.distance as number | undefined) ?? 60;
        state.x += lerp(dist, 0, t);
        state.opacity *= lerp(0, 1, t);
        break;
      }
      case "slide-right": {
        const dist = (p.distance as number | undefined) ?? 60;
        state.x += lerp(-dist, 0, t);
        state.opacity *= lerp(0, 1, t);
        break;
      }
      case "scale-in": {
        const from = (p.fromScale as number | undefined) ?? 0.5;
        state.scale *= lerp(from, 1, t);
        state.opacity *= lerp(0, 1, t);
        break;
      }
      case "pop-in": {
        const over = (p.overshoot as number | undefined) ?? 1.2;
        // quick overshoot: scale goes 0 → overshoot → 1
        const s = t < 0.6 ? lerp(0, over, t / 0.6) : lerp(over, 1, (t - 0.6) / 0.4);
        state.scale *= s;
        state.opacity *= Math.min(1, t * 3);
        break;
      }
      case "drop-in": {
        state.y += lerp(-120, 0, t);
        state.opacity *= lerp(0, 1, Math.min(1, t * 2));
        break;
      }
      case "blur-in": {
        const fromBlur = (p.fromBlur as number | undefined) ?? 12;
        state.blur += lerp(fromBlur, 0, t);
        state.opacity *= lerp(0, 1, t);
        break;
      }
      case "zoom-in": {
        const from = (p.fromScale as number | undefined) ?? 0.1;
        state.scale *= lerp(from, 1, t);
        state.opacity *= lerp(0, 1, t);
        break;
      }
      case "wipe-left":
      case "wipe-right":
        // Wipe is a clip effect — drawProgress drives it; opacity stays 1
        state.drawProgress = (state.drawProgress ?? 1) * t;
        break;
      case "typewriter":
        // Handled separately in SceneRenderer/canvasRenderer per-char
        state.opacity *= 1;
        break;
      case "glitch":
      case "draw-on": {
        state.drawProgress = (state.drawProgress ?? 0) === 0 ? t : (state.drawProgress ?? 1) * t;
        break;
      }
      case "wipe-reveal":
        state.drawProgress = (state.drawProgress ?? 1) * t;
        break;
      case "scramble":
        // text-layer effect — not a transform, skip
        break;
      case "text-stagger": {
        // Pass stagger config to state — canvas renderer decomposes and animates per-unit
        const unit = (p.unit as string | undefined) ?? "word";
        const staggerMs = (p.staggerMs as number | undefined) ?? 60;
        const staggerFrom = (p.staggerFrom as string | undefined) ?? "start";
        const animation = (p.animation as string | undefined) ?? "fade-up";
        const dur = (p.durationMs as number | undefined) ?? 1200;
        const easingKey = (p.easing as string | undefined) ?? "ease-out";
        state.textStagger = { unit, staggerMs, staggerFrom, animation, durationMs: dur, easing: easingKey, enterMs: enterMs };
        // Overall opacity = 1 (individual units handle their own)
        break;
      }
    }
    return;
  }

  // ── Exit effects ─────────────────────────────────────────────────────────
  if (effect.trigger === "exit") {
    const dur = (p.durationMs as number | undefined) ?? effect.durationMs ?? def?.defaultDurationMs ?? 400;
    const animStart = exitMs - dur;
    if (sceneTimeMs < animStart) return; // not yet exiting
    const raw = Math.max(0, Math.min(1, (sceneTimeMs - animStart) / dur));
    const easingKey = (p.easing as string | undefined) ?? (effect.easing as string | undefined) ?? "ease-in";
    const t = resolveEasing(easingKey as Easing, raw);

    switch (effect.definitionId) {
      case "fade-out":
        state.opacity *= lerp(1, 0, t);
        break;
      case "slide-out": {
        const dir = (p.direction as string | undefined) ?? "down";
        const dist = (p.distance as number | undefined) ?? 40;
        if (dir === "up")    state.y += lerp(0, -dist, t);
        if (dir === "down")  state.y += lerp(0, dist, t);
        if (dir === "left")  state.x += lerp(0, -dist, t);
        if (dir === "right") state.x += lerp(0, dist, t);
        state.opacity *= lerp(1, 0, t);
        break;
      }
      case "scale-out": {
        const to = (p.toScale as number | undefined) ?? 0;
        state.scale *= lerp(1, to, t);
        state.opacity *= lerp(1, 0, t);
        break;
      }
      case "blur-out": {
        const toBlur = (p.toBlur as number | undefined) ?? 12;
        state.blur += lerp(0, toBlur, t);
        state.opacity *= lerp(1, 0, t);
        break;
      }
      case "zoom-out": {
        const to = (p.toScale as number | undefined) ?? 0.1;
        state.scale *= lerp(1, to, t);
        state.opacity *= lerp(1, 0, t);
        break;
      }
    }
    return;
  }

  // ── Lifetime effects ─────────────────────────────────────────────────────
  if (effect.trigger === "lifetime") {
    const elementDuration = Math.max(1, exitMs - enterMs);
    const lifetimeProgress = Math.max(0, Math.min(1, (sceneTimeMs - enterMs) / elementDuration));
    // startProgress / endProgress clamp
    const sp = effect.startProgress ?? 0;
    const ep = effect.endProgress ?? 1;
    if (lifetimeProgress < sp || lifetimeProgress > ep) return;
    const localT = (ep - sp) > 0 ? (lifetimeProgress - sp) / (ep - sp) : 0;
    // oscillation time in seconds
    const timeS = (sceneTimeMs - enterMs) / 1000;

    switch (effect.definitionId) {
      case "float": {
        const amp = (p.amplitude as number | undefined) ?? 10;
        const speed = (p.speed as number | undefined) ?? 0.5;
        state.y += Math.sin(timeS * speed * Math.PI * 2) * amp;
        break;
      }
      case "shake": {
        const amp = (p.amplitude as number | undefined) ?? 8;
        const speed = (p.speed as number | undefined) ?? 8;
        state.x += Math.sin(timeS * speed * Math.PI * 2) * amp;
        break;
      }
      case "wiggle": {
        const amp = (p.amplitude as number | undefined) ?? 5;
        const speed = (p.speed as number | undefined) ?? 3;
        state.rotation += Math.sin(timeS * speed * Math.PI * 2) * amp;
        break;
      }
      case "rotate-loop": {
        const speed = (p.speed as number | undefined) ?? 90;
        const dir = (p.direction as string | undefined) ?? "cw";
        state.rotation += timeS * speed * (dir === "ccw" ? -1 : 1);
        break;
      }
      case "bounce-loop": {
        const amp = (p.amplitude as number | undefined) ?? 20;
        const speed = (p.speed as number | undefined) ?? 1;
        state.y += Math.abs(Math.sin(timeS * speed * Math.PI)) * -amp;
        break;
      }
      case "glitch-loop": {
        const interval = ((p.interval as number | undefined) ?? 800) / 1000;
        const burst = ((p.burstDuration as number | undefined) ?? 150) / 1000;
        const phase = timeS % interval;
        if (phase < burst) state.glitch = true;
        break;
      }
      case "blur-pulse": {
        const maxBlur = (p.maxBlur as number | undefined) ?? 8;
        const speed = (p.speed as number | undefined) ?? 0.5;
        const v = (Math.sin(timeS * speed * Math.PI * 2) + 1) / 2;
        state.blur += v * maxBlur;
        break;
      }
      case "chromatic-aberration":
        // signals canvas renderer — no transform
        state.glitch = true;
        break;
      case "flash": {
        const speed = (p.speed as number | undefined) ?? 2;
        const intensity = (p.intensity as number | undefined) ?? 0.8;
        const flashColor = (p.color as string | undefined) ?? "#ffffff";
        const v = (Math.sin(timeS * speed * Math.PI * 2) + 1) / 2 * intensity;
        state.color = state.color ? lerpColor(state.color, flashColor, v) : lerpColor("#000000", flashColor, v);
        break;
      }
      case "color-shift": {
        const from = (p.fromColor as string | undefined) ?? "#ff6b6b";
        const to = (p.toColor as string | undefined) ?? "#4ecdc4";
        const speed = (p.speed as number | undefined) ?? 0.5;
        const v = (Math.sin(timeS * speed * Math.PI * 2) + 1) / 2;
        state.color = lerpColor(from, to, v);
        break;
      }
      case "neon-pulse": {
        const glowColor = (p.color as string | undefined) ?? "#00ffff";
        const intensity = (p.intensity as number | undefined) ?? 0.7;
        const speed = (p.speed as number | undefined) ?? 1;
        const v = (Math.sin(timeS * speed * Math.PI * 2) + 1) / 2 * intensity;
        state.blur += v * 6;
        state.color = state.color ? lerpColor(state.color, glowColor, v) : undefined;
        break;
      }
      case "draw-on":
        state.drawProgress = (state.drawProgress ?? 0) === 0 ? localT : (state.drawProgress ?? 1) * localT;
        break;
      case "custom-keyframes": {
        const keyframes = (p.keyframes as Keyframe[] | undefined) ?? [];
        // Apply loop logic: remap lifetimeProgress based on loopCount/loopMode
        let kfProgress = lifetimeProgress;
        const loopCount = effect.loopCount ?? 1;
        const loopMode: LoopMode = effect.loopMode ?? "repeat";
        if (loopCount > 1 || loopCount === Infinity) {
          const cycleProgress = lifetimeProgress * (loopCount === Infinity ? 1e6 : loopCount);
          const cycle = Math.floor(cycleProgress);
          let frac = cycleProgress - cycle;
          if (loopMode === "ping-pong" && cycle % 2 === 1) frac = 1 - frac;
          if (loopMode === "hold-last" && cycleProgress >= (loopCount === Infinity ? 1e6 : loopCount)) frac = 1;
          kfProgress = frac;
        }
        const kfState = interpolateKeyframes(keyframes, kfProgress);
        if (kfState.x !== undefined) state.x += kfState.x;
        if (kfState.y !== undefined) state.y += kfState.y;
        if (kfState.scale !== undefined) state.scale *= kfState.scale;
        if (kfState.scaleX !== undefined) state.scaleX *= kfState.scaleX;
        if (kfState.scaleY !== undefined) state.scaleY *= kfState.scaleY;
        if (kfState.rotation !== undefined) state.rotation += kfState.rotation;
        if (kfState.opacity !== undefined) state.opacity *= kfState.opacity;
        if (kfState.blur !== undefined) state.blur += kfState.blur;
        if (kfState.color !== undefined) state.color = kfState.color;
        if (kfState.backgroundColor !== undefined) state.backgroundColor = kfState.backgroundColor;
        if (kfState.drawProgress !== undefined) state.drawProgress = kfState.drawProgress;
        if (kfState.letterSpacing !== undefined) state.letterSpacing = (state.letterSpacing ?? 0) + kfState.letterSpacing;
        if (kfState.textStrokeColor !== undefined) state.textStrokeColor = kfState.textStrokeColor;
        if (kfState.textStrokeWidth !== undefined) state.textStrokeWidth = kfState.textStrokeWidth;
        if (kfState.motionProgress !== undefined) state.motionProgress = kfState.motionProgress;
        if (kfState.morphProgress !== undefined) state.morphProgress = kfState.morphProgress;
        break;
      }
      case "glow": {
        const glowColor = (p.color as string | undefined) ?? "#ffffff";
        const radius = (p.radius as number | undefined) ?? 16;
        const intensity = (p.intensity as number | undefined) ?? 0.6;
        const passes = (p.passes as number | undefined) ?? 2;
        const pulse = (p.pulse as boolean | undefined) ?? false;
        const pulseSpeed = (p.pulseSpeed as number | undefined) ?? 1;
        let effectiveIntensity = intensity;
        if (pulse) {
          effectiveIntensity *= (Math.sin(timeS * pulseSpeed * Math.PI * 2) + 1) / 2;
        }
        state.glowColor = glowColor;
        state.glowRadius = radius;
        state.glowIntensity = effectiveIntensity;
        state.glowPasses = passes;
        break;
      }
      case "morph": {
        // morphProgress driven by lifetime — simple 0→1 over element duration
        state.morphProgress = localT;
        break;
      }
      case "motion-path": {
        // motionProgress driven by lifetime — 0→1 over element duration
        state.motionProgress = localT;
        break;
      }
      case "boil": {
        const amplitude = (p.amplitude as number | undefined) ?? 2;
        const speed = (p.speed as number | undefined) ?? 12;
        // Posterize time: snap to discrete frames for stop-motion feel
        const snappedTime = Math.floor(timeS * speed) / speed;
        // Deterministic pseudo-random jitter based on snapped time
        const seedX = Math.sin(snappedTime * 127.1) * 43758.5453;
        const seedY = Math.sin(snappedTime * 269.5) * 43758.5453;
        state.x += (seedX % 1) * amplitude * 2 - amplitude;
        state.y += (seedY % 1) * amplitude * 2 - amplitude;
        state.rotation += (Math.sin(snappedTime * 311.7) * 43758.5453 % 1) * amplitude * 0.5 - amplitude * 0.25;
        break;
      }
    }
  }
}

/* ─── Main compute function ─── */

/**
 * Compute the visual state of a scene element at a given time using the
 * unified effects[] array. Replaces computeElementStyle() for elements
 * that have effects defined.
 */
export function computeEffects(
  element: SceneElement,
  sceneTimeMs: number,
  sceneDurationMs: number,
): ComputedElementStyle {
  const { timing } = element;
  const enterMs = timing.enterMs;
  const exitMs = timing.exitMs ?? sceneDurationMs;

  if (sceneTimeMs < enterMs || sceneTimeMs > exitMs) {
    return { transform: "", opacity: 0, filter: "", visible: false };
  }

  const effects = timing.effects ?? [];
  const state: EffectState = { ...IDENTITY };

  for (const effect of effects) {
    if (!effect.enabled) continue;
    applyEffect(effect, state, enterMs, exitMs, sceneTimeMs);
  }

  const transforms: string[] = [];
  if (state.x !== 0 || state.y !== 0) transforms.push(`translate(${state.x}px, ${state.y}px)`);
  if (state.scale !== 1) transforms.push(`scale(${state.scale})`);
  else if (state.scaleX !== 1 || state.scaleY !== 1) transforms.push(`scale(${state.scaleX}, ${state.scaleY})`);
  if (state.rotation !== 0) transforms.push(`rotate(${state.rotation}deg)`);

  const filters: string[] = [];
  if (state.blur > 0) filters.push(`blur(${state.blur}px)`);

  return {
    transform: transforms.join(" "),
    opacity: Math.max(0, Math.min(1, state.opacity)),
    filter: filters.join(" "),
    visible: true,
    color: state.color,
    backgroundColor: state.backgroundColor,
    drawProgress: state.drawProgress,
    glitch: state.glitch ?? undefined,
    letterSpacing: state.letterSpacing,
    textStrokeColor: state.textStrokeColor,
    textStrokeWidth: state.textStrokeWidth,
    motionProgress: state.motionProgress,
    morphProgress: state.morphProgress,
    glowColor: state.glowColor,
    glowRadius: state.glowRadius,
    glowIntensity: state.glowIntensity,
    glowPasses: state.glowPasses,
    textStagger: state.textStagger,
  };
}

/**
 * Compute translational velocity (px/ms) at a given time for motion blur.
 * Samples state 16ms before and at current time, returns speed.
 */
export function computeTranslationVelocity(
  element: SceneElement,
  sceneTimeMs: number,
  sceneDurationMs: number,
): number {
  const dt = 16;
  const prev = computeEffects(element, Math.max(0, sceneTimeMs - dt), sceneDurationMs);
  const curr = computeEffects(element, sceneTimeMs, sceneDurationMs);
  if (!prev.visible || !curr.visible) return 0;
  // Extract translate from transform strings
  const extractXY = (t: string): [number, number] => {
    const m = t.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 0];
  };
  const [px, py] = extractXY(prev.transform);
  const [cx, cy] = extractXY(curr.transform);
  return Math.sqrt((cx - px) ** 2 + (cy - py) ** 2) / dt;
}

/** Detect typewriter effect in an element's effects array */
export function hasTypewriterEffect(element: SceneElement): boolean {
  return element.timing.effects?.some((e) => e.enabled && e.definitionId === "typewriter") ?? false;
}

/** Get the typewriter timing params from the first typewriter effect */
export function getTypewriterParams(element: SceneElement): { enterMs: number; durationMs: number; delayMs: number } | null {
  const effect = element.timing.effects?.find((e) => e.enabled && e.definitionId === "typewriter");
  if (!effect) return null;
  const dur = (effect.params.durationMs as number | undefined) ?? 1000;
  const delay = (effect.params.delayMs as number | undefined) ?? 0;
  return { enterMs: element.timing.enterMs, durationMs: dur, delayMs: delay };
}
