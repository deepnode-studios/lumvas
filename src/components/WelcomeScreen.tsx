import { useEffect, useState } from "react";
import { useFileStore, getAutoSave, clearAutoSave, type AutoSaveData } from "@/store/useFileStore";
import { useLumvasStore, DEFAULT_DOC } from "@/store/useLumvasStore";
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
          <p className={styles.subtitle}>Visual Carousel Builder</p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.actionBtnPrimary} onClick={newDocument}>
            <span className={styles.actionIcon}>+</span>
            New Empty Project
          </button>
          <button className={styles.actionBtn} onClick={handleStartDemo}>
            <span className={styles.actionIcon}>◆</span>
            Start with Demo
          </button>
          <button className={styles.actionBtn} onClick={openFile}>
            <span className={styles.actionIcon}>↗</span>
            Open File…
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
