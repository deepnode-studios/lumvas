"use client";

import { useRef, useEffect, useCallback } from "react";
import { useLumvasStore, selectSlideContent } from "@/store/useLumvasStore";
import { useFileStore } from "@/store/useFileStore";
import { useViewStore, type ViewMode } from "@/store/useViewStore";
import { SlideRenderer } from "@/components/slides/SlideRenderer";
import canvasStyles from "./renderCanvas.module.css";

const ZOOM_STEPS = [0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_INDEX = 4; // 0.5

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function RenderCanvas() {
  const slides = useLumvasStore((s) => selectSlideContent(s).slides);
  const theme = useLumvasStore((s) => s.theme);
  const assets = useLumvasStore((s) => s.assets.items);
  const size = useLumvasStore((s) => s.documentSize);
  const language = useLumvasStore((s) => s.language);
  const activeSlideId = useLumvasStore((s) => s.activeSlideId);
  const setActiveSlide = useLumvasStore((s) => s.setActiveSlide);
  const activeElementId = useLumvasStore((s) => s.activeElementId);
  const setActiveElement = useLumvasStore((s) => s.setActiveElement);
  const slideRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const viewMode = useViewStore((s) => s.viewMode);
  const setViewMode = useViewStore((s) => s.setViewMode);
  const zoomIdx = useViewStore((s) => s.zoomIndex);
  const setZoomIdx = useViewStore((s) => s.setZoomIndex);
  const projectDir = useFileStore((s) => s.currentFilePath);
  const canvasRef = useRef<HTMLDivElement>(null);

  const zoom = ZOOM_STEPS[zoomIdx];
  const zoomPercent = Math.round(zoom * 100);

  const activeSlide = slides.find((s) => s.id === activeSlideId) ?? slides[0];


  const zoomIn = useCallback(() => {
    setZoomIdx(clamp(useViewStore.getState().zoomIndex + 1, 0, ZOOM_STEPS.length - 1));
  }, [setZoomIdx]);

  const zoomOut = useCallback(() => {
    setZoomIdx(clamp(useViewStore.getState().zoomIndex - 1, 0, ZOOM_STEPS.length - 1));
  }, [setZoomIdx]);

  const zoomFit = useCallback(() => {
    setZoomIdx(DEFAULT_ZOOM_INDEX);
  }, []);

  // Arrow keys to navigate slides
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

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
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides, activeSlideId, setActiveSlide]);

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
                    projectDir={projectDir}
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
                      projectDir={projectDir}
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
            projectDir={projectDir}
          />
        ))}
      </div>
    </div>
  );
}
