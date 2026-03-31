import { useEffect, useRef } from "react";
import { renderSceneToCanvas } from "@/utils/canvasRenderer";
import type { VideoScene, ThemeNode, AssetItem, DocumentSize } from "@/types/schema";

const THUMB_W = 128;
const THUMB_H = 72;

interface Props {
  scene: VideoScene;
  theme: ThemeNode;
  assets: AssetItem[];
  size: DocumentSize;
  projectDir?: string | null;
  language?: string;
  /** Scene-relative time to render (defaults to midpoint) */
  atMs?: number;
}

export function SceneThumbnail({ scene, theme, assets, size, projectDir, language, atMs }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderScheduled = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (renderScheduled.current) clearTimeout(renderScheduled.current);
    renderScheduled.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sceneTime = atMs ?? scene.durationMs / 2;

      // Render at thumb size using canvas scale
      ctx.save();
      ctx.scale(THUMB_W / size.width, THUMB_H / size.height);
      renderSceneToCanvas(ctx, scene, theme, assets, size, projectDir ?? null, sceneTime, language);
      ctx.restore();
    }, 250);
    return () => { if (renderScheduled.current) clearTimeout(renderScheduled.current); };
  }, [scene, theme, assets, size, projectDir, atMs]);

  return (
    <canvas
      ref={canvasRef}
      width={THUMB_W}
      height={THUMB_H}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", opacity: 0.45, borderRadius: 4, pointerEvents: "none",
      }}
    />
  );
}
