import { useRef, useState } from "react";
import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { useFileStore } from "@/store/useFileStore";
import { writeMediaFromDataUri } from "@/utils/lumvasFile";
import { resolveMediaSrc } from "@/utils/media";
import type { AssetItem, AudioTrack, SceneElement, AudioTrackType } from "@/types/schema";
import styles from "./mediaPool.module.css";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type Tab = "media" | "audio" | "text";

const AUDIO_TRACK_TYPES: { value: AudioTrackType; label: string; color: string }[] = [
  { value: "narration", label: "Narration", color: "#4ecdc4" },
  { value: "music", label: "Music", color: "#ff6b6b" },
  { value: "sfx", label: "SFX", color: "#ffe66d" },
];

export function MediaPool() {
  const [tab, setTab] = useState<Tab>("media");
  const assets = useLumvasStore((s) => s.assets.items);
  const addAsset = useLumvasStore((s) => s.addAsset);
  const removeAsset = useLumvasStore((s) => s.removeAsset);
  const vc = useLumvasStore((s) => selectVideoContent(s));
  const addAudioTrack = useLumvasStore((s) => s.addAudioTrack);
  const removeAudioTrack = useLumvasStore((s) => s.removeAudioTrack);
  const updateAudioTrack = useLumvasStore((s) => s.updateAudioTrack);
  const addSceneElement = useLumvasStore((s) => s.addSceneElement);
  const projectDir = useFileStore((s) => s.currentFilePath);
  const imageRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const handleImportImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const b64 = await fileToBase64(file);
    let data: string;
    if (projectDir) {
      data = await writeMediaFromDataUri(projectDir, b64, "asset");
    } else {
      data = b64;
    }
    const name = file.name.replace(/\.[^/.]+$/, "");
    addAsset({ id: uid(), label: name, description: "", data });
  };

  const handleImportAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const b64 = await fileToBase64(file);
    let src: string;
    if (projectDir) {
      src = await writeMediaFromDataUri(projectDir, b64, "audio");
    } else {
      src = b64;
    }

    let durationMs = 5000;
    try {
      const audio = new Audio();
      if (src.startsWith("data:")) {
        audio.src = src;
      } else if (projectDir) {
        try {
          const { convertFileSrc } = await import("@tauri-apps/api/core");
          audio.src = convertFileSrc(`${projectDir}/${src}`);
        } catch {
          audio.src = src;
        }
      }
      if (audio.src) {
        await new Promise<void>((resolve) => {
          audio.addEventListener("loadedmetadata", () => {
            const dur = audio.duration;
            if (Number.isFinite(dur) && dur > 0) {
              durationMs = Math.round(dur * 1000);
            }
            resolve();
          });
          audio.addEventListener("error", () => resolve());
          setTimeout(resolve, 2000);
        });
      }
    } catch {
      /* use default */
    }

    const name = file.name.replace(/\.[^/.]+$/, "");
    addAudioTrack({
      id: `audio-${uid()}`,
      type: "music",
      label: name,
      src,
      startMs: 0,
      durationMs,
      volume: 1,
    });
  };

  const handleDragStartImage = (e: React.DragEvent, asset: AssetItem) => {
    e.dataTransfer.setData("application/x-media-type", "image");
    e.dataTransfer.setData("application/x-asset-id", asset.id);
    e.dataTransfer.setData("application/x-asset-data", asset.data);
    e.dataTransfer.setData("application/x-asset-label", asset.label);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragStartAudio = (e: React.DragEvent, track: AudioTrack) => {
    e.dataTransfer.setData("application/x-media-type", "audio");
    e.dataTransfer.setData("application/x-audio-id", track.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragStartText = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-media-type", "text");
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className={styles.pool}>
      {/* Tab bar */}
      <div className={styles.tabs}>
        {(["media", "audio", "text"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "media" ? "Media" : t === "audio" ? "Audio" : "Text"}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {/* Hidden file inputs */}
        <input ref={imageRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleImportImage} />
        <input ref={audioRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleImportAudio} />

        {/* MEDIA TAB */}
        {tab === "media" && (
          <>
            <button className={styles.importBtn} onClick={() => imageRef.current?.click()}>
              + Import Media
            </button>
            {assets.length === 0 ? (
              <div className={styles.emptyHint}>
                Import images or video, then drag them onto the timeline.
              </div>
            ) : (
              <div className={styles.grid}>
                {assets.map((asset) => {
                  const src = resolveMediaSrc(asset.data, projectDir);
                  return (
                    <div
                      key={asset.id}
                      className={styles.mediaItem}
                      draggable
                      onDragStart={(e) => handleDragStartImage(e, asset)}
                      title={`Drag "${asset.label}" to add to scene`}
                    >
                      {asset.data ? (
                        <img src={src} alt={asset.label} className={styles.mediaThumb} />
                      ) : (
                        <div className={styles.mediaPlaceholder}>?</div>
                      )}
                      <span className={styles.mediaLabel}>{asset.label}</span>
                      <button
                        className={styles.removeBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAsset(asset.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* AUDIO TAB */}
        {tab === "audio" && (
          <>
            <button className={styles.importBtn} onClick={() => audioRef.current?.click()}>
              + Import Audio
            </button>
            {vc.audioTracks.length === 0 ? (
              <div className={styles.emptyHint}>
                Import audio files. They appear on the timeline automatically.
              </div>
            ) : (
              <div className={styles.audioList}>
                {vc.audioTracks.map((track) => {
                  const typeInfo = AUDIO_TRACK_TYPES.find((t) => t.value === track.type) ?? AUDIO_TRACK_TYPES[0];
                  return (
                    <div
                      key={track.id}
                      className={styles.audioItem}
                      draggable
                      onDragStart={(e) => handleDragStartAudio(e, track)}
                    >
                      <span className={styles.audioDot} style={{ background: typeInfo.color }} />
                      <span className={styles.audioLabel}>{track.label}</span>
                      <select
                        className={styles.audioType}
                        value={track.type}
                        onChange={(e) => updateAudioTrack(track.id, { type: e.target.value as AudioTrackType })}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {AUDIO_TRACK_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <div className={styles.audioVolume}>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={track.volume}
                          onChange={(e) => updateAudioTrack(track.id, { volume: Number(e.target.value) })}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeAudioTrack(track.id)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TEXT TAB - quick text elements to drag in */}
        {tab === "text" && (
          <>
            <div className={styles.emptyHint} style={{ marginBottom: 8 }}>
              Drag a text preset onto the timeline to add it to the current scene.
            </div>
            {[
              { label: "Title", fontSize: 48, fontWeight: 700 },
              { label: "Subtitle", fontSize: 32, fontWeight: 600 },
              { label: "Body Text", fontSize: 24, fontWeight: 400 },
              { label: "Caption", fontSize: 18, fontWeight: 400 },
            ].map((preset) => (
              <div
                key={preset.label}
                className={styles.textPreset}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-media-type", "text");
                  e.dataTransfer.setData("application/x-text-label", preset.label);
                  e.dataTransfer.setData("application/x-text-fontSize", String(preset.fontSize));
                  e.dataTransfer.setData("application/x-text-fontWeight", String(preset.fontWeight));
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <span style={{ fontSize: Math.min(preset.fontSize * 0.4, 18), fontWeight: preset.fontWeight }}>
                  {preset.label}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
