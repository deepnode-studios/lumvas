/* ─── Lumvas Document Schema ─── */

export type IconLibrary = "lucide" | "phosphor" | "remix";

export interface AssetItem {
  id: string;
  label: string;
  description: string;
  data: string; // base64 data URI or URL
  tintable?: boolean; // when true, the asset can be colorized (e.g. monochrome logos)
}

export interface AssetNode {
  items: AssetItem[];
}

export interface DocumentSize {
  width: number;
  height: number;
  label: string;
}

export interface ColorToken {
  id: string;
  label: string;
  description: string;
  value: string; // hex
}

export interface FontToken {
  id: string;
  label: string;
  value: string; // CSS font-family string
}

export interface BackgroundPreset {
  id: string;
  label: string;
  style: SlideStyle;
}

export interface ThemeNode {
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string; // fallback font (resolved from "body" font)
  fonts: FontToken[];
  fontSize: number;
  fontWeight: number;
  borderRadius: number;
  palette: ColorToken[];
  backgroundPresets?: BackgroundPreset[];
}

/* ─── Element system ─── */

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

export type ElementType =
  | "text"
  | "image"
  | "button"
  | "list"
  | "divider"
  | "spacer"
  | "logo"
  | "group"
  | "icon"
  | "chart"
  | "counter"          // animated number counter
  | "path"             // SVG path with draw-on animation
  | "svg"              // inline SVG shape
  | "indicator"        // pulsing emphasis ring
  | "lottie"           // Lottie/Bodymovin animation (JSON)
  | "particle-emitter"; // particle system (hearts, sparks, dust, etc.)

/* ─── Chart data ─── */

export type ChartType = "bar" | "donut" | "progress";

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string; // color token or hex
}

/** A styled text segment — when spans are present they replace content for rendering */
export interface TextSpan {
  text: string;  // the literal text of this segment
  color?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  fontSize?: number;
  opacity?: number;
  letterSpacing?: number;
  backgroundGradient?: string;
}

/* ─── Sprite sheet animation ─── */

export type SpritePlayMode = "loop" | "ping-pong" | "once" | "hold-last";

export interface SpriteConfig {
  /** Asset ID of the sprite sheet image */
  spriteSheet: string;
  /** Width of a single frame in px */
  frameWidth: number;
  /** Height of a single frame in px */
  frameHeight: number;
  /** Number of columns in the sprite sheet grid */
  columns: number;
  /** Total number of frames */
  frameCount: number;
  /** Playback frame rate */
  fps: number;
  /** How the animation loops */
  playMode: SpritePlayMode;
}

/* ─── Lottie animation ─── */

export interface LottieConfig {
  /** Lottie JSON data (inline) or asset ID referencing a .json asset */
  src: string;
  /** Playback speed multiplier (default 1) */
  playbackSpeed?: number;
  /** Start frame override (default 0) */
  startFrame?: number;
  /** End frame override (default: last frame) */
  endFrame?: number;
  /** Loop the animation */
  loop?: boolean;
}

/* ─── Motion path ─── */

export interface MotionPath {
  /** SVG path `d` string defining the trajectory curve */
  d: string;
  /** Auto-rotate element to face direction of travel */
  autoRotate?: boolean;
  /** Which point of the element sits on the path [x, y] normalized 0–1 (default [0.5, 0.5]) */
  alignOrigin?: [number, number];
}

/* ─── Path morphing ─── */

export interface PathMorphConfig {
  /** Target SVG path `d` string to morph into */
  targetD: string;
  /** Number of interpolation points (higher = smoother, default 128) */
  pointCount?: number;
}

/* ─── Particle emitter ─── */

export type ParticleShape = "circle" | "heart" | "star" | "square" | "custom";

