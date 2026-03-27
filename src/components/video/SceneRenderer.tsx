import { forwardRef } from "react";
import type {
  VideoScene,
  SceneElement,
  ThemeNode,
  AssetItem,
  DocumentSize,
  SlideStyle,
} from "@/types/schema";
import { computeElementStyle } from "@/utils/animation";
import { resolveMediaSrc } from "@/utils/media";
import styles from "../slides/slides.module.css";

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
}

export const SceneRenderer = forwardRef<HTMLDivElement, SceneRendererProps>(
  function SceneRenderer(
    { scene, theme, assets, size, language, projectDir, currentTimeMs, activeElementId, onElementClick, onBackgroundClick },
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
          padding: scene.padding ?? 80,
          gap: scene.gap ?? 24,
          position: "relative",
          overflow: "hidden",
          fontFamily: theme.fontFamily,
          fontSize: theme.fontSize,
          fontWeight: theme.fontWeight,
          color: theme.primaryColor,
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
}) {
  const { transform, opacity, filter, visible } = computeElementStyle(element, sceneTimeMs, sceneDurationMs);

  if (!visible) return null;

  const color = resolveColor(element.color) || theme.primaryColor;
  const fontSize = element.fontSize ?? theme.fontSize;
  const fontWeight = element.fontWeight ?? theme.fontWeight;

  const activeOutline = isActive
    ? { boxShadow: "inset 0 0 0 3px #0071e3", borderRadius: 4 }
    : {};

  return (
    <div
      style={{
        transform: transform || undefined,
        opacity,
        filter: filter || undefined,
        willChange: "transform, opacity, filter",
        ...activeOutline,
        cursor: onClick ? "pointer" : undefined,
      }}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
    >
      {renderElementContent(element, { color, fontSize, fontWeight, theme, assets, projectDir })}
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
  },
) {
  switch (el.type) {
    case "text":
      return (
        <div
          style={{
            color: ctx.color,
            fontSize: el.fontSize ?? ctx.fontSize,
            fontWeight: el.fontWeight ?? ctx.fontWeight,
            textAlign: el.textAlign ?? "left",
            letterSpacing: el.letterSpacing,
            lineHeight: el.lineHeight,
            opacity: el.opacity,
            textTransform: el.textTransform,
            maxWidth: el.maxWidth,
            width: el.width,
          }}
        >
          {el.content || "\u00A0"}
        </div>
      );

    case "image": {
      const src = resolveMediaSrc(el.content, ctx.projectDir);
      return src ? (
        <img
          src={src}
          alt=""
          style={{
            width: el.width ?? "100%",
            height: el.height ?? "auto",
            objectFit: el.objectFit ?? "cover",
            borderRadius: el.borderRadius ?? ctx.theme.borderRadius,
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
      return (
        <img
          src={src}
          alt={asset?.label ?? "Logo"}
          style={{
            maxWidth: el.maxWidth ?? "120px",
            maxHeight: el.height ?? "80px",
            objectFit: "contain",
          }}
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
          borderRadius: el.borderRadius ?? ctx.theme.borderRadius,
          textAlign: "center",
        }}>
          {el.content || "Button"}
        </div>
      );

    case "group":
      return (
        <div style={{
          display: "flex",
          flexDirection: el.direction ?? "row",
          alignItems: el.alignItems ?? "center",
          justifyContent: el.justifyContent ?? "flex-start",
          gap: el.gap ?? 12,
          padding: el.padding,
          width: el.width,
        }}>
          {(el.children ?? []).map((child) => (
            <div key={child.id}>
              {renderElementContent(child, ctx)}
            </div>
          ))}
        </div>
      );

    default:
      return <div>{el.content}</div>;
  }
}
