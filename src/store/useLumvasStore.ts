import { create } from "zustand";
import type {
  LumvasDocument,
  DocumentSize,
  ThemeNode,
  AssetNode,
  AssetItem,
  ColorToken,
  FontToken,
  BackgroundPreset,
  ContentNode,
  SlideContent,
  SlideElement,
  SlideStyle,
  ElementType,
  VideoContentNode,
  VideoScene,
  SceneElement,
  ElementTiming,
  AudioTrack,
  CaptionTrack,
  CaptionSegment,
  VideoSettings,
} from "@/types/schema";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const DOCUMENT_SIZES: DocumentSize[] = [
  { width: 1080, height: 1080, label: "Square (1080×1080)" },
  { width: 1080, height: 1350, label: "Portrait 4:5 (1080×1350)" },
  { width: 1080, height: 1920, label: "Story / Reel (1080×1920)" },
  { width: 1920, height: 1080, label: "Landscape 16:9 (1920×1080)" },
  { width: 1200, height: 628, label: "LinkedIn / OG (1200×628)" },
  { width: 1600, height: 900, label: "Presentation (1600×900)" },
];

export interface FontOption {
  label: string;
  value: string;
  category: "system" | "google";
}

export const FONT_OPTIONS: FontOption[] = [
  // System / web-safe
  { label: "System UI", value: "system-ui, sans-serif", category: "system" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif", category: "system" },
  { label: "Georgia", value: "Georgia, serif", category: "system" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif", category: "system" },
  { label: "Courier New", value: "'Courier New', Courier, monospace", category: "system" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif", category: "system" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif", category: "system" },
  { label: "Palatino", value: "'Palatino Linotype', Palatino, serif", category: "system" },
  { label: "Menlo", value: "Menlo, monospace", category: "system" },
  // Google Fonts
  { label: "Inter", value: "Inter, sans-serif", category: "google" },
  { label: "Roboto", value: "Roboto, sans-serif", category: "google" },
  { label: "Open Sans", value: "'Open Sans', sans-serif", category: "google" },
  { label: "Lato", value: "Lato, sans-serif", category: "google" },
  { label: "Montserrat", value: "Montserrat, sans-serif", category: "google" },
  { label: "Poppins", value: "Poppins, sans-serif", category: "google" },
  { label: "Raleway", value: "Raleway, sans-serif", category: "google" },
  { label: "Oswald", value: "Oswald, sans-serif", category: "google" },
  { label: "Nunito", value: "Nunito, sans-serif", category: "google" },
  { label: "Playfair Display", value: "'Playfair Display', serif", category: "google" },
  { label: "Merriweather", value: "Merriweather, serif", category: "google" },
  { label: "Lora", value: "Lora, serif", category: "google" },
  { label: "PT Serif", value: "'PT Serif', serif", category: "google" },
  { label: "Source Code Pro", value: "'Source Code Pro', monospace", category: "google" },
  { label: "Fira Code", value: "'Fira Code', monospace", category: "google" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace", category: "google" },
  { label: "DM Sans", value: "'DM Sans', sans-serif", category: "google" },
  { label: "Space Grotesk", value: "'Space Grotesk', sans-serif", category: "google" },
  { label: "Outfit", value: "Outfit, sans-serif", category: "google" },
  { label: "Sora", value: "Sora, sans-serif", category: "google" },
  { label: "Manrope", value: "Manrope, sans-serif", category: "google" },
  { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif", category: "google" },
  { label: "Bitter", value: "Bitter, serif", category: "google" },
  { label: "Crimson Text", value: "'Crimson Text', serif", category: "google" },
  { label: "Libre Baskerville", value: "'Libre Baskerville', serif", category: "google" },
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif", category: "google" },
  { label: "Anton", value: "Anton, sans-serif", category: "google" },
  { label: "Pacifico", value: "Pacifico, cursive", category: "google" },
  { label: "Dancing Script", value: "'Dancing Script', cursive", category: "google" },
  { label: "Caveat", value: "Caveat, cursive", category: "google" },
];

const DEFAULT_FONTS: FontToken[] = [
  { id: "header", label: "Header", value: "Inter, sans-serif" },
  { id: "body", label: "Body", value: "Inter, sans-serif" },
];

const DEFAULT_THEME: ThemeNode = {
  backgroundColor: "#ffffff",
  primaryColor: "#1a1a2e",
  secondaryColor: "#e94560",
  fontFamily: "Inter, sans-serif",
  fonts: DEFAULT_FONTS,
  fontSize: 16,
  fontWeight: 400,
  borderRadius: 12,
  palette: [],
};

/* ─── Slide presets ─── */

export function createTitleSlide(): SlideContent {
  return {
    id: uid(),
    alignItems: "center",
    justifyContent: "center",
    direction: "column",
    padding: 80,
    gap: 24,
    elements: [
      { id: uid(), type: "logo", content: "" },
      {
        id: uid(),
        type: "text",
        content: "Welcome to Lumvas",
        fontSize: 72,
        fontWeight: 800,
        textAlign: "center",
        letterSpacing: -1.5,
        lineHeight: 1.1,
      },
      {
        id: uid(),
        type: "text",
        content: "Build beautiful carousels from JSON",
        fontSize: 28,
        color: "secondary",
        textAlign: "center",
        lineHeight: 1.4,
      },
    ],
  };
}

export function createTextSlide(): SlideContent {
  return {
    id: uid(),
    alignItems: "flex-start",
    justifyContent: "center",
    direction: "column",
    padding: 80,
    gap: 20,
    elements: [
      { id: uid(), type: "logo", content: "", maxWidth: "100px" },
      {
        id: uid(),
        type: "text",
        content: "Heading",
        fontSize: 52,
        fontWeight: 700,
        letterSpacing: -1,
        lineHeight: 1.15,
      },
      {
        id: uid(),
        type: "text",
        content: "Body text goes here.",
        fontSize: 22,
        opacity: 0.75,
        lineHeight: 1.6,
      },
    ],
  };
}

export function createBlankSlide(): SlideContent {
  return {
    id: uid(),
    alignItems: "center",
    justifyContent: "center",
    direction: "column",
    padding: 80,
    gap: 24,
    elements: [],
  };
}

export const SLIDE_PRESETS: { label: string; factory: () => SlideContent }[] = [
  { label: "Title Slide", factory: createTitleSlide },
  { label: "Text Slide", factory: createTextSlide },
  { label: "Blank Slide", factory: createBlankSlide },
];

/* ─── Element presets ─── */

export function createElement(type: ElementType): SlideElement {
  switch (type) {
    case "text":
      return { id: uid(), type: "text", content: "Text", fontSize: 24, lineHeight: 1.5 };
    case "image":
      return {
        id: uid(),
        type: "image",
        content: "",
        width: "100%",
        height: "400px",
        objectFit: "cover",
        borderRadius: 12,
      };
    case "button":
      return {
        id: uid(),
        type: "button",
        content: "Click me",
        fontSize: 24,
        fontWeight: 700,
        paddingX: 56,
        paddingY: 20,
        borderRadius: 12,
      };
    case "list":
      return {
        id: uid(),
        type: "list",
        content: "First item\nSecond item\nThird item",
        fontSize: 26,
        lineHeight: 1.5,
      };
    case "divider":
      return {
        id: uid(),
        type: "divider",
        content: "",
        maxWidth: "100%",
        opacity: 0.15,
        marginTop: 8,
        marginBottom: 8,
      };
    case "spacer":
      return { id: uid(), type: "spacer", content: "", height: "40px" };
    case "logo":
      return { id: uid(), type: "logo", content: "", maxWidth: "120px" };
    case "icon":
      return {
        id: uid(),
        type: "icon",
        content: "",
        iconLibrary: "lucide",
        iconName: "Star",
        iconSize: 48,
        color: "primary",
      };
    case "group":
      return {
        id: uid(),
        type: "group",
        content: "",
        direction: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 0,
        children: [],
      };
    case "chart":
      return {
        id: uid(),
        type: "chart",
        content: "",
        chartType: "bar",
        chartData: [
          { label: "Category A", value: 75, color: "primary" },
          { label: "Category B", value: 50, color: "secondary" },
          { label: "Category C", value: 90 },
        ],
        showLabels: true,
        showValues: true,
        width: "100%",
        maxWidth: "100%",
        fontSize: 14,
      };
  }
}

/* ─── Recursive element helpers ─── */

/** Find an element anywhere in the tree, returning it and its parent array */
function findElementDeep(
  elements: SlideElement[],
  id: string
): SlideElement | undefined {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.children) {
      const found = findElementDeep(el.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Update an element anywhere in the tree */
function updateElementDeep(
  elements: SlideElement[],
  id: string,
  patch: Partial<SlideElement>
): SlideElement[] {
  return elements.map((el) => {
    if (el.id === id) return { ...el, ...patch };
    if (el.children) {
      return { ...el, children: updateElementDeep(el.children, id, patch) };
    }
    return el;
  });
}

/** Remove an element anywhere in the tree */
function removeElementDeep(
  elements: SlideElement[],
  id: string
): SlideElement[] {
  return elements
    .filter((el) => el.id !== id)
    .map((el) => {
      if (el.children) {
        return { ...el, children: removeElementDeep(el.children, id) };
      }
      return el;
    });
}

/** Add an element to a specific parent group, or top-level if parentId is null */
function addElementDeep(
  elements: SlideElement[],
  parentId: string | null,
  newEl: SlideElement
): SlideElement[] {
  if (!parentId) return [...elements, newEl];
  return elements.map((el) => {
    if (el.id === parentId && el.type === "group") {
      return { ...el, children: [...(el.children ?? []), newEl] };
    }
    if (el.children) {
      return { ...el, children: addElementDeep(el.children, parentId, newEl) };
    }
    return el;
  });
}

/** Reorder elements within a parent (top-level if parentId is null) */
function reorderElementsDeep(
  elements: SlideElement[],
  parentId: string | null,
  from: number,
  to: number
): SlideElement[] {
  if (!parentId) {
    const arr = [...elements];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    return arr;
  }
  return elements.map((el) => {
    if (el.id === parentId && el.children) {
      const arr = [...el.children];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { ...el, children: arr };
    }
    if (el.children) {
      return { ...el, children: reorderElementsDeep(el.children, parentId, from, to) };
    }
    return el;
  });
}

/** Find parent ID of a given element, or null if top-level */
function findParentId(
  elements: SlideElement[],
  targetId: string
): string | null {
  for (const el of elements) {
    if (el.children) {
      if (el.children.some((c) => c.id === targetId)) return el.id;
      const found = findParentId(el.children, targetId);
      if (found !== null) return found;
    }
  }
  return null;
}

/** Remove an element from the tree and return it along with the modified tree */
function extractElement(
  elements: SlideElement[],
  id: string
): { tree: SlideElement[]; extracted: SlideElement | null } {
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].id === id) {
      const extracted = elements[i];
      const tree = [...elements.slice(0, i), ...elements.slice(i + 1)];
      return { tree, extracted };
    }
  }
  // Search inside children
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].children) {
      const result = extractElement(elements[i].children!, id);
      if (result.extracted) {
        const updated = [...elements];
        updated[i] = { ...updated[i], children: result.tree };
        return { tree: updated, extracted: result.extracted };
      }
    }
  }
  return { tree: elements, extracted: null };
}

