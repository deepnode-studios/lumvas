import { create } from "zustand";
import { useLumvasStore, EMPTY_DOC } from "./useLumvasStore";
import { validateLumvasDocument } from "@/utils/validateDocument";
import { saveProject, loadProject } from "@/utils/lumvasFile";
import { getLastDialogPath, setLastDialogPath } from "@/utils/dialogPath";
import { basename } from "@/utils/path";
import type { LumvasDocument } from "@/types/schema";

const RECENT_KEY = "lumvas-recent-files";
const AUTOSAVE_KEY = "lumvas-autosave";
const MAX_RECENT = 10;

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

export interface AutoSaveData {
  document: LumvasDocument;
  filePath: string | null;
  timestamp: number;
}

interface FileStore {
  appMode: "welcome" | "workspace";
  setAppMode: (mode: "welcome" | "workspace") => void;

  // currentFilePath = project directory path (e.g. /home/user/MyProject.lumvas)
  currentFilePath: string | null;
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;

  recentFiles: RecentFile[];
  addRecentFile: (path: string) => void;
  removeRecentFile: (path: string) => void;
  clearRecentFiles: () => void;

  newDocument: () => void;
  openFile: () => Promise<void>;
  openFilePath: (path: string) => Promise<void>;
  save: () => Promise<void>;
  saveAs: () => Promise<void>;

  lastAutoSave: number | null;
  saveAutoSave: () => void;
  hydrateFromStorage: () => void;
}

function persistRecents(files: RecentFile[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(files));
  } catch { /* quota */ }
}

// Flag to skip dirty tracking during file load
let _skipDirtyTracking = false;

export const useFileStore = create<FileStore>((set, get) => ({
  appMode: "welcome",
  setAppMode: (mode) => set({ appMode: mode }),

  currentFilePath: null,
  isDirty: false,
  setDirty: (dirty) => set({ isDirty: dirty }),

  recentFiles: [],

  addRecentFile: (path) => {
    const files = get().recentFiles.filter((f) => f.path !== path);
    files.unshift({ path, name: basename(path), lastOpened: Date.now() });
    if (files.length > MAX_RECENT) files.pop();
    set({ recentFiles: files });
    persistRecents(files);
  },

  removeRecentFile: (path) => {
    const files = get().recentFiles.filter((f) => f.path !== path);
    set({ recentFiles: files });
    persistRecents(files);
  },

  clearRecentFiles: () => {
    set({ recentFiles: [] });
    persistRecents([]);
  },

  newDocument: () => {
    _skipDirtyTracking = true;
    useLumvasStore.getState().importDocument(structuredClone(EMPTY_DOC));
    _skipDirtyTracking = false;
    set({ currentFilePath: null, isDirty: false, appMode: "workspace" });
    updateWindowTitle(null, false);
  },

  openFile: async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    // Open a .lumvas project directory
    const selected = await open({
      directory: true,
      title: "Open Lumvas Project",
      defaultPath: getLastDialogPath(),
    });
    if (!selected) return;
    setLastDialogPath(selected as string);
    await get().openFilePath(selected as string);
  },

  openFilePath: async (projectDir) => {
    try {
      const doc = await loadProject(projectDir);
      if (!validateLumvasDocument(doc)) {
        console.error("Invalid lumvas project:", projectDir);
        return;
      }
      _skipDirtyTracking = true;
      useLumvasStore.getState().importDocument(doc);
      _skipDirtyTracking = false;
      set({ currentFilePath: projectDir, isDirty: false, appMode: "workspace" });
      get().addRecentFile(projectDir);
      updateWindowTitle(projectDir, false);
    } catch (err) {
      console.error("Failed to open project:", err);
    }
  },

  save: async () => {
    const { currentFilePath } = get();
    if (!currentFilePath) {
      await get().saveAs();
      return;
    }
    try {
      const doc = useLumvasStore.getState().getDocument();
      await saveProject(currentFilePath, doc);
      set({ isDirty: false });
      updateWindowTitle(currentFilePath, false);
      clearAutoSave();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  },

  saveAs: async () => {
    const { save: saveDialog } = await import("@tauri-apps/plugin-dialog");
    // User picks a file name and location
    const filePath = await saveDialog({
      title: "Save project as",
      defaultPath: getLastDialogPath() ? `${getLastDialogPath()}/project.lumvas` : "project.lumvas",
      filters: [{ name: "Lumvas Project", extensions: ["lumvas"] }],
    });
    if (!filePath) return;
    // Ensure .lumvas extension
    const projectDir = (filePath as string).endsWith(".lumvas") ? (filePath as string) : `${filePath}.lumvas`;
    setLastDialogPath(projectDir.substring(0, projectDir.lastIndexOf("/")));
    try {
      const doc = useLumvasStore.getState().getDocument();
      await saveProject(projectDir, doc);
      set({ currentFilePath: projectDir, isDirty: false });
      get().addRecentFile(projectDir);
      updateWindowTitle(projectDir, false);
      clearAutoSave();
    } catch (err) {
      console.error("Failed to save as:", err);
    }
  },

  lastAutoSave: null,

  saveAutoSave: () => {
    const { appMode, isDirty } = get();
    if (appMode !== "workspace" || !isDirty) return;
    const doc = useLumvasStore.getState().getDocument();
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
        document: doc,
        filePath: get().currentFilePath,
        timestamp: Date.now(),
      } satisfies AutoSaveData));
      set({ lastAutoSave: Date.now() });
    } catch { /* quota exceeded */ }
  },

  hydrateFromStorage: () => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RecentFile[];
      if (Array.isArray(parsed)) {
        set({ recentFiles: parsed.slice(0, MAX_RECENT) });
      }
    } catch { /* ignore */ }
  },
}));

// ── Dirty tracking via subscription ──

useLumvasStore.subscribe(
  (state, prevState) => {
    if (_skipDirtyTracking) return;
    if (
      state.documentSize !== prevState.documentSize ||
      state.assets !== prevState.assets ||
      state.theme !== prevState.theme ||
      state.content !== prevState.content
    ) {
      useFileStore.getState().setDirty(true);
      const path = useFileStore.getState().currentFilePath;
      updateWindowTitle(path, true);
    }
  },
);

// ── Auto-save ──

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoSave() {
  if (autoSaveTimer) return;
  autoSaveTimer = setInterval(() => {
    useFileStore.getState().saveAutoSave();
  }, 30_000);
}

export function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

export function getAutoSave(): AutoSaveData | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AutoSaveData;
  } catch {
    return null;
  }
}

export function clearAutoSave() {
  localStorage.removeItem(AUTOSAVE_KEY);
}

// ── Window title ──

async function updateWindowTitle(filePath: string | null, dirty: boolean) {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const name = filePath ? basename(filePath) : "Untitled";
    const title = `${dirty ? "● " : ""}${name} — Lumvas`;
    getCurrentWindow().setTitle(title);
  } catch { /* not in Tauri context */ }
}
