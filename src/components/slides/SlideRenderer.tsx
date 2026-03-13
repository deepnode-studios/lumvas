"use client";

import { forwardRef } from "react";
import type {
  SlideContent,
  SlideElement,
  SlideStyle,
  ThemeNode,
  AssetItem,
  DocumentSize,
  BackgroundPattern,
} from "@/types/schema";
import { getIcon } from "@/data/icons";
import styles from "./slides.module.css";

interface SlideProps {
  slide: SlideContent;
  theme: ThemeNode;
  assets: AssetItem[];
  size: DocumentSize;
  activeElementId?: string | null;
  onElementClick?: (id: string) => void;
  onBackgroundClick?: () => void;
}

function resolveColorRaw(
  token: string | undefined,
  theme: ThemeNode,
): string | undefined {
  if (!token) return undefined;
  if (token === "primary") return theme.primaryColor;
  if (token === "secondary") return theme.secondaryColor;
  if (token === "background") return theme.backgroundColor;
  const paletteColor = theme.palette?.find((c) => c.id === token);
  if (paletteColor) return paletteColor.value;
  return token; // raw hex/rgb
}

function resolveColor(
  token: string | undefined,
  theme: ThemeNode,
  slide: SlideContent
): string | undefined {
  if (!token) return undefined;
  if (token === "primary")
    return resolveColorRaw(slide.style?.primaryColor, theme) || theme.primaryColor;
  if (token === "secondary")
    return resolveColorRaw(slide.style?.secondaryColor, theme) || theme.secondaryColor;
  if (token === "background")
    return resolveColorRaw(slide.style?.backgroundColor, theme) || theme.backgroundColor;
  const paletteColor = theme.palette?.find((c) => c.id === token);
  if (paletteColor) return paletteColor.value;
  return token; // raw hex/rgb
}

function resolveFont(
  fontId: string | undefined,
  theme: ThemeNode
): string | undefined {
  if (!fontId) return undefined;
  const font = theme.fonts?.find((f) => f.id === fontId);
  return font?.value;
}

/**
 * Generate CSS background-image for a pattern type.
 * All patterns use a single color and are transparent otherwise.
 */
function generatePatternCSS(
  pattern: BackgroundPattern,
  color: string,
  scale: number
): { backgroundImage: string; backgroundSize?: string } {
  const s = scale;
  const enc = encodeURIComponent;

  switch (pattern) {
    case "dots": {
      const gap = 24 * s;
      const r = 2 * s;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><circle cx='${gap / 2}' cy='${gap / 2}' r='${r}' fill='${enc(color)}'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: `${gap}px ${gap}px`,
      };
    }
    case "grid": {
      const gap = 32 * s;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><path d='M ${gap} 0 L 0 0 0 ${gap}' fill='none' stroke='${enc(color)}' stroke-width='1'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: `${gap}px ${gap}px`,
      };
    }
    case "lines": {
      const gap = 20 * s;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><line x1='0' y1='${gap}' x2='${gap}' y2='${gap}' stroke='${enc(color)}' stroke-width='1'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: `${gap}px ${gap}px`,
      };
    }
    case "diagonal": {
      const gap = 16 * s;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><line x1='0' y1='${gap}' x2='${gap}' y2='0' stroke='${enc(color)}' stroke-width='1'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: `${gap}px ${gap}px`,
      };
    }
    case "crosshatch": {
      const gap = 16 * s;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><line x1='0' y1='${gap}' x2='${gap}' y2='0' stroke='${enc(color)}' stroke-width='1'/><line x1='0' y1='0' x2='${gap}' y2='${gap}' stroke='${enc(color)}' stroke-width='1'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: `${gap}px ${gap}px`,
      };
    }
    case "waves": {
      const w = 60 * s;
      const h = 20 * s;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><path d='M0 ${h / 2} Q${w / 4} 0 ${w / 2} ${h / 2} Q${(3 * w) / 4} ${h} ${w} ${h / 2}' fill='none' stroke='${enc(color)}' stroke-width='1.5'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: `${w}px ${h}px`,
      };
    }
    case "checkerboard": {
      const gap = 24 * s;
      const half = gap / 2;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><rect width='${half}' height='${half}' fill='${enc(color)}'/><rect x='${half}' y='${half}' width='${half}' height='${half}' fill='${enc(color)}'/></svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: `${gap}px ${gap}px`,
      };
    }
    default:
      return { backgroundImage: "none" };
  }
}

