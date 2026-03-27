<div align="center">
  <h1>Lumvas</h1>
  <p><b>The open-source, programmatic media suite. Liberating design, motion, and layout from walled gardens.</b></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Tauri](https://img.shields.io/badge/Tauri_v2-FFC131?logo=tauri&logoColor=black)](https://tauri.app/)
  [![React](https://img.shields.io/badge/React_19-blue?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
</div>

---

<div align="center">
  <br/>
  <img src="docs/sample-output.png" alt="Sample media created entirely by Lumvas — no human modification" width="100%" />
  <p><i>This layout was rendered entirely by Lumvas from structured JSON — zero manual design work required.</i></p>
  <br/>
</div>

## What is Lumvas?

Professional media creation has been locked behind expensive subscriptions, proprietary file formats, and closed ecosystems for too long. **Lumvas** is an open-source, programmatic media suite designed to tear down those walled gardens and build a positive-sum, regenerative ecosystem for creators and developers alike. 

Powered by a strict, universal JSON schema, Lumvas acts as a universal rendering engine. It translates structured, programmatic data into pixel-perfect visual layouts, and soon, dynamic video and motion graphics. 

Whether you are a developer automating thousands of assets, an open-source creator looking for a free alternative to legacy design software, or building AI agents that need a native visual output layer, Lumvas provides a common protocol to build, modify, and iterate on multi-format media.

## Current State

Lumvas is in active development. The first domain — **Static Layouts & Social Media Carousels** — is fully functional and covers everything needed to programmatically design, edit, and export high-fidelity documents.

### What works today

**9 Core Element Types**
| Element | Description |
|---------|-------------|
| Text | Rich text with font, size, weight, style, alignment, spacing, opacity, transforms, and gradient text fills |
| Image | Responsive images with object-fit, border-radius, and sizing |
| Button | Styled buttons with background color/gradient, text color, padding, border-radius |
| List | Bulleted lists with colored dots and full text styling |
| Divider | Horizontal lines with opacity and color control |
| Spacer | Flexible vertical spacing |
| Logo | Asset-based logo with optional color tinting (CSS masking) for monochrome assets |
| Icon | 100+ built-in SVG icons across 9 categories (general, arrows, social, media, communication, commerce, content, status, shapes) |
| Group | Flex container for nested layouts — enables columns, icon+text rows, button groups, etc. |

**Theme & Design System**
- Global primary, secondary, and background colors
- Custom color palette with labeled tokens — elements reference tokens, not raw hex
- Font token system (header, body, custom) with 40+ fonts (system + Google Fonts)
- Background presets: reusable slide backgrounds shared across slides
- Global font size, weight, and border-radius defaults

**Backgrounds & Composition**
- Solid colors and CSS gradients (linear, radial)
- 8 procedural patterns (dots, grid, lines, diagonal, crosshatch, waves, checkerboard) with color, opacity, and scale controls
- Background images from assets (cover, contain, repeat) with positioning
- Color overlays with opacity
- All composable — gradient + pattern + overlay on the same canvas

**Layout Architecture**
- Canvas-level flex layout: direction, alignment, justification, padding, gap
- Per-element flex-grow, flex-shrink, alignSelf
- Nested groups with independent flex configuration
- Element margins (top/bottom)

**Asset Management**
- Upload images and logos as base64 data URIs
- Label, describe, and tag assets as "tintable" for color masking
- Reuse assets across any frame via asset ID references

**Icon Library**
- 100+ curated SVG icons rendered inline (no external fonts or CDNs)
- Categories: general, arrows, social (Instagram, X, LinkedIn, YouTube, TikTok, GitHub, etc.), media, communication, commerce, content, status, shapes
- Configurable size, color (token or hex), stroke width, opacity
- Searchable icon picker with category filters

**Templates**
- 15 built-in canvas templates across 8 categories (title, content, quote, CTA, stats, image, comparison, blank)
- Save any layout as a custom template with category tagging
- Custom templates persist locally

**Document Sizes**
- 6 presets: Square (1080x1080), Portrait 4:5, Story/Reel, Landscape 16:9, LinkedIn/OG, Presentation
- Custom dimensions (320–3840px)

**Programmatic Editor & AI Bridge**
- Full JSON editor with 4 modes: Content, Theme, Assets, Full document
- Live bidirectional sync — edits in JSON reflect instantly in the visual builder and vice versa
- Native LLM compatibility: "Copy Schema" exports the document structure as a clean prompt for AI generation
- Binary data (uploaded images) auto-stripped to metadata placeholders for clean code contexts
- Strict validation with clear error messages, visible even when the editor is minimized

**Export Engine**
- Download all frames as high-res PNGs (2x pixel ratio) bundled in a ZIP
- Merge export: stitch all frames into a single image (horizontal or vertical)
- Handles Google Fonts embedding for offline-accurate renders

### Tech Stack

| Layer | Choice |
|-------|--------|
| Desktop | Tauri v2 (cross-platform: Linux, macOS, Windows) |
| Frontend | Vite + React 19 |
| Language | TypeScript 5 |
| State | Zustand 5 |
| Styling | CSS Modules (no Tailwind — intentional for programmatic design token control) |
| Export | html-to-image, jszip, file-saver |

## Getting Started

**Prerequisites:** Node.js, [Rust toolchain](https://rustup.rs/), and platform-specific deps (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)).

```bash
git clone https://github.com/deepnode-studios/lumvas.git
cd lumvas
npm install
npm run tauri dev
```

## Roadmap

- [x] **Phase 1: The Canvas Engine** — Layouts & Social Carousels
  - [x] JSON schema + rendering engine
  - [x] Theme system, typography, and asset management
  - [x] Flex layout with nested groups and composable backgrounds
  - [x] Live programmatic editor with bidirectional sync
  - [x] High-res PNG & ZIP export
- [ ] **Phase 2: The Document Engine** — Presentations & Multi-format
  - [ ] PDF export and vector rendering
  - [ ] Aspect ratio-aware responsive layouts
  - [ ] Multi-page document architecture
- [ ] **Phase 3: The Motion Engine** — Video & Dynamic Media
  - [ ] Timeline architecture and keyframe JSON schemas
  - [ ] Auto-subtitles and kinetic typography generation
  - [ ] Audio asset ingestion and synchronization
  - [ ] MP4/WebM video compilation and export
- [ ] **Phase 4: Ecosystem & API** — The Open Standard
  - [ ] REST/WebSocket API for programmatic batch rendering
  - [ ] Direct LLM tool-use integration
  - [ ] Cloud workspace and collaborative instances

## Contributing

Lumvas is community-driven. Whether you're refining the schema, building new visual elements, or engineering the upcoming motion features — contributions are welcome. We are building the open-source alternative to legacy media suites, and we need your help.

See [open issues](https://github.com/deepnode-studios/lumvas/issues) or start a discussion.

---

<div align="center">
  <i>Built by the community, for a liberated web.</i>
</div>