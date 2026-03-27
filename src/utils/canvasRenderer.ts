/**
 * Canvas2D scene renderer — draws scene elements directly to a canvas context.
 * No DOM, no html-to-image, no foreignObject. Pure canvas drawing.
 * Designed for real-time export: each frame renders in <5ms.
 */

import type {
  VideoScene,
  SceneElement,
  ThemeNode,
  AssetItem,
  DocumentSize,
  FlexAlign,
  FlexJustify,
  FlexDirection,
} from "@/types/schema";
import { computeElementStyle } from "@/utils/animation";

/* ─── Image cache ─── */

const imageCache = new Map<string, HTMLImageElement>();

export function preloadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

/** Pre-load all images/logos referenced in a scene */
export async function preloadSceneAssets(
  scene: VideoScene,
  assets: AssetItem[],
  projectDir: string | null | undefined,
): Promise<void> {
  const srcs = new Set<string>();

  function collectFromElement(el: SceneElement) {
    if (el.type === "image" && el.content) {
      srcs.add(resolveMediaSrcLocal(el.content, projectDir));
    }
    if (el.type === "logo") {
      const asset = el.assetId ? assets.find((a) => a.id === el.assetId) : assets[0];
      if (asset?.data) srcs.add(resolveMediaSrcLocal(asset.data, projectDir));
    }
    if (el.children) el.children.forEach(collectFromElement);
  }

  scene.elements.forEach(collectFromElement);

  await Promise.all(
    Array.from(srcs).filter(Boolean).map((src) => preloadImage(src).catch(() => { })),
  );
}

function resolveMediaSrcLocal(ref: string | undefined, projectDir: string | null | undefined): string {
  if (!ref) return "";
  if (ref.startsWith("data:") || ref.startsWith("http") || ref.startsWith("blob:") || ref.startsWith("asset:")) return ref;
  if (projectDir) {
    // Use Tauri's convertFileSrc equivalent — asset:// protocol
    return `asset://localhost/${projectDir}/${ref}`;
  }
  return ref;
}

/* ─── Color resolution ─── */

function resolveColor(token: string | undefined, theme: ThemeNode, scene: VideoScene): string {
  if (!token) return "";
  if (token === "primary") return scene.style?.primaryColor ?? theme.primaryColor;
  if (token === "secondary") return scene.style?.secondaryColor ?? theme.secondaryColor;
  if (token === "background") return scene.style?.backgroundColor ?? theme.backgroundColor;
  const pal = theme.palette?.find((c) => c.id === token);
  if (pal) return pal.value;
  return token;
}

/* ─── Flex layout helper ─── */

interface LayoutBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function measureTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
): number {
  const lh = fontSize * (lineHeight || 1.4);
  const words = text.split(/\s+/);
  let line = "";
  let lines = 1;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    const m = ctx.measureText(test);
    if (m.width > maxWidth && line) {
      lines++;
      line = word;
    } else {
      line = test;
    }
  }
  return lines * lh;
}

