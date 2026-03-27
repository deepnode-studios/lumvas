import { create } from "zustand";

type ExportPhase = "idle" | "settings" | "rendering-frames" | "mixing-audio" | "encoding" | "done" | "error";

interface ExportStore {
  isExporting: boolean;
  progress: number; // 0–100
  currentPhase: ExportPhase;
  errorMessage: string | null;
  totalFrames: number;
  renderedFrames: number;
  /** The time (ms) the off-screen export renderer should display */
  exportTimeMs: number;

  /** User-configurable export settings */
  exportFps: number;
  exportScale: number; // 0.5 = half res, 1 = full, 2 = double

  setPhase: (phase: ExportPhase) => void;
  setProgress: (progress: number) => void;
  setFrameProgress: (rendered: number, total: number) => void;
  setError: (message: string) => void;
  setExportTime: (ms: number) => void;
  setExportFps: (fps: number) => void;
  setExportScale: (scale: number) => void;
  reset: () => void;
  /** Show the settings dialog */
  showSettings: () => void;
  startExport: () => void;
  cancelExport: () => void;
}

export const useExportStore = create<ExportStore>((set) => ({
  isExporting: false,
  progress: 0,
  currentPhase: "idle",
  errorMessage: null,
  totalFrames: 0,
  renderedFrames: 0,
  exportTimeMs: 0,
  exportFps: 30,
  exportScale: 1,

  setPhase: (phase) => set({ currentPhase: phase }),
  setProgress: (progress) => set({ progress }),
  setFrameProgress: (rendered, total) =>
    set({ renderedFrames: rendered, totalFrames: total, progress: total > 0 ? (rendered / total) * 100 : 0 }),
  setError: (message) => set({ currentPhase: "error", errorMessage: message, isExporting: false }),
  setExportTime: (ms) => set({ exportTimeMs: ms }),
  setExportFps: (fps) => set({ exportFps: fps }),
  setExportScale: (scale) => set({ exportScale: scale }),
  reset: () => set({ isExporting: false, progress: 0, currentPhase: "idle", errorMessage: null, totalFrames: 0, renderedFrames: 0, exportTimeMs: 0 }),
  showSettings: () => set({ currentPhase: "settings" }),
  startExport: () => set({ isExporting: true, progress: 0, currentPhase: "rendering-frames", errorMessage: null }),
  cancelExport: () => set({ isExporting: false, currentPhase: "idle" }),
}));
