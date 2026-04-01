import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { useExportStore } from "@/store/useExportStore";
import { getLastDialogPath, setLastDialogPath, revealInFolder } from "./dialogPath";
import { renderSceneToCanvas, renderCaptionsToCanvas, renderComposition, preloadSceneAssets, preloadCompositionAssets, seekSceneVideos, buildCompositionMap } from "./canvasRenderer";
import { applySceneTransition } from "./sceneTransition";
import type { VideoScene } from "@/types/schema";

/** Show the export settings dialog. */
export function exportVideo() {
  const store = useLumvasStore.getState();
  if (store.contentType !== "video") return;
  useExportStore.getState().showSettings();
}

/** Called when the user confirms settings and clicks Export. */
export async function confirmExport() {
  const store = useLumvasStore.getState();
  if (store.contentType !== "video") return;
  const vc = selectVideoContent(store);
  const { settings } = vc;

  const { exportFps, exportScale } = useExportStore.getState();

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

  const renderWidth = Math.round(store.documentSize.width * exportScale);
  const renderHeight = Math.round(store.documentSize.height * exportScale);

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const { tempDir: tempDirPath } = await import("@tauri-apps/api/path");
    const baseTemp = await tempDirPath();
    const sep = baseTemp.endsWith("/") ? "" : "/";

    const theme = store.theme;
    const language = store.language;
    const assets = store.assets.items;
    const size = { ...store.documentSize, width: renderWidth, height: renderHeight };
    const projectDir = (await import("@/store/useFileStore")).useFileStore.getState().currentFilePath;

    // Composition mode or legacy scene mode
    const hasCompositions = !!(vc.compositions && vc.rootCompositionId);
    const compMap = hasCompositions ? buildCompositionMap(vc) : null;
    const rootComp = hasCompositions ? compMap!.get(vc.rootCompositionId!) : null;

    const totalDurationMs = rootComp
      ? rootComp.durationMs
      : (vc.scenes ?? []).reduce((sum, s) => sum + s.durationMs, 0);
    const frameIntervalMs = 1000 / exportFps;
    const totalFrames = Math.ceil(totalDurationMs / frameIntervalMs);

    // Phase 1 — preload all images/assets (ONCE)
    exportStore.setPhase("rendering-frames");
    if (hasCompositions && compMap) {
      await preloadCompositionAssets(vc.rootCompositionId!, compMap, assets, projectDir);
    } else {
      for (const scene of (vc.scenes ?? [])) {
        await preloadSceneAssets(scene, assets, projectDir);
      }
    }

    // Phase 2 — mix audio (if any)
    let mixedAudioPath: string | undefined;
    if (vc.audioTracks.length > 0) {
      exportStore.setPhase("mixing-audio");
      const { mkdir, writeFile: writeFs } = await import("@tauri-apps/plugin-fs");
      const tempDir = `${baseTemp}${sep}lumvas-export-${Date.now()}`;
      await mkdir(tempDir, { recursive: true });

      const audioSpecs = await Promise.all(
        vc.audioTracks.map(async (t, i) => {
          let path: string;
          if (t.src.startsWith("data:")) {
            const match = t.src.match(/^data:[^;]+;base64,(.+)$/);
            if (!match) throw new Error(`Invalid audio data URI for track ${i}`);
            const binary = atob(match[1]);
            const bytes = new Uint8Array(binary.length);
            for (let b = 0; b < binary.length; b++) bytes[b] = binary.charCodeAt(b);
            path = `${tempDir}/audio-track-${i}.aac`;
            await writeFs(path, bytes);
          } else if (t.src.startsWith("http")) {
            path = t.src;
          } else {
            path = projectDir ? `${projectDir}/${t.src}` : t.src;
          }
          return {
            path,
            start_ms: t.startMs,
            volume: t.volume,
            fade_in_ms: t.fadeInMs ?? 0,
            fade_out_ms: t.fadeOutMs ?? 0,
            trim_start_ms: t.trimStartMs ?? 0,
            trim_end_ms: t.trimEndMs ?? null,
          };
        }),
      );

      mixedAudioPath = `${tempDir}/mixed-audio.aac`;
      await invoke("mix_audio", {
        tracks: audioSpecs,
        outputPath: mixedAudioPath,
        totalDurationMs,
      });
    }

    // Phase 3 — start FFmpeg pipe
    exportStore.setPhase("rendering-frames");
    await invoke("start_video_pipe", {
      width: renderWidth,
      height: renderHeight,
      fps: exportFps,
      codec: settings.codec,
      quality: settings.quality,
      audioPath: mixedAudioPath ?? null,
      outputPath,
    });

    // Phase 4 — render ALL frames in a tight loop (no DOM, no rAF)
    const canvas = document.createElement("canvas");
    canvas.width = renderWidth;
    canvas.height = renderHeight;
    const ctx = canvas.getContext("2d")!;

    // Scale context if exportScale != 1
    if (exportScale !== 1) {
      ctx.scale(exportScale, exportScale);
    }

    const originalSize = store.documentSize; // unscaled

    for (let i = 0; i < totalFrames; i++) {
      if (!useExportStore.getState().isExporting) break;

      const timeMs = i * frameIntervalMs;

      if (hasCompositions && compMap && rootComp) {
        // ─── Composition mode: single renderComposition call ───
        ctx.clearRect(0, 0, renderWidth, renderHeight);
        if (exportScale !== 1) ctx.save();
        renderComposition(ctx, vc.rootCompositionId!, compMap, theme, assets, originalSize, projectDir, timeMs, language);
        if (exportScale !== 1) ctx.restore();
      } else {
        // ─── Legacy scene mode ───
        const scenes = vc.scenes ?? [];
        let elapsed = 0;
        let scene: VideoScene | null = null;
        let sceneTimeMs = 0;
        for (const s of scenes) {
          if (timeMs >= elapsed && timeMs < elapsed + s.durationMs) {
            scene = s;
            sceneTimeMs = timeMs - elapsed;
            break;
          }
          elapsed += s.durationMs;
        }
        if (!scene && scenes.length > 0) {
          scene = scenes[scenes.length - 1];
          sceneTimeMs = scene.durationMs;
        }
        if (!scene) continue;

        await seekSceneVideos(scene, sceneTimeMs, projectDir, vc.settings.fps);
        renderSceneToCanvas(ctx, scene, theme, assets, originalSize, projectDir, sceneTimeMs, language);
      }

      // Draw captions on top
      if (vc.captionTracks.length > 0) {
        renderCaptionsToCanvas(ctx, vc.captionTracks, timeMs, originalSize.width, originalSize.height);
      }

      // Pipe raw RGBA pixels directly to FFmpeg — no disk I/O
      const imageData = ctx.getImageData(0, 0, renderWidth, renderHeight);
      await invoke("write_raw_frame", new Uint8Array(imageData.data.buffer));

      // Update progress — yield to UI every 30 frames
      if (i % 30 === 0) {
        exportStore.setFrameProgress(i + 1, totalFrames);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    exportStore.setFrameProgress(totalFrames, totalFrames);

    if (!useExportStore.getState().isExporting) {
      await invoke("finish_video_pipe").catch(() => {});
      return;
    }

    // Phase 5 — close pipe
    exportStore.setPhase("encoding");
    await invoke("finish_video_pipe");

    exportStore.setPhase("done");
    exportStore.setProgress(100);
    await revealInFolder(outputPath);
  } catch (err) {
    exportStore.setError(String(err));
  }
}
