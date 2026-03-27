"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLumvasStore } from "@/store/useLumvasStore";
import { useTemplateStore } from "@/store/useTemplateStore";
import { BUILT_IN_TEMPLATES, describeTemplatesForLLM } from "@/store/templates";
import type { LumvasDocument } from "@/types/schema";
import { validateLumvasDocument } from "@/utils/validateDocument";
import { JsonEditor } from "./JsonEditor";
import styles from "@/styles/workspace.module.css";
import b from "./llmBridge.module.css";

type EditorTab = "content" | "theme" | "assets" | "full";

const TABS: { key: EditorTab; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "theme", label: "Theme" },
  { key: "assets", label: "Assets" },
  { key: "full", label: "Full" },
];

/* ─── Helpers ─── */

/** Detect base64 data URI */
function isDataUri(s: string): boolean {
  return s.startsWith("data:");
}

/** Extract metadata from a base64 data URI */
function dataUriMeta(s: string): string {
  if (!s || !isDataUri(s)) return s;
  const mimeMatch = s.match(/^data:([^;,]+)/);
  const mime = mimeMatch?.[1] ?? "unknown";
  // Approximate byte size: base64 portion is ~75% of the encoded length
  const commaIdx = s.indexOf(",");
  const base64Part = commaIdx >= 0 ? s.slice(commaIdx + 1) : "";
  const bytes = Math.round((base64Part.length * 3) / 4);
  const kb = (bytes / 1024).toFixed(1);
  return `[uploaded: ${mime}, ${kb}KB]`;
}

/** Replace all binary data in a document with metadata placeholders */
function stripBinaryFromDoc(doc: LumvasDocument): LumvasDocument {
  const stripped = JSON.parse(JSON.stringify(doc)) as LumvasDocument;

  // Strip asset binary data
  for (const item of stripped.assets.items) {
    if (item.data && isDataUri(item.data)) {
      item.data = dataUriMeta(item.data);
    }
  }

  // Strip image element content (including inside groups)
  function stripElements(elements: LumvasDocument["content"]["slides"][0]["elements"]) {
    for (const el of elements) {
      if (el.type === "image" && el.content && isDataUri(el.content)) {
        el.content = dataUriMeta(el.content);
      }
      if (el.children) {
        stripElements(el.children);
      }
    }
  }
  for (const slide of stripped.content.slides) {
    stripElements(slide.elements);
  }

  return stripped;
}

/** Get the JSON slice for a given tab */
function getSlice(doc: LumvasDocument, tab: EditorTab): string {
  switch (tab) {
    case "content":
      return JSON.stringify(doc.content, null, 2);
    case "theme":
      return JSON.stringify(doc.theme, null, 2);
    case "assets":
      return JSON.stringify(doc.assets, null, 2);
    case "full":
      return JSON.stringify(doc, null, 2);
  }
}

/** Merge an edited slice back into the full document */
function mergeSlice(
  doc: LumvasDocument,
  tab: EditorTab,
  parsed: unknown
): LumvasDocument | null {
  switch (tab) {
    case "content": {
      const c = parsed as Record<string, unknown>;
      if (!c || !Array.isArray(c.slides)) return null;
      return { ...doc, content: parsed as LumvasDocument["content"] };
    }
    case "theme": {
      if (!parsed || typeof parsed !== "object") return null;
      return { ...doc, theme: parsed as LumvasDocument["theme"] };
    }
    case "assets": {
      if (!parsed || typeof parsed !== "object") return null;
      return { ...doc, assets: parsed as LumvasDocument["assets"] };
    }
    case "full": {
      if (!validateLumvasDocument(parsed as unknown)) return null;
      return parsed as LumvasDocument;
    }
  }
}

/* ─── Component ─── */

