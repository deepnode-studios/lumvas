import { useEffect, useState } from "react";
import { useFileStore, getAutoSave, clearAutoSave, type AutoSaveData } from "@/store/useFileStore";
import { useLumvasStore, DEFAULT_DOC, DOCUMENT_SIZES } from "@/store/useLumvasStore";
import type { VideoDocument } from "@/types/schema";
import { validateLumvasDocument } from "@/utils/validateDocument";
import styles from "./welcomeScreen.module.css";

export function WelcomeScreen() {
  const recentFiles = useFileStore((s) => s.recentFiles);
  const openFile = useFileStore((s) => s.openFile);
  const openFilePath = useFileStore((s) => s.openFilePath);
  const removeRecentFile = useFileStore((s) => s.removeRecentFile);
  const newDocument = useFileStore((s) => s.newDocument);
  const setDirty = useFileStore((s) => s.setDirty);

  const [autoSave, setAutoSave] = useState<AutoSaveData | null>(null);

  useEffect(() => {
    setAutoSave(getAutoSave());
  }, []);

  const handleStartDemo = () => {
    useLumvasStore.getState().importDocument(structuredClone(DEFAULT_DOC));
    setDirty(false);
    useFileStore.getState().setAppMode("workspace");
  };

  const handleNewVideo = () => {
    const doc: VideoDocument = {
      contentType: "video",
      documentSize: DOCUMENT_SIZES[3], // Landscape 16:9
      language: "en",
      assets: { items: [] },
      theme: {
        backgroundColor: "#0d1117",
        primaryColor: "#e6edf3",
        secondaryColor: "#8a2be2",
        fontFamily: "Inter, sans-serif",
        fonts: [
          { id: "header", label: "Header", value: "Inter, sans-serif" },
          { id: "body", label: "Body", value: "Inter, sans-serif" },
        ],
        fontSize: 24,
        fontWeight: 400,
        borderRadius: 12,
        palette: [],
      },
      content: {
        scenes: [{
          id: "scene-1",
          durationMs: 5000,
          alignItems: "center",
          justifyContent: "center",
          direction: "column",
          padding: 80,
          gap: 24,
          elements: [],
        }],
        audioTracks: [],
        captionTracks: [],
        settings: { fps: 30, format: "mp4", codec: "h264", quality: "standard" },
      },
    };
    useLumvasStore.getState().importDocument(doc);
    setDirty(false);
    useFileStore.getState().setAppMode("workspace");
  };

  const handleRecover = () => {
    if (!autoSave?.document) return;
    if (!validateLumvasDocument(autoSave.document)) {
      clearAutoSave();
      setAutoSave(null);
      return;
    }
    useLumvasStore.getState().importDocument(autoSave.document);
    useFileStore.setState({
      currentFilePath: autoSave.filePath,
      isDirty: true,
      appMode: "workspace",
    });
    clearAutoSave();
  };

  const handleDismissRecovery = () => {
    clearAutoSave();
    setAutoSave(null);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Recovery banner */}
        {autoSave && (
          <div className={styles.recoveryBanner}>
            <div className={styles.recoveryText}>
              <strong>Unsaved work found</strong>
              <span>{formatTime(autoSave.timestamp)}{autoSave.filePath ? ` — ${autoSave.filePath}` : ""}</span>
            </div>
            <div className={styles.recoveryActions}>
              <button className={styles.recoverBtn} onClick={handleRecover}>Recover</button>
              <button className={styles.dismissBtn} onClick={handleDismissRecovery}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Lumvas</h1>
          <p className={styles.subtitle}>Visual Media Suite</p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.actionBtnPrimary} onClick={newDocument}>
            <span className={styles.actionIcon}>+</span>
            New Carousel
          </button>
          <button className={styles.actionBtnPrimary} onClick={handleNewVideo} style={{ background: "#8a2be2" }}>
            <span className={styles.actionIcon}>▶</span>
            New Video
          </button>
          <button className={styles.actionBtn} onClick={handleStartDemo}>
            <span className={styles.actionIcon}>◆</span>
            Start with Demo
          </button>
          <button className={styles.actionBtn} onClick={openFile}>
            <span className={styles.actionIcon}>↗</span>
            Open Project…
          </button>
        </div>

        {/* Recent files */}
        {recentFiles.length > 0 && (
          <div className={styles.recentSection}>
            <h2 className={styles.recentTitle}>Recent Files</h2>
            <ul className={styles.recentList}>
              {recentFiles.map((f) => (
                <li key={f.path} className={styles.recentItem}>
                  <button
                    className={styles.recentFileBtn}
                    onClick={() => openFilePath(f.path)}
                    title={f.path}
                  >
                    <span className={styles.recentName}>{f.name}</span>
                    <span className={styles.recentPath}>{f.path}</span>
                  </button>
                  <button
                    className={styles.recentRemove}
                    onClick={(e) => { e.stopPropagation(); removeRecentFile(f.path); }}
                    title="Remove from recents"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