/* ─── Scene element deep helpers (SceneElement has children?: SceneElement[]) ─── */

/** Find a scene element anywhere in the tree */
export function findSceneElementDeep(elements: SceneElement[], id: string): SceneElement | null {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.children) {
      const found = findSceneElementDeep(el.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Update a scene element anywhere in the tree */
function updateSceneElementDeep(elements: SceneElement[], id: string, patch: Partial<SceneElement>): SceneElement[] {
  return elements.map((el) => {
    if (el.id === id) return { ...el, ...patch };
    if (el.children) return { ...el, children: updateSceneElementDeep(el.children, id, patch) };
    return el;
  });
}

/** Remove a scene element anywhere in the tree */
function removeSceneElementDeep(elements: SceneElement[], id: string): SceneElement[] {
  return elements
    .filter((el) => el.id !== id)
    .map((el) => {
      if (el.children) return { ...el, children: removeSceneElementDeep(el.children, id) };
      return el;
    });
}

/** Update element timing anywhere in the tree */
function updateSceneTimingDeep(elements: SceneElement[], id: string, timing: Partial<ElementTiming>): SceneElement[] {
  return elements.map((el) => {
    if (el.id === id) return { ...el, timing: { ...el.timing, ...timing } };
    if (el.children) return { ...el, children: updateSceneTimingDeep(el.children, id, timing) };
    return el;
  });
}

/** Add a scene element into a group (or top-level if groupId is null) */
function addSceneElementToGroup(elements: SceneElement[], groupId: string | null, newEl: SceneElement): SceneElement[] {
  if (!groupId) return [...elements, newEl];
  return elements.map((el) => {
    if (el.id === groupId && el.type === "group") {
      return { ...el, children: [...(el.children as SceneElement[] ?? []), newEl] };
    }
    if (el.children) return { ...el, children: addSceneElementToGroup(el.children, groupId, newEl) };
    return el;
  });
}

/** Extract a scene element from the tree (remove + return it) */
function extractSceneElement(elements: SceneElement[], id: string): { tree: SceneElement[]; extracted: SceneElement | null } {
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].id === id) {
      return { tree: [...elements.slice(0, i), ...elements.slice(i + 1)], extracted: elements[i] };
    }
  }
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].children) {
      const result = extractSceneElement(elements[i].children!, id);
      if (result.extracted) {
        const updated = [...elements];
        updated[i] = { ...updated[i], children: result.tree };
        return { tree: updated, extracted: result.extracted };
      }
    }
  }
  return { tree: elements, extracted: null };
}

