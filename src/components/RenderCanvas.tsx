"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useJsonvasStore } from "@/store/useJsonvasStore";
import { SlideRenderer } from "@/components/slides/SlideRenderer";
import canvasStyles from "./renderCanvas.module.css";

type ViewMode = "single" | "horizontal" | "vertical";

const ZOOM_STEPS = [0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_INDEX = 4; // 0.5

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function RenderCanvas() {
  const slides = useJsonvasStore((s) => s.content.slides);
  const theme = useJsonvasStore((s) => s.theme);
  const assets = useJsonvasStore((s) => s.assets.items);
  const size = useJsonvasStore((s) => s.documentSize);
  const language = useJsonvasStore((s) => s.language);
  const activeSlideId = useJsonvasStore((s) => s.activeSlideId);
  const setActiveSlide = useJsonvasStore((s) => s.setActiveSlide);
  const activeElementId = useJsonvasStore((s) => s.activeElementId);
  const setActiveElement = useJsonvasStore((s) => s.setActiveElement);
  const slideRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>("vertical");
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_INDEX);
  const canvasRef = useRef<HTMLDivElement>(null);

  const zoom = ZOOM_STEPS[zoomIdx];
  const zoomPercent = Math.round(zoom * 100);

  const activeSlide = slides.find((s) => s.id === activeSlideId) ?? slides[0];


  const zoomIn = useCallback(() => {
    setZoomIdx((i) => clamp(i + 1, 0, ZOOM_STEPS.length - 1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomIdx((i) => clamp(i - 1, 0, ZOOM_STEPS.length - 1));
  }, []);

  const zoomFit = useCallback(() => {
    setZoomIdx(DEFAULT_ZOOM_INDEX);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + = / + → zoom in
      if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomIn();
      }
      // Ctrl/Cmd + - → zoom out
      if (mod && e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
      // Ctrl/Cmd + 0 → fit to view
      if (mod && e.key === "0") {
        e.preventDefault();
        zoomFit();
      }
      // Ctrl/Cmd + 1 → 100%
      if (mod && e.key === "1") {
        e.preventDefault();
        setZoomIdx(ZOOM_STEPS.indexOf(1));
      }
      // Arrow left / right to navigate slides (no modifier, not in an input)
      const tag = (e.target as HTMLElement).tagName;
      if (!mod && !e.shiftKey && !e.altKey && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          const idx = slides.findIndex((s) => s.id === activeSlideId);
          if (idx > 0) {
            e.preventDefault();
            setActiveSlide(slides[idx - 1].id);
          }
        }
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          const idx = slides.findIndex((s) => s.id === activeSlideId);
          if (idx < slides.length - 1) {
            e.preventDefault();
            setActiveSlide(slides[idx + 1].id);
          }
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, zoomFit, slides, activeSlideId, setActiveSlide]);

  // Ctrl/Cmd + scroll wheel to zoom
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomIn, zoomOut]);

  if (!slides.length) {
    return (
      <div className={canvasStyles.empty}>
        <p>No slides yet. Add one to get started.</p>
      </div>
    );
  }

  return (
    <div className={canvasStyles.wrapper} ref={canvasRef}>
      {/* Top controls */}
      <div className={canvasStyles.topBar}>
        <span className={canvasStyles.sizeLabel}>{size.label}</span>
        <div className={canvasStyles.viewToggle}>
          <button
            className={`${canvasStyles.viewBtn} ${viewMode === "single" ? canvasStyles.viewBtnActive : ""}`}
            onClick={() => setViewMode("single")}
            title="Single slide"
          >
            &#9632;
          </button>
          <button
            className={`${canvasStyles.viewBtn} ${viewMode === "horizontal" ? canvasStyles.viewBtnActive : ""}`}
            onClick={() => setViewMode("horizontal")}
            title="Horizontal list"
          >
            &#9644;&#9644;&#9644;
          </button>
          <button
            className={`${canvasStyles.viewBtn} ${viewMode === "vertical" ? canvasStyles.viewBtnActive : ""}`}
            onClick={() => setViewMode("vertical")}
            title="Vertical list"
          >
            &#9650;&#9660;
          </button>
        </div>
      </div>

      {/* Scrollable canvas area */}
      <div className={canvasStyles.canvasScroll}>
        {viewMode === "single" && (
          <div className={canvasStyles.singleView}>
            <div className={canvasStyles.pagination}>
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  className={`${canvasStyles.pageDot} ${
                    slide.id === activeSlide?.id ? canvasStyles.pageDotActive : ""
                  }`}
                  onClick={() => setActiveSlide(slide.id)}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {activeSlide && (
              <div
                className={canvasStyles.stageWrapper}
                style={{
                  width: size.width * zoom,
                  height: size.height * zoom,
                }}
              >
                <div
                  className={canvasStyles.stage}
                  style={{
                    width: size.width,
                    height: size.height,
                    transform: `scale(${zoom})`,
                  }}
                >
                  <SlideRenderer
                    ref={(el) => {
                      if (el) slideRefs.current.set(activeSlide.id, el);
                    }}
                    slide={activeSlide}
                    theme={theme}
                    assets={assets}
                    size={size}
                    language={language}
                    activeElementId={activeElementId}
                    onElementClick={setActiveElement}
                    onBackgroundClick={() => setActiveElement(null)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {(viewMode === "horizontal" || viewMode === "vertical") && (
          <div
            className={
              viewMode === "horizontal"
                ? canvasStyles.multiHorizontal
                : canvasStyles.multiVertical
            }
          >
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className={`${canvasStyles.multiItem} ${
                  slide.id === activeSlideId ? canvasStyles.multiItemActive : ""
                }`}
                onClick={() => setActiveSlide(slide.id)}
              >
                <span className={canvasStyles.multiIndex}>{i + 1}</span>
                <div
                  className={canvasStyles.stageWrapper}
                  style={{
                    width: size.width * zoom,
                    height: size.height * zoom,
                  }}
                >
                  <div
                    className={canvasStyles.stage}
                    style={{
                      width: size.width,
                      height: size.height,
                      transform: `scale(${zoom})`,
                    }}
                  >
                    <SlideRenderer
                      slide={slide}
                      theme={theme}
                      assets={assets}
                      size={size}
                      activeElementId={slide.id === activeSlideId ? activeElementId : null}
                      onElementClick={(id) => {
                        setActiveSlide(slide.id);
                        setActiveElement(id);
                      }}
                      onBackgroundClick={() => setActiveElement(null)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom zoom bar */}
      <div className={canvasStyles.zoomBar}>
        <button className={canvasStyles.zoomBtn} onClick={zoomOut} title="Zoom out (Ctrl -)">
          &minus;
        </button>
        <button className={canvasStyles.zoomLevel} onClick={zoomFit} title="Fit to view (Ctrl 0)">
          {zoomPercent}%
        </button>
        <button className={canvasStyles.zoomBtn} onClick={zoomIn} title="Zoom in (Ctrl +)">
          +
        </button>
      </div>

      {/* Hidden full-size slides for export */}
      <div className={canvasStyles.exportHidden} id="export-slides">
        {slides.map((slide) => (
          <SlideRenderer
            key={slide.id}
            ref={(el) => {
              if (el) slideRefs.current.set(`export-${slide.id}`, el);
            }}
            slide={slide}
            theme={theme}
            assets={assets}
            size={size}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}
