import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useFileStore } from "@/store/useFileStore";
import { useViewStore } from "@/store/useViewStore";
import { exportSlidesToFolder, exportMerged } from "@/utils/exportSlides";

const ZOOM_STEPS = [0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2];

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function useMenuEvents() {
  useEffect(() => {
    let cancelled = false;
    const unlisteners: UnlistenFn[] = [];

    async function setup() {
      const listeners: Array<[string, () => void]> = [
        ["menu:new", () => useFileStore.getState().newDocument()],
        ["menu:open", () => useFileStore.getState().openFile()],
        ["menu:save", () => useFileStore.getState().save()],
        ["menu:save_as", () => useFileStore.getState().saveAs()],
        ["menu:export_slides", () => exportSlidesToFolder()],
        ["menu:export_merge_h", () => exportMerged("horizontal")],
        ["menu:export_merge_v", () => exportMerged("vertical")],
        ["menu:zoom_in", () => {
          const idx = useViewStore.getState().zoomIndex;
          useViewStore.getState().setZoomIndex(clamp(idx + 1, 0, ZOOM_STEPS.length - 1));
        }],
        ["menu:zoom_out", () => {
          const idx = useViewStore.getState().zoomIndex;
          useViewStore.getState().setZoomIndex(clamp(idx - 1, 0, ZOOM_STEPS.length - 1));
        }],
        ["menu:zoom_reset", () => useViewStore.getState().setZoomIndex(4)],
        ["menu:view_single", () => useViewStore.getState().setViewMode("single")],
        ["menu:view_horizontal", () => useViewStore.getState().setViewMode("horizontal")],
        ["menu:view_vertical", () => useViewStore.getState().setViewMode("vertical")],
      ];

      for (const [event, handler] of listeners) {
        if (cancelled) return;
        const unlisten = await listen(event, handler);
        if (cancelled) { unlisten(); return; }
        unlisteners.push(unlisten);
      }
    }

    setup();

    return () => {
      cancelled = true;
      unlisteners.forEach((fn) => fn());
    };
  }, []);
}
