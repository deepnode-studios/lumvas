/* ─── Jsonvas Document Schema ─── */

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
  | "icon";

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
  iconName?: string; // references an icon from the built-in registry
  iconSize?: number; // pixel size (width = height)
  strokeWidth?: number; // SVG stroke width for stroke-based icons

  // Group layout (only for type "group")
  children?: SlideElement[];
  direction?: FlexDirection;
  alignItems?: FlexAlign;
  justifyContent?: FlexJustify;
  gap?: number;
  padding?: number;
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

export interface JsonvasDocument {
  documentSize: DocumentSize;
  language?: string; // BCP 47 language tag (e.g. "en", "tr", "de") — used for locale-aware text rendering
  assets: AssetNode;
  theme: ThemeNode;
  content: ContentNode;
}

/* ─── Templates ─── */

export interface SlideTemplate {
  id: string;
  name: string;
  category: string;
  builtIn: boolean;
  slide: Omit<SlideContent, "id">;
}
