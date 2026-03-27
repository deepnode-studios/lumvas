"use client";

import { ThemeEditor } from "@/components/ThemeEditor";
import { AssetManager } from "@/components/AssetManager";
import { CarouselBuilder } from "@/components/CarouselBuilder";
import { RenderCanvas } from "@/components/RenderCanvas";
import { LLMBridge } from "@/components/LLMBridge";
import { useGoogleFonts } from "@/hooks/useGoogleFonts";
import { useMenuEvents } from "@/hooks/useMenuEvents";
import { useLumvasStore } from "@/store/useLumvasStore";
import { useFileStore } from "@/store/useFileStore";
import { basename } from "@/utils/path";
import { useEffect } from "react";
import styles from "@/styles/workspace.module.css";

export function Workspace() {
  useGoogleFonts();
  useMenuEvents();

  const currentFilePath = useFileStore((s) => s.currentFilePath);
  const isDirty = useFileStore((s) => s.isDirty);

  const fileName = currentFilePath ? basename(currentFilePath) : "Untitled";

  // Undo/Redo (not in inputs/textareas)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useLumvasStore.getState().undo();
      } else if (
        (e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey ||
        (e.ctrlKey || e.metaKey) && e.key === "y"
      ) {
        e.preventDefault();
        useLumvasStore.getState().redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-save on beforeunload
  useEffect(() => {
    const handler = () => useFileStore.getState().saveAutoSave();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.headerFile}>
          {isDirty && <span className={styles.dirtyDot}>●</span>}
          {fileName}
        </span>
        <div className={styles.headerActions}>
          <LLMBridge />
        </div>
      </header>

      <aside className={styles.leftPanel}>
        <ThemeEditor />
        <AssetManager />
      </aside>

      <main className={styles.canvas}>
        <RenderCanvas />
      </main>

      <aside className={styles.rightPanel}>
        <CarouselBuilder />
      </aside>
    </div>
  );
}
