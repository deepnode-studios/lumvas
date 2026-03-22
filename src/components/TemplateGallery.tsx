"use client";

import { useState, useEffect, useRef } from "react";
import { useJsonvasStore } from "@/store/useJsonvasStore";
import { useTemplateStore } from "@/store/useTemplateStore";
import { TEMPLATE_CATEGORIES } from "@/store/templates";
import { instantiateTemplate, slideToTemplate } from "@/store/templates";
import { SlideRenderer } from "@/components/slides/SlideRenderer";
import type { SlideTemplate } from "@/types/schema";
import styles from "@/styles/workspace.module.css";
import g from "./templateGallery.module.css";

/** Mini slide preview — renders the real slide at a tiny scale */
function TemplatePreview({ template }: { template: SlideTemplate }) {
  const theme = useJsonvasStore((s) => s.theme);
  const assets = useJsonvasStore((s) => s.assets.items);
  const size = useJsonvasStore((s) => s.documentSize);
  const language = useJsonvasStore((s) => s.language);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.offsetWidth;
    setScale(w / size.width);
  }, [size.width]);

  // Build a temporary slide with IDs for rendering
  const previewSlide = {
    ...template.slide,
    id: template.id,
    elements: template.slide.elements.map((el, i) => ({
      ...el,
      id: `${template.id}-el-${i}`,
    })),
  };

  return (
    <div ref={containerRef} className={g.cardPreview}>
      <div
        className={g.cardPreviewInner}
        style={{
          width: size.width,
          height: size.height,
          transform: `scale(${scale})`,
        }}
      >
        <SlideRenderer
          slide={previewSlide}
          theme={{ ...theme, ...(template.slide.style ? {} : {}) }}
          assets={assets}
          size={size}
          language={language}
        />
      </div>
    </div>
  );
}

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
  /** If provided, shows "Save current slide" form */
  saveSlideId?: string | null;
}

export function TemplateGallery({ open, onClose, saveSlideId }: TemplateGalleryProps) {
  const addSlide = useJsonvasStore((s) => s.addSlide);
  const slides = useJsonvasStore((s) => s.content.slides);
  const allTemplates = useTemplateStore((s) => s.allTemplates);
  const addCustomTemplate = useTemplateStore((s) => s.addCustomTemplate);
  const removeCustomTemplate = useTemplateStore((s) => s.removeCustomTemplate);
  const hydrate = useTemplateStore((s) => s.hydrateFromStorage);

  const [category, setCategory] = useState("All");
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] = useState("Custom");

  // Hydrate custom templates from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!open) return null;

  const templates = allTemplates();
  const filtered =
    category === "All"
      ? templates
      : templates.filter((t) => t.category === category);

  const handleUseTemplate = (template: SlideTemplate) => {
    const slide = instantiateTemplate(template);
    addSlide(slide);
    onClose();
  };

  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeCustomTemplate(id);
  };

  const handleSaveCurrent = () => {
    if (!saveName.trim()) return;
    const slide = slides.find((s) => s.id === saveSlideId);
    if (!slide) return;
    const template = slideToTemplate(slide, saveName.trim(), saveCategory);
    addCustomTemplate(template);
    setSaveName("");
  };

  // Unique categories including custom ones
  const customCats = [...new Set(templates.filter((t) => !t.builtIn).map((t) => t.category))];
  const allCats = [...TEMPLATE_CATEGORIES, ...customCats.filter((c) => !TEMPLATE_CATEGORIES.includes(c))];

  return (
    <div className={g.overlay} onClick={onClose}>
      <div className={g.modal} onClick={(e) => e.stopPropagation()}>
        <div className={g.header}>
          <span className={g.headerTitle}>Slide Templates</span>
          <button className={g.close} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Category filter */}
        <div className={g.categories}>
          {allCats.map((cat) => (
            <button
              key={cat}
              className={`${g.catBtn} ${category === cat ? g.catBtnActive : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
              {cat !== "All" && (
                <> ({templates.filter((t) => t.category === cat).length})</>
              )}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className={g.grid}>
          {filtered.length === 0 && (
            <div className={g.emptyState}>No templates in this category.</div>
          )}
          {filtered.map((template) => (
            <div
              key={template.id}
              className={g.card}
              onClick={() => handleUseTemplate(template)}
              title={`Use "${template.name}"`}
            >
              <TemplatePreview template={template} />
              <div className={g.cardInfo}>
                <span className={g.cardName}>{template.name}</span>
                {!template.builtIn && (
                  <div className={g.cardActions}>
                    <button
                      className={g.cardDeleteBtn}
                      onClick={(e) => handleDeleteTemplate(e, template.id)}
                      title="Delete template"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Save current slide as template */}
        {saveSlideId && slides.find((s) => s.id === saveSlideId) && (
          <div className={g.saveForm}>
            <input
              className={g.saveInput}
              type="text"
              placeholder="Template name..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveCurrent();
              }}
            />
            <select
              className={g.saveSelect}
              value={saveCategory}
              onChange={(e) => setSaveCategory(e.target.value)}
            >
              {["Custom", ...TEMPLATE_CATEGORIES.filter((c) => c !== "All" && c !== "Blank")].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
            <button className={styles.btnPrimary} onClick={handleSaveCurrent}>
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