/** Collect all elements recursively (for flat iteration) */
export function flattenSceneElements(elements: SceneElement[]): SceneElement[] {
  const result: SceneElement[] = [];
  for (const el of elements) {
    result.push(el);
    if (el.children) result.push(...flattenSceneElements(el.children));
  }
  return result;
}

/** Insert an element at a specific index within a parent (null = top-level) */
function insertElement(
  elements: SlideElement[],
  parentId: string | null,
  el: SlideElement,
  index: number
): SlideElement[] {
  if (!parentId) {
    const arr = [...elements];
    arr.splice(index, 0, el);
    return arr;
  }
  return elements.map((item) => {
    if (item.id === parentId && item.type === "group") {
      const children = [...(item.children ?? [])];
      children.splice(index, 0, el);
      return { ...item, children };
    }
    if (item.children) {
      return { ...item, children: insertElement(item.children, parentId, el, index) };
    }
    return item;
  });
}

/** Get the array that contains the given element, and its index */
function getElementContext(
  elements: SlideElement[],
  targetId: string
): { parent: SlideElement[] | null; index: number; parentId: string | null } | null {
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].id === targetId) {
      return { parent: elements, index: i, parentId: null };
    }
  }
  for (const el of elements) {
    if (el.children) {
      for (let i = 0; i < el.children.length; i++) {
        if (el.children[i].id === targetId) {
          return { parent: el.children, index: i, parentId: el.id };
        }
      }
      const found = getElementContext(el.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

/* ─── Default document ─── */

import defaultDocJson from "@/data/defaultDocument.json";

export const DEFAULT_DOC: LumvasDocument = defaultDocJson as unknown as LumvasDocument;

export const EMPTY_DOC: LumvasDocument = {
  contentType: "slides",
  documentSize: DOCUMENT_SIZES[0],
  language: "en",
  assets: { items: [] },
  theme: DEFAULT_THEME,
  content: { slides: [createBlankSlide()] },
};

/* ─── Store ─── */

/* ─── Undo / Redo history ─── */

interface DocSnapshot {
  documentSize: DocumentSize;
  assets: AssetNode;
  theme: ThemeNode;
  contentType?: "slides" | "video";
  content: ContentNode | VideoContentNode;
}

const MAX_HISTORY = 50;
const undoStack: DocSnapshot[] = [];
const redoStack: DocSnapshot[] = [];

function takeSnapshot(s: DocSnapshot) {
  undoStack.push(structuredClone({
    documentSize: s.documentSize,
    assets: s.assets,
    theme: s.theme,
    contentType: s.contentType,
    content: s.content,
  }));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0; // clear redo on new action
}

interface LumvasStore {
  // Document fields (covers both slide and video documents)
  documentSize: DocumentSize;
  language?: string;
  assets: AssetNode;
  theme: ThemeNode;
  contentType?: "slides" | "video";
  content: ContentNode | VideoContentNode;

  setDocumentSize: (size: DocumentSize) => void;
  setLanguage: (lang: string) => void;
  updateTheme: (patch: Partial<ThemeNode>) => void;

  // Assets
  addAsset: (asset: AssetItem) => void;
  updateAsset: (id: string, patch: Partial<AssetItem>) => void;
  removeAsset: (id: string) => void;

  // Palette
  addPaletteColor: (color: ColorToken) => void;
  updatePaletteColor: (id: string, patch: Partial<ColorToken>) => void;
  removePaletteColor: (id: string) => void;

  // Fonts
  addFont: (font: FontToken) => void;
  updateFont: (id: string, patch: Partial<FontToken>) => void;
  removeFont: (id: string) => void;

  // Background presets
  addBackgroundPreset: (preset: BackgroundPreset) => void;
  updateBackgroundPreset: (id: string, patch: Partial<BackgroundPreset>) => void;
  removeBackgroundPreset: (id: string) => void;
  resolveSlideStyle: (slide: SlideContent) => SlideStyle | undefined;

  // Slides
  addSlide: (slide?: SlideContent) => void;
  updateSlide: (id: string, patch: Partial<SlideContent>) => void;
  removeSlide: (id: string) => void;
  reorderSlides: (from: number, to: number) => void;

  // Elements
  addElement: (slideId: string, element: SlideElement, parentId?: string | null) => void;
  updateElement: (slideId: string, elementId: string, patch: Partial<SlideElement>) => void;
  removeElement: (slideId: string, elementId: string) => void;
  reorderElements: (slideId: string, from: number, to: number, parentId?: string | null) => void;
  moveElement: (slideId: string, elementId: string, targetParentId: string | null, targetIndex: number) => void;
  findElementParentId: (slideId: string, elementId: string) => string | null;

  // ── Video mode: Scenes ──
  addScene: (scene?: VideoScene) => void;
  updateScene: (id: string, patch: Partial<VideoScene>) => void;
  removeScene: (id: string) => void;
  reorderScenes: (from: number, to: number) => void;

  // Video mode: Scene elements
  addSceneElement: (sceneId: string, element: SceneElement) => void;
  updateSceneElement: (sceneId: string, elementId: string, patch: Partial<SceneElement>) => void;
  removeSceneElement: (sceneId: string, elementId: string) => void;
  reorderSceneElements: (sceneId: string, from: number, to: number) => void;
  updateElementTiming: (sceneId: string, elementId: string, timing: Partial<ElementTiming>) => void;
  addSceneElementToGroup: (sceneId: string, groupId: string | null, element: SceneElement) => void;
  moveSceneElementToGroup: (sceneId: string, elementId: string, targetGroupId: string | null) => void;

  // Video mode: Audio tracks
  addAudioTrack: (track: AudioTrack) => void;
  updateAudioTrack: (id: string, patch: Partial<AudioTrack>) => void;
  removeAudioTrack: (id: string) => void;

  // Video mode: Caption tracks
  addCaptionTrack: (track: CaptionTrack) => void;
  updateCaptionTrack: (id: string, patch: Partial<CaptionTrack>) => void;
  removeCaptionTrack: (id: string) => void;
  setCaptionSegments: (trackId: string, segments: CaptionSegment[]) => void;

  // Video mode: Settings
  updateVideoSettings: (patch: Partial<VideoSettings>) => void;

  // LLM bridge
  getDocument: () => LumvasDocument;
  importDocument: (doc: LumvasDocument) => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Selection
  activeSlideId: string | null;
  setActiveSlide: (id: string | null) => void;
  activeSceneId: string | null;
  setActiveScene: (id: string | null) => void;
  activeElementId: string | null;
  setActiveElement: (id: string | null) => void;
}

/** Helper: access slide content (safe for slide mode) */
function getSlideContent(state: { content: ContentNode | VideoContentNode }): ContentNode {
  return state.content as ContentNode;
}

/** Typed selector: use in components to get slide content */
export function selectSlideContent(state: LumvasStore): ContentNode {
  return state.content as ContentNode;
}

/** Typed selector: use in components to get video content */
export function selectVideoContent(state: LumvasStore): VideoContentNode {
  return state.content as VideoContentNode;
}

export const useLumvasStore = create<LumvasStore>((_set, get) => {
  // Wrap set to auto-snapshot before each mutation
  let _skipSnapshot = false;
  const set: typeof _set = (partial, replace?) => {
    if (!_skipSnapshot) {
      try { takeSnapshot(get()); } catch { /* never block state updates */ }
    }
    (_set as Function)(partial, replace);
  };

  return {
  ...DEFAULT_DOC,
  activeSlideId: getSlideContent(DEFAULT_DOC).slides[0]?.id ?? null,
  activeSceneId: null,
  activeElementId: null,

  setDocumentSize: (size) => set({ documentSize: size }),
  setLanguage: (lang) => set({ language: lang }),

  updateTheme: (patch) =>
    set((s) => ({ theme: { ...s.theme, ...patch } })),

  // ── Assets ──

  addAsset: (asset) =>
    set((s) => ({
      assets: { ...s.assets, items: [...s.assets.items, asset] },
    })),

  updateAsset: (id, patch) =>
    set((s) => ({
      assets: {
        ...s.assets,
        items: s.assets.items.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      },
    })),

  removeAsset: (id) =>
    set((s) => ({
      assets: {
        ...s.assets,
        items: s.assets.items.filter((a) => a.id !== id),
      },
    })),

  // ── Palette ──

  addPaletteColor: (color) =>
    set((s) => ({
      theme: { ...s.theme, palette: [...s.theme.palette, color] },
    })),

  updatePaletteColor: (id, patch) =>
    set((s) => ({
      theme: {
        ...s.theme,
        palette: s.theme.palette.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    })),

  removePaletteColor: (id) =>
    set((s) => ({
      theme: {
        ...s.theme,
        palette: s.theme.palette.filter((c) => c.id !== id),
      },
    })),

  // ── Fonts ──

  addFont: (font) =>
    set((s) => ({
      theme: { ...s.theme, fonts: [...s.theme.fonts, font] },
    })),

  updateFont: (id, patch) =>
    set((s) => {
      const fonts = s.theme.fonts.map((f) => (f.id === id ? { ...f, ...patch } : f));
      // Keep fontFamily in sync with the "body" font
      const bodyFont = fonts.find((f) => f.id === "body");
      return {
        theme: {
          ...s.theme,
          fonts,
          fontFamily: bodyFont?.value ?? s.theme.fontFamily,
        },
      };
    }),

  removeFont: (id) =>
    set((s) => ({
      theme: {
        ...s.theme,
        fonts: s.theme.fonts.filter((f) => f.id !== id),
      },
    })),

  // ── Background presets ──

  addBackgroundPreset: (preset) =>
    set((s) => ({
      theme: {
        ...s.theme,
        backgroundPresets: [...(s.theme.backgroundPresets ?? []), preset],
      },
    })),

  updateBackgroundPreset: (id, patch) =>
    set((s) => ({
      theme: {
        ...s.theme,
        backgroundPresets: (s.theme.backgroundPresets ?? []).map((p) =>
          p.id === id ? { ...p, ...patch } : p
        ),
      },
    })),

  removeBackgroundPreset: (id) =>
    set((s) => ({
      theme: {
        ...s.theme,
        backgroundPresets: (s.theme.backgroundPresets ?? []).filter(
          (p) => p.id !== id
        ),
      },
    })),

  resolveSlideStyle: (slide) => {
    const ss = slide.style;
    if (!ss) return undefined;
    if (!ss.backgroundPresetId) return ss;
    const preset = (get().theme.backgroundPresets ?? []).find(
      (p) => p.id === ss.backgroundPresetId
    );
    if (!preset) return ss;
    // Preset provides defaults, slide-level fields override
    const { backgroundPresetId: _, ...slideOverrides } = ss;
    const merged: SlideStyle = { ...preset.style };
    for (const [key, val] of Object.entries(slideOverrides)) {
      if (val !== undefined) {
        (merged as Record<string, unknown>)[key] = val;
      }
    }
    return merged;
  },

  // ── Slides ──

  addSlide: (slide) => {
    const s = slide ?? createTextSlide();
    set((st) => ({
      content: { slides: [...getSlideContent(st).slides, s] },
      activeSlideId: s.id,
      activeElementId: null,
    }));
  },

  updateSlide: (id, patch) =>
    set((s) => ({
      content: {
        slides: getSlideContent(s).slides.map((sl) =>
          sl.id === id ? { ...sl, ...patch } : sl
        ),
      },
    })),

  removeSlide: (id) =>
    set((s) => {
      const slides = getSlideContent(s).slides.filter((sl) => sl.id !== id);
      return {
        content: { slides },
        activeSlideId:
          s.activeSlideId === id ? (slides[0]?.id ?? null) : s.activeSlideId,
        activeElementId: s.activeSlideId === id ? null : s.activeElementId,
      };
    }),

  reorderSlides: (from, to) =>
    set((s) => {
      const slides = [...getSlideContent(s).slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);
      return { content: { slides } };
    }),

  // ── Elements ──

  addElement: (slideId, element, parentId) =>
    set((s) => ({
      content: {
        slides: getSlideContent(s).slides.map((sl) =>
          sl.id === slideId
            ? { ...sl, elements: addElementDeep(sl.elements, parentId ?? null, element) }
            : sl
        ),
      },
      activeElementId: element.id,
    })),

  updateElement: (slideId, elementId, patch) =>
    set((s) => ({
      content: {
        slides: getSlideContent(s).slides.map((sl) =>
          sl.id === slideId
            ? { ...sl, elements: updateElementDeep(sl.elements, elementId, patch) }
            : sl
        ),
      },
    })),

  removeElement: (slideId, elementId) =>
    set((s) => ({
      content: {
        slides: getSlideContent(s).slides.map((sl) =>
          sl.id === slideId
            ? { ...sl, elements: removeElementDeep(sl.elements, elementId) }
            : sl
        ),
      },
      activeElementId:
        s.activeElementId === elementId ? null : s.activeElementId,
    })),

  reorderElements: (slideId, from, to, parentId) =>
    set((s) => ({
      content: {
        slides: getSlideContent(s).slides.map((sl) => {
          if (sl.id !== slideId) return sl;
          return { ...sl, elements: reorderElementsDeep(sl.elements, parentId ?? null, from, to) };
        }),
      },
    })),

  moveElement: (slideId, elementId, targetParentId, targetIndex) =>
    set((s) => ({
      content: {
        slides: getSlideContent(s).slides.map((sl) => {
          if (sl.id !== slideId) return sl;
          // Extract the element from its current position
          const { tree, extracted } = extractElement(sl.elements, elementId);
          if (!extracted) return sl;
          // Insert at the new position
          return { ...sl, elements: insertElement(tree, targetParentId, extracted, targetIndex) };
        }),
      },
    })),

  findElementParentId: (slideId, elementId) => {
    const slide = getSlideContent(get()).slides.find((s) => s.id === slideId);
    if (!slide) return null;
    return findParentId(slide.elements, elementId);
  },

  // ── Video mode: Scenes ──

  addScene: (scene) => {
    const s = scene ?? {
      id: uid(),
      durationMs: 5000,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      direction: "column" as const,
      padding: 80,
      gap: 24,
      elements: [],
    };
    const vc = get().content as VideoContentNode;
    set({ content: { ...vc, scenes: [...vc.scenes, s] } });
  },

  updateScene: (id, patch) => {
    const vc = get().content as VideoContentNode;
    set({ content: { ...vc, scenes: vc.scenes.map((sc) => sc.id === id ? { ...sc, ...patch } : sc) } });
  },

  removeScene: (id) => {
    const vc = get().content as VideoContentNode;
    set({ content: { ...vc, scenes: vc.scenes.filter((sc) => sc.id !== id) } });
  },

  reorderScenes: (from, to) => {
    const vc = get().content as VideoContentNode;
    const scenes = [...vc.scenes];
    const [moved] = scenes.splice(from, 1);
    scenes.splice(to, 0, moved);
    set({ content: { ...vc, scenes } });
  },

  // Video mode: Scene elements

  addSceneElement: (sceneId, element) => {
    const vc = get().content as VideoContentNode;
    set({
      content: {
        ...vc,
        scenes: vc.scenes.map((sc) =>
          sc.id === sceneId ? { ...sc, elements: [...sc.elements, element] } : sc,
        ),
      },
    });
  },

  updateSceneElement: (sceneId, elementId, patch) => {
    const vc = get().content as VideoContentNode;
    set({
      content: {
        ...vc,
        scenes: vc.scenes.map((sc) =>
          sc.id === sceneId
            ? { ...sc, elements: updateSceneElementDeep(sc.elements, elementId, patch) }
            : sc,
        ),
      },
    });
  },

  removeSceneElement: (sceneId, elementId) => {
    const vc = get().content as VideoContentNode;
    set({
      content: {
        ...vc,
        scenes: vc.scenes.map((sc) =>
          sc.id === sceneId ? { ...sc, elements: removeSceneElementDeep(sc.elements, elementId) } : sc,
        ),
      },
    });
  },

  reorderSceneElements: (sceneId, from, to) => {
    const vc = get().content as VideoContentNode;
    set({
      content: {
        ...vc,
        scenes: vc.scenes.map((sc) => {
          if (sc.id !== sceneId) return sc;
          const elements = [...sc.elements];
          const [moved] = elements.splice(from, 1);
          elements.splice(to, 0, moved);
          return { ...sc, elements };
        }),
      },
    });
  },

  updateElementTiming: (sceneId, elementId, timing) => {
    const vc = get().content as VideoContentNode;
    set({
      content: {
        ...vc,
        scenes: vc.scenes.map((sc) =>
          sc.id === sceneId
            ? { ...sc, elements: updateSceneTimingDeep(sc.elements, elementId, timing) }
            : sc,
        ),
      },
    });
  },

  addSceneElementToGroup: (sceneId, groupId, element) => {
    const vc = get().content as VideoContentNode;
    set({
      content: {
        ...vc,
        scenes: vc.scenes.map((sc) =>
          sc.id === sceneId
            ? { ...sc, elements: addSceneElementToGroup(sc.elements, groupId, element) }
            : sc,
        ),
      },
    });
  },

  moveSceneElementToGroup: (sceneId, elementId, targetGroupId) => {
    const vc = get().content as VideoContentNode;
    const scene = vc.scenes.find((sc) => sc.id === sceneId);
    if (!scene) return;
    const { tree, extracted } = extractSceneElement(scene.elements, elementId);
    if (!extracted) return;
    const newElements = addSceneElementToGroup(tree, targetGroupId, extracted);
    set({
      content: {
        ...vc,
        scenes: vc.scenes.map((sc) => sc.id === sceneId ? { ...sc, elements: newElements } : sc),
      },
    });
  },

  // Video mode: Audio tracks

  addAudioTrack: (track) => {
    const vc = get().content as VideoContentNode;
    set({ content: { ...vc, audioTracks: [...vc.audioTracks, track] } });
  },

  updateAudioTrack: (id, patch) => {
    const vc = get().content as VideoContentNode;
    set({ content: { ...vc, audioTracks: vc.audioTracks.map((t) => t.id === id ? { ...t, ...patch } : t) } });
  },

  removeAudioTrack: (id) => {
    const vc = get().content as VideoContentNode;
    set({ content: { ...vc, audioTracks: vc.audioTracks.filter((t) => t.id !== id) } });
  },

  // Video mode: Caption tracks

  addCaptionTrack: (track) => {
    const vc = get().content as VideoContentNode;
    set({ content: { ...vc, captionTracks: [...vc.captionTracks, track] } });
  },

  updateCaptionTrack: (id, patch) => {
    const vc = get().content as VideoContentNode;
    set({ content: { ...vc, captionTracks: vc.captionTracks.map((t) => t.id === id ? { ...t, ...patch } : t) } });
  },

  removeCaptionTrack: (id) => {
    const vc = get().content as VideoContentNode;
    set({ content: { ...vc, captionTracks: vc.captionTracks.filter((t) => t.id !== id) } });
  },

  setCaptionSegments: (trackId, segments) => {
    const vc = get().content as VideoContentNode;
    set({
      content: {
        ...vc,
        captionTracks: vc.captionTracks.map((t) => t.id === trackId ? { ...t, segments } : t),
      },
    });
  },

  // Video mode: Settings

  updateVideoSettings: (patch) => {
    const vc = get().content as VideoContentNode;
    set({ content: { ...vc, settings: { ...vc.settings, ...patch } } });
  },

  // ── LLM bridge ──

  getDocument: () => {
    const { documentSize, language, assets, theme, contentType, content } = get();
    return { documentSize, language, assets, theme, contentType, content } as LumvasDocument;
  },

  importDocument: (doc) => {
    const isVideo = doc.contentType === "video";

    // Skip undo snapshot — importDocument is called on every debounced keystroke
    // in the JSON editor, which would flood the undo stack with intermediate states.
    _skipSnapshot = true;

    if (isVideo) {
      // Video document: import as-is
      _set({
        documentSize: doc.documentSize ?? DOCUMENT_SIZES[0],
        language: doc.language ?? "en",
        assets: doc.assets,
        contentType: "video",
        theme: { ...DEFAULT_THEME, ...doc.theme, palette: doc.theme.palette ?? [], fonts: doc.theme.fonts ?? DEFAULT_FONTS, backgroundPresets: doc.theme.backgroundPresets ?? [] },
        content: doc.content,
        activeSlideId: null,
        activeElementId: null,
      });
    } else {
      // Slide document: normalize elements
      const normalizeElements = (els: SlideElement[]): SlideElement[] =>
        els.map((el) => {
          if (el.type === "group") {
            const raw = el as SlideElement & { elements?: SlideElement[] };
            const kids = raw.children ?? raw.elements ?? [];
            delete raw.elements;
            return { ...el, children: normalizeElements(kids) };
          }
          if (el.type === "chart") {
            const raw = el as SlideElement & { data?: SlideElement["chartData"] };
            const chartData = el.chartData ?? raw.data ?? [];
            delete raw.data;
            return { ...el, chartData: Array.isArray(chartData) ? chartData : [] };
          }
          return el;
        });
      const content: ContentNode = {
        slides: getSlideContent(doc).slides.map((sl) => ({
          ...sl,
          elements: normalizeElements(sl.elements),
        })),
      };
      _set({
        documentSize: doc.documentSize ?? DOCUMENT_SIZES[0],
        language: doc.language ?? "en",
        assets: doc.assets,
        contentType: "slides",
        theme: { ...DEFAULT_THEME, ...doc.theme, palette: doc.theme.palette ?? [], fonts: doc.theme.fonts ?? DEFAULT_FONTS, backgroundPresets: doc.theme.backgroundPresets ?? [] },
        content,
        activeSlideId: content.slides[0]?.id ?? null,
        activeElementId: null,
      });
    }

    _skipSnapshot = false;
  },

  // ── Undo / Redo ──

  undo: () => {
    const snapshot = undoStack.pop();
    if (!snapshot) return;
    // Save current state to redo
    redoStack.push(structuredClone({
      documentSize: get().documentSize,
      assets: get().assets,
      theme: get().theme,
      contentType: get().contentType,
      content: get().content,
    }));
    _skipSnapshot = true;
    const isVideoSnap = snapshot.contentType === "video";
    _set({
      ...snapshot,
      activeSlideId: isVideoSnap ? null : getSlideContent(snapshot).slides[0]?.id ?? null,
      activeElementId: null,
    });
    _skipSnapshot = false;
  },

  redo: () => {
    const snapshot = redoStack.pop();
    if (!snapshot) return;
    // Save current state to undo
    undoStack.push(structuredClone({
      documentSize: get().documentSize,
      assets: get().assets,
      theme: get().theme,
      contentType: get().contentType,
      content: get().content,
    }));
    _skipSnapshot = true;
    const isVideoSnap = snapshot.contentType === "video";
    _set({
      ...snapshot,
      activeSlideId: isVideoSnap ? null : getSlideContent(snapshot).slides[0]?.id ?? null,
      activeElementId: null,
    });
    _skipSnapshot = false;
  },

  canUndo: () => undoStack.length > 0,
  canRedo: () => redoStack.length > 0,

  setActiveSlide: (id) => { _skipSnapshot = true; _set({ activeSlideId: id, activeElementId: null }); _skipSnapshot = false; },
  setActiveScene: (id) => { _skipSnapshot = true; _set({ activeSceneId: id, activeElementId: null }); _skipSnapshot = false; },
  setActiveElement: (id) => { _skipSnapshot = true; _set({ activeElementId: id }); _skipSnapshot = false; },
};
});