export interface ParticleEmitterConfig {
  /** Shape of each particle */
  shape: ParticleShape;
  /** SVG path `d` for custom shape (when shape === "custom") */
  customShapePath?: string;
  /** Particles emitted per second */
  emitRate: number;
  /** Lifetime of each particle in ms */
  particleLifetimeMs: number;
  /** Velocity range in px/s */
  velocity: { min: number; max: number };
  /** Emission angle range in degrees (0 = up, 90 = right) */
  angle: { min: number; max: number };
  /** Gravity in px/s^2 (positive = downward) */
  gravity: number;
  /** Particle size range in px */
  size: { min: number; max: number };
  /** Opacity fade from start to end of lifetime */
  opacity: { start: number; end: number };
  /** Color pool — each particle picks randomly */
  colors: string[];
  /** Blend mode for particles */
  blendMode?: BlendMode;
  /** Max particles alive at once (perf budget, default 200) */
  maxParticles?: number;
}

/* ─── Per-word / per-character text animation ─── */

export type TextAnimUnit = "character" | "word" | "line";
export type StaggerOrigin = "start" | "end" | "center" | "random";

export interface TextAnimationConfig {
  /** Decomposition unit */
  unit: TextAnimUnit;
  /** Delay between each unit's animation start in ms */
  staggerMs: number;
  /** Where the stagger begins */
  staggerFrom: StaggerOrigin;
  /** Effect applied to each unit (uses same Effect structure) */
  perUnitEffect: Omit<Effect, "id">;
}

/* ─── Glow effect config (extends via effect params) ─── */

export interface GlowConfig {
  /** Glow color */
  color: string;
  /** Blur radius in px */
  radius: number;
  /** Intensity multiplier 0–1 */
  intensity: number;
  /** Number of glow passes (more = brighter, default 2) */
  passes?: number;
}

export interface SlideElement {
  id: string;
  type: ElementType;
  content: string; // text, URL, or newline-separated list items

  // Inline text spans (style overrides for character ranges)
  spans?: TextSpan[];

  // Asset reference (for logo/image elements)
  assetId?: string;

  // Text styling
  fontId?: string; // references a FontToken id (e.g. "header", "body")
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  opacity?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textStrokeColor?: string;  // text outline color (token or hex)
  textStrokeWidth?: number;  // text outline width in px

  // Blending
  blendMode?: BlendMode; // compositing blend mode (CSS mix-blend-mode / Canvas globalCompositeOperation)

  // Sizing
  maxWidth?: string; // "100%", "80%", "600px"
  width?: string;
  height?: string;

  // Image / video specific
  objectFit?: "cover" | "contain" | "fill";
  borderRadius?: number;
  videoLoop?: boolean;          // auto-loop video content to fill the element's timeline
  videoTrimLastFrame?: boolean; // skip last frame when looping (for seamless-loop videos where first == last frame)

  // Button specific
  backgroundColor?: string;
  backgroundGradient?: string; // CSS gradient string
  textColor?: string;
  paddingX?: number;
  paddingY?: number;

  // Spacing
  marginTop?: number;
  marginBottom?: number;

  // Flex layout (works on any element inside a flex parent — slide or group)
  flex?: number; // flex-grow value (e.g. 1 = take remaining space)
  flexShrink?: number; // flex-shrink (default 1)
  alignSelf?: FlexAlign | "stretch"; // override parent's alignItems for this element

  // Icon specific
  iconLibrary?: IconLibrary; // icon library: "lucide", "phosphor", or "remix"
  iconName?: string; // icon component name within the selected library
  iconSize?: number; // pixel size (width = height)
  strokeWidth?: number; // SVG stroke width for stroke-based icons (lucide only)

  // Group layout (only for type "group")
  children?: SlideElement[];
  direction?: FlexDirection;
  alignItems?: FlexAlign;
  justifyContent?: FlexJustify;
  gap?: number;
  padding?: number;

  // Chart specific
  chartType?: ChartType;
  chartData?: ChartDataPoint[];
  showLabels?: boolean;   // show label text (default true)
  showValues?: boolean;   // show numeric values (default true)

  // Counter specific (type "counter")
  counterStart?: number;   // starting value (default 0)
  counterEnd?: number;     // ending value (default 100)
  counterPrefix?: string;  // text before number e.g. "$"
  counterSuffix?: string;  // text after number e.g. "%"
  counterDecimals?: number; // decimal places (default 0)

