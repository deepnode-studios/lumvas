import type { EffectDefinition, EffectCombo } from "@/types/schema";

export const EFFECT_DEFINITIONS: EffectDefinition[] = [
  // ─── INTRO ───────────────────────────────────────────────────────────────
  {
    id: "fade-in",
    label: "Fade In",
    category: "intro",
    icon: "↑",
    description: "Element fades in from transparent to opaque.",
    defaultTrigger: "enter",
    defaultDurationMs: 500,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 5000, step: 50, default: 500 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "linear", label: "Linear" },
        { value: "ease-in", label: "Ease In" },
        { value: "ease-out", label: "Ease Out" },
        { value: "ease-in-out", label: "Ease In-Out" },
      ], default: "ease-out" },
    ],
  },
  {
    id: "slide-up",
    label: "Slide Up",
    category: "intro",
    icon: "↑",
    description: "Element slides in from below.",
    defaultTrigger: "enter",
    defaultDurationMs: 500,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 5000, step: 50, default: 500 },
      { key: "distance", label: "Distance (px)", type: "number", min: 10, max: 400, step: 10, default: 40 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "linear", label: "Linear" },
        { value: "ease-out", label: "Ease Out" },
        { value: "ease-in-out", label: "Ease In-Out" },
        { value: "spring", label: "Spring" },
      ], default: "ease-out" },
    ],
  },
  {
    id: "slide-down",
    label: "Slide Down",
    category: "intro",
    icon: "↓",
    description: "Element slides in from above.",
    defaultTrigger: "enter",
    defaultDurationMs: 500,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 5000, step: 50, default: 500 },
      { key: "distance", label: "Distance (px)", type: "number", min: 10, max: 400, step: 10, default: 40 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "linear", label: "Linear" },
        { value: "ease-out", label: "Ease Out" },
        { value: "ease-in-out", label: "Ease In-Out" },
        { value: "spring", label: "Spring" },
      ], default: "ease-out" },
    ],
  },
  {
    id: "slide-left",
    label: "Slide Left",
    category: "intro",
    icon: "←",
    description: "Element slides in from the right.",
    defaultTrigger: "enter",
    defaultDurationMs: 500,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 5000, step: 50, default: 500 },
      { key: "distance", label: "Distance (px)", type: "number", min: 10, max: 400, step: 10, default: 60 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "linear", label: "Linear" },
        { value: "ease-out", label: "Ease Out" },
        { value: "ease-in-out", label: "Ease In-Out" },
        { value: "spring", label: "Spring" },
      ], default: "ease-out" },
    ],
  },
  {
    id: "slide-right",
    label: "Slide Right",
    category: "intro",
    icon: "→",
    description: "Element slides in from the left.",
    defaultTrigger: "enter",
    defaultDurationMs: 500,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 5000, step: 50, default: 500 },
      { key: "distance", label: "Distance (px)", type: "number", min: 10, max: 400, step: 10, default: 60 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "linear", label: "Linear" },
        { value: "ease-out", label: "Ease Out" },
        { value: "ease-in-out", label: "Ease In-Out" },
        { value: "spring", label: "Spring" },
      ], default: "ease-out" },
    ],
  },
  {
    id: "scale-in",
    label: "Scale In",
    category: "intro",
    icon: "⊕",
    description: "Element grows in from a small scale.",
    defaultTrigger: "enter",
    defaultDurationMs: 400,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 5000, step: 50, default: 400 },
      { key: "fromScale", label: "From Scale", type: "number", min: 0, max: 2, step: 0.05, default: 0.5 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "ease-out", label: "Ease Out" },
        { value: "spring", label: "Spring" },
        { value: "bounce", label: "Bounce" },
      ], default: "ease-out" },
    ],
  },
  {
    id: "pop-in",
    label: "Pop In",
    category: "intro",
    icon: "✦",
    description: "Element pops in with a quick scale overshoot.",
    defaultTrigger: "enter",
    defaultDurationMs: 350,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 2000, step: 50, default: 350 },
      { key: "overshoot", label: "Overshoot", type: "number", min: 1, max: 2, step: 0.05, default: 1.2 },
    ],
  },
  {
    id: "drop-in",
    label: "Drop In",
    category: "intro",
    icon: "⬇",
    description: "Element drops in from above with a bounce.",
    defaultTrigger: "enter",
    defaultDurationMs: 600,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 100, max: 3000, step: 50, default: 600 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "bounce", label: "Bounce" },
        { value: "spring", label: "Spring" },
        { value: "ease-out", label: "Ease Out" },
      ], default: "bounce" },
    ],
  },
  {
    id: "blur-in",
    label: "Blur In",
    category: "intro",
    icon: "≈",
    description: "Element fades in while sharpening from a blur.",
    defaultTrigger: "enter",
    defaultDurationMs: 600,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 5000, step: 50, default: 600 },
      { key: "fromBlur", label: "Blur Amount (px)", type: "number", min: 2, max: 40, step: 1, default: 12 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "ease-out", label: "Ease Out" },
        { value: "ease-in-out", label: "Ease In-Out" },
      ], default: "ease-out" },
    ],
  },
  {
    id: "zoom-in",
    label: "Zoom In",
    category: "intro",
    icon: "🔍",
    description: "Element zooms in from a very small scale with a fade.",
    defaultTrigger: "enter",
    defaultDurationMs: 500,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 5000, step: 50, default: 500 },
      { key: "fromScale", label: "From Scale", type: "number", min: 0, max: 1, step: 0.05, default: 0.1 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "ease-out", label: "Ease Out" },
        { value: "spring", label: "Spring" },
      ], default: "ease-out" },
    ],
  },
  {
    id: "wipe-left",
    label: "Wipe Left",
    category: "intro",
    icon: "▷",
    description: "Element is revealed from left to right via a clipping wipe.",
    defaultTrigger: "enter",
    defaultDurationMs: 600,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 100, max: 3000, step: 50, default: 600 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "linear", label: "Linear" },
        { value: "ease-in-out", label: "Ease In-Out" },
      ], default: "ease-in-out" },
    ],
  },
  {
    id: "wipe-right",
    label: "Wipe Right",
    category: "intro",
    icon: "◁",
    description: "Element is revealed from right to left via a clipping wipe.",
    defaultTrigger: "enter",
    defaultDurationMs: 600,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 100, max: 3000, step: 50, default: 600 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "linear", label: "Linear" },
        { value: "ease-in-out", label: "Ease In-Out" },
      ], default: "ease-in-out" },
    ],
  },
  {
    id: "typewriter",
    label: "Typewriter",
    category: "intro",
    icon: "▌",
    description: "Text reveals character by character.",
    defaultTrigger: "enter",
    defaultDurationMs: 1000,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 100, max: 10000, step: 100, default: 1000 },
      { key: "delayMs", label: "Delay (ms)", type: "number", min: 0, max: 2000, step: 50, default: 0 },
    ],
  },
  {
    id: "glitch",
    label: "Glitch",
    category: "intro",
    icon: "⚡",
    description: "RGB-split glitch distortion entrance.",
    defaultTrigger: "enter",
    defaultDurationMs: 600,
    postProcess: "glitch",
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 100, max: 3000, step: 50, default: 600 },
      { key: "intensity", label: "Intensity", type: "number", min: 0, max: 1, step: 0.05, default: 0.5 },
    ],
  },

  // ─── OUTRO ────────────────────────────────────────────────────────────────
  {
    id: "fade-out",
    label: "Fade Out",
    category: "outro",
    icon: "↓",
    description: "Element fades out to transparent.",
    defaultTrigger: "exit",
    defaultDurationMs: 400,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 5000, step: 50, default: 400 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "linear", label: "Linear" },
        { value: "ease-in", label: "Ease In" },
        { value: "ease-in-out", label: "Ease In-Out" },
      ], default: "ease-in" },
    ],
  },
  {
    id: "slide-out",
    label: "Slide Out",
    category: "outro",
    icon: "↙",
    description: "Element slides out in a chosen direction.",
    defaultTrigger: "exit",
    defaultDurationMs: 400,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 5000, step: 50, default: 400 },
      { key: "direction", label: "Direction", type: "select", options: [
        { value: "up", label: "Up" },
        { value: "down", label: "Down" },
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ], default: "down" },
      { key: "distance", label: "Distance (px)", type: "number", min: 10, max: 400, step: 10, default: 40 },
    ],
  },
  {
    id: "scale-out",
    label: "Scale Out",
    category: "outro",
    icon: "⊖",
    description: "Element shrinks out.",
    defaultTrigger: "exit",
    defaultDurationMs: 300,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 2000, step: 50, default: 300 },
      { key: "toScale", label: "To Scale", type: "number", min: 0, max: 1, step: 0.05, default: 0 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "ease-in", label: "Ease In" },
        { value: "ease-in-out", label: "Ease In-Out" },
      ], default: "ease-in" },
    ],
  },
  {
    id: "blur-out",
    label: "Blur Out",
    category: "outro",
    icon: "≋",
    description: "Element blurs out and fades.",
    defaultTrigger: "exit",
    defaultDurationMs: 400,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 3000, step: 50, default: 400 },
      { key: "toBlur", label: "Blur Amount (px)", type: "number", min: 2, max: 40, step: 1, default: 12 },
    ],
  },
  {
    id: "zoom-out",
    label: "Zoom Out",
    category: "outro",
    icon: "🔎",
    description: "Element zooms out to very small with fade.",
    defaultTrigger: "exit",
    defaultDurationMs: 400,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 50, max: 3000, step: 50, default: 400 },
      { key: "toScale", label: "To Scale", type: "number", min: 0, max: 1, step: 0.05, default: 0.1 },
    ],
  },

  // ─── MOTION ───────────────────────────────────────────────────────────────
  {
    id: "float",
    label: "Float",
    category: "motion",
    icon: "〜",
    description: "Element gently bobs up and down throughout its lifetime.",
    defaultTrigger: "lifetime",
    params: [
      { key: "amplitude", label: "Amplitude (px)", type: "number", min: 1, max: 60, step: 1, default: 10 },
      { key: "speed", label: "Speed (cycles/s)", type: "number", min: 0.1, max: 5, step: 0.1, default: 0.5 },
    ],
  },
  {
    id: "shake",
    label: "Shake",
    category: "motion",
    icon: "⟺",
    description: "Element shakes horizontally.",
    defaultTrigger: "lifetime",
    params: [
      { key: "amplitude", label: "Amplitude (px)", type: "number", min: 1, max: 60, step: 1, default: 8 },
      { key: "speed", label: "Speed (cycles/s)", type: "number", min: 0.5, max: 20, step: 0.5, default: 8 },
    ],
  },
  {
    id: "wiggle",
    label: "Wiggle",
    category: "motion",
    icon: "↔",
    description: "Element wiggles with a rotation oscillation.",
    defaultTrigger: "lifetime",
    params: [
      { key: "amplitude", label: "Amplitude (deg)", type: "number", min: 1, max: 45, step: 1, default: 5 },
      { key: "speed", label: "Speed (cycles/s)", type: "number", min: 0.5, max: 10, step: 0.5, default: 3 },
    ],
  },
  {
    id: "rotate-loop",
    label: "Rotate Loop",
    category: "motion",
    icon: "↻",
    description: "Element continuously rotates.",
    defaultTrigger: "lifetime",
    params: [
      { key: "speed", label: "Speed (deg/s)", type: "number", min: 10, max: 1080, step: 10, default: 90 },
      { key: "direction", label: "Direction", type: "select", options: [
        { value: "cw", label: "Clockwise" },
        { value: "ccw", label: "Counter-clockwise" },
      ], default: "cw" },
    ],
  },
  {
    id: "bounce-loop",
    label: "Bounce Loop",
    category: "motion",
    icon: "⤴",
    description: "Element continuously bounces up and down.",
    defaultTrigger: "lifetime",
    params: [
      { key: "amplitude", label: "Amplitude (px)", type: "number", min: 1, max: 100, step: 1, default: 20 },
      { key: "speed", label: "Speed (cycles/s)", type: "number", min: 0.1, max: 5, step: 0.1, default: 1 },
    ],
  },

  // ─── FILTER ───────────────────────────────────────────────────────────────
  {
    id: "glitch-loop",
    label: "Glitch Loop",
    category: "filter",
    icon: "⚡",
    description: "Periodic RGB-split glitch distortion.",
    defaultTrigger: "lifetime",
    postProcess: "glitch",
    params: [
      { key: "intensity", label: "Intensity", type: "number", min: 0, max: 1, step: 0.05, default: 0.6 },
      { key: "interval", label: "Interval (ms)", type: "number", min: 100, max: 5000, step: 100, default: 800 },
      { key: "burstDuration", label: "Burst Duration (ms)", type: "number", min: 50, max: 1000, step: 50, default: 150 },
    ],
  },
  {
    id: "blur-pulse",
    label: "Blur Pulse",
    category: "filter",
    icon: "≈",
    description: "Element pulses in and out of focus.",
    defaultTrigger: "lifetime",
    postProcess: "blur-pulse",
    params: [
      { key: "maxBlur", label: "Max Blur (px)", type: "number", min: 1, max: 40, step: 1, default: 8 },
      { key: "speed", label: "Speed (cycles/s)", type: "number", min: 0.1, max: 5, step: 0.1, default: 0.5 },
    ],
  },
  {
    id: "chromatic-aberration",
    label: "Chromatic",
    category: "filter",
    icon: "⊞",
    description: "Persistent RGB channel split (chromatic aberration).",
    defaultTrigger: "lifetime",
    postProcess: "chromatic",
    params: [
      { key: "offset", label: "Offset (px)", type: "number", min: 1, max: 20, step: 1, default: 4 },
    ],
  },

  // ─── COLOR ────────────────────────────────────────────────────────────────
  {
    id: "flash",
    label: "Flash",
    category: "color",
    icon: "◈",
    description: "Element flashes to a color and back.",
    defaultTrigger: "lifetime",
    params: [
      { key: "color", label: "Flash Color", type: "color", default: "#ffffff" },
      { key: "speed", label: "Speed (cycles/s)", type: "number", min: 0.5, max: 20, step: 0.5, default: 2 },
      { key: "intensity", label: "Intensity", type: "number", min: 0, max: 1, step: 0.05, default: 0.8 },
    ],
  },
  {
    id: "color-shift",
    label: "Color Shift",
    category: "color",
    icon: "◑",
    description: "Element color oscillates between two colors.",
    defaultTrigger: "lifetime",
    params: [
      { key: "fromColor", label: "From Color", type: "color", default: "#ff6b6b" },
      { key: "toColor", label: "To Color", type: "color", default: "#4ecdc4" },
      { key: "speed", label: "Speed (cycles/s)", type: "number", min: 0.1, max: 5, step: 0.1, default: 0.5 },
    ],
  },
  {
    id: "neon-pulse",
    label: "Neon Pulse",
    category: "color",
    icon: "✦",
    description: "Pulsing neon glow effect.",
    defaultTrigger: "lifetime",
    params: [
      { key: "color", label: "Glow Color", type: "color", default: "#00ffff" },
      { key: "intensity", label: "Intensity", type: "number", min: 0, max: 1, step: 0.05, default: 0.7 },
      { key: "speed", label: "Speed (cycles/s)", type: "number", min: 0.1, max: 5, step: 0.1, default: 1 },
    ],
  },

  // ─── TEXT ─────────────────────────────────────────────────────────────────
  {
    id: "scramble",
    label: "Scramble",
    category: "text",
    icon: "▓",
    description: "Text scrambles from random characters to final text.",
    defaultTrigger: "enter",
    defaultDurationMs: 800,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 100, max: 5000, step: 100, default: 800 },
      { key: "chars", label: "Scramble Chars", type: "select", options: [
        { value: "alphanumeric", label: "A–Z 0–9" },
        { value: "symbols", label: "Symbols" },
        { value: "binary", label: "Binary" },
      ], default: "alphanumeric" },
    ],
  },
  {
    id: "wave-chars",
    label: "Wave",
    category: "text",
    icon: "〰",
    description: "Characters animate in a wave pattern.",
    defaultTrigger: "lifetime",
    params: [
      { key: "amplitude", label: "Amplitude (px)", type: "number", min: 1, max: 40, step: 1, default: 8 },
      { key: "speed", label: "Speed (cycles/s)", type: "number", min: 0.2, max: 5, step: 0.2, default: 1 },
      { key: "spread", label: "Spread (chars)", type: "number", min: 1, max: 20, step: 1, default: 5 },
    ],
  },

  // ─── DRAW ─────────────────────────────────────────────────────────────────
  {
    id: "draw-on",
    label: "Draw On",
    category: "draw",
    icon: "✏",
    description: "Path/stroke is drawn on progressively.",
    defaultTrigger: "enter",
    defaultDurationMs: 1000,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 100, max: 10000, step: 100, default: 1000 },
      { key: "easing", label: "Easing", type: "select", options: [
        { value: "linear", label: "Linear" },
        { value: "ease-in-out", label: "Ease In-Out" },
        { value: "ease-out", label: "Ease Out" },
      ], default: "ease-in-out" },
    ],
  },
  {
    id: "wipe-reveal",
    label: "Wipe Reveal",
    category: "draw",
    icon: "▷",
    description: "Element is revealed by a directional wipe clip.",
    defaultTrigger: "enter",
    defaultDurationMs: 800,
    params: [
      { key: "durationMs", label: "Duration (ms)", type: "number", min: 100, max: 5000, step: 100, default: 800 },
      { key: "direction", label: "Direction", type: "select", options: [
        { value: "left-to-right", label: "Left to Right" },
        { value: "right-to-left", label: "Right to Left" },
        { value: "top-to-bottom", label: "Top to Bottom" },
        { value: "bottom-to-top", label: "Bottom to Top" },
      ], default: "left-to-right" },
    ],
  },

  // ─── KEYFRAMES ────────────────────────────────────────────────────────────
  {
    id: "custom-keyframes",
    label: "Custom Keyframes",
    category: "keyframes",
    icon: "◆",
    description: "Animate any property over the element lifetime with custom keyframes. Supports opacity, x, y, scale, rotation, blur, color, backgroundColor, and drawProgress.",
    defaultTrigger: "lifetime",
    params: [
      { key: "keyframes", label: "Keyframes", type: "keyframes", default: [] },
    ],
  },
];

