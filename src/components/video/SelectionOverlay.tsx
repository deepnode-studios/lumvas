/**
 * SelectionOverlay — a transparent canvas layered on top of the WebGL
 * preview canvas. Handles:
 *   - Hit-testing (click → select element)
 *   - Drag-to-move elements
 *   - Drawing selection outlines and handles
 *
 * This replaces the per-element <div> interaction from SceneRenderer.
 */

import { useRef, useEffect, useCallback } from "react";
import type { VideoScene, ThemeNode, AssetItem, DocumentSize } from "@/types/schema";
import { computeSceneLayout, type SceneElementLayout } from "@/utils/canvasRenderer";

interface SelectionOverlayProps {
  scene: VideoScene;
  theme: ThemeNode;
  assets: AssetItem[];
  size: DocumentSize;
  projectDir: string | null | undefined;
  sceneTimeMs: number;
  previewScale: number;
  activeElementId?: string | null;
  onElementClick?: (id: string) => void;
  onBackgroundClick?: () => void;
  onElementDragMove?: (id: string, dx: number, dy: number) => void;
}

export function SelectionOverlay({
  scene,
  theme,
  assets,
  size,
  projectDir,
  sceneTimeMs,
  previewScale,
  activeElementId,
  onElementClick,
  onBackgroundClick,
  onElementDragMove,
}: SelectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<SceneElementLayout[]>([]);
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Lazily create a measurement canvas (for text measurement in computeSceneLayout)
  const getMeasureCtx = useCallback(() => {
    if (!measureCtxRef.current) {
      const c = document.createElement("canvas");
      c.width = 1; c.height = 1;
      measureCtxRef.current = c.getContext("2d")!;
    }
    return measureCtxRef.current;
  }, []);

  // Recompute layout and draw selection outline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Compute layout for hit-testing
    const layout = computeSceneLayout(
      getMeasureCtx(), scene, theme, assets, size, projectDir, sceneTimeMs,
    );
    layoutRef.current = layout;

    // Clear and draw selection
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!activeElementId) return;
    const active = layout.find((l) => l.id === activeElementId);
    if (!active || !active.visible) return;

    const b = active.box;
    ctx.save();
    ctx.scale(previewScale, previewScale);

    // Transform to element center for rotation
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.translate(cx, cy);
    if (active.rotation) ctx.rotate((active.rotation * Math.PI) / 180);
    if (active.scale !== 1) ctx.scale(active.scale, active.scale);
    ctx.translate(-b.w / 2, -b.h / 2);

    // Selection outline
    ctx.strokeStyle = "#0071e3";
    ctx.lineWidth = 2 / previewScale;
    ctx.setLineDash([6 / previewScale, 3 / previewScale]);
    ctx.strokeRect(0, 0, b.w, b.h);

    // Corner handles
    ctx.setLineDash([]);
    ctx.fillStyle = "#0071e3";
    const hs = 6 / previewScale; // handle size
    const corners = [
      [0, 0], [b.w, 0], [0, b.h], [b.w, b.h],
      [b.w / 2, 0], [b.w / 2, b.h], [0, b.h / 2], [b.w, b.h / 2],
    ];
    for (const [hx, hy] of corners) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }

    ctx.restore();
  }, [scene, sceneTimeMs, activeElementId, previewScale, theme, assets, size, projectDir, getMeasureCtx]);

  // Hit-test: find the topmost visible element under a click
  const hitTest = useCallback((clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sceneX = (clientX - rect.left) / previewScale;
    const sceneY = (clientY - rect.top) / previewScale;

    // Iterate in reverse (topmost element = last rendered = last in array)
    const layout = layoutRef.current;
    for (let i = layout.length - 1; i >= 0; i--) {
      const el = layout[i];
      if (!el.visible) continue;
      const b = el.box;
      // Simple AABB test (ignores rotation for now — good enough for most cases)
      if (sceneX >= b.x && sceneX <= b.x + b.w && sceneY >= b.y && sceneY <= b.y + b.h) {
        return el.id;
      }
    }
    return null;
  }, [previewScale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const hitId = hitTest(e.clientX, e.clientY);

    if (!hitId) {
      onBackgroundClick?.();
      return;
    }

    // Select the element
    onElementClick?.(hitId);

    if (!onElementDragMove) return;

    // Start drag
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / previewScale;
      const dy = (ev.clientY - startY) / previewScale;
      if (!moved && Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      moved = true;
      onElementDragMove(hitId, dx, dy);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [hitTest, onElementClick, onBackgroundClick, onElementDragMove, previewScale]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(size.width * previewScale)}
      height={Math.round(size.height * previewScale)}
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: size.width * previewScale,
        height: size.height * previewScale,
        cursor: activeElementId ? "grab" : "default",
        // Transparent — only draws selection outlines
      }}
    />
  );
}