  // Path specific (type "path") — content holds SVG path `d` string
  pathStroke?: string;      // stroke color token or hex
  pathStrokeWidth?: number; // stroke width px (default 2)
  pathFill?: string;        // fill color token or hex (default "none")
  pathLinecap?: "butt" | "round" | "square";

  // SVG shape specific (type "svg") — content holds inline SVG markup
  // uses existing color, width, height fields

  // Indicator specific (type "indicator")
  indicatorRadius?: number;  // ring radius px (default 40)
  indicatorColor?: string;   // color token or hex

  // Stagger / repeat for group type
  staggerMs?: number;   // delay between each child's enter animation (ms)
  repeatCount?: number; // render first child repeatCount times with stagger

  // Sprite sheet animation (for type "image" with sprite sheet)
  sprite?: SpriteConfig;

  // Lottie animation (for type "lottie")
  lottie?: LottieConfig;

  // Particle emitter (for type "particle-emitter")
  particles?: ParticleEmitterConfig;

  // Per-word / per-character text animation (for type "text")
  textAnimation?: TextAnimationConfig;

  // Path morphing (for type "path")
  morph?: PathMorphConfig;

  // Glow effect
  glow?: GlowConfig;
}

/* ─── Slide ─── */

export type FlexAlign = "flex-start" | "center" | "flex-end";
export type FlexJustify = "flex-start" | "center" | "flex-end" | "space-between" | "space-evenly";
export type FlexDirection = "column" | "row";

export type BackgroundPattern =
  | "none"
  | "dots"
  | "grid"
  | "lines"
  | "diagonal"
  | "crosshatch"
  | "waves"
  | "checkerboard";

export interface SlideStyle {
  backgroundPresetId?: string; // references a BackgroundPreset id
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundGradient?: string; // CSS gradient string

  // Background pattern
  backgroundPattern?: BackgroundPattern;
  backgroundPatternColor?: string; // color token or hex
  backgroundPatternOpacity?: number; // 0–1
  backgroundPatternScale?: number; // multiplier (default 1)

  // Background image from assets
  backgroundAssetId?: string;
  backgroundAssetOpacity?: number; // 0–1
  backgroundAssetSize?: "cover" | "contain" | "repeat";
  backgroundAssetPosition?: string; // CSS position e.g. "center", "top left"

  // Color overlay
  backgroundOverlayColor?: string; // color token or hex
  backgroundOverlayOpacity?: number; // 0–1
}

export interface SlideContent {
  id: string;
  elements: SlideElement[];

  // Slide-level layout
  alignItems?: FlexAlign;
  justifyContent?: FlexJustify;
  direction?: FlexDirection;
  padding?: number;
  gap?: number;

  // Per-slide style overrides
  style?: SlideStyle;
}

export interface ContentNode {
  slides: SlideContent[];
}

/* ─── Video / Motion types ─── */

/** Milliseconds from video or scene start */
export type TimeMs = number;

export interface TimeRange {
  startMs: TimeMs;
  endMs: TimeMs;
}

/* Easing */

export type EasingPreset =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring"
  | "bounce";

export interface CubicBezierEasing {
  type: "cubic-bezier";
  x1: number; y1: number;
  x2: number; y2: number;
}

export type Easing = EasingPreset | CubicBezierEasing;

/* Animation presets */

export type AnimationPreset =
  | "none"
  | "fade-in" | "fade-out"
  | "slide-up" | "slide-down" | "slide-left" | "slide-right"
  | "scale-in" | "scale-out"
  | "drop-in" | "pop-in"
  | "typewriter"
  | "blur-in" | "blur-out"
  | "wipe-left" | "wipe-right"
  | "zoom-in" | "zoom-out"
  | "glitch";  // RGB-split glitch distortion (Canvas2D post-process)

export interface AnimationConfig {
  preset: AnimationPreset;
  durationMs: number;
  delayMs?: number;
  easing?: Easing;
}

/* Keyframes for continuous property animation */

