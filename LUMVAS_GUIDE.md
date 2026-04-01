# Lumvas Project Format & Capabilities Guide

> This document is the authoritative reference for the `.lumvas` project format and all capabilities of the Lumvas system. It is designed for LLMs and automated tools to generate complete, valid Lumvas projects programmatically.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Document Format](#2-document-format)
3. [Document Sizes](#3-document-sizes)
4. [Theme System](#4-theme-system)
5. [Asset System](#5-asset-system)
6. [Element Types](#6-element-types)
7. [Slide Documents](#7-slide-documents)
8. [Video Documents](#8-video-documents)
9. [Scene Elements & Positioning](#9-scene-elements--positioning)
10. [Animation & Effects System](#10-animation--effects-system)
11. [Effect Definitions Catalog](#11-effect-definitions-catalog)
12. [Keyframe System](#12-keyframe-system)
13. [Easing System](#13-easing-system)
14. [Audio Tracks](#14-audio-tracks)
15. [Caption System](#15-caption-system)
16. [Scene Transitions](#16-scene-transitions)
17. [Slide Styling](#17-slide-styling)
18. [Group Elements](#18-group-elements)
19. [Video Export](#19-video-export)
20. [Fonts Reference](#20-fonts-reference)
21. [Examples](#21-examples)

---

## 1. Project Structure

A Lumvas project is a directory with the `.lumvas` extension:

```
MyProject.lumvas/
  project.json          # Main document (complete project state)
  media/
    img-a1b2c3.png      # Imported images
    img-d4e5f6.jpg
    audio-x7y8z9.mp3    # Imported audio files
    ...
```

### Rules

- `project.json` contains the full `LumvasDocument` as JSON.
- Media files are stored in the `media/` subdirectory with generated filenames.
- Elements reference media by relative path (e.g. `"media/img-a1b2c3.png"`), never by embedded base64.
- When generating a project programmatically, place media files in `media/` and reference them by relative path in element `content` or asset `data` fields.

---

## 2. Document Format

Every `project.json` is a `LumvasDocument`:

```jsonc
{
  "contentType": "video",       // "video" or "slides" (omit for slides for backward compat)
  "documentSize": { "width": 1920, "height": 1080, "label": "Landscape 16:9 (1920x1080)" },
  "language": "en",             // BCP 47 language code (optional)
  "assets": { "items": [] },
  "theme": { /* ThemeNode */ },
  "content": { /* VideoContentNode or ContentNode */ }
}
```

### Content Type Discrimination

| `contentType` | `content` type | Purpose |
|---|---|---|
| `"video"` | `VideoContentNode` | Timeline-based video with scenes, audio, captions |
| `"slides"` or omitted | `ContentNode` | Static slide deck / carousel |

---

## 3. Document Sizes

Preset sizes (any custom `width`/`height` between 320-3840 is also valid):

| Width | Height | Label |
|-------|--------|-------|
| 1080 | 1080 | Square (1080x1080) |
| 1080 | 1350 | Portrait 4:5 (1080x1350) |
| 1080 | 1920 | Story / Reel (1080x1920) |
| 1920 | 1080 | Landscape 16:9 (1920x1080) |
| 1200 | 628 | LinkedIn / OG (1200x628) |
| 1600 | 900 | Presentation (1600x900) |

---

## 4. Theme System

The `ThemeNode` controls global styling:

```jsonc
{
  "backgroundColor": "#ffffff",
  "primaryColor": "#1a1a2e",
  "secondaryColor": "#e94560",
  "fontFamily": "Inter, sans-serif",     // CSS font-family fallback
  "fonts": [                             // Named font tokens
    { "id": "header", "label": "Header", "value": "Inter, sans-serif" },
    { "id": "body", "label": "Body", "value": "Inter, sans-serif" }
  ],
  "fontSize": 16,
  "fontWeight": 400,
  "borderRadius": 12,
  "palette": [                           // Named color tokens
    { "id": "accent", "label": "Accent", "description": "Accent color", "value": "#ff6b6b" }
  ],
  "backgroundPresets": [                 // Saved background styles
    { "id": "preset-1", "label": "Dark gradient", "style": { /* SlideStyle */ } }
  ]
}
```

### Color References

Throughout the document, color fields can be:
- **Hex values**: `"#ff0000"`, `"#1a1a2e"`
- **Theme tokens**: `"primary"`, `"secondary"`, `"background"`
- **Palette IDs**: Any `palette[].id` value (e.g. `"accent"`)

These are resolved at render time.

### Font References

The `fontId` field on elements can be:
- **Font token ID**: References `theme.fonts[].id` (e.g. `"header"`)
- **Raw CSS font-family**: Direct value (e.g. `"Inter, sans-serif"`, `"'Playfair Display', serif"`)
- **Omitted**: Falls back to `theme.fontFamily`

---

## 5. Asset System

```jsonc
{
  "assets": {
    "items": [
      {
        "id": "asset-1",
        "label": "Company Logo",
        "description": "Main brand logo",
        "data": "media/img-a1b2c3.png",    // Relative path to media file
        "tintable": true                     // Optional: can be colorized
      }
    ]
  }
}
```

Elements reference assets via `assetId` (for `logo`/`image` types).

---

## 6. Element Types

All 14 element types and their specific properties:

### `text`
```jsonc
{
  "type": "text",
  "content": "Hello World",          // The text content
  "fontId": "header",                // Font token or CSS font-family
  "fontSize": 48,
  "fontWeight": 700,
  "fontStyle": "normal",             // "normal" | "italic"
  "color": "primary",                // Color token, palette ID, or hex
  "textAlign": "center",             // "left" | "center" | "right"
  "letterSpacing": 0,
  "lineHeight": 1.4,
  "opacity": 1.0,
  "textTransform": "uppercase",      // "none" | "uppercase" | "lowercase" | "capitalize"
  "textStrokeColor": "#ffffff",      // Text outline color (token or hex)
  "textStrokeWidth": 2,             // Text outline width in px
  "blendMode": "overlay",           // Compositing blend mode (see Blend Modes below)
  "maxWidth": "80%",                 // CSS value
  "width": "100%"
}
```

### `image`
```jsonc
{
  "type": "image",
  "content": "media/img-a1b2c3.png", // Path to image file
  "objectFit": "cover",              // "cover" | "contain" | "fill"
  "borderRadius": 12,
  "width": "100%",
  "height": "auto"
}
```

### `logo`
```jsonc
{
  "type": "logo",
  "content": "",
  "assetId": "asset-1",              // References an asset item
  "maxWidth": "120px",
  "height": "80px"
}
```

### `button`
```jsonc
{
  "type": "button",
  "content": "Click Me",
  "backgroundColor": "#e94560",
  "backgroundGradient": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "textColor": "#ffffff",
  "fontSize": 16,
  "fontWeight": 600,
  "fontId": "body",
  "paddingX": 32,
  "paddingY": 14,
  "borderRadius": 8
}
```

### `list`
```jsonc
{
  "type": "list",
  "content": "Item one\nItem two\nItem three",  // Newline-separated
  "fontSize": 16,
  "lineHeight": 1.8,
  "color": "primary"
}
```

### `divider`
```jsonc
{
  "type": "divider",
  "content": "",
  "width": "80%",
  "color": "primary",
  "opacity": 0.3
}
```

### `spacer`
```jsonc
{
  "type": "spacer",
  "content": "",
  "height": "24px"
}
```

### `icon`
```jsonc
{
  "type": "icon",
  "content": "",
  "iconLibrary": "lucide",           // "lucide" | "phosphor" | "remix"
  "iconName": "Heart",               // Component name in the library
  "iconSize": 48,
  "strokeWidth": 2,                  // Lucide only
  "color": "secondary"
}
```

### `chart`
```jsonc
{
  "type": "chart",
  "content": "",
  "chartType": "bar",                // "bar" | "donut" | "progress"
  "chartData": [
    { "label": "Q1", "value": 42, "color": "#ff6b6b" },
    { "label": "Q2", "value": 68, "color": "#4ecdc4" },
    { "label": "Q3", "value": 55 }
  ],
  "showLabels": true,
  "showValues": true
}
```

### `counter`
```jsonc
{
  "type": "counter",
  "content": "",
  "counterStart": 0,
  "counterEnd": 100,
  "counterPrefix": "$",
  "counterSuffix": "M",
  "counterDecimals": 1,
  "fontSize": 64,
  "fontWeight": 700,
  "color": "#ffffff"
}
```

### `path`
```jsonc
{
  "type": "path",
  "content": "M 0 0 L 200 0 L 200 200",  // SVG path d attribute
  "pathStroke": "#ffffff",
  "pathStrokeWidth": 3,
  "pathFill": "none",
  "pathLinecap": "round"                    // "butt" | "round" | "square"
}
```

### `svg`
```jsonc
{
  "type": "svg",
  "content": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"currentColor\"/></svg>"
}
```

### `indicator`
```jsonc
{
  "type": "indicator",
  "content": "",
  "indicatorRadius": 40,
  "indicatorColor": "#00ffff",
  "pathStrokeWidth": 3
}
```

### `group`
See [Section 18: Group Elements](#18-group-elements).

### Common Properties (all elements)

```jsonc
{
  "id": "el-unique-id",
  "opacity": 1.0,
  "marginTop": 0,
  "marginBottom": 0,
  "flex": 1,                    // flex-grow in flex parent
  "flexShrink": 1,
  "alignSelf": "center"         // "flex-start" | "center" | "flex-end" | "stretch"
}
```

---

## 7. Slide Documents

For `contentType: "slides"` (or omitted):

```jsonc
{
  "content": {
    "slides": [
      {
        "id": "slide-1",
        "elements": [ /* SlideElement[] */ ],
        "direction": "column",           // "column" | "row"
        "alignItems": "center",          // "flex-start" | "center" | "flex-end"
        "justifyContent": "center",      // "flex-start" | "center" | "flex-end" | "space-between" | "space-evenly"
        "padding": 80,
        "gap": 24,
        "style": { /* SlideStyle - see Section 17 */ }
      }
    ]
  }
}
```

---

## 8. Video Documents

For `contentType: "video"`:

```jsonc
{
  "content": {
    "scenes": [ /* VideoScene[] */ ],
    "audioTracks": [ /* AudioTrack[] */ ],
    "captionTracks": [ /* CaptionTrack[] */ ],
    "settings": {
      "fps": 30,                // 24 | 30 | 60
      "format": "mp4",         // "mp4" | "webm"
      "codec": "h264",         // "h264" | "vp9"
      "quality": "high"        // "draft" | "standard" | "high"
    }
  }
}
```

### VideoScene

```jsonc
{
  "id": "scene-1",
  "durationMs": 5000,
  "elements": [ /* SceneElement[] */ ],
  "direction": "column",
  "alignItems": "center",
  "justifyContent": "center",
  "padding": 0,
  "gap": 24,
  "style": {
    "backgroundColor": "#1a1a2e",
    "backgroundGradient": "linear-gradient(135deg, #1a1a2e, #16213e)"
  },
  "transition": {
    "preset": "crossfade",
    "durationMs": 500,
    "easing": "ease-in-out"
  }
}
```

---

## 9. Scene Elements & Positioning

`SceneElement` extends the base element with timing and absolute positioning:

```jsonc
{
  "id": "el-1",
  "type": "text",
  "content": "Title",
  "fontSize": 64,
  "fontWeight": 700,
  "color": "#ffffff",

  // Absolute position (pixels from scene top-left)
  "x": 540,
  "y": 540,

  // Anchor point: 0 = top-left, 0.5 = center, 1 = bottom-right
  // The element's anchor is placed at (x, y)
  "anchorX": 0.5,
  "anchorY": 0.5,

  // Explicit size
  "sceneWidth": "80%",          // "auto", "50%", "400px"
  "sceneHeight": "auto",

  // Static transforms
  "scale": 1.0,
  "scaleX": 1.0,
  "scaleY": 1.0,
  "rotation": 0,                // degrees

  // Timing (REQUIRED for scene elements)
  "timing": {
    "enterMs": 0,               // When element appears (ms from scene start)
    "exitMs": 5000,             // When element disappears (omit = scene end)
    "effects": [ /* Effect[] */ ]
  }
}
```

### Anchor System

The anchor determines which point of the element is placed at `(x, y)`:

| anchorX | anchorY | Behavior |
|---------|---------|----------|
| 0 | 0 | Top-left corner at (x, y) — default |
| 0.5 | 0.5 | Center of element at (x, y) |
| 1 | 0 | Top-right corner at (x, y) |
| 0.5 | 1 | Bottom-center at (x, y) |

**Example: Center text in a 1920x1080 scene:**
```jsonc
{ "x": 960, "y": 540, "anchorX": 0.5, "anchorY": 0.5 }
```

---

## 10. Animation & Effects System

The `effects` array in `ElementTiming` is the **single source of truth** for all animations.

### Effect Structure

```jsonc
{
  "id": "fx-1",
  "definitionId": "fade-in",      // References an effect definition
  "trigger": "enter",             // "enter" | "exit" | "lifetime"
  "durationMs": 500,              // For enter/exit effects
  "delayMs": 0,                   // Delay before effect starts
  "startProgress": 0.0,           // For lifetime effects: start at 0% of element life
  "endProgress": 1.0,             // For lifetime effects: end at 100%
  "easing": "ease-out",           // Easing preset or cubic-bezier
  "enabled": true,
  "params": {                     // Effect-specific parameters
    "durationMs": 500,
    "easing": "ease-out"
  }
}
```

### Trigger Types

| Trigger | When it plays | Duration |
|---------|--------------|----------|
| `"enter"` | When element appears (`enterMs`) | `durationMs` from element enter |
| `"exit"` | Before element disappears (`exitMs`) | `durationMs` before element exit |
| `"lifetime"` | Continuously while visible | `startProgress` to `endProgress` (0-1) |

### Multiple Effects

Elements can have multiple effects stacked. They compose additively:

```jsonc
"effects": [
  { "definitionId": "fade-in", "trigger": "enter", "durationMs": 500 },
  { "definitionId": "slide-up", "trigger": "enter", "durationMs": 600, "params": { "distance": 40 } },
  { "definitionId": "float", "trigger": "lifetime", "params": { "amplitude": 10, "speed": 0.5 } },
  { "definitionId": "fade-out", "trigger": "exit", "durationMs": 400 }
]
```

---

## 11. Effect Definitions Catalog

### Intro Effects (Enter)

| ID | Label | Params | Description |
|----|-------|--------|-------------|
| `fade-in` | Fade In | `durationMs` (50-5000, def 500), `easing` | Opacity 0 to 1 |
| `slide-up` | Slide Up | `durationMs`, `distance` (10-400px, def 40), `easing` | Slides in from below |
| `slide-down` | Slide Down | `durationMs`, `distance` (def 40), `easing` | Slides in from above |
| `slide-left` | Slide Left | `durationMs`, `distance` (def 60), `easing` | Slides in from right |
| `slide-right` | Slide Right | `durationMs`, `distance` (def 60), `easing` | Slides in from left |
| `scale-in` | Scale In | `durationMs` (def 400), `fromScale` (0-2, def 0.5), `easing` | Grows from small |
| `pop-in` | Pop In | `durationMs` (def 350), `overshoot` (1-2, def 1.2) | Quick scale with bounce |
| `drop-in` | Drop In | `durationMs` (def 600), `easing` | Falls from top |
| `blur-in` | Blur In | `durationMs` (def 600), `fromBlur` (2-40px, def 12), `easing` | Sharpens from blur |
| `zoom-in` | Zoom In | `durationMs` (def 500), `fromScale` (0-1, def 0.1), `easing` | Zooms from very small |
| `wipe-left` | Wipe Left | `durationMs` (def 600), `easing` | Revealed left to right |
| `wipe-right` | Wipe Right | `durationMs` (def 600), `easing` | Revealed right to left |
| `typewriter` | Typewriter | `durationMs` (100-10000, def 1000), `delayMs` (0-2000) | Character-by-character reveal |
| `glitch` | Glitch | `durationMs` (100-3000, def 600), `intensity` (0-1, def 0.5) | RGB-split distortion |

### Outro Effects (Exit)

| ID | Label | Params | Description |
|----|-------|--------|-------------|
| `fade-out` | Fade Out | `durationMs` (def 400), `easing` | Opacity 1 to 0 |
| `slide-out` | Slide Out | `durationMs` (def 400), `direction` (up/down/left/right), `distance` (def 40) | Slides out |
| `scale-out` | Scale Out | `durationMs` (def 300), `toScale` (0-1, def 0), `easing` | Shrinks out |
| `blur-out` | Blur Out | `durationMs` (def 400), `toBlur` (2-40px, def 12) | Blurs and fades |
| `zoom-out` | Zoom Out | `durationMs` (def 400), `toScale` (0-1, def 0.1) | Zooms out with fade |

### Motion Effects (Lifetime)

| ID | Label | Params | Description |
|----|-------|--------|-------------|
| `float` | Float | `amplitude` (1-60px, def 10), `speed` (0.1-5 cycles/s, def 0.5) | Gentle vertical bob |
| `shake` | Shake | `amplitude` (1-60px, def 8), `speed` (0.5-20, def 8) | Horizontal shake |
| `wiggle` | Wiggle | `amplitude` (1-45deg, def 5), `speed` (0.5-10, def 3) | Rotation oscillation |
| `rotate-loop` | Rotate Loop | `speed` (10-1080 deg/s, def 90), `direction` (cw/ccw) | Continuous rotation |
| `bounce-loop` | Bounce Loop | `amplitude` (1-100px, def 20), `speed` (0.1-5, def 1) | Vertical bounce |
| `boil` | Boil | `amplitude` (0.5-10px, def 2), `speed` (2-24fps, def 8) | Stop-motion jitter — random position/rotation wobble at a reduced frame rate for a hand-drawn, organic feel |

### Filter Effects (Lifetime)

| ID | Label | Params | Description |
|----|-------|--------|-------------|
| `glitch-loop` | Glitch Loop | `intensity` (0-1, def 0.6), `interval` (100-5000ms), `burstDuration` (50-1000ms, def 150) | Periodic glitch |
| `blur-pulse` | Blur Pulse | `maxBlur` (1-40px, def 8), `speed` (0.1-5, def 0.5) | Pulsing focus |
| `chromatic-aberration` | Chromatic | `offset` (1-20px, def 4) | RGB channel split |

### Color Effects (Lifetime)

| ID | Label | Params | Description |
|----|-------|--------|-------------|
| `flash` | Flash | `color` (def "#ffffff"), `speed` (0.5-20), `intensity` (0-1, def 0.8) | Flashes to color |
| `color-shift` | Color Shift | `fromColor` (def "#ff6b6b"), `toColor` (def "#4ecdc4"), `speed` (0.1-5, def 0.5) | Oscillates between colors |
| `neon-pulse` | Neon Pulse | `color` (def "#00ffff"), `intensity` (0-1, def 0.7), `speed` (0.1-5, def 1) | Pulsing neon glow |

### Text Effects

| ID | Label | Trigger | Params | Description |
|----|-------|---------|--------|-------------|
| `scramble` | Scramble | enter | `durationMs` (100-5000, def 800), `chars` (alphanumeric/symbols/binary) | Random chars to final text |
| `wave-chars` | Wave Chars | lifetime | `amplitude` (1-40px, def 8), `speed` (0.2-5, def 1), `spread` (1-20, def 5) | Characters wave |

### Draw Effects

| ID | Label | Trigger | Params | Description |
|----|-------|---------|--------|-------------|
| `draw-on` | Draw On | enter | `durationMs` (100-10000, def 1000), `easing` | Progressive path reveal |
| `wipe-reveal` | Wipe Reveal | enter | `durationMs` (100-5000, def 800), `direction` (left-to-right/right-to-left/top-to-bottom/bottom-to-top) | Directional clip reveal |

### Custom Keyframes

| ID | Label | Trigger | Params | Description |
|----|-------|---------|--------|-------------|
| `custom-keyframes` | Custom Keyframes | lifetime | `keyframes` (Keyframe[]) | Fully custom animation |

### Effect Combos (Presets)

| ID | Effects | Description |
|----|---------|-------------|
| `cinematic-entrance` | slide-up (600ms) + fade-in (500ms) | Smooth cinematic entrance |
| `glitch-reveal` | glitch (600ms) + scramble (800ms) | Glitchy text reveal |
| `hero-pop` | scale-in (400ms) + neon-pulse (lifetime) | Hero element with glow |
| `typewriter-fade` | typewriter (1000ms) + fade-in (800ms) | Typewriter with fade |
| `smooth-exit` | fade-out (500ms) + slide-down (400ms) | Smooth exit |
| `pulse-attention` | float (lifetime) + neon-pulse (lifetime) | Attention-grabbing loop |

---

## 12. Keyframe System

For `custom-keyframes` effect or legacy `timing.keyframes`:

```jsonc
{
  "keyframes": [
    {
      "progress": 0.0,           // 0 = element enter, 1 = element exit
      "easing": "ease-out",
      "properties": {
        "opacity": 0,
        "x": -100,
        "y": 0,
        "scale": 0.5,
        "rotation": -10,
        "blur": 5,
        "drawProgress": 0,
        "color": "#ff0000",
        "backgroundColor": "#000000"
      }
    },
    {
      "progress": 0.5,
      "properties": { "opacity": 1, "x": 0, "scale": 1.2, "rotation": 0, "blur": 0 }
    },
    {
      "progress": 1.0,
      "properties": { "opacity": 1, "x": 0, "scale": 1, "drawProgress": 1, "color": "#00ff00" }
    }
  ]
}
```

### Animatable Keyframe Properties

| Property | Type | Description |
|----------|------|-------------|
| `opacity` | 0-1 | Element transparency |
| `x` | number (px) | Horizontal offset |
| `y` | number (px) | Vertical offset |
| `scale` | number | Uniform scale |
| `scaleX` | number | Horizontal scale |
| `scaleY` | number | Vertical scale |
| `rotation` | number (deg) | Rotation |
| `blur` | number (px) | Gaussian blur |
| `color` | hex string | Text/stroke color (interpolated) |
| `backgroundColor` | hex string | Background color (interpolated) |
| `drawProgress` | 0-1 | Path draw reveal progress |
| `letterSpacing` | number (px) | Animated letter spacing (cinematic tracking) |
| `textStrokeColor` | hex string | Animated text outline color |
| `textStrokeWidth` | number (px) | Animated text outline width (0 = no stroke) |

---

## 12b. Blend Modes

Any element can use `"blendMode"` to control how it composites with the video beneath it. Supported values: `"normal"`, `"multiply"`, `"screen"`, `"overlay"`, `"darken"`, `"lighten"`, `"color-dodge"`, `"color-burn"`, `"hard-light"`, `"soft-light"`, `"difference"`, `"exclusion"`, `"hue"`, `"saturation"`, `"color"`, `"luminosity"`.

## 12c. Element Masking

Scene elements support `"maskElementId"` — the ID of another element in the same scene. The mask element's bounding box clips the masked element, creating depth effects where foreground objects appear *in front of* text (spatial integration).

```jsonc
{
  "id": "title-text",
  "type": "text",
  "content": "EXPLORE",
  "maskElementId": "person-image"  // this text is clipped to the person image's bounds
}
```

---

## 13. Easing System

### Preset Easings

| Value | Description |
|-------|-------------|
| `"linear"` | Constant speed |
| `"ease-in"` | Slow start |
| `"ease-out"` | Slow end |
| `"ease-in-out"` | Slow start and end |
| `"spring"` | Springy overshoot |
| `"bounce"` | Bouncing effect |

### Custom Cubic Bezier

```jsonc
{
  "type": "cubic-bezier",
  "x1": 0.25,
  "y1": 0.1,
  "x2": 0.25,
  "y2": 1.0
}
```

---

## 14. Audio Tracks

```jsonc
{
  "id": "audio-1",
  "type": "music",               // "narration" | "music" | "sfx"
  "label": "Background Music",
  "src": "media/audio-x7y8z9.mp3",
  "startMs": 0,                  // When track starts (from video start)
  "durationMs": 30000,           // Duration of audio clip
  "trimStartMs": 0,              // Skip from beginning of audio file
  "trimEndMs": 30000,            // Stop at this point in audio file
  "volume": 0.8,                 // 0.0 - 1.0
  "fadeInMs": 500,               // Fade in duration
  "fadeOutMs": 1000              // Fade out duration
}
```

---

## 15. Caption System

### Caption Track

```jsonc
{
  "id": "cap-1",
  "label": "English Captions",
  "language": "en",
  "style": "karaoke",            // See styles below
  "segments": [
    {
      "id": "seg-1",
      "speaker": "Narrator",     // Optional (from diarization)
      "words": [
        { "text": "Hello", "startMs": 0, "endMs": 500, "confidence": 0.98 },
        { "text": "world", "startMs": 550, "endMs": 1000, "confidence": 0.95 }
      ]
    }
  ],
  "appearance": {
    "fontId": "body",
    "fontSize": 32,
    "fontWeight": 700,
    "color": "#ffffff",
    "backgroundColor": "#000000",
    "backgroundOpacity": 0.7,
    "position": "bottom",        // "bottom" | "top" | "center" | "custom"
    "positionX": 50,             // % of scene width (for position: "custom")
    "positionY": 85,             // % of scene height
    "padding": 12,
    "highlightColor": "#FFD700", // For karaoke style
    "fillMode": "box",           // "box" | "line"
    "borderRadius": 8
  }
}
```

### Caption Styles

| Style | Description |
|-------|-------------|
| `"default"` | Plain static text |
| `"karaoke"` | Highlight word-by-word as spoken |
| `"word-reveal"` | Reveal words one at a time |
| `"line-reveal"` | Reveal line at a time |
| `"bounce"` | Each word bounces in |
| `"typewriter"` | Character-by-character |

---

## 16. Scene Transitions

```jsonc
{
  "transition": {
    "preset": "crossfade",
    "durationMs": 500,
    "easing": "ease-in-out"
  }
}
```

### Transition Presets

| Preset | Description |
|--------|-------------|
| `"none"` | Hard cut |
| `"crossfade"` | Opacity blend |
| `"dissolve"` | Dissolve blend |
| `"slide-left"` | Next scene slides in from right |
| `"slide-right"` | Next scene slides in from left |
| `"slide-up"` | Next scene slides in from bottom |
| `"slide-down"` | Next scene slides in from top |
| `"zoom"` | Zoom transition |
| `"wipe-left"` | Wipe reveal left to right |
| `"wipe-right"` | Wipe reveal right to left |

---

## 17. Slide Styling

Per-slide style overrides (also used in scene `style`):

```jsonc
{
  "style": {
    "backgroundColor": "#1a1a2e",
    "primaryColor": "#ffffff",
    "secondaryColor": "#e94560",
    "backgroundGradient": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

    // Pattern overlay
    "backgroundPattern": "dots",     // "none" | "dots" | "grid" | "lines" | "diagonal" | "crosshatch" | "waves" | "checkerboard"
    "backgroundPatternColor": "#ffffff",
    "backgroundPatternOpacity": 0.1,
    "backgroundPatternScale": 1.0,

    // Asset background
    "backgroundAssetId": "asset-1",
    "backgroundAssetOpacity": 0.3,
    "backgroundAssetSize": "cover",  // "cover" | "contain" | "repeat"
    "backgroundAssetPosition": "center",

    // Color overlay
    "backgroundOverlayColor": "#000000",
    "backgroundOverlayOpacity": 0.5,

    // Preset reference
    "backgroundPresetId": "preset-1"
  }
}
```

---

## 18. Group Elements

Groups are containers with flex layout for their children:

```jsonc
{
  "type": "group",
  "content": "",
  "timing": { "enterMs": 0 },
  "x": 100,
  "y": 200,
  "anchorX": 0,
  "anchorY": 0,
  "sceneWidth": "600px",

  // Group layout
  "direction": "row",               // "row" | "column"
  "alignItems": "center",           // "flex-start" | "center" | "flex-end"
  "justifyContent": "space-between", // "flex-start" | "center" | "flex-end" | "space-between" | "space-evenly"
  "gap": 16,
  "padding": 24,

  // Group background
  "backgroundColor": "#1a1a2e",
  "backgroundGradient": "linear-gradient(...)",
  "borderRadius": 12,

  // Stagger animation
  "staggerMs": 200,                 // Delay between child animations (ms)
  "repeatCount": 3,                 // Clone first child N times with stagger

  // Children (each is a full SceneElement with its own timing)
  "children": [
    {
      "id": "child-1",
      "type": "text",
      "content": "First",
      "fontSize": 24,
      "timing": { "enterMs": 0 }
    },
    {
      "id": "child-2",
      "type": "text",
      "content": "Second",
      "fontSize": 24,
      "timing": { "enterMs": 0 }
    }
  ]
}
```

### Key Behaviors

- **Groups are absolutely positioned** on the scene (via `x`, `y`, `anchorX`, `anchorY`)
- **Children are flex-positioned** within the group (they affect each other's layout)
- **Each child has independent timing** — its own `enterMs`, `exitMs`, and `effects`
- **Groups can be nested** (a group can contain another group)
- **Stagger**: When `staggerMs` is set, each child's `enterMs` is offset by `i * staggerMs`

---

## 19. Video Export

Export produces video files with these options:

| Setting | Values | Description |
|---------|--------|-------------|
| FPS | 24, 30, 60 | Frame rate |
| Format | mp4, webm | Container format |
| Codec | h264, vp9 | Video codec |
| Quality | draft, standard, high | Encoding quality |

- **Rendering**: Pure Canvas2D (no DOM), <5ms per frame
- **Audio**: All tracks mixed to single AAC, with volume/fade/trim
- **Pipeline**: Raw RGBA frames piped to FFmpeg (no intermediate files)

---

## 20. Fonts Reference

### System Fonts
System UI, Arial, Georgia, Times New Roman, Courier New, Verdana, Trebuchet MS, Palatino, Menlo

### Google Fonts (loaded automatically)

**Sans-serif:** Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Raleway, Oswald, Nunito, DM Sans, Space Grotesk, Outfit, Sora, Manrope, Plus Jakarta Sans, Bebas Neue, Anton

**Serif:** Playfair Display, Merriweather, Lora, PT Serif, Bitter, Crimson Text, Libre Baskerville

**Monospace:** Source Code Pro, Fira Code, JetBrains Mono

**Cursive:** Pacifico, Dancing Script, Caveat

---

## 21. Examples

### Minimal Video Project

```json
{
  "contentType": "video",
  "documentSize": { "width": 1920, "height": 1080, "label": "Landscape 16:9 (1920x1080)" },
  "language": "en",
  "assets": { "items": [] },
  "theme": {
    "backgroundColor": "#0a0a0a",
    "primaryColor": "#ffffff",
    "secondaryColor": "#ff6b6b",
    "fontFamily": "Inter, sans-serif",
    "fonts": [
      { "id": "header", "label": "Header", "value": "Inter, sans-serif" },
      { "id": "body", "label": "Body", "value": "Inter, sans-serif" }
    ],
    "fontSize": 16,
    "fontWeight": 400,
    "borderRadius": 12,
    "palette": [],
    "backgroundPresets": []
  },
  "content": {
    "scenes": [
      {
        "id": "scene-1",
        "durationMs": 3000,
        "style": {
          "backgroundColor": "#0a0a0a",
          "backgroundGradient": "linear-gradient(135deg, #0a0a0a, #1a1a2e)"
        },
        "elements": [
          {
            "id": "title",
            "type": "text",
            "content": "Hello World",
            "fontSize": 72,
            "fontWeight": 700,
            "color": "#ffffff",
            "x": 960,
            "y": 540,
            "anchorX": 0.5,
            "anchorY": 0.5,
            "timing": {
              "enterMs": 0,
              "effects": [
                {
                  "id": "fx-1",
                  "definitionId": "fade-in",
                  "trigger": "enter",
                  "durationMs": 800,
                  "enabled": true,
                  "params": { "durationMs": 800, "easing": "ease-out" }
                }
              ]
            }
          }
        ],
        "transition": { "preset": "crossfade", "durationMs": 500 }
      }
    ],
    "audioTracks": [],
    "captionTracks": [],
    "settings": { "fps": 30, "format": "mp4", "codec": "h264", "quality": "high" }
  }
}
```

### Scene with Group Layout

```json
{
  "id": "scene-stats",
  "durationMs": 5000,
  "style": { "backgroundColor": "#1a1a2e" },
  "elements": [
    {
      "id": "stat-row",
      "type": "group",
      "content": "",
      "x": 960,
      "y": 540,
      "anchorX": 0.5,
      "anchorY": 0.5,
      "direction": "row",
      "alignItems": "center",
      "justifyContent": "space-evenly",
      "gap": 60,
      "sceneWidth": "80%",
      "staggerMs": 300,
      "timing": { "enterMs": 0 },
      "children": [
        {
          "id": "stat-1",
          "type": "counter",
          "content": "",
          "counterStart": 0,
          "counterEnd": 500,
          "counterSuffix": "+",
          "fontSize": 64,
          "fontWeight": 700,
          "color": "#4ecdc4",
          "timing": {
            "enterMs": 0,
            "effects": [
              { "id": "fx-s1", "definitionId": "scale-in", "trigger": "enter", "durationMs": 500, "enabled": true, "params": { "fromScale": 0.3 } }
            ]
          }
        },
        {
          "id": "stat-2",
          "type": "counter",
          "content": "",
          "counterStart": 0,
          "counterEnd": 98,
          "counterSuffix": "%",
          "fontSize": 64,
          "fontWeight": 700,
          "color": "#ff6b6b",
          "timing": {
            "enterMs": 0,
            "effects": [
              { "id": "fx-s2", "definitionId": "scale-in", "trigger": "enter", "durationMs": 500, "enabled": true, "params": { "fromScale": 0.3 } }
            ]
          }
        }
      ]
    }
  ]
}
```

### Scene with Image + Captions

```json
{
  "id": "scene-hero",
  "durationMs": 6000,
  "style": { "backgroundColor": "#000000" },
  "elements": [
    {
      "id": "bg-image",
      "type": "image",
      "content": "media/img-hero.jpg",
      "x": 0,
      "y": 0,
      "sceneWidth": "100%",
      "sceneHeight": "100%",
      "objectFit": "cover",
      "opacity": 0.7,
      "timing": { "enterMs": 0 }
    },
    {
      "id": "headline",
      "type": "text",
      "content": "The Future is Now",
      "fontSize": 80,
      "fontWeight": 800,
      "fontId": "Montserrat, sans-serif",
      "color": "#ffffff",
      "textAlign": "center",
      "maxWidth": "80%",
      "x": 960,
      "y": 480,
      "anchorX": 0.5,
      "anchorY": 0.5,
      "timing": {
        "enterMs": 500,
        "effects": [
          { "id": "fx-1", "definitionId": "slide-up", "trigger": "enter", "durationMs": 700, "enabled": true, "params": { "distance": 60, "easing": "ease-out" } },
          { "id": "fx-2", "definitionId": "fade-in", "trigger": "enter", "durationMs": 700, "enabled": true, "params": {} }
        ]
      }
    }
  ]
}
```

---

## Notes for LLM Project Generation

1. **Always include `timing`** on every scene element — it's required. At minimum: `{ "enterMs": 0 }`.
2. **Generate unique IDs** for all objects (scenes, elements, effects, tracks, segments). Use short random strings (e.g. 8 chars alphanumeric).
3. **Use anchor for centering**: Set `anchorX: 0.5, anchorY: 0.5` with `x` and `y` at the desired center point.
4. **Effects need both top-level and params**: Some params like `durationMs` appear both at the effect level AND inside `params`. Include in both for compatibility.
5. **Media references**: Use relative paths (`"media/filename.ext"`). Place actual files in the `media/` directory.
6. **Color tokens**: Use `"primary"`, `"secondary"`, or palette IDs for theme-aware colors. Use hex for fixed colors.
7. **Font selection**: Use Google Font names directly as `fontId` (e.g. `"Montserrat, sans-serif"`) or theme token IDs.
8. **Scene duration**: Must be explicitly set in milliseconds. Elements without `exitMs` stay until scene ends.
9. **Groups**: Absolutely positioned on scene, children are flex-positioned within. Each child has independent animation timing.
10. **Transitions**: Set on a scene to define how it transitions to the NEXT scene.