function ElementRenderer({
  el,
  theme,
  slide,
  assets,
  isActive,
  onClick,
  activeElementId,
  onElementClick,
}: {
  el: SlideElement;
  theme: ThemeNode;
  slide: SlideContent;
  assets: AssetItem[];
  isActive: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  activeElementId?: string | null;
  onElementClick?: (id: string) => void;
}) {
  const color = resolveColor(el.color, theme, slide);
  const primary = resolveColor("primary", theme, slide)!;
  const secondary = resolveColor("secondary", theme, slide)!;
  const fontFamily = resolveFont(el.fontId, theme);

  const clickable = onClick ? { cursor: "pointer" as const } : {};
  const activeOutline = isActive
    ? { boxShadow: "inset 0 0 0 3px #0071e3", borderRadius: 4, position: "relative" as const, zIndex: 2, ...clickable }
    : clickable;

  const spacing = {
    marginTop: el.marginTop ?? undefined,
    marginBottom: el.marginBottom ?? undefined,
  };

  const flexProps: React.CSSProperties = {
    flexGrow: el.flex ?? undefined,
    flexShrink: el.flexShrink ?? undefined,
    flexBasis: el.flex != null ? 0 : undefined,
    alignSelf: el.alignSelf ?? undefined,
  };

  switch (el.type) {
    case "text": {
      const textGradientStyle: React.CSSProperties = el.backgroundGradient
        ? {
            backgroundImage: el.backgroundGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }
        : {};
      return (
        <div
          className={styles.element}
          style={{
            color: color || primary,
            fontFamily,
            fontSize: el.fontSize ?? 24,
            fontWeight: el.fontWeight ?? theme.fontWeight,
            fontStyle: el.fontStyle ?? "normal",
            textAlign: el.textAlign ?? "left",
            letterSpacing: el.letterSpacing ?? undefined,
            lineHeight: el.lineHeight ?? 1.4,
            opacity: el.opacity ?? 1,
            maxWidth: el.maxWidth ?? "100%",
            textTransform: el.textTransform ?? "none",
            width: "100%",
            ...spacing,
            ...flexProps,
            ...activeOutline,
            ...textGradientStyle,
          }}
          onClick={onClick}
        >
          {el.content || "\u00A0"}
        </div>
      );
    }

    case "image":
      return (
        <div
          className={styles.element}
          style={{
            maxWidth: el.maxWidth ?? "100%",
            width: el.width ?? "100%",
            ...spacing,
            ...flexProps,
            ...activeOutline,
          }}
          onClick={onClick}
        >
          {el.content ? (
            <img
              src={el.content}
              alt=""
              style={{
                width: "100%",
                height: el.height ?? "auto",
                objectFit: el.objectFit ?? "cover",
                borderRadius: el.borderRadius ?? theme.borderRadius,
                display: "block",
              }}
            />
          ) : (
            <div
              className={styles.imagePlaceholder}
              style={{
                width: "100%",
                height: el.height ?? "300px",
                borderRadius: el.borderRadius ?? theme.borderRadius,
              }}
            >
              No image
            </div>
          )}
        </div>
      );

    case "button":
      return (
        <div
          className={styles.element}
          style={{
            textAlign: el.textAlign ?? "center",
            ...spacing,
            ...flexProps,
            ...activeOutline,
          }}
          onClick={onClick}
        >
          <span
            style={{
              display: "inline-flex",
              padding: `${el.paddingY ?? 20}px ${el.paddingX ?? 56}px`,
              fontFamily,
              fontSize: el.fontSize ?? 24,
              fontWeight: el.fontWeight ?? 700,
              color: resolveColor(el.textColor, theme, slide) || color || primary,
              backgroundImage: el.backgroundGradient || undefined,
              backgroundColor: !el.backgroundGradient ? (resolveColor(el.backgroundColor, theme, slide) || secondary) : undefined,
              borderRadius: el.borderRadius ?? theme.borderRadius,
              letterSpacing: el.letterSpacing ?? undefined,
              textTransform: el.textTransform ?? "none",
            }}
          >
            {el.content || "Button"}
          </span>
        </div>
      );

    case "list": {
      const items = el.content.split("\n").filter(Boolean);
      return (
        <ul
          className={`${styles.element} ${styles.bulletList}`}
          style={{
            fontFamily,
            fontSize: el.fontSize ?? 26,
            fontWeight: el.fontWeight ?? theme.fontWeight,
            color: color || primary,
            lineHeight: el.lineHeight ?? 1.5,
            maxWidth: el.maxWidth ?? "100%",
            opacity: el.opacity ?? 1,
            ...spacing,
            ...flexProps,
            ...activeOutline,
          }}
          onClick={onClick}
        >
          {items.map((item, i) => (
            <li
              key={i}
              className={styles.bulletItem}
              style={{ "--dot-color": secondary } as React.CSSProperties}
            >
              {item}
            </li>
          ))}
        </ul>
      );
    }

    case "divider":
      return (
        <div
          className={styles.element}
          style={{ maxWidth: el.maxWidth ?? "100%", ...spacing, ...flexProps, ...activeOutline }}
          onClick={onClick}
        >
          <hr
            className={styles.divider}
            style={{
              opacity: el.opacity ?? 0.15,
              borderColor: color || primary,
            }}
          />
        </div>
      );

    case "spacer":
      return (
        <div
          className={styles.element}
          style={{
            height: el.height ?? "40px",
            ...spacing,
            ...flexProps,
            ...activeOutline,
          }}
          onClick={onClick}
        />
      );

    case "group": {
      const groupChildren = el.children ?? [];
      return (
        <div
          className={styles.element}
          style={{
            display: "flex",
            flexDirection: el.direction ?? "row",
            alignItems: el.alignItems ?? "center",
            justifyContent: el.justifyContent ?? "center",
            gap: el.gap ?? 16,
            padding: el.padding ?? 0,
            maxWidth: el.maxWidth ?? "100%",
            width: el.width ?? "100%",
            backgroundImage: el.backgroundGradient || undefined,
            backgroundColor: !el.backgroundGradient && el.backgroundColor ? resolveColor(el.backgroundColor, theme, slide) : undefined,
            borderRadius: el.borderRadius ?? undefined,
            opacity: el.opacity ?? 1,
            ...spacing,
            ...flexProps,
            ...activeOutline,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(e);
          }}
        >
          {groupChildren.map((child) => (
            <ElementRenderer
              key={child.id}
              el={child}
              theme={theme}
              slide={slide}
              assets={assets}
              isActive={activeElementId === child.id}
              activeElementId={activeElementId}
              onElementClick={onElementClick}
              onClick={
                onElementClick
                  ? (e?: React.MouseEvent) => { e?.stopPropagation(); onElementClick(child.id); }
                  : undefined
              }
            />
          ))}
          {groupChildren.length === 0 && (
            <div style={{ padding: 20, color: "#999", fontSize: 14 }}>
              Empty group
            </div>
          )}
        </div>
      );
    }

    case "icon": {
      const iconDef = getIcon(el.iconName ?? "star");
      if (!iconDef) return null;
      const size = el.iconSize ?? 48;
      const iconColor = color || primary;
      const sw = el.strokeWidth ?? 2;
      return (
        <div
          className={styles.element}
          style={{ ...spacing, ...flexProps, ...activeOutline }}
          onClick={onClick}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox={iconDef.viewBox}
            fill={iconDef.fill ? iconColor : "none"}
            stroke={iconDef.fill ? "none" : iconColor}
            strokeWidth={iconDef.fill ? undefined : sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: el.opacity ?? 1 }}
          >
            {iconDef.paths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </svg>
        </div>
      );
    }

    case "logo": {
      // Look up asset by assetId, or fall back to first asset
      const asset = el.assetId
        ? assets.find((a) => a.id === el.assetId)
        : assets[0];
      const src = asset?.data;
      if (!src) return null;

      const tintColor = asset?.tintable
        ? resolveColor(el.color, theme, slide) || primary
        : undefined;

      const baseSize: React.CSSProperties = {
        width: el.width ?? undefined,
        maxWidth: el.maxWidth ?? "120px",
        maxHeight: el.height ?? "80px",
        objectFit: "contain",
      };

      return (
        <div
          className={styles.element}
          style={{ ...spacing, ...flexProps, ...activeOutline }}
          onClick={onClick}
        >
          {tintColor ? (
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
              role="img"
              aria-label={asset?.label ?? "Logo"}
            />
          ) : (
            <img
              src={src}
              alt={asset?.label ?? "Logo"}
              style={baseSize}
            />
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

const layerBase: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

export const SlideRenderer = forwardRef<HTMLDivElement, SlideProps>(
  function SlideRenderer({ slide, theme, assets, size, activeElementId, onElementClick, onBackgroundClick }, ref) {
    // Resolve background preset: merge preset defaults with slide-level overrides
    const ss: SlideStyle | undefined = (() => {
      const raw = slide.style;
      if (!raw?.backgroundPresetId) return raw;
      const preset = (theme.backgroundPresets ?? []).find(
        (p) => p.id === raw.backgroundPresetId
      );
      if (!preset) return raw;
      const { backgroundPresetId: _, ...overrides } = raw;
      const merged: SlideStyle = { ...preset.style, backgroundPresetId: raw.backgroundPresetId };
      for (const [key, val] of Object.entries(overrides)) {
        if (val !== undefined) {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      return merged;
    })();

    const resolvedSlideBg = ss?.backgroundColor
      ? resolveColor(ss.backgroundColor, theme, slide)
      : undefined;
    const bg = ss?.backgroundGradient || resolvedSlideBg || theme.backgroundColor;

    const containerStyle: React.CSSProperties = {
      width: size.width,
      height: size.height,
      backgroundImage: ss?.backgroundGradient || undefined,
      backgroundColor: !ss?.backgroundGradient ? bg : undefined,
      fontFamily: resolveFont("body", theme) || theme.fontFamily,
      overflow: "hidden",
      position: "relative",
      flexShrink: 0,
    };

    // Pattern layer
    const hasPattern = ss?.backgroundPattern && ss.backgroundPattern !== "none";
    let patternStyle: React.CSSProperties | undefined;
    if (hasPattern) {
      const patColor = resolveColor(ss!.backgroundPatternColor, theme, slide) || theme.primaryColor;
      const patScale = ss!.backgroundPatternScale ?? 1;
      const patCSS = generatePatternCSS(ss!.backgroundPattern!, patColor, patScale);
      patternStyle = {
        ...layerBase,
        ...patCSS,
        opacity: ss!.backgroundPatternOpacity ?? 0.15,
      };
    }

    // Background image layer (from assets)
    const bgAsset = ss?.backgroundAssetId
      ? assets.find((a) => a.id === ss.backgroundAssetId)
      : undefined;
    let bgImageStyle: React.CSSProperties | undefined;
    if (bgAsset?.data) {
      const sizeMode = ss?.backgroundAssetSize ?? "cover";
      const isRepeat = sizeMode === "repeat";
      bgImageStyle = {
        ...layerBase,
        backgroundImage: `url(${bgAsset.data})`,
        backgroundSize: isRepeat ? "auto" : sizeMode,
        backgroundRepeat: isRepeat ? "repeat" : "no-repeat",
        backgroundPosition: ss?.backgroundAssetPosition ?? "center",
        opacity: ss?.backgroundAssetOpacity ?? 0.3,
      };
    }

    // Overlay layer
    const hasOverlay = ss?.backgroundOverlayColor && (ss?.backgroundOverlayOpacity ?? 0) > 0;
    let overlayStyle: React.CSSProperties | undefined;
    if (hasOverlay) {
      overlayStyle = {
        ...layerBase,
        backgroundColor: resolveColor(ss!.backgroundOverlayColor, theme, slide),
        opacity: ss!.backgroundOverlayOpacity ?? 0.5,
      };
    }

    // Content layer
    const contentStyle: React.CSSProperties = {
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: slide.direction ?? "column",
      alignItems: slide.alignItems ?? "center",
      justifyContent: slide.justifyContent ?? "center",
      padding: slide.padding ?? 80,
      gap: slide.gap ?? 24,
      zIndex: 1,
      boxSizing: "border-box",
    };

    return (
      <div ref={ref} style={containerStyle}>
        {patternStyle && <div style={patternStyle} />}
        {bgImageStyle && <div style={bgImageStyle} />}
        {overlayStyle && <div style={overlayStyle} />}
        <div style={contentStyle} onClick={(e) => {
          if (e.target === e.currentTarget) onBackgroundClick?.();
        }}>
          {slide.elements.map((el) => (
            <ElementRenderer
              key={el.id}
              el={el}
              theme={theme}
              slide={slide}
              assets={assets}
              isActive={activeElementId === el.id}
              activeElementId={activeElementId}
              onElementClick={onElementClick}
              onClick={
                onElementClick
                  ? (e?: React.MouseEvent) => { e?.stopPropagation(); onElementClick(el.id); }
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    );
  }
);