export function getEffectDefinition(id: string): EffectDefinition | undefined {
  return EFFECT_DEFINITIONS.find((d) => d.id === id);
}

export const EFFECT_COMBOS: EffectCombo[] = [
  {
    id: "cinematic-entrance",
    label: "Cinematic Entrance",
    icon: "🎬",
    description: "Slide up + fade in combo for a dramatic entrance.",
    effects: [
      { definitionId: "slide-up", trigger: "enter", durationMs: 600, delayMs: 0, enabled: true,
        params: { durationMs: 600, distance: 40, easing: "ease-out" } },
      { definitionId: "fade-in", trigger: "enter", durationMs: 500, delayMs: 0, enabled: true,
        params: { durationMs: 500, easing: "ease-out" } },
    ],
  },
  {
    id: "glitch-reveal",
    label: "Glitch Reveal",
    icon: "⚡",
    description: "Glitch + scramble for a digital reveal effect.",
    effects: [
      { definitionId: "glitch", trigger: "enter", durationMs: 600, delayMs: 0, enabled: true,
        params: { durationMs: 600, intensity: 0.5, speed: 15 } },
      { definitionId: "scramble", trigger: "enter", durationMs: 800, delayMs: 0, enabled: true,
        params: { durationMs: 800, chars: "symbols" } },
    ],
  },
  {
    id: "hero-pop",
    label: "Hero Pop",
    icon: "✨",
    description: "Scale in + neon pulse for a hero element.",
    effects: [
      { definitionId: "scale-in", trigger: "enter", durationMs: 400, delayMs: 0, enabled: true,
        params: { durationMs: 400, fromScale: 0.5, easing: "ease-out" } },
      { definitionId: "neon-pulse", trigger: "lifetime", durationMs: 0, delayMs: 0, enabled: true,
        params: { color: "#00ffff", intensity: 0.7, speed: 1 } },
    ],
  },
  {
    id: "typewriter-fade",
    label: "Typewriter Fade",
    icon: "⌨",
    description: "Typewriter effect + subtle fade in.",
    effects: [
      { definitionId: "typewriter", trigger: "enter", durationMs: 1000, delayMs: 0, enabled: true,
        params: { durationMs: 1000, cursor: true } },
      { definitionId: "fade-in", trigger: "enter", durationMs: 800, delayMs: 0, enabled: true,
        params: { durationMs: 800, easing: "ease-in" } },
    ],
  },
  {
    id: "smooth-exit",
    label: "Smooth Exit",
    icon: "🌫",
    description: "Fade out + slide down for a graceful exit.",
    effects: [
      { definitionId: "fade-out", trigger: "exit", durationMs: 500, delayMs: 0, enabled: true,
        params: { durationMs: 500, easing: "ease-in" } },
      { definitionId: "slide-down", trigger: "exit", durationMs: 400, delayMs: 0, enabled: true,
        params: { durationMs: 400, distance: 30, easing: "ease-in" } },
    ],
  },
  {
    id: "pulse-attention",
    label: "Pulse Attention",
    icon: "📣",
    description: "Float + neon pulse to grab viewer attention.",
    effects: [
      { definitionId: "float", trigger: "lifetime", durationMs: 0, delayMs: 0, enabled: true,
        params: { amplitude: 8, speed: 0.8 } },
      { definitionId: "neon-pulse", trigger: "lifetime", durationMs: 0, delayMs: 0, enabled: true,
        params: { color: "#ff6b6b", intensity: 0.6, speed: 0.8 } },
    ],
  },
];

export const EFFECT_CATEGORIES: { id: string; label: string }[] = [
  { id: "intro", label: "Intro" },
  { id: "outro", label: "Outro" },
  { id: "motion", label: "Motion" },
  { id: "filter", label: "Filter" },
  { id: "color", label: "Color" },
  { id: "text", label: "Text" },
  { id: "draw", label: "Draw" },
  { id: "keyframes", label: "Keyframes" },
];
