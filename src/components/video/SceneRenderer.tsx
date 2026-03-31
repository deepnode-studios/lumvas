import React, { forwardRef } from "react";
import type {
  VideoScene,
  SceneElement,
  ThemeNode,
  AssetItem,
  DocumentSize,
} from "@/types/schema";
import { computeElementStyle } from "@/utils/animation";
import { computeEffects, hasTypewriterEffect, getTypewriterParams, computeTranslationVelocity } from "@/utils/effectsRenderer";
import { resolveMediaSrc } from "@/utils/media";

/* ─── DOM path length cache (reuses real SVG measurements) ─── */
const domPathLenCache = new Map<string, number>();
function getDomPathLength(d: string): number {
  if (domPathLenCache.has(d)) return domPathLenCache.get(d)!;
  try {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg") as SVGSVGElement;
    const path = document.createElementNS(ns, "path") as SVGPathElement;
    path.setAttribute("d", d);
    svg.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:0;height:0";
    svg.appendChild(path);
    document.body.appendChild(svg);
    const len = path.getTotalLength();
    document.body.removeChild(svg);
    domPathLenCache.set(d, len > 0 ? len : 10000);
    return domPathLenCache.get(d)!;
  } catch {
    return 10000;
  }
}
import styles from "../slides/slides.module.css";

/** Resolve fontId to a CSS font-family string. Checks theme tokens first, then treats as raw CSS value. */
function resolveFont(fontId: string | undefined, theme: ThemeNode): string | undefined {
  if (!fontId) return undefined;
  const token = theme.fonts?.find((f) => f.id === fontId);
  if (token) return token.value;
  // Not a token — treat as a raw CSS font-family value
  return fontId;
}

// TODO: Extract ElementRenderer from SlideRenderer into shared module.
// For now, we import the full SlideRenderer's rendering logic via a simpler approach:
// SceneRenderer wraps each element in an animated div and delegates actual element rendering
// to the same CSS/HTML structure as slides.

interface SceneRendererProps {
  scene: VideoScene;
  theme: ThemeNode;
  assets: AssetItem[];
  size: DocumentSize;
  language?: string;
  projectDir?: string | null;
  currentTimeMs: number;
  activeElementId?: string | null;
  onElementClick?: (id: string) => void;
  onBackgroundClick?: () => void;
  onElementDragMove?: (id: string, dx: number, dy: number) => void;
  previewScale?: number;
  style?: React.CSSProperties;
}

export const SceneRenderer = forwardRef<HTMLDivElement, SceneRendererProps>(
  function SceneRenderer(
    { scene, theme, assets, size, language, projectDir, currentTimeMs, activeElementId, onElementClick, onBackgroundClick, onElementDragMove, previewScale = 1, style },
    ref,
  ) {
    const resolveColor = (token: string | undefined): string => {
      if (!token) return "";
      if (token === "primary") return scene.style?.primaryColor ?? theme.primaryColor;
      if (token === "secondary") return scene.style?.secondaryColor ?? theme.secondaryColor;
      if (token === "background") return scene.style?.backgroundColor ?? theme.backgroundColor;
      const paletteColor = theme.palette?.find((c) => c.id === token);
      if (paletteColor) return paletteColor.value;
      return token; // treat as raw hex/color
    };

    const bgColor = scene.style?.backgroundColor ?? theme.backgroundColor;

    return (
      <div
        ref={ref}
        className={styles.slide}
        lang={language}
        dir={language === "ar" || language === "he" ? "rtl" : undefined}
        style={{
          width: size.width,
          height: size.height,
          backgroundColor: bgColor,
          backgroundImage: scene.style?.backgroundGradient || undefined,
          display: "flex",
          flexDirection: scene.direction ?? "column",
          alignItems: scene.alignItems ?? "center",
          justifyContent: scene.justifyContent ?? "center",
          padding: scene.padding ?? 0,
          gap: scene.gap ?? 24,
          position: "relative",
          overflow: "hidden",
          fontFamily: theme.fontFamily,
          fontSize: theme.fontSize,
          fontWeight: theme.fontWeight,
          color: theme.primaryColor,
          ...style,
        }}
        onClick={onBackgroundClick ? (e) => { if (e.target === e.currentTarget) onBackgroundClick(); } : undefined}
      >
        {scene.elements.map((el) => (
          <AnimatedElement
            key={el.id}
            element={el}
            sceneTimeMs={currentTimeMs}
            sceneDurationMs={scene.durationMs}
            theme={theme}
            assets={assets}
            projectDir={projectDir}
            isActive={activeElementId === el.id}
            resolveColor={resolveColor}
            onClick={onElementClick ? () => onElementClick(el.id) : undefined}
            onDragMove={onElementDragMove ? (dx, dy) => onElementDragMove(el.id, dx, dy) : undefined}
            previewScale={previewScale}
          />
        ))}
      </div>
    );
  },
);

