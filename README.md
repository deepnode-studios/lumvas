<div align="center">
  <h1>Jsonvas</h1>
  <p><b>The standard translation layer between LLM intent and structured visual design.</b></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js_15-black?logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React_19-blue?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
</div>

---

## What is Jsonvas?

LLMs are great at generating structured data but can't directly render polished, brand-aligned visuals. **Jsonvas** bridges that gap — it's an open-source rendering engine and visual builder that takes a strict JSON schema (from an AI or a human) and turns it into pixel-perfect, exportable visual documents.

It's not another UI kit. It's a **common protocol for agents to build, modify, and iterate on visual content**.

## Current State

Jsonvas is in active development. The first domain — **Social Media Carousels** — is fully functional and covers everything needed to design, edit, and export multi-slide carousel posts.

### What works today

**9 Element Types**
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

**Backgrounds**
- Solid colors and CSS gradients (linear, radial)
- 8 procedural patterns (dots, grid, lines, diagonal, crosshatch, waves, checkerboard) with color, opacity, and scale controls
- Background images from assets (cover, contain, repeat) with positioning
- Color overlays with opacity
- All composable — gradient + pattern + overlay on the same slide

**Layout**
- Slide-level flex layout: direction, alignment, justification, padding, gap
- Per-element flex-grow, flex-shrink, alignSelf
- Nested groups with independent flex configuration
- Element margins (top/bottom)

**Asset Management**
- Upload images and logos as base64 data URIs
- Label, describe, and tag assets as "tintable" for color masking
- Reuse assets across any slide via asset ID references

**Icon Library**
- 100+ curated SVG icons rendered inline (no external fonts or CDNs)
- Categories: general, arrows, social (Instagram, X, LinkedIn, YouTube, TikTok, GitHub, etc.), media, communication, commerce, content, status, shapes
- Configurable size, color (token or hex), stroke width, opacity
- Searchable icon picker with category filters

**Templates**
- 15 built-in slide templates across 8 categories (title, content, quote, CTA, stats, image, comparison, blank)
- Save any slide as a custom template with category tagging
- Custom templates persist in localStorage

**Document Sizes**
- 6 presets: Square (1080x1080), Portrait 4:5, Story/Reel, Landscape 16:9, LinkedIn/OG, Presentation
- Custom dimensions (320–3840px)

**LLM Bridge**
- Full JSON editor with 4 modes: Content, Theme, Assets, Full document
- Live bidirectional sync — edits in JSON reflect instantly in the visual builder and vice versa
- "Copy for LLM" exports the document + full schema reference as a prompt
- Binary data (uploaded images) auto-stripped to metadata placeholders for LLM context
- Validation with clear error messages, visible even when the editor is minimized

**Export**
- Download all slides as high-res PNGs (2x pixel ratio) bundled in a ZIP
- Handles Google Fonts embedding for offline-accurate renders

### Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 |
| Language | TypeScript 5 |
| State | Zustand 5 |
| Styling | CSS Modules (no Tailwind — intentional for programmatic design token control) |
| Export | html-to-image, jszip, file-saver |

## Getting Started

```bash
git clone https://github.com/user/jsonvas.git
cd jsonvas
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Roadmap

- [x] **Phase 1** — Social Media Carousels
  - [x] JSON schema + rendering engine
  - [x] Theme system (colors, fonts, palette tokens)
  - [x] Asset management with tintable logos
  - [x] 9 element types (text, image, button, list, divider, spacer, logo, icon, group)
  - [x] Background system (gradients, patterns, images, overlays, presets)
  - [x] Flex layout with nested groups
  - [x] Built-in icon library (100+ icons, 9 categories)
  - [x] Slide templates (15 built-in + custom)
  - [x] LLM bridge (JSON editor, copy-for-LLM, import/export)
  - [x] PNG export (ZIP bundle, 2x resolution)
- [ ] **Phase 2** — Presentation Slides & Multi-format Export
  - [ ] PDF export
  - [ ] Slide transitions and speaker notes
  - [ ] Aspect ratio-aware responsive layouts
- [ ] **Phase 3** — Interactive Web Pages & Reports
  - [ ] Clickable elements and navigation
  - [ ] Data-bound components (charts, tables)
  - [ ] Multi-page documents
- [ ] **Phase 4** — Agent API
  - [ ] REST/WebSocket API for programmatic document generation
  - [ ] Direct LLM tool-use integration
  - [ ] Batch rendering pipeline

## Contributing

Jsonvas is community-driven. Whether you're refining the schema, building new element types, or improving the rendering engine — contributions are welcome.

See [open issues](https://github.com/user/jsonvas/issues) or start a discussion.

---

<div align="center">
  <i>Built by the community, for the generative web.</i>
</div>
