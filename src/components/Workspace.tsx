"use client";

import { ThemeEditor } from "@/components/ThemeEditor";
import { AssetManager } from "@/components/AssetManager";
import { CarouselBuilder } from "@/components/CarouselBuilder";
import { RenderCanvas } from "@/components/RenderCanvas";
import { LLMBridge } from "@/components/LLMBridge";
import { useGoogleFonts } from "@/hooks/useGoogleFonts";
import styles from "@/styles/workspace.module.css";

export function Workspace() {
  useGoogleFonts();
  return (
    <div className={styles.layout}>
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.headerTitle}>Jsonvas</span>
        <div className={styles.headerActions}>
          <LLMBridge />
        </div>
      </header>

      {/* Left panel: theme + assets */}
      <aside className={styles.leftPanel}>
        <ThemeEditor />
        <AssetManager />
      </aside>

      {/* Center: render canvas */}
      <main className={styles.canvas}>
        <RenderCanvas />
      </main>

      {/* Right panel: carousel builder */}
      <aside className={styles.rightPanel}>
        <CarouselBuilder />
      </aside>
    </div>
  );
}
