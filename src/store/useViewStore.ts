import { create } from "zustand";

export type ViewMode = "single" | "horizontal" | "vertical";

const STORAGE_KEY = "lumvas-view-settings";

interface ViewStore {
  zoomIndex: number;
  viewMode: ViewMode;
  setZoomIndex: (idx: number) => void;
  setViewMode: (mode: ViewMode) => void;
  hydrateFromStorage: () => void;
}

function persist(state: Pick<ViewStore, "zoomIndex" | "viewMode">) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      zoomIndex: state.zoomIndex,
      viewMode: state.viewMode,
    }));
  } catch { /* quota exceeded */ }
}

export const useViewStore = create<ViewStore>((set, get) => ({
  zoomIndex: 4, // 0.5 default
  viewMode: "vertical",

  setZoomIndex: (idx) => {
    set({ zoomIndex: idx });
    persist(get());
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
    persist(get());
  },

  hydrateFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      set({
        zoomIndex: typeof parsed.zoomIndex === "number" ? parsed.zoomIndex : 4,
        viewMode: parsed.viewMode || "vertical",
      });
    } catch { /* ignore */ }
  },
}));
