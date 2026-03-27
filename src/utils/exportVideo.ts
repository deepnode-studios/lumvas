import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { useExportStore } from "@/store/useExportStore";
import { getSceneStartMs } from "@/store/useTimelineStore";
import { getLastDialogPath, setLastDialogPath, revealInFolder } from "./dialogPath";
import type { VideoContentNode } from "@/types/schema";

/**
 * Export a video project:
 * 1. Render each frame as PNG via html-to-image
 * 2. Mix audio tracks via FFmpeg
 * 3. Encode frames + audio into MP4/WebM via FFmpeg
 */
export async function exportVideo() {
  const store = useLumvasStore.getState();
  if (store.contentType !== "video") return;
  const vc = selectVideoContent(store);
  const { settings } = vc;

  // Pick output path
  const { save } = await import("@tauri-apps/plugin-dialog");
  const ext = settings.format === "webm" ? "webm" : "mp4";
  const outputPath = await save({
    filters: [{ name: `${ext.toUpperCase()} Video`, extensions: [ext] }],
    defaultPath: getLastDialogPath()
      ? `${getLastDialogPath()}/output.${ext}`
      : `output.${ext}`,
  });
  if (!outputPath) return;
  setLastDialogPath(outputPath);

  const exportStore = useExportStore.getState();
  exportStore.startExport();

  try {
    // Create temp directory for frames
    const { invoke } = await import("@tauri-apps/api/core");
    const { mkdir, writeFile } = await import("@tauri-apps/plugin-fs");
    const { appDataDir } = await import("@tauri-apps/api/path");
    const dataDir = await appDataDir();
    const tempDir = `${dataDir}/export-temp-${Date.now()}`;
    const framesDir = `${tempDir}/frames`;
    await mkdir(framesDir, { recursive: true });

    // Phase 1: Render frames
    exportStore.setPhase("rendering-frames");
    const totalDurationMs = vc.scenes.reduce((sum, s) => sum + s.durationMs, 0);
    const frameIntervalMs = 1000 / settings.fps;
    const totalFrames = Math.ceil(totalDurationMs / frameIntervalMs);

    const { toPng } = await import("html-to-image");
    const container = document.getElementById("export-scenes");

    if (!container) {
      exportStore.setError("Export container not found");
      return;
    }

    const size = store.documentSize;

    for (let i = 0; i < totalFrames; i++) {
      if (!useExportStore.getState().isExporting) break; // cancelled

      const timeMs = i * frameIntervalMs;
      // Find which scene is active at this time
      let elapsed = 0;
      let sceneEl: HTMLElement | null = null;
      for (let si = 0; si < container.children.length; si++) {
        const sceneDuration = vc.scenes[si].durationMs;
        if (timeMs >= elapsed && timeMs < elapsed + sceneDuration) {
          sceneEl = container.children[si] as HTMLElement;
          break;
        }
        elapsed += sceneDuration;
      }

      if (sceneEl) {
        const dataUrl = await toPng(sceneEl, { width: size.width, height: size.height, pixelRatio: 2 });
        const base64 = dataUrl.split(",")[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let b = 0; b < binary.length; b++) bytes[b] = binary.charCodeAt(b);
        const framePath = `${framesDir}/frame-${String(i + 1).padStart(5, "0")}.png`;
        await writeFile(framePath, bytes);
      }

      exportStore.setFrameProgress(i + 1, totalFrames);
    }

    if (!useExportStore.getState().isExporting) return; // cancelled

    // Phase 2: Mix audio (if there are audio tracks)
    let mixedAudioPath: string | undefined;
    if (vc.audioTracks.length > 0) {
      exportStore.setPhase("mixing-audio");
      const projectDir = (await import("@/store/useFileStore")).useFileStore.getState().currentFilePath;
      const audioSpecs = vc.audioTracks.map((t) => ({
        path: projectDir ? `${projectDir}/${t.src}` : t.src,
        start_ms: t.startMs,
        volume: t.volume,
        fade_in_ms: t.fadeInMs ?? 0,
        fade_out_ms: t.fadeOutMs ?? 0,
        trim_start_ms: t.trimStartMs ?? 0,
        trim_end_ms: t.trimEndMs ?? null,
      }));
      mixedAudioPath = `${tempDir}/mixed-audio.aac`;
      await invoke("mix_audio", {
        tracks: audioSpecs,
        outputPath: mixedAudioPath,
        totalDurationMs: totalDurationMs,
      });
    }

    // Phase 3: Encode
    exportStore.setPhase("encoding");
    await invoke("encode_video", {
      framesDir,
      audioPath: mixedAudioPath ?? null,
      outputPath,
      fps: settings.fps,
      codec: settings.codec,
      quality: settings.quality,
    });

    exportStore.setPhase("done");
    exportStore.setProgress(100);
    await revealInFolder(outputPath);
  } catch (err) {
    exportStore.setError(String(err));
  }
}