export interface KeyframeProperties {
  x?: number;        // px offset from layout position
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number; // degrees
  opacity?: number;  // 0–1
  blur?: number;     // px
  color?: string;           // interpolated text/stroke color (hex)
  backgroundColor?: string; // interpolated background color (hex)
  drawProgress?: number;    // 0–1: fraction of path/stroke drawn (for "path" elements)
  letterSpacing?: number;       // px — animated letter spacing (cinematic tracking)
  textStrokeColor?: string;     // hex — animated text stroke color
  textStrokeWidth?: number;     // px — animated text stroke width (0 = no stroke)
  motionProgress?: number;      // 0–1: position along a motion path curve
  morphProgress?: number;       // 0–1: interpolation between source and target path shapes
}

export interface Keyframe {
  /** 0.0 = element enter time, 1.0 = element exit time */
  progress: number;
  properties: KeyframeProperties;
  easing?: Easing;
}

/* ─── Effects system ─── */

export type EffectTrigger = "enter" | "exit" | "lifetime";

export type EffectParamType = "number" | "color" | "select" | "boolean" | "keyframes";

export interface EffectParamOption {
  value: string;
  label: string;
}

export interface EffectParamDef {
  key: string;
  label: string;
  type: EffectParamType;
  min?: number;
  max?: number;
  step?: number;
  options?: EffectParamOption[];
  default: EffectParamValue;
}

export type EffectParamValue = number | string | boolean | Keyframe[];

export type LoopMode = "repeat" | "ping-pong" | "hold-last";

export interface Effect {
  id: string;
  definitionId: string;
  trigger: EffectTrigger;
  durationMs?: number;       // for enter/exit effects
  delayMs?: number;
  startProgress?: number;    // 0–1 for lifetime effects
  endProgress?: number;      // 0–1
  easing?: Easing;
  enabled: boolean;
  params: Record<string, EffectParamValue>;
  /** Number of times to loop keyframe sequence (Infinity = forever). Default 1 (no loop). */
  loopCount?: number;
  /** How the loop behaves at boundaries */
  loopMode?: LoopMode;
}

export interface EffectDefinition {
  id: string;
  label: string;
  category: EffectCategory;
  icon: string;
  description: string;
  defaultTrigger: EffectTrigger;
  defaultDurationMs?: number;
  params: EffectParamDef[];
  /** Canvas post-process type (glitch, chromatic, etc.) */
  postProcess?: "glitch" | "chromatic" | "blur-pulse";
}

export type EffectCategory =
  | "intro"
  | "outro"
  | "motion"
  | "filter"
  | "color"
  | "text"
  | "draw"
  | "keyframes";

export interface EffectCombo {
  id: string;
  label: string;
  icon: string;
  description: string;
  effects: Omit<Effect, "id">[];
}

/* Element timing */

export interface ElementTiming {
  /** When this element appears, relative to scene start (ms) */
  enterMs: TimeMs;
  /** When this element disappears. Omit = stays until scene end. */
  exitMs?: TimeMs;
  /** Unified effects array — the single source of truth for all animations */
  effects?: Effect[];
  /** @deprecated Use effects[] instead */
  enterAnimation?: AnimationConfig;
  /** @deprecated Use effects[] instead */
  exitAnimation?: AnimationConfig;
  /** @deprecated Use effects[] with custom-keyframes instead */
  keyframes?: Keyframe[];
}

/** A scene element: SlideElement + timing/animation metadata + absolute positioning */
export interface SceneElement extends SlideElement {
  timing: ElementTiming;
  children?: SceneElement[];

  // Absolute positioning within the scene (pixels)
  x?: number;
  y?: number;
  // Anchor point (0 = left/top, 0.5 = center, 1 = right/bottom)
  anchorX?: number;
  anchorY?: number;
  // Explicit size override (percentage of scene dimensions, or "auto")
  sceneWidth?: string;   // e.g. "50%", "auto", "200px"
  sceneHeight?: string;
  // Static transforms
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  // Rotation in degrees
  rotation?: number;
  // Masking: ID of another element in the same scene that masks (clips) this element.
  // The mask element's visual shape defines the visible area of this element.
  maskElementId?: string;

  // Motion path: element follows a bezier curve instead of linear x,y interpolation
  motionPath?: MotionPath;
}

