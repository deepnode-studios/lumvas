<div align="center">
  <h1>Lumvas</h1>
  <p><b>The open-source, programmatic media suite. Liberating design, motion, and layout from walled gardens.</b></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Tauri](https://img.shields.io/badge/Tauri_v2-FFC131?logo=tauri&logoColor=black)](https://tauri.app/)
  [![React](https://img.shields.io/badge/React_19-blue?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
  [![Whisper](https://img.shields.io/badge/Whisper-Local_AI-green)](https://github.com/ggerganov/whisper.cpp)
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

Powered by a strict, universal JSON schema, Lumvas acts as a universal rendering engine. It translates structured, programmatic data into pixel-perfect visual layouts, animated video, and motion graphics.

Whether you are a developer automating thousands of assets, an open-source creator looking for a free alternative to legacy design software, or building AI agents that need a native visual output layer, Lumvas provides a common protocol to build, modify, and iterate on multi-format media.

## Two Modes

### Carousel Mode (Static Layouts)
Design and export social media carousels, presentations, and multi-slide documents from structured JSON.

### Video Mode (Motion & Animation)
Create animated explainer videos, social media clips, and motion graphics with a scene-based timeline, audio tracks, and AI-powered captions — think manim meets CapCut.

## Current State

Lumvas is a **standalone cross-platform desktop app** (Linux, macOS, Windows) built with Tauri v2. No browser, no server — runs natively.

### Carousel Mode — What works today

**10 Core Element Types**
| Element | Description |
|---------|-------------|
| Text | Rich text with font, size, weight, style, alignment, spacing, opacity, transforms, and gradient text fills |
| Image | Responsive images with object-fit, border-radius, and sizing |
| Button | Styled buttons with background color/gradient, text color, padding, border-radius |
| List | Bulleted lists with colored dots and full text styling |
| Divider | Horizontal lines with opacity and color control |
| Spacer | Flexible vertical spacing |
| Logo | Asset-based logo with optional color tinting (CSS masking) for monochrome assets |
| Icon | 100+ built-in SVG icons across 9 categories |
| Group | Flex container for nested layouts — columns, icon+text rows, button groups |
| Chart | Bar, donut, and progress charts with labeled data points |

**Theme & Design System**
- Global primary, secondary, and background colors
- Custom color palette with labeled tokens
- Font token system (header, body, custom) with 40+ fonts (system + Google Fonts)
- Background presets: reusable slide backgrounds shared across slides
- Global font size, weight, and border-radius defaults

**Backgrounds & Composition**
- Solid colors and CSS gradients (linear, radial)
- 8 procedural patterns (dots, grid, lines, diagonal, crosshatch, waves, checkerboard)
- Background images from assets (cover, contain, repeat) with positioning
- Color overlays with opacity — all composable on the same canvas

**Layout Architecture**
- Canvas-level flex layout: direction, alignment, justification, padding, gap
- Per-element flex-grow, flex-shrink, alignSelf
- Nested groups with independent flex configuration

**Asset Management**
- Media stored as separate files in the project directory (not embedded)
- Loaded into memory on demand via Tauri's asset protocol
- Label, describe, and tag assets as "tintable" for color masking
- Reuse assets across any frame via asset ID references

**Export**
- Export slides as individual PNGs to a folder (2x resolution)
- Merge export: stitch all slides into a single horizontal or vertical image
- Native file dialogs, auto-opens folder after export
- Remembers last export location across sessions

### Video Mode — What works today

**Scene-Based Timeline**
- Video as a sequence of scenes, each with independent duration and layout
- Scene-level flex layout (same system as carousel slides)
- Add/remove/reorder scenes
- Playback with play/pause/stop/scrub controls

**Element Animations**
- Every element has enter/exit timing within its scene
- 16 animation presets: fade-in/out, slide (4 directions), scale-in/out, drop-in, pop-in, blur-in/out, zoom-in/out, typewriter, wipe
- Configurable duration, delay, and easing per animation
- Easing: linear, ease-in, ease-out, ease-in-out, spring, bounce, custom cubic-bezier
- Keyframe system: animate any property (position, scale, rotation, opacity, blur) over time

**Audio System**
- Import audio files (narration, music, SFX)
- Multi-track audio with per-track volume control
- Track types: narration, music, SFX (color-coded)
- Web Audio API engine for synchronized playback
- Audio mixing via FFmpeg for export

**AI-Powered Captions (Local Whisper)**
- Automatic speech-to-text via whisper.cpp — runs 100% on your hardware, no API keys
- Word-level timestamps with confidence scores
- Model auto-download from Hugging Face (tiny/base/small/medium/large)
- 5 caption styles: default, karaoke (word highlight), word-reveal, bounce, typewriter
- Full appearance control: font, size, color, background, position, highlight color
- Manual editing after generation

**Video Export**
- Frame-by-frame rendering via html-to-image
- Audio mixing via FFmpeg sidecar
- Final encoding to MP4 (H.264) or WebM (VP9)
- Quality presets: draft, standard, high
- FPS: 24, 30, or 60

### Desktop App Features

**File Management**
- Project directory format: `.lumvas/` folder with `project.json` + `media/` subfolder
- Media stored as separate files on disk — never embedded in JSON
- Native menu bar (File, Edit, View, Window, Help) with keyboard shortcuts
- Save (Ctrl+S), Save As, Open, New — all via native OS dialogs
- Dirty state tracking with unsaved changes indicator in title bar
- Auto-save every 30 seconds + on close
- Recent files list with one-click reopen
- Dialog path memory — every dialog starts where you last left off

**View Settings**
- Zoom controls (10%–200%) persisted across sessions
- Single / horizontal / vertical view modes
- Fullscreen toggle

### Tech Stack

| Layer | Choice |
|-------|--------|
| Desktop | Tauri v2 (cross-platform: Linux, macOS, Windows) |
| Frontend | Vite 6 + React 19 |
| Language | TypeScript 5, Rust |
| State | Zustand 5 |
| Styling | CSS Modules |
| Rendering | html-to-image (frame capture) |
| Audio/Video | FFmpeg (sidecar), Web Audio API |
| AI Captions | whisper.cpp via whisper-rs (local, no API key) |
| Model Hosting | Hugging Face Hub (auto-download) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust toolchain](https://rustup.rs/)
- Platform-specific deps (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))

**Linux (Ubuntu/Debian):**
```bash
sudo apt install -y libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
  librsvg2-dev patchelf libclang-dev cmake ffmpeg
```

**macOS:**
```bash
xcode-select --install
brew install cmake ffmpeg
```

**Windows:**
- Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [CMake](https://cmake.org/download/)
- Install [FFmpeg](https://ffmpeg.org/download.html) and add to PATH

### Run

```bash
git clone https://github.com/deepnode-studios/lumvas.git
cd lumvas
npm install
npm run tauri dev
```

First run will:
1. Compile the Rust backend (~2-3 min, includes whisper.cpp)
2. Start the Vite dev server
3. Open the Lumvas desktop window

Whisper model downloads automatically on first caption generation (~150MB for base model).

## Roadmap

- [x] **Phase 1: The Canvas Engine** — Layouts & Social Carousels
  - [x] JSON schema + rendering engine
  - [x] Theme system, typography, and asset management
  - [x] Flex layout with nested groups and composable backgrounds
  - [x] Live programmatic editor with bidirectional sync
  - [x] High-res PNG export to folder
- [x] **Phase 1.5: Desktop App** — Tauri Migration
  - [x] Cross-platform native app (Linux, macOS, Windows)
  - [x] Native menu bar with keyboard shortcuts
  - [x] Project directory format with external media storage
  - [x] File save/load, auto-save, recent files
- [x] **Phase 2: The Motion Engine** — Video & Dynamic Media
  - [x] Scene-based timeline with playback controls
  - [x] Element animation system (16 presets, keyframes, easing)
  - [x] Multi-track audio (narration, music, SFX)
  - [x] AI caption generation via local Whisper (no API key)
  - [x] 5 caption styles (karaoke, word-reveal, bounce, typewriter)
  - [x] FFmpeg-based video export (MP4/WebM)
- [ ] **Phase 3: The Document Engine** — Presentations & Multi-format
  - [ ] PDF export and vector rendering
  - [ ] Aspect ratio-aware responsive layouts
  - [ ] Multi-page document architecture
- [ ] **Phase 4: Ecosystem & API** — The Open Standard
  - [ ] REST/WebSocket API for programmatic batch rendering
  - [ ] Direct LLM tool-use integration
  - [ ] Cloud workspace and collaborative instances

## Known Issues

- **FFmpeg sidecar**: For development, FFmpeg must be installed system-wide. Bundled binaries are used for distribution builds only.
- **Whisper first run**: The first caption generation downloads the model from Hugging Face (~150MB). Requires internet for this one-time download.
- **Asset protocol (Linux)**: Requires `libwebkit2gtk-4.1-dev` for the Tauri asset protocol to serve project media files.
- **libclang**: Required at build time for `whisper-rs` (compiles whisper.cpp from source via bindgen).
- **cmake**: Required at build time for `whisper-rs` C++ compilation.

## Contributing

Lumvas is community-driven. Whether you're refining the schema, building new visual elements, or engineering the motion engine — contributions are welcome. We are building the open-source alternative to legacy media suites, and we need your help.

See [open issues](https://github.com/deepnode-studios/lumvas/issues) or start a discussion.

---

<div align="center">
  <i>Built by the community, for a liberated web.</i>
</div>