function estimateElementSize(
  ctx: CanvasRenderingContext2D,
  el: SceneElement,
  parentWidth: number,
  parentHeight: number,
  theme: ThemeNode,
  assets: AssetItem[],
  projectDir: string | null | undefined,
): { w: number; h: number } {
  const parseSizeW = (s: string | undefined, fallback: number): number => {
    if (!s || s === "auto") return fallback;
    if (s.endsWith("%")) return (parseFloat(s) / 100) * parentWidth;
    if (s.endsWith("px")) return parseFloat(s);
    return parseFloat(s) || fallback;
  };
  const parseSizeH = (s: string | undefined, fallback: number): number => {
    if (!s || s === "auto") return fallback;
    if (s.endsWith("%")) return (parseFloat(s) / 100) * parentHeight;
    if (s.endsWith("px")) return parseFloat(s);
    return parseFloat(s) || fallback;
  };

  // sceneWidth/sceneHeight take priority over width/height for scene elements
  const w = parseSizeW(el.sceneWidth ?? el.width, parentWidth);

  switch (el.type) {
    case "text": {
      const fs = el.fontSize ?? theme.fontSize;
      const lh = el.lineHeight || 1.4;
      ctx.font = `${el.fontWeight ?? theme.fontWeight} ${fs}px ${theme.fontFamily}`;
      const maxW = parseSizeW(el.maxWidth, w);
      const h = measureTextHeight(ctx, el.content || " ", maxW, fs, lh);
      return { w: Math.min(w, maxW), h };
    }
    case "image": {
      const h = parseSizeH(el.sceneHeight ?? el.height, parentHeight);
      return { w, h };
    }
    case "logo":
      return { w: parseSizeW(el.maxWidth, 120), h: parseSizeH(el.height, 80) };
    case "divider":
      return { w, h: 1 };
    case "spacer":
      return { w, h: parseSizeH(el.height, 24) };
    case "button": {
      const fs = el.fontSize ?? theme.fontSize;
      ctx.font = `${el.fontWeight ?? 600} ${fs}px ${theme.fontFamily}`;
      const tm = ctx.measureText(el.content || "Button");
      const px = el.paddingX ?? 32;
      const py = el.paddingY ?? 14;
      return { w: tm.width + px * 2, h: fs * 1.2 + py * 2 };
    }
    case "group": {
      const dir = el.direction ?? "row";
      const gap = el.gap ?? 12;
      const pad = el.padding ?? 0;
      let totalW = pad * 2, totalH = pad * 2;
      const childSizes = (el.children ?? []).map((c) =>
        estimateElementSize(ctx, c, w - pad * 2, parentHeight - pad * 2, theme, assets, projectDir),
      );
      if (dir === "row") {
        totalW += childSizes.reduce((s, c) => s + c.w, 0) + Math.max(0, childSizes.length - 1) * gap;
        totalH += Math.max(...childSizes.map((c) => c.h), 0);
      } else {
        totalW += Math.max(...childSizes.map((c) => c.w), 0);
        totalH += childSizes.reduce((s, c) => s + c.h, 0) + Math.max(0, childSizes.length - 1) * gap;
      }
      return { w: parseSizeW(el.width, totalW), h: totalH };
    }
    default:
      return { w, h: 24 };
  }
}