/* Scene transitions */

export type TransitionPreset =
  | "none"
  | "crossfade"
  | "slide-left" | "slide-right" | "slide-up" | "slide-down"
  | "zoom"
  | "wipe-left" | "wipe-right"
  | "dissolve";

export interface SceneTransition {
  preset: TransitionPreset;
  durationMs: number;
  easing?: Easing;
}

/* Audio tracks */

export type AudioTrackType = "narration" | "music" | "sfx";

/** A keyframe for audio volume automation */
export interface AudioKeyframe {
  timeMs: number;      // absolute time in ms from video start
  volume: number;      // 0–1
  easing?: Easing;
}

/** Audio ducking: automatically lower this track's volume when a trigger track is active */
export interface AudioDuckingConfig {
  /** ID of the track that triggers ducking (e.g. narration track) */
  triggerTrackId: string;
  /** Volume multiplier when ducking is active (0 = silent, 1 = no ducking) */
  duckAmount: number;
  /** Fade-in time for ducking (ms) */
  attackMs?: number;
  /** Fade-out time for ducking (ms) */
  releaseMs?: number;
}

export interface AudioTrack {
  id: string;
  type: AudioTrackType;
  label: string;
  /** Relative path in media/ folder */
  src: string;
  /** When this track starts playing (ms from video start) */
  startMs: TimeMs;
  /** Duration of the audio clip in ms */
  durationMs: number;
  /** Trim: skip this many ms from start of audio file */
  trimStartMs?: number;
  /** Trim: stop playback at this point in the audio file */
  trimEndMs?: number;
  /** 0.0–1.0 */
  volume: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  /** Volume automation keyframes (override static volume at specific times) */
  volumeKeyframes?: AudioKeyframe[];
  /** Auto-ducking config (lower this track when another plays) */
  ducking?: AudioDuckingConfig;
}

/* Captions / subtitles */

export type CaptionStyle =
  | "default"
  | "karaoke"       // highlight word-by-word as spoken
  | "word-reveal"   // reveal words one at a time
  | "line-reveal"   // reveal line at a time
  | "bounce"        // each word bounces in
  | "typewriter";   // character-by-character

export interface CaptionWord {
  text: string;
  startMs: TimeMs;
  endMs: TimeMs;
  confidence?: number; // 0–1, from Whisper
}

export interface CaptionSegment {
  id: string;
  words: CaptionWord[];
  speaker?: string; // from diarization
}

export type CaptionFillMode = "box" | "line";

export interface CaptionAppearance {
  fontId?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  position: "bottom" | "top" | "center" | "custom";
  positionX?: number;  // % of scene width (0–100), used when position === "custom"
  positionY?: number;  // % of scene height (0–100)
  padding?: number;
  highlightColor?: string; // for karaoke mode
  fillMode?: CaptionFillMode;   // "box" = single rectangle, "line" = per-line rectangles
  borderRadius?: number;         // px, used for corners and concave joins in line mode
}

export interface CaptionTrack {
  id: string;
  label: string;
  language: string;
  segments: CaptionSegment[];
  style: CaptionStyle;
  appearance: CaptionAppearance;
}

/* Scene */

export interface VideoScene {
  id: string;
  /** Scene duration in milliseconds */
  durationMs: number;
  /** Layout (same props as SlideContent) */
  alignItems?: FlexAlign;
  justifyContent?: FlexJustify;
  direction?: FlexDirection;
  padding?: number;
  gap?: number;
  style?: SlideStyle;
  /** Elements with timing/animation */
  elements: SceneElement[];
  /** Transition to the next scene */
  transition?: SceneTransition;
}

/* Video settings */

export interface VideoSettings {
  fps: 24 | 30 | 60;
  format: "mp4" | "webm";
  codec: "h264" | "vp9";
  quality: "draft" | "standard" | "high";
}

/* ─── Composition system ─── */

/** What a layer references — discriminated union */
export type LayerSource =
  | { type: "element"; element: SceneElement }
  | { type: "composition"; compositionId: string }
  | { type: "audio"; audio: AudioTrack }
  | { type: "caption"; caption: CaptionTrack }
  | SymbolInstanceSource;