export function LLMBridge() {
  const getDocument = useLumvasStore((s) => s.getDocument);
  const importDocument = useLumvasStore((s) => s.importDocument);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EditorTab>("content");
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy for LLM");
  const suppressSync = useRef(false);
  const editorFocused = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync store → textarea (when store changes externally, NOT while user is editing)
  const storeSlice = getSlice(getDocument(), tab);
  useEffect(() => {
    if (!suppressSync.current && !editorFocused.current) {
      setJsonText(storeSlice);
      setParseError("");
    }
  }, [storeSlice]);

  // When switching tabs, immediately sync
  const switchTab = useCallback(
    (newTab: EditorTab) => {
      setTab(newTab);
      setJsonText(getSlice(getDocument(), newTab));
      setParseError("");
    },
    [getDocument]
  );

  // Live apply: textarea → store (debounced)
  const handleChange = useCallback(
    (value: string) => {
      setJsonText(value);
      clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        try {
          const parsed = JSON.parse(value);
          const merged = mergeSlice(getDocument(), tab, parsed);
          if (!merged) {
            const hints: Record<EditorTab, string> = {
              full: "Missing required keys: assets, theme, content.slides",
              content: "Expected { slides: [...] }",
              theme: "Expected a theme object",
              assets: "Expected an assets object",
            };
            setParseError(`Invalid ${tab} — ${hints[tab]}`);
            return;
          }
          setParseError("");
          suppressSync.current = true;
          importDocument(merged);
          requestAnimationFrame(() => {
            suppressSync.current = false;
          });
        } catch {
          setParseError("Invalid JSON");
        }
      }, 400);
    },
    [importDocument, getDocument, tab]
  );

  const customTemplates = useTemplateStore.getState().customTemplates;

  const buildLLMPrompt = () => {
    const doc = getDocument();
    const stripped = stripBinaryFromDoc(doc);
    const templateDesc = describeTemplatesForLLM(BUILT_IN_TEMPLATES, customTemplates);
    return `# Lumvas Document Schema

Below is a Lumvas carousel document. You can modify it and return the full JSON to update the design.

## Schema Reference

### documentSize
Controls the pixel dimensions of every slide.
- "width": Width in px (e.g. 1080).
- "height": Height in px (e.g. 1080).
- "label": Human-readable label (e.g. "Square (1080×1080)").

### language
BCP 47 language tag (e.g. "en", "tr", "de"). Controls locale-aware text rendering such as CSS text-transform (e.g. Turkish "i" uppercases to "İ", not "I").
Common presets: 1080×1080 (square), 1080×1350 (portrait 4:5), 1080×1920 (story/reel), 1920×1080 (landscape 16:9), 1200×628 (LinkedIn/OG), 1600×900 (presentation). You can also use any custom dimensions.

### assets.items
A flexible array of named assets (images, logos, icons). Each asset has:
- "id": Unique identifier string. Used to reference the asset from elements (e.g. logo element's "assetId").
- "label": Human-readable name (e.g. "Main Logo", "Hero Image").
- "description": Optional description of the asset's purpose.
- "data": Image data — either a URL or an uploaded image. Uploaded images appear as "[uploaded: mime, size]" placeholders — do not modify these. You can set "data" to a URL string or "" (empty).
- "tintable": Optional boolean. When true, the asset is treated as a monochrome icon/logo that can be colorized via the logo element's "color" property using CSS masking. Set to true for single-color SVGs or simple icons.
You can add, remove, and reorder assets. The first asset is used as the default logo.

### theme
Global design tokens that control the visual appearance of every slide.
- "backgroundColor": Slide background color (hex, e.g. "#ffffff").
- "primaryColor": Main text/heading color (hex).
- "secondaryColor": Accent color used for subtitles and highlights (hex).
- "fontFamily": Fallback CSS font-family string (derived from "body" font). Usually you don't set this directly — use "fonts" instead.
- "fonts": An array of named font tokens. Each font has:
  - "id": Unique identifier string. Use this as the font token in element "fontId" fields. Built-in: "header", "body".
  - "label": Human-readable name (e.g. "Header", "Body", "Code").
  - "value": CSS font-family string (e.g. "Inter, sans-serif"). System fonts: System UI, Arial, Georgia, Times New Roman, Courier New, Verdana, Trebuchet MS, Palatino, Menlo. Google Fonts: Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Raleway, Oswald, Nunito, Playfair Display, Merriweather, Lora, PT Serif, Source Code Pro, Fira Code, JetBrains Mono, DM Sans, Space Grotesk, Outfit, Sora, Manrope, Plus Jakarta Sans, Bitter, Crimson Text, Libre Baskerville, Bebas Neue, Anton, Pacifico, Dancing Script, Caveat. You can also use any other Google Font name.
  The "body" font is used as the default for all text. The "header" font is a convention for headings. You can add as many custom font variables as needed.
- "fontSize": Base font size in px (10–32). Headings scale proportionally from this.
- "fontWeight": Base body text weight (300–800). Headings use their own heavier weights.
- "borderRadius": Border radius in px for images and cards (0–48).
- "palette": An array of named color tokens. Each color has:
  - "id": Unique identifier string. Use this as the color token in element color fields.
  - "label": Human-readable name (e.g. "Warm Red", "Ocean Blue").
  - "description": Purpose or usage note (e.g. "Used for section headings", "CTA button background").
  - "value": Hex color value (e.g. "#e94560").
  You can add as many palette colors as needed. They become available as color tokens alongside "primary", "secondary", and "background".
- "backgroundPresets": Optional array of reusable background styles. Each preset has:
  - "id": Unique identifier string. Use this to link slides to a shared background.
  - "label": Human-readable name (e.g. "Dark Gradient", "Pattern Blue").
  - "style": A SlideStyle object with the same background fields as slide style (backgroundColor, backgroundGradient, backgroundPattern, backgroundPatternColor, backgroundPatternOpacity, backgroundPatternScale, backgroundAssetId, backgroundAssetOpacity, backgroundAssetSize, backgroundAssetPosition, backgroundOverlayColor, backgroundOverlayOpacity). Does NOT include primaryColor, secondaryColor, or backgroundPresetId.
  Multiple slides can reference the same preset via "backgroundPresetId" in their style. Editing a preset updates all linked slides.

### content.slides
An ordered array of slide objects. Each slide is a flex container rendered at the documentSize dimensions. Slides do NOT use fixed layout templates — instead, each slide contains an "elements" array of composable content blocks.

Each slide object:
- "id": Unique identifier string. Generate a random 8-char alphanumeric string.
- "alignItems": Horizontal alignment of elements — "flex-start" | "center" | "flex-end". Default "center".
- "justifyContent": Vertical distribution — "flex-start" | "center" | "flex-end" | "space-between" | "space-evenly". Default "center".
- "direction": Stack direction — "column" (vertical, default) or "row" (horizontal).
- "padding": Inner padding in px. Default 80.
- "gap": Space between elements in px. Default 24.
- "style": Optional per-slide style overrides (overrides global theme for this slide):
  - "backgroundPresetId": ID of a background preset from theme.backgroundPresets. When set, the preset's style fields are used as defaults; any additional fields in this style object override the preset.
  - "backgroundColor": hex color.
  - "primaryColor": hex color for text. Use "primary" token in element color fields to reference this.
  - "secondaryColor": hex color for accents. Use "secondary" token in element color fields to reference this.
  - "backgroundGradient": CSS gradient string. Supports linear (e.g. "linear-gradient(135deg, #667eea 0%, #764ba2 100%)") and radial (e.g. "radial-gradient(circle, #667eea 0%, #764ba2 100%)"). Each color stop should include a position percentage. Overrides backgroundColor.
  - "backgroundPattern": Pattern overlay — "none" | "dots" | "grid" | "lines" | "diagonal" | "crosshatch" | "waves" | "checkerboard".
  - "backgroundPatternColor": Color token or hex for the pattern (default: "primary").
  - "backgroundPatternOpacity": Pattern opacity 0–1 (default: 0.15).
  - "backgroundPatternScale": Size multiplier for pattern (default: 1). Higher = larger.
  - "backgroundAssetId": Asset ID to use as background image.
  - "backgroundAssetOpacity": Background image opacity 0–1 (default: 0.3).
  - "backgroundAssetSize": "cover" | "contain" | "repeat" (default: "cover").
  - "backgroundAssetPosition": CSS position string (default: "center"). E.g. "top left", "bottom right".
  - "backgroundOverlayColor": Color token or hex for overlay on top of background.
  - "backgroundOverlayOpacity": Overlay opacity 0–1 (default: 0.5).

### elements
Each slide's "elements" is an ordered array of content blocks. Each element has:

- "id": Unique identifier string.
- "type": One of "text" | "image" | "button" | "list" | "divider" | "spacer" | "logo" | "icon" | "chart" | "group".

#### Element types

**"text"** — A text block. Set "content" to the text string.
  Styling: fontId (font token ID, e.g. "header", "body", or custom), fontSize (px), fontWeight (300-900), fontStyle ("normal"|"italic"), textAlign ("left"|"center"|"right"), letterSpacing (px), lineHeight (number), opacity (0-1), textTransform ("none"|"uppercase"|"lowercase"|"capitalize"), color (hex or token: "primary", "secondary", "background"), maxWidth (CSS string e.g. "80%"), backgroundGradient (CSS gradient string, e.g. "linear-gradient(90deg, #ff0000, #0000ff)") — applies as a gradient text fill (background-clip: text), overrides color.

**"image"** — An image block. Set "content" to the image URL. Images uploaded in the UI appear as "[uploaded: mime, size]" — do not modify these placeholders.
  Styling: width (CSS string), height (CSS string), objectFit ("cover"|"contain"|"fill"), borderRadius (px), maxWidth (CSS string).

**"button"** — A styled button. Set "content" to the button label text.
  Styling: fontId (font token), fontSize (px), fontWeight, letterSpacing, textTransform, borderRadius (px), backgroundColor (hex or token, defaults to secondaryColor), backgroundGradient (CSS gradient string, overrides backgroundColor), textColor (hex or token, defaults to primaryColor), paddingX (px), paddingY (px), textAlign ("left"|"center"|"right").

**"list"** — A bulleted list. Set "content" to items separated by newlines (\\n). Each line becomes a bullet with a colored dot using secondaryColor.
  Styling: fontId (font token), fontSize (px), fontWeight, textAlign ("left"|"center"|"right"), letterSpacing (px), lineHeight (number), color (hex or token), opacity (0-1), textTransform ("none"|"uppercase"|"lowercase"|"capitalize"), maxWidth (CSS string).

**"divider"** — A horizontal line. Styling: opacity (0-1), maxWidth (CSS string), color (hex or token).

**"spacer"** — Empty vertical space. Set "height" (CSS string, e.g. "40px").

**"logo"** — Renders an asset image (logo/icon). Set "assetId" to reference a specific asset by its ID, or omit to use the first asset. Styling: width (CSS string), maxWidth (CSS string, default "120px"), height (CSS string, default "80px"), color (hex or token — only applies when the referenced asset has "tintable": true, used to colorize the logo via CSS masking).

**"icon"** — An icon element using external icon libraries. Set "iconLibrary" to one of: "lucide" (default), "phosphor", or "remix". Set "iconName" to the PascalCase component name from the selected library.
  Lucide examples: Star, Heart, Home, Settings, Search, ArrowRight, ChevronDown, Code, Terminal, Rocket, Globe, MapPin, Calendar, Clock, ThumbsUp, Crown, Sparkles, Mail, Phone, ShoppingCart, Download, Upload, TrendingUp, BarChart, Activity.
  Phosphor examples: Star, Heart, House, Gear, MagnifyingGlass, ArrowRight, Code, Terminal, Rocket, Globe, MapPin, Calendar, Clock, ThumbsUp, Crown, Sparkle, Envelope, Phone, ShoppingCart, DownloadSimple, UploadSimple, TrendUp, ChartBar.
  Remix examples: RiStarLine, RiHeartLine, RiHomeLine, RiSettingsLine, RiSearchLine, RiArrowRightLine, RiCodeLine, RiTerminalLine, RiRocketLine, RiGlobeLine, RiMapPinLine, RiCalendarLine, RiTimeLine, RiThumbUpLine, RiMailLine, RiPhoneLine, RiShoppingCartLine, RiDownloadLine, RiUploadLine, RiBarChartLine.
  Styling: iconSize (px, default 48), color (hex or token: "primary", "secondary", etc.), strokeWidth (0.5-4, default 2, lucide only), opacity (0-1).

**"chart"** — A data visualization element. Supports three chart types via "chartType":
  - "bar": Horizontal bar chart. Bars auto-scale relative to the maximum value.
  - "donut": Donut/ring chart using conic-gradient. Shows color legend below.
  - "progress": Progress bars where each value is a percentage (0-100).
  Data: "chartData" is an array of data points, each with:
    - "label": Display label (string).
    - "value": Numeric value. For "bar" charts, values are relative. For "progress" charts, values are percentages (0-100).
    - "color": Optional color token or hex (e.g. "primary", "secondary", "#10b981"). If omitted, cycles through primary/secondary.
  Options:
    - "showLabels": Show label text (boolean, default true).
    - "showValues": Show numeric values (boolean, default true).
  Styling: fontSize (px, default 14), color (text color — hex or token), width (CSS string), maxWidth (CSS string), height (CSS string — controls donut size for "donut" type, e.g. "200").
  Example: { "type": "chart", "chartType": "donut", "chartData": [{ "label": "Sales", "value": 45, "color": "primary" }, { "label": "Marketing", "value": 30, "color": "secondary" }], "showLabels": true, "showValues": true }

**"group"** — A flex container that groups child elements together with its own layout. Useful for horizontal layouts within vertical slides (e.g. side-by-side columns, icon+text rows, button groups).
  - "children": Array of child SlideElement objects (same schema as regular elements, except no nested groups).
  - "direction": "row" (horizontal, default) or "column" (vertical).
  - "alignItems": "flex-start" | "center" | "flex-end". Default "center".
  - "justifyContent": "flex-start" | "center" | "flex-end" | "space-between" | "space-evenly". Default "center".
  - "gap": Space between children in px. Default 16.
  - "padding": Inner padding in px. Default 0.
  - "width": CSS width string (e.g. "100%", "80%"). Default "100%".
  - "maxWidth": CSS max-width string (e.g. "100%", "600px"). Default "100%".
  - "backgroundColor": Optional background color (hex or token).
  - "backgroundGradient": Optional CSS gradient string (e.g. "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" or "radial-gradient(circle, #667eea 0%, #764ba2 100%)"). Overrides backgroundColor.
  - "borderRadius": px. "opacity": 0-1.
  Groups themselves support "flex" to extend within their parent (e.g. set flex:1 on a group to make it fill remaining space in a slide — great for header/content/footer layouts).

#### Flex layout (all elements)
Any element inside a flex parent (slide or group) supports:
- "flex": flex-grow value (e.g. 1 = take remaining space). Set to 1 on groups to make them extend and fill available space — useful for header/content/footer layouts.
- "flexShrink": flex-shrink value (default 1). Set to 0 to prevent shrinking.
- "alignSelf": Override parent's alignItems for this element — "flex-start" | "center" | "flex-end" | "stretch".

#### Universal element spacing
All elements support: marginTop (px), marginBottom (px).

#### Color tokens
For element "color" fields, you can use these token strings instead of hex values:
- "primary" → resolves to slide's primaryColor or theme's primaryColor
- "secondary" → resolves to slide's secondaryColor or theme's secondaryColor
- "background" → resolves to slide's backgroundColor or theme's backgroundColor
- Any palette color ID (from theme.palette) → resolves to that palette color's value
Or use any hex color directly (e.g. "#ff6600").

### Available Slide Templates
The following pre-built slide templates are available. You can use these as starting points and customize them, or create slides from scratch. Each template defines a slide layout with pre-configured elements.

${templateDesc}

You can use any template structure as a starting point, modify the element contents and styles, or build completely custom slides. You can add, remove, and reorder both slides and elements within slides. Return the complete JSON object with all five top-level keys: documentSize, language, assets, theme, content.

## Current Document

\`\`\`json
${JSON.stringify(stripped, null, 2)}
\`\`\`
`;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildLLMPrompt());
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy for LLM"), 1500);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={parseError ? `JSON Editor — ${parseError}` : "JSON Editor"}
        style={{
          padding: "4px 8px",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "var(--font-mono)",
          color: parseError ? "var(--danger)" : "var(--text-secondary)",
          background: "none",
          border: `1px solid ${parseError ? "var(--danger)" : "var(--input-border)"}`,
          borderRadius: 6,
          lineHeight: 1,
        }}
      >
        {"{ }"}
      </button>
    );
  }

  return (
    <div className={b.overlay} onClick={() => setOpen(false)}>
      <div className={b.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header with tabs */}
        <div className={b.header}>
          <div className={b.tabBar}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`${b.tab} ${tab === t.key ? b.tabActive : ""}`}
                onClick={() => switchTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {parseError && (
            <span className={b.statusError}>{parseError}</span>
          )}
          {!parseError && jsonText && (
            <span className={b.statusOk}>Valid</span>
          )}
          <button className={b.close} onClick={() => setOpen(false)}>
            &times;
          </button>
        </div>

        <JsonEditor
          value={jsonText}
          onChange={handleChange}
          onFocus={() => { editorFocused.current = true; }}
          onBlur={() => {
            editorFocused.current = false;
            // Sync store → textarea on blur to pick up any external changes
            const fresh = getSlice(getDocument(), tab);
            setJsonText(fresh);
            setParseError("");
          }}
        />

        <div className={b.actions}>
          <button className={styles.btnSecondary} onClick={handleCopy}>
            {copyLabel}
          </button>
          <button
            className={styles.btnSecondary}
            onClick={() => {
              setJsonText(getSlice(getDocument(), tab));
              setParseError("");
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