/* ─── Drawing functions ─── */

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: LayoutBox,
  opts: {
    color: string;
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
    textAlign?: CanvasTextAlign;
    lineHeight?: number;
    opacity?: number;
    textTransform?: string;
    letterSpacing?: number;
  },
) {
  if (!text) return;

  let displayText = text;
  if (opts.textTransform === "uppercase") displayText = text.toUpperCase();
  else if (opts.textTransform === "lowercase") displayText = text.toLowerCase();
  else if (opts.textTransform === "capitalize") displayText = text.replace(/\b\w/g, (c) => c.toUpperCase());

  ctx.save();
  if (opts.opacity !== undefined && opts.opacity < 1) ctx.globalAlpha *= opts.opacity;
  ctx.fillStyle = opts.color;
  ctx.font = `${opts.fontWeight} ${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textAlign = opts.textAlign ?? "left";
  ctx.textBaseline = "top";

  if (opts.letterSpacing) {
    (ctx as any).letterSpacing = `${opts.letterSpacing}px`;
  }

  const lh = opts.fontSize * (opts.lineHeight || 1.4);
  const words = displayText.split(/\s+/);
  let line = "";
  let y = box.y;
  const xBase = opts.textAlign === "center" ? box.x + box.w / 2 : opts.textAlign === "right" ? box.x + box.w : box.x;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > box.w && line) {
      ctx.fillText(line, xBase, y);
      y += lh;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, xBase, y);
  ctx.restore();
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  src: string,
  box: LayoutBox,
  borderRadius: number,
  objectFit: string,
) {
  const img = imageCache.get(src);
  if (!img) return;

  ctx.save();
  if (borderRadius > 0) {
    roundRect(ctx, box.x, box.y, box.w, box.h, borderRadius);
    ctx.clip();
  }

  if (objectFit === "contain") {
    const scale = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
  } else {
    // cover
    const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}


/**
 * Carve a concave (inward-curving) notch at the outer edge of a seam between
 * two adjacent line rects. Called on an offscreen canvas so destination-out
 * only affects the caption layer, not the underlying video frame.
 * `cx` is the X edge, `seamY` is the seam Y, `side` is which side of cx to clear.
 */
function drawConcaveCorner(
  ctx: CanvasRenderingContext2D,
  cx: number,
  seamY: number,
  r: number,
  side: "left" | "right",
) {
  ctx.save();
  ctx.beginPath();
  const sweep = side === "left" ? -1 : 1;

  ctx.moveTo(cx, seamY);

  // 2. Draw a line outward along the horizontal seam
  ctx.lineTo(cx + (r * sweep), seamY);

  // 3. Curve smoothly downward to the vertical edge
  // arcTo automatically handles the perfect rounded transition
  ctx.arcTo(cx, seamY, cx, seamY + r, r);

  // 4. Close the path back to the sharp corner, forming a solid wedge shape
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a merged background shape for stacked line-fill caption rects.
 * Adjacent rects are connected (no gap) and concave corners are carved
 * at the outer seam edges. Uses an offscreen canvas so destination-out
 * does not affect the underlying video content.
 */
export function drawMergedLineRects(
  ctx: CanvasRenderingContext2D,
  lineRects: { x: number; y: number; w: number; h: number }[],
  bgColor: string,
  bgOpacity: number,
  radius: number,
) {
  if (lineRects.length === 0) return;

  // Compute bounding box (with margin for the concave notch arcs)
  let minX = lineRects[0].x;
  let maxX = lineRects[0].x + lineRects[0].w;
  let minY = lineRects[0].y;
  let maxY = lineRects[lineRects.length - 1].y + lineRects[lineRects.length - 1].h;
  for (const r of lineRects) {
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x + r.w);
  }
  minX -= radius + 1;
  maxX += radius + 1;
  minY -= radius + 1;
  maxY += radius + 1;

  const offCanvas = document.createElement("canvas");
  offCanvas.width = Math.ceil(maxX - minX);
  offCanvas.height = Math.ceil(maxY - minY);
  const offCtx = offCanvas.getContext("2d")!;

  offCtx.fillStyle = bgColor;

  // Draw all line rects onto the offscreen canvas
  for (const r of lineRects) {
    roundRect(offCtx, r.x - minX, r.y - minY, r.w, r.h, radius);
    offCtx.fill();
  }

  // Connect adjacent rects and carve concave corners
  if (radius > 0) {
    for (let li = 0; li < lineRects.length - 1; li++) {
      const cur = lineRects[li];
      const next = lineRects[li + 1];
      const seamY = cur.y + cur.h;
      const overlapL = Math.max(cur.x, next.x);
      const overlapR = Math.min(cur.x + cur.w, next.x + next.w);
      if (overlapL >= overlapR) continue;

      // Fill the seam zone so the two rounded rects merge seamlessly
      offCtx.fillRect(overlapL - minX, seamY - minY - radius, overlapR - overlapL, radius * 2);

      // Carve concave notches at the outer seam edges
      drawConcaveCorner(offCtx, overlapL - minX, seamY - minY, radius, "left");
      drawConcaveCorner(offCtx, overlapR - minX, seamY - minY, radius, "right");
    }
  }

  // Composite onto main canvas with background opacity
  ctx.save();
  ctx.globalAlpha = bgOpacity;
  ctx.drawImage(offCanvas, minX, minY);
  ctx.restore();
}

/* ─── Element renderer ─── */

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: SceneElement,
  box: LayoutBox,
  theme: ThemeNode,
  scene: VideoScene,
  assets: AssetItem[],
  projectDir: string | null | undefined,
) {
  const color = resolveColor(el.color, theme, scene) || theme.primaryColor;

  switch (el.type) {
    case "text":
      drawText(ctx, el.content || "", box, {
        color,
        fontSize: el.fontSize ?? theme.fontSize,
        fontWeight: el.fontWeight ?? theme.fontWeight,
        fontFamily: theme.fontFamily,
        textAlign: (el.textAlign as CanvasTextAlign) ?? "left",
        lineHeight: el.lineHeight,
        opacity: el.opacity,
        textTransform: el.textTransform,
        letterSpacing: el.letterSpacing,
      });
      break;

    case "image": {
      const src = resolveMediaSrcLocal(el.content, projectDir);
      if (src) drawImage(ctx, src, box, el.borderRadius ?? theme.borderRadius, el.objectFit ?? "cover");
      break;
    }

    case "logo": {
      const asset = el.assetId ? assets.find((a) => a.id === el.assetId) : assets[0];
      const src = resolveMediaSrcLocal(asset?.data, projectDir);
      if (src) drawImage(ctx, src, box, 0, "contain");
      break;
    }

    case "divider":
      ctx.save();
      ctx.globalAlpha *= (el.opacity ?? 0.3);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(box.x, box.y);
      ctx.lineTo(box.x + box.w, box.y);
      ctx.stroke();
      ctx.restore();
      break;

    case "spacer":
      // Nothing to draw
      break;

    case "button": {
      const bgColor = el.backgroundColor ? color : (resolveColor(el.backgroundColor, theme, scene) || theme.secondaryColor);
      ctx.save();
      roundRect(ctx, box.x, box.y, box.w, box.h, el.borderRadius ?? theme.borderRadius);
      ctx.fillStyle = bgColor;
      ctx.fill();
      drawText(ctx, el.content || "Button", box, {
        color: el.textColor ?? "#ffffff",
        fontSize: el.fontSize ?? theme.fontSize,
        fontWeight: el.fontWeight ?? 600,
        fontFamily: theme.fontFamily,
        textAlign: "center",
        lineHeight: 1.2,
      });
      ctx.restore();
      break;
    }

    case "group": {
      const dir = el.direction ?? "row";
      const gap = el.gap ?? 12;
      const pad = el.padding ?? 0;
      const children = el.children ?? [];

      const childSizes = children.map((c) =>
        estimateElementSize(ctx, c, box.w - pad * 2, box.h - pad * 2, theme, assets, projectDir),
      );

      let cx = box.x + pad;
      let cy = box.y + pad;

      for (let i = 0; i < children.length; i++) {
        const cs = childSizes[i];
        drawElement(ctx, children[i], { x: cx, y: cy, w: cs.w, h: cs.h }, theme, scene, assets, projectDir);
        if (dir === "row") cx += cs.w + gap;
        else cy += cs.h + gap;
      }
      break;
    }

    default:
      if (el.content) {
        drawText(ctx, el.content, box, {
          color,
          fontSize: el.fontSize ?? theme.fontSize,
          fontWeight: el.fontWeight ?? theme.fontWeight,
          fontFamily: theme.fontFamily,
        });
      }
  }
}

/* ─── Main render function ─── */

/**
 * Render a scene at a given time directly to a canvas.
 * Returns in <5ms for typical scenes.
 */
export function renderSceneToCanvas(
  ctx: CanvasRenderingContext2D,
  scene: VideoScene,
  theme: ThemeNode,
  assets: AssetItem[],
  size: DocumentSize,
  projectDir: string | null | undefined,
  sceneTimeMs: number,
) {
  const w = size.width;
  const h = size.height;

  // Background
  ctx.save();
  const bgColor = scene.style?.backgroundColor ?? theme.backgroundColor;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  // Background gradient (CSS gradient → we just draw the solid bg for now)
  // TODO: parse CSS gradients and draw them

  // Layout: simple flex layout
  const padding = scene.padding ?? 0;
  const gap = scene.gap ?? 24;
  const dir: FlexDirection = scene.direction ?? "column";
  const alignItems: FlexAlign = scene.alignItems ?? "center";
  const justifyContent: FlexJustify = scene.justifyContent ?? "center";

  // Measure visible elements
  const visibleElements: { el: SceneElement; size: { w: number; h: number }; anim: ReturnType<typeof computeElementStyle> }[] = [];

  for (const el of scene.elements) {
    const anim = computeElementStyle(el, sceneTimeMs, scene.durationMs);
    if (!anim.visible) continue;
    const sz = estimateElementSize(ctx, el, w - padding * 2, h - padding * 2, theme, assets, projectDir);
    visibleElements.push({ el, size: sz, anim });
  }

  // Compute total content size
  const contentArea = { x: padding, y: padding, w: w - padding * 2, h: h - padding * 2 };
  const isRow = dir === "row";

  const totalMain = visibleElements.reduce(
    (sum, e) => sum + (isRow ? e.size.w : e.size.h),
    0,
  ) + Math.max(0, visibleElements.length - 1) * gap;

  const mainSpace = isRow ? contentArea.w : contentArea.h;

  // Justify content
  let mainOffset: number;
  let mainGap = gap;
  switch (justifyContent) {
    case "flex-start": mainOffset = 0; break;
    case "flex-end": mainOffset = mainSpace - totalMain; break;
    case "center": mainOffset = (mainSpace - totalMain) / 2; break;
    case "space-between":
      mainOffset = 0;
      mainGap = visibleElements.length > 1 ? (mainSpace - totalMain + (visibleElements.length - 1) * gap) / (visibleElements.length - 1) : gap;
      break;
    case "space-evenly":
      mainGap = (mainSpace - totalMain + (visibleElements.length - 1) * gap) / (visibleElements.length + 1);
      mainOffset = mainGap;
      break;
    default: mainOffset = (mainSpace - totalMain) / 2;
  }

  let cursor = mainOffset;

  for (const { el, size: sz, anim } of visibleElements) {
    // Align items (cross axis)
    const crossSpace = isRow ? contentArea.h : contentArea.w;
    const crossSize = isRow ? sz.h : sz.w;
    let crossOffset: number;
    switch (alignItems) {
      case "flex-start": crossOffset = 0; break;
      case "flex-end": crossOffset = crossSpace - crossSize; break;
      case "center": default: crossOffset = (crossSpace - crossSize) / 2;
    }

    const box: LayoutBox = isRow
      ? { x: contentArea.x + cursor, y: contentArea.y + crossOffset, w: sz.w, h: sz.h }
      : { x: contentArea.x + crossOffset, y: contentArea.y + cursor, w: sz.w, h: sz.h };

    // Apply transforms
    ctx.save();

    const { transform, opacity: animOpacity, filter } = anim;
    ctx.globalAlpha *= (el.opacity ?? 1) * animOpacity;

    // Apply at element center
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;

    ctx.translate(cx, cy);

    // Static element transforms (x/y offset, scale, rotation)
    if (el.x || el.y) ctx.translate(el.x ?? 0, el.y ?? 0);
    if (el.scale != null && el.scale !== 1) {
      ctx.scale(el.scale, el.scale);
    } else if (el.scaleX != null || el.scaleY != null) {
      ctx.scale(el.scaleX ?? 1, el.scaleY ?? 1);
    }
    if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);

    // Animation transforms
    const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    if (translateMatch) {
      ctx.translate(parseFloat(translateMatch[1]), parseFloat(translateMatch[2]));
    }
    const scaleMatch = transform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
    if (scaleMatch) {
      const sx = parseFloat(scaleMatch[1]);
      const sy = scaleMatch[2] ? parseFloat(scaleMatch[2]) : sx;
      ctx.scale(sx, sy);
    }
    const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
    if (rotateMatch) {
      ctx.rotate((parseFloat(rotateMatch[1]) * Math.PI) / 180);
    }

    ctx.translate(-cx, -cy);

    // Apply blur via filter (Canvas2D supports filter property)
    const blurMatch = filter.match(/blur\(([^)]+)px\)/);
    if (blurMatch) {
      ctx.filter = `blur(${blurMatch[1]}px)`;
    }

    drawElement(ctx, el, box, theme, scene, assets, projectDir);

    ctx.restore();

    cursor += (isRow ? sz.w : sz.h) + mainGap;
  }

  ctx.restore();
}

/* ─── Caption renderer ─── */

import type { CaptionTrack, CaptionWord } from "@/types/schema";

/**
 * Draw captions onto the canvas at the given absolute time.
 */
export function renderCaptionsToCanvas(
  ctx: CanvasRenderingContext2D,
  captionTracks: CaptionTrack[],
  currentTimeMs: number,
  width: number,
  height: number,
) {
  for (const track of captionTracks) {
    // Find active segment
    let activeWords: CaptionWord[] | null = null;
    for (const seg of track.segments) {
      if (seg.words.length === 0) continue;
      const segStart = seg.words[0].startMs;
      const segEnd = seg.words[seg.words.length - 1].endMs;
      if (currentTimeMs >= segStart && currentTimeMs <= segEnd) {
        activeWords = seg.words;
        break;
      }
    }
    if (!activeWords) continue;

    const a = track.appearance;
    const fontSize = a.fontSize ?? 32;
    const fontWeight = a.fontWeight ?? 700;
    const fontFamily = a.fontId ?? "sans-serif";
    const textColor = a.color ?? "#ffffff";
    const highlightColor = a.highlightColor ?? "#FFD700";
    const bgColor = a.backgroundColor ?? "#000000";
    const bgOpacity = a.backgroundOpacity ?? 0.7;
    const pad = a.padding ?? 12;
    const radius = a.borderRadius ?? 8;
    const fillMode = a.fillMode ?? "box";
    const maxW = width * 0.8;

    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = "middle";

    // Word wrap
    const lines: { text: string; words: { text: string; startMs: number; endMs: number }[]; measuredWidth: number }[] = [];
    let currentLine = "";
    let currentLineWords: { text: string; startMs: number; endMs: number }[] = [];
    for (const w of activeWords) {
      const test = currentLine ? `${currentLine} ${w.text}` : w.text;
      if (ctx.measureText(test).width > maxW && currentLine) {
        lines.push({ text: currentLine, words: [...currentLineWords], measuredWidth: ctx.measureText(currentLine).width });
        currentLine = w.text;
        currentLineWords = [w];
      } else {
        currentLine = test;
        currentLineWords.push(w);
      }
    }
    if (currentLine) lines.push({ text: currentLine, words: currentLineWords, measuredWidth: ctx.measureText(currentLine).width });

    const lineH = fontSize * 1.4;
    const totalH = lines.length * lineH;

    // Y position
    let anchorY: number;
    if (a.position === "custom" && a.positionY != null) {
      anchorY = (a.positionY / 100) * height - (totalH + pad * 2) / 2;
    } else if (a.position === "top") {
      anchorY = height * 0.05;
    } else if (a.position === "center") {
      anchorY = (height - totalH - pad * 2) / 2;
    } else {
      anchorY = height - totalH - pad * 2 - height * 0.08;
    }

    // X anchor for custom positioning
    const anchorX = (a.position === "custom" && a.positionX != null)
      ? (a.positionX / 100) * width
      : width / 2;

    // Build line rects — touching, no gap
    const lineRects: { x: number; y: number; w: number; h: number }[] = [];
    {
      const lh = lineH + pad * 0.6;
      let ly = anchorY;
      for (const line of lines) {
        const lw = line.measuredWidth + pad * 2;
        lineRects.push({ x: anchorX - lw / 2, y: ly, w: lw, h: lh });
        ly += lh; // no gap — rects touch
      }
    }

    if (fillMode === "line") {
      drawMergedLineRects(ctx, lineRects, bgColor, bgOpacity, radius);
    } else {
      // Box fill: single rectangle (same for word-reveal — full size, text fades in)
      const boxW2 = Math.min(maxW + pad * 2, width);
      const boxH = totalH + pad * 2;
      const boxX = anchorX - boxW2 / 2;
      ctx.save();
      ctx.globalAlpha = bgOpacity;
      ctx.fillStyle = bgColor;
      roundRect(ctx, boxX, anchorY, boxW2, boxH, radius);
      ctx.fill();
      ctx.restore();
    }

    // Draw text lines — position text centered vertically within each line rect
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const rect = lineRects[li];
      // Text Y: middle of each line slot (textBaseline = "middle")
      const textY = fillMode === "line"
        ? rect.y + rect.h / 2
        : anchorY + pad + li * lineH + lineH / 2;
      const lineX = anchorX - line.measuredWidth / 2;

      if (track.style === "karaoke") {
        let textX = lineX;
        for (const w of line.words) {
          const isActive = currentTimeMs >= w.startMs && currentTimeMs <= w.endMs;
          const past = currentTimeMs > w.endMs;
          ctx.fillStyle = (isActive || past) ? highlightColor : textColor;
          ctx.fillText(w.text, textX, textY);
          textX += ctx.measureText(w.text + " ").width;
        }
      } else if (track.style === "word-reveal") {
        let textX = lineX;
        for (const w of line.words) {
          ctx.globalAlpha = currentTimeMs >= w.startMs ? 1 : 0;
          ctx.fillStyle = textColor;
          ctx.fillText(w.text, textX, textY);
          textX += ctx.measureText(w.text + " ").width;
        }
        ctx.globalAlpha = 1;
      } else if (track.style === "typewriter") {
        let charCount = 0;
        for (const w of activeWords) {
          if (currentTimeMs < w.startMs) break;
          const progress = Math.min(1, (currentTimeMs - w.startMs) / Math.max(1, w.endMs - w.startMs));
          charCount += Math.floor(w.text.length * progress) + 1;
        }
        const full = activeWords.map((w) => w.text).join(" ");
        const slice = full.slice(0, charCount);
        ctx.fillStyle = textColor;
        ctx.fillText(slice, anchorX - ctx.measureText(slice).width / 2, textY);
      } else {
        ctx.fillStyle = textColor;
        ctx.fillText(line.text, lineX, textY);
      }
    }

    ctx.restore();
  }
}
