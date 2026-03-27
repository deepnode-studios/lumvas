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
  | "chart";

/* ─── Chart data ─── */

export type ChartType = "bar" | "donut" | "progress";

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string; // color token or hex
}

export interface SlideElement {
  id: string;
  type: ElementType;
  content: string; // text, URL, or newline-separated list items

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

  // Sizing
  maxWidth?: string; // "100%", "80%", "600px"
  width?: string;
  height?: string;

  // Image specific
  objectFit?: "cover" | "contain" | "fill";
  borderRadius?: number;

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
  | "zoom-in" | "zoom-out";

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
}

export interface Keyframe {
  /** 0.0 = element enter time, 1.0 = element exit time */
  progress: number;
  properties: KeyframeProperties;
  easing?: Easing;
}

/* Element timing */

export interface ElementTiming {
  /** When this element appears, relative to scene start (ms) */
  enterMs: TimeMs;
  /** When this element disappears. Omit = stays until scene end. */
  exitMs?: TimeMs;
  enterAnimation?: AnimationConfig;
  exitAnimation?: AnimationConfig;
  keyframes?: Keyframe[];
}

/** A scene element: SlideElement + timing/animation metadata + absolute positioning */
export interface SceneElement extends SlideElement {
  timing: ElementTiming;
  children?: SceneElement[];

  // Absolute positioning within the scene (percentage 0–100 of scene dimensions)
  x?: number;
  y?: number;
  // Explicit size override (percentage of scene dimensions, or "auto")
  sceneWidth?: string;   // e.g. "50%", "auto", "200px"
  sceneHeight?: string;
  // Static transforms
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  // Rotation in degrees
  rotation?: number;
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

/* Video content */

export interface VideoContentNode {
  scenes: VideoScene[];
  audioTracks: AudioTrack[];
  captionTracks: CaptionTrack[];
  settings: VideoSettings;
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