/** Renders a scene element with computed animation state */
function AnimatedElement({
  element,
  sceneTimeMs,
  sceneDurationMs,
  theme,
  assets,
  projectDir,
  isActive,
  resolveColor,
  onClick,
  onDragMove,
  previewScale = 1,
}: {
  element: SceneElement;
  sceneTimeMs: number;
  sceneDurationMs: number;
  theme: ThemeNode;
  assets: AssetItem[];
  projectDir?: string | null;
  isActive: boolean;
  resolveColor: (token: string | undefined) => string;
  onClick?: () => void;
  onDragMove?: (dx: number, dy: number) => void;
  previewScale?: number;
}) {
  const computed = (element.timing.effects && element.timing.effects.length > 0)
    ? computeEffects(element, sceneTimeMs, sceneDurationMs)
    : computeElementStyle(element, sceneTimeMs, sceneDurationMs);
  const { transform: animTransform, opacity: animOpacity, filter, visible } = computed;

  // Motion blur: compute velocity and add blur filter for fast-moving elements
  const velocity = visible ? computeTranslationVelocity(element, sceneTimeMs, sceneDurationMs) : 0;
  const motionBlur = velocity > 2 ? `blur(${Math.min(velocity * 0.4, 12).toFixed(1)}px)` : undefined;

  const color = resolveColor(element.color) || theme.primaryColor;
  const fontSize = element.fontSize ?? theme.fontSize;
  const fontWeight = element.fontWeight ?? theme.fontWeight;

  // Static transforms from element properties (applied on top of animation transforms)
  const staticParts: string[] = [];
  // Anchor offset: translate by -anchorX%, -anchorY% of element's own size
  const ax = element.anchorX ?? 0;
  const ay = element.anchorY ?? 0;
  if (ax !== 0 || ay !== 0) staticParts.push(`translate(${-ax * 100}%, ${-ay * 100}%)`);
  if (element.scale != null && element.scale !== 1) staticParts.push(`scale(${element.scale})`);
  else if (element.scaleX != null || element.scaleY != null) staticParts.push(`scale(${element.scaleX ?? 1}, ${element.scaleY ?? 1})`);
  if (element.rotation) staticParts.push(`rotate(${element.rotation}deg)`);

  const combinedTransform = [staticParts.join(" "), animTransform].filter(Boolean).join(" ") || undefined;
  const opacity = (element.opacity ?? 1) * animOpacity;

  // Wipe clip: detect active wipe effects and apply CSS clipPath
  let clipPath: string | undefined;
  if (computed.drawProgress !== undefined && computed.drawProgress < 1) {
    const activeEffects = element.timing.effects ?? [];
    const wipeEffect = activeEffects.find(
      (e) => e.enabled && (e.definitionId === "wipe-left" || e.definitionId === "wipe-right" || e.definitionId === "wipe-reveal"),
    );
    if (wipeEffect) {
      const dp = computed.drawProgress;
      const dir = (wipeEffect.params.direction as string | undefined) ?? "left-to-right";
      if (wipeEffect.definitionId === "wipe-right") {
        clipPath = `inset(0 0 0 ${(1 - dp) * 100}%)`;
      } else if (dir === "right-to-left") {
        clipPath = `inset(0 0 0 ${(1 - dp) * 100}%)`;
      } else if (dir === "top-to-bottom") {
        clipPath = `inset(0 0 ${(1 - dp) * 100}% 0)`;
      } else if (dir === "bottom-to-top") {
        clipPath = `inset(${(1 - dp) * 100}% 0 0 0)`;
      } else {
        clipPath = `inset(0 ${(1 - dp) * 100}% 0 0)`;
      }
    }
  }

  const activeOutline = isActive
    ? { boxShadow: "inset 0 0 0 3px #0071e3", borderRadius: 4 }
    : {};

  // Auto-width for text-based elements: if no explicit sceneWidth, default based on type
  const needsAutoWidth = !element.sceneWidth && (
    element.type === "text" || element.type === "button" || element.type === "list" ||
    element.type === "counter" || element.type === "group"
  );
  const autoWidth = needsAutoWidth
    ? (element.anchorX === 0.5 ? "90%" : undefined)
    : undefined;
  const autoMaxWidth = needsAutoWidth && !autoWidth ? "90%" : undefined;

  return (
    <div
      style={{
        position: "absolute",
        left: element.x ?? 0,
        top: element.y ?? 0,
        width: element.sceneWidth ?? autoWidth,
        maxWidth: autoMaxWidth,
        height: element.sceneHeight ?? undefined,
        transform: visible ? combinedTransform : undefined,
        opacity: visible ? opacity : 0,
        filter: visible ? ([filter, motionBlur].filter(Boolean).join(" ") || undefined) : undefined,
        clipPath: visible ? clipPath : undefined,
        WebkitClipPath: visible ? clipPath : undefined,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? undefined : "none",
        willChange: "transform, opacity, filter",
        ...(visible ? activeOutline : {}),
        cursor: visible ? (onDragMove ? "grab" : onClick ? "pointer" : undefined) : undefined,
      }}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onMouseDown={onDragMove ? (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        let moved = false;
        const onMove = (ev: MouseEvent) => {
          const dx = (ev.clientX - startX) / previewScale;
          const dy = (ev.clientY - startY) / previewScale;
          if (!moved && Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
          moved = true;
          onDragMove(dx, dy);
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      } : undefined}
    >
      {element.type === "group" ? (
        <GroupContent
          element={element}
          sceneTimeMs={sceneTimeMs}
          sceneDurationMs={sceneDurationMs}
          theme={theme}
          assets={assets}
          projectDir={projectDir}
          resolveColor={resolveColor}
          isActive={isActive}
          activeElementId={undefined}
          onClick={onClick}
          onDragMove={onDragMove}
          previewScale={previewScale}
          animBgColor={computed.backgroundColor}
        />
      ) : renderElementContent(element, {
        color,
        fontSize,
        fontWeight,
        theme,
        assets,
        projectDir,
        animColor: computed.color,
        animBgColor: computed.backgroundColor,
        drawProgress: computed.drawProgress,
        sceneTimeMs,
        sceneDurationMs,
      })}
    </div>
  );
}

/** Render group content: flex container with independently animated children */
function GroupContent({
  element,
  sceneTimeMs,
  sceneDurationMs,
  theme,
  assets,
  projectDir,
  resolveColor,
  isActive,
  activeElementId,
  onClick,
  onDragMove,
  previewScale,
  animBgColor,
}: {
  element: SceneElement;
  sceneTimeMs: number;
  sceneDurationMs: number;
  theme: ThemeNode;
  assets: AssetItem[];
  projectDir?: string | null;
  resolveColor: (token: string | undefined) => string;
  isActive: boolean;
  activeElementId?: string | null;
  onClick?: () => void;
  onDragMove?: (dx: number, dy: number) => void;
  previewScale: number;
  animBgColor?: string;
}) {
  const children = (element.repeatCount && element.repeatCount > 1 && element.children?.[0])
    ? Array.from({ length: element.repeatCount }, (_, i) => ({
        ...element.children![0],
        id: `${element.children![0].id}_r${i}`,
        timing: {
          ...element.children![0].timing,
          enterMs: (element.children![0].timing.enterMs ?? 0) + i * (element.staggerMs ?? 0),
        },
      }))
    : (element.children ?? []) as SceneElement[];

  return (
    <div style={{
      display: "flex",
      flexDirection: element.direction ?? "row",
      alignItems: element.alignItems ?? "center",
      justifyContent: element.justifyContent ?? "flex-start",
      gap: element.gap ?? 12,
      padding: element.padding,
      width: element.width ?? "100%",
      backgroundColor: animBgColor ?? (element.backgroundColor || undefined),
      borderRadius: element.borderRadius,
    }}>
      {children.map((child) => (
        <GroupChildElement
          key={child.id}
          element={child}
          sceneTimeMs={sceneTimeMs}
          sceneDurationMs={sceneDurationMs}
          theme={theme}
          assets={assets}
          projectDir={projectDir}
          resolveColor={resolveColor}
          isActive={activeElementId === child.id}
          previewScale={previewScale}
        />
      ))}
    </div>
  );
}

/** A child element within a group — uses relative positioning (flex flow) with independent animation */
function GroupChildElement({
  element,
  sceneTimeMs,
  sceneDurationMs,
  theme,
  assets,
  projectDir,
  resolveColor,
  isActive,
  previewScale,
}: {
  element: SceneElement;
  sceneTimeMs: number;
  sceneDurationMs: number;
  theme: ThemeNode;
  assets: AssetItem[];
  projectDir?: string | null;
  resolveColor: (token: string | undefined) => string;
  isActive: boolean;
  previewScale: number;
}) {
  const computed = (element.timing.effects && element.timing.effects.length > 0)
    ? computeEffects(element, sceneTimeMs, sceneDurationMs)
    : computeElementStyle(element, sceneTimeMs, sceneDurationMs);
  const { transform: animTransform, opacity: animOpacity, filter, visible } = computed;

  const staticParts: string[] = [];
  if (element.scale != null && element.scale !== 1) staticParts.push(`scale(${element.scale})`);
  else if (element.scaleX != null || element.scaleY != null) staticParts.push(`scale(${element.scaleX ?? 1}, ${element.scaleY ?? 1})`);
  if (element.rotation) staticParts.push(`rotate(${element.rotation}deg)`);
  const combinedTransform = [staticParts.join(" "), animTransform].filter(Boolean).join(" ") || undefined;
  const opacity = (element.opacity ?? 1) * animOpacity;

  const color = resolveColor(element.color) || theme.primaryColor;
  const fontSize = element.fontSize ?? theme.fontSize;
  const fontWeight = element.fontWeight ?? theme.fontWeight;

  return (
    <div
      style={{
        // Relative positioning within the flex group
        position: "relative",
        flex: element.flex ?? undefined,
        flexShrink: element.flexShrink ?? undefined,
        alignSelf: element.alignSelf ?? undefined,
        transform: visible ? combinedTransform : undefined,
        opacity: visible ? opacity : 0,
        filter: visible ? ([filter].filter(Boolean).join(" ") || undefined) : undefined,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? undefined : "none",
        willChange: "transform, opacity",
        ...(isActive ? { boxShadow: "inset 0 0 0 2px #0071e3", borderRadius: 4 } : {}),
      }}
    >
      {element.type === "group" ? (
        <GroupContent
          element={element}
          sceneTimeMs={sceneTimeMs}
          sceneDurationMs={sceneDurationMs}
          theme={theme}
          assets={assets}
          projectDir={projectDir}
          resolveColor={resolveColor}
          isActive={isActive}
          previewScale={previewScale}
          animBgColor={computed.backgroundColor}
        />
      ) : renderElementContent(element, {
        color,
        fontSize,
        fontWeight,
        theme,
        assets,
        projectDir,
        animColor: computed.color,
        animBgColor: computed.backgroundColor,
        drawProgress: computed.drawProgress,
        sceneTimeMs,
        sceneDurationMs,
      })}
    </div>
  );
}

/** Render the visual content of an element (text, image, icon, etc.) */
function renderElementContent(
  el: SceneElement,
  ctx: {
    color: string;
    fontSize: number;
    fontWeight: number;
    theme: ThemeNode;
    assets: AssetItem[];
    projectDir?: string | null;
    animColor?: string;
    animBgColor?: string;
    drawProgress?: number;
    sceneTimeMs?: number;
    sceneDurationMs?: number;
  },
) {
  switch (el.type) {
    case "text": {
      // Enhanced typewriter: supports both legacy enterAnimation preset and new effects system
      const twParams = getTypewriterParams(el);
      const isTypewriter = twParams !== null || el.timing.enterAnimation?.preset === "typewriter";
      let displayContent: React.ReactNode = el.content || "\u00A0";
      if (isTypewriter && ctx.sceneTimeMs !== undefined) {
        const enterMs = twParams?.enterMs ?? el.timing.enterMs;
        const dur = twParams?.durationMs ?? el.timing.enterAnimation!.durationMs;
        const delay = twParams?.delayMs ?? el.timing.enterAnimation!.delayMs ?? 0;
        const text = el.content ?? "";
        const charDur = (dur - delay) / Math.max(1, text.length);
        const elapsed = ctx.sceneTimeMs - enterMs - delay;
        const visibleChars = Math.max(0, Math.floor(elapsed / charDur));
        displayContent = (
          <>
            {text.split("").map((ch, i) => (
              <span
                key={i}
                style={{
                  opacity: i < visibleChars ? 1 : i === visibleChars ? Math.max(0, (elapsed - i * charDur) / charDur) : 0,
                  display: ch === " " ? "inline" : "inline-block",
                  transition: "none",
                }}
              >
                {ch}
              </span>
            ))}
          </>
        );
      }
      return (
        <div
          style={{
            color: ctx.animColor ?? ctx.color,
            fontSize: el.fontSize ?? ctx.fontSize,
            fontWeight: el.fontWeight ?? ctx.fontWeight,
            fontFamily: resolveFont(el.fontId, ctx.theme),
            textAlign: el.textAlign ?? "left",
            letterSpacing: el.letterSpacing,
            lineHeight: el.lineHeight,
            opacity: el.opacity,
            textTransform: el.textTransform,
            maxWidth: el.maxWidth,
            width: el.width,
            whiteSpace: "pre-wrap",
          }}
        >
          {displayContent}
        </div>
      );
    }

    case "image": {
      const src = resolveMediaSrc(el.content, ctx.projectDir);
      // When sceneWidth/sceneHeight controls the wrapper, fill it completely
      const hasSceneSize = el.sceneWidth || el.sceneHeight;
      return src ? (
        <img
          src={src}
          alt=""
          style={{
            width: el.width ?? (hasSceneSize ? "100%" : "100%"),
            height: el.height ?? (hasSceneSize ? "100%" : "auto"),
            objectFit: el.objectFit ?? "cover",
            borderRadius: el.borderRadius ?? ctx.theme.borderRadius,
            display: "block",
          }}
        />
      ) : (
        <div style={{ width: el.width ?? "100%", height: el.height ?? 200, background: "#e0e0e4", borderRadius: ctx.theme.borderRadius }} />
      );
    }

    case "logo": {
      const asset = el.assetId ? ctx.assets.find((a) => a.id === el.assetId) : ctx.assets[0];
      const src = resolveMediaSrc(asset?.data, ctx.projectDir);
      if (!src) return null;
      const tintColor = asset?.tintable ? (ctx.animColor ?? ctx.color ?? ctx.theme.primaryColor) : undefined;
      const baseSize: React.CSSProperties = {
        maxWidth: el.maxWidth ?? "120px",
        maxHeight: el.height ?? "80px",
        objectFit: "contain" as const,
      };
      if (tintColor) {
        return (
          <div
            style={{
              ...baseSize,
              display: "inline-block",
              backgroundColor: tintColor,
              WebkitMaskImage: `url(${src})`,
              WebkitMaskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskImage: `url(${src})`,
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "center",
              width: el.width ?? el.maxWidth ?? "120px",
              height: el.height ?? "80px",
            }}
          />
        );
      }
      return (
        <img
          src={src}
          alt={asset?.label ?? "Logo"}
          style={baseSize}
        />
      );
    }

    case "divider":
      return (
        <hr style={{
          width: el.width ?? "100%",
          border: "none",
          borderTop: `1px solid ${ctx.color}`,
          opacity: el.opacity ?? 0.3,
        }} />
      );

    case "spacer":
      return <div style={{ height: el.height ?? "24px" }} />;

    case "button":
      return (
        <div style={{
          display: "inline-block",
          padding: `${el.paddingY ?? 14}px ${el.paddingX ?? 32}px`,
          backgroundColor: el.backgroundColor ? ctx.color : ctx.theme.secondaryColor,
          backgroundImage: el.backgroundGradient || undefined,
          color: el.textColor ?? "#ffffff",
          fontSize: el.fontSize ?? ctx.fontSize,
          fontWeight: el.fontWeight ?? 600,
          fontFamily: resolveFont(el.fontId, ctx.theme),
          borderRadius: el.borderRadius ?? ctx.theme.borderRadius,
          textAlign: "center",
        }}>
          {el.content || "Button"}
        </div>
      );

    case "group": {
      const children = (el.repeatCount && el.repeatCount > 1 && el.children?.[0])
        ? Array.from({ length: el.repeatCount }, (_, i) => ({
            ...el.children![0],
            id: `${el.children![0].id}_r${i}`,
            timing: {
              ...el.children![0].timing,
              enterMs: (el.children![0].timing.enterMs ?? 0) + i * (el.staggerMs ?? 0),
            },
          }))
        : (el.children ?? []);
      // Render as a stub here — the actual group rendering with AnimatedElement
      // children is handled by GroupElement (rendered from AnimatedElement's parent).
      return (
        <div style={{
          display: "flex",
          flexDirection: el.direction ?? "row",
          alignItems: el.alignItems ?? "center",
          justifyContent: el.justifyContent ?? "flex-start",
          gap: el.gap ?? 12,
          padding: el.padding,
          width: el.width,
          backgroundColor: ctx.animBgColor ?? (el.backgroundColor || undefined),
          borderRadius: el.borderRadius,
        }}>
          {/* Children are rendered below by AnimatedElement to get independent animation */}
        </div>
      );
    }

    case "counter": {
      const start = el.counterStart ?? 0;
      const end = el.counterEnd ?? 100;
      let progress: number;
      if (ctx.drawProgress !== undefined) {
        progress = ctx.drawProgress;
      } else if (ctx.sceneTimeMs !== undefined && ctx.sceneDurationMs !== undefined) {
        const enterMs = el.timing.enterMs;
        const exitMs = el.timing.exitMs ?? ctx.sceneDurationMs;
        progress = Math.max(0, Math.min(1, (ctx.sceneTimeMs - enterMs) / Math.max(1, exitMs - enterMs)));
      } else {
        progress = 0;
      }
      const value = start + (end - start) * progress;
      const decimals = el.counterDecimals ?? 0;
      const displayText = (el.counterPrefix ?? "") + value.toFixed(decimals) + (el.counterSuffix ?? "");
      return (
        <div style={{
          color: ctx.animColor ?? ctx.color,
          fontSize: el.fontSize ?? ctx.fontSize,
          fontWeight: el.fontWeight ?? ctx.fontWeight,
          textAlign: el.textAlign ?? "center",
          letterSpacing: el.letterSpacing,
          lineHeight: el.lineHeight,
          fontVariantNumeric: "tabular-nums",
        }}>
          {displayText}
        </div>
      );
    }

    case "path": {
      const d = el.content;
      if (!d) return null;
      const dp = ctx.drawProgress ?? 1;
      const strokeColor = el.pathStroke ? el.pathStroke : ctx.color;
      const fillColor = el.pathFill ?? "none";
      const sw = el.pathStrokeWidth ?? 2;
      const totalLen = dp < 1 ? getDomPathLength(d) : 0;
      const drawn = totalLen * dp;
      return (
        <svg
          style={{ width: el.width ?? "100%", height: el.height ?? "100%", overflow: "visible" }}
          viewBox={el.sceneWidth && el.sceneHeight ? `0 0 ${parseFloat(el.sceneWidth)} ${parseFloat(el.sceneHeight)}` : undefined}
        >
          <path
            d={d}
            stroke={strokeColor}
            strokeWidth={sw}
            fill={fillColor}
            strokeLinecap={el.pathLinecap ?? "round"}
            strokeDasharray={dp < 1 ? totalLen : undefined}
            strokeDashoffset={dp < 1 ? totalLen - drawn : undefined}
            style={{ transition: "none" }}
          />
        </svg>
      );
    }

    case "svg": {
      const markup = el.content;
      if (!markup) return null;
      return (
        <div
          style={{
            width: el.width ?? "100%",
            height: el.height ?? "100%",
            color: ctx.animColor ?? ctx.color,
            opacity: el.opacity,
          }}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      );
    }

    case "indicator": {
      const r = el.indicatorRadius ?? 40;
      const sw = el.pathStrokeWidth ?? 3;
      const ic = el.indicatorColor ?? ctx.color;
      const pulse = ctx.drawProgress ?? 1;
      const pulseScale = 1 + pulse * 0.3;
      const fade = 1 - pulse * 0.5;
      const size = (r + 10) * 2;
      return (
        <svg width={size} height={size} style={{ overflow: "visible" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r * pulseScale}
            stroke={ic}
            strokeWidth={sw}
            fill="none"
            opacity={fade}
          />
        </svg>
      );
    }

    default:
      return <div>{el.content}</div>;
  }
}