/** A layer in a composition's timeline */
export interface CompLayer {
  id: string;
  name?: string;
  source: LayerSource;
  /** When this layer starts relative to the parent composition (ms) */
  startMs: number;
  /** Duration of this layer on the parent timeline (ms) */
  durationMs: number;
  /** Layer visibility */
  enabled?: boolean;  // default true
  /** Effects applied at the layer level */
  effects?: Effect[];
  /** Opacity override (0–1) */
  opacity?: number;
  /** Blend mode */
  blendMode?: BlendMode;
}

/* ─── Camera system ─── */

export interface CameraKeyframe {
  /** Time in ms relative to composition start */
  timeMs: number;
  /** Camera X offset in px (pan horizontal) */
  x: number;
  /** Camera Y offset in px (pan vertical) */
  y: number;
  /** Zoom factor (1 = 100%, 2 = 200%) */
  zoom: number;
  /** Camera rotation in degrees */
  rotation?: number;
  /** Easing to this keyframe from the previous one */
  easing?: Easing;
}

export interface CameraTrack {
  keyframes: CameraKeyframe[];
}

/* ─── Timeline markers ─── */

export interface Marker {
  id: string;
  name: string;
  timeMs: number;
  color?: string;
}

/* ─── Symbol / component library ─── */

export interface Symbol {
  id: string;
  name: string;
  /** The master element tree */
  elements: SceneElement[];
  /** Default timing for instances */
  defaultTiming?: ElementTiming;
}

export interface SymbolInstanceSource {
  type: "symbol";
  symbolId: string;
  /** Per-element property overrides keyed by element ID */
  overrides?: Record<string, Partial<SceneElement>>;
}

/** A composition: independent timeline container with its own layer stack */
export interface Composition {
  id: string;
  name: string;
  durationMs: number;
  /** Dimensions — defaults to project documentSize if omitted */
  width?: number;
  height?: number;
  /** Background style */
  style?: SlideStyle;
  /** Layout (for positioned elements) */
  alignItems?: FlexAlign;
  justifyContent?: FlexJustify;
  direction?: FlexDirection;
  padding?: number;
  gap?: number;
  /** Ordered layer stack — last layer renders on top */
  layers: CompLayer[];
  /** Virtual camera with keyframed pan/zoom/rotation */
  camera?: CameraTrack;
  /** Named time markers for aligning elements to narrative beats */
  markers?: Marker[];
}

/* Video content */

export interface VideoContentNode {
  /** @deprecated Use compositions[] + rootCompositionId instead */
  scenes?: VideoScene[];
  /** Library of all compositions */
  compositions?: Composition[];
  /** ID of the root composition (the final output) */
  rootCompositionId?: string;
  audioTracks: AudioTrack[];
  captionTracks: CaptionTrack[];
  settings: VideoSettings;
  /** Reusable symbol/component library */
  symbols?: Symbol[];
}

/* ─── Document (discriminated union) ─── */

interface LumvasDocumentBase {
  documentSize: DocumentSize;
  language?: string; // BCP 47 language tag (e.g. "en", "tr", "de")
  assets: AssetNode;
  theme: ThemeNode;
}

export interface SlideDocument extends LumvasDocumentBase {
  contentType?: "slides"; // optional for backward compat (old docs lack this field)
  content: ContentNode;
}

export interface VideoDocument extends LumvasDocumentBase {
  contentType: "video";
  content: VideoContentNode;
}

export type LumvasDocument = SlideDocument | VideoDocument;

/** Type guard: is this a video document? */
export function isVideoDocument(doc: LumvasDocument): doc is VideoDocument {
  return doc.contentType === "video";
}

/** Type guard: is this a slide document? */
export function isSlideDocument(doc: LumvasDocument): doc is SlideDocument {
  return doc.contentType !== "video";
}

/* ─── Templates ─── */

export interface SlideTemplate {
  id: string;
  name: string;
  category: string;
  builtIn: boolean;
  slide: Omit<SlideContent, "id">;
}
