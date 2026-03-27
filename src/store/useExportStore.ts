import { create } from "zustand";

type ExportPhase = "idle" | "rendering-frames" | "mixing-audio" | "encoding" | "done" | "error";

interface ExportStore {
  isExporting: boolean;
  progress: number; // 0–100
  currentPhase: ExportPhase;
  errorMessage: string | null;
  totalFrames: number;
  renderedFrames: number;

  setPhase: (phase: ExportPhase) => void;
  setProgress: (progress: number) => void;
  setFrameProgress: (rendered: number, total: number) => void;
  setError: (message: string) => void;
  reset: () => void;
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

  setPhase: (phase) => set({ currentPhase: phase }),
  setProgress: (progress) => set({ progress }),
  setFrameProgress: (rendered, total) =>
    set({ renderedFrames: rendered, totalFrames: total, progress: total > 0 ? (rendered / total) * 100 : 0 }),
  setError: (message) => set({ currentPhase: "error", errorMessage: message, isExporting: false }),
  reset: () => set({ isExporting: false, progress: 0, currentPhase: "idle", errorMessage: null, totalFrames: 0, renderedFrames: 0 }),
  startExport: () => set({ isExporting: true, progress: 0, currentPhase: "rendering-frames", errorMessage: null }),
  cancelExport: () => set({ isExporting: false, currentPhase: "idle" }),
}));
