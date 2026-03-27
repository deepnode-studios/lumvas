import { useRef } from "react";
import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { useFileStore } from "@/store/useFileStore";
import { writeMediaFromDataUri } from "@/utils/lumvasFile";
import type { AudioTrack, AudioTrackType } from "@/types/schema";
import styles from "../videoWorkspace.module.css";

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

const TRACK_TYPES: { value: AudioTrackType; label: string; color: string }[] = [
  { value: "narration", label: "Narration", color: "#4ecdc4" },
  { value: "music", label: "Music", color: "#ff6b6b" },
  { value: "sfx", label: "SFX", color: "#ffe66d" },
];

export function AudioPanel() {
  const vc = useLumvasStore((s) => selectVideoContent(s));
  const addAudioTrack = useLumvasStore((s) => s.addAudioTrack);
  const updateAudioTrack = useLumvasStore((s) => s.updateAudioTrack);
  const removeAudioTrack = useLumvasStore((s) => s.removeAudioTrack);
  const projectDir = useFileStore((s) => s.currentFilePath);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    let src: string;
    if (projectDir) {
      const b64 = await fileToBase64(file);
      src = await writeMediaFromDataUri(projectDir, b64, "audio");
    } else {
      src = await fileToBase64(file);
    }

    let durationMs = 5000;
    try {
      const audio = new Audio();
      // For relative paths, try to resolve via convertFileSrc if available, otherwise use data URI
      if (src.startsWith("data:")) {
        audio.src = src;
      } else if (projectDir) {
        // Try Tauri asset protocol
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
    const track: AudioTrack = {
      id: `audio-${uid()}`,
      type: "narration",
      label: name,
      src,
      startMs: 0,
      durationMs,
      volume: 1,
    };
    addAudioTrack(track);
  };

  return (
    <div className={styles.panelSection}>
      <h3 className={styles.panelTitle}>Audio Tracks</h3>

      <input ref={fileRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleUpload} />

      {vc.audioTracks.length === 0 && (
        <div
          style={{
            padding: 20,
            textAlign: "center",
            color: "#666",
            fontSize: 12,
            cursor: "pointer",
            border: "1px dashed #3a3a3e",
            borderRadius: 8,
            transition: "border-color 0.15s",
          }}
          onClick={() => fileRef.current?.click()}
        >
          + Add audio track
        </div>
      )}

      {vc.audioTracks.map((track) => {
        const typeInfo = TRACK_TYPES.find((t) => t.value === track.type) ?? TRACK_TYPES[0];
        return (
          <div
            key={track.id}
            style={{
              padding: "10px 0",
              borderBottom: "1px solid #2a2a2e",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: typeInfo.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#ddd",
                }}
              >
                {track.label}
              </span>
              <button
                style={{
                  fontSize: 14,
                  color: "#666",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 4px",
                }}
                onClick={() => removeAudioTrack(track.id)}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>
              <select
                value={track.type}
                onChange={(e) => updateAudioTrack(track.id, { type: e.target.value as AudioTrackType })}
                style={{ fontSize: 11, padding: "3px 6px" }}
              >
                {TRACK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#888", flex: 1 }}>
                Vol
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={track.volume}
                  onChange={(e) => updateAudioTrack(track.id, { volume: Number(e.target.value) })}
                  style={{ flex: 1, height: 3 }}
                />
                <span style={{ fontFamily: "var(--font-mono)", color: "#555", minWidth: 24, textAlign: "right" }}>
                  {Math.round(track.volume * 100)}
                </span>
              </label>
            </div>
          </div>
        );
      })}

      {vc.audioTracks.length > 0 && (
        <button
          style={{
            marginTop: 10,
            width: "100%",
            padding: "7px 0",
            fontSize: 12,
            fontWeight: 500,
            color: "#888",
            background: "transparent",
            border: "1px dashed #3a3a3e",
            borderRadius: 6,
            cursor: "pointer",
          }}
          onClick={() => fileRef.current?.click()}
        >
          + Add audio
        </button>
      )}
    </div>
  );
}
