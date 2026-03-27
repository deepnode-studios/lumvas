import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { useTimelineStore } from "@/store/useTimelineStore";
import type { CaptionTrack, CaptionStyle, CaptionSegment } from "@/types/schema";
import styles from "../videoWorkspace.module.css";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const CAPTION_STYLES: { value: CaptionStyle; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "karaoke", label: "Karaoke" },
  { value: "word-reveal", label: "Word Reveal" },
  { value: "line-reveal", label: "Line Reveal" },
  { value: "bounce", label: "Bounce" },
  { value: "typewriter", label: "Typewriter" },
];

export function CaptionEditor() {
  const vc = useLumvasStore((s) => selectVideoContent(s));
  const addCaptionTrack = useLumvasStore((s) => s.addCaptionTrack);
  const updateCaptionTrack = useLumvasStore((s) => s.updateCaptionTrack);
  const removeCaptionTrack = useLumvasStore((s) => s.removeCaptionTrack);
  const currentTimeMs = useTimelineStore((s) => s.currentTimeMs);

  const handleAddTrack = () => {
    const track: CaptionTrack = {
      id: `cap-${uid()}`,
      label: "Captions",
      language: "en",
      segments: [],
      style: "karaoke",
      appearance: {
        fontSize: 32,
        fontWeight: 700,
        color: "#ffffff",
        backgroundColor: "#000000",
        backgroundOpacity: 0.7,
        position: "bottom",
        padding: 12,
        highlightColor: "#FFD700",
      },
    };
    addCaptionTrack(track);
  };

  const handleTranscribe = async (trackId: string) => {
    const narration = vc.audioTracks.find((t) => t.type === "narration");
    if (!narration) {
      alert("Add a narration audio track first.");
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const { useFileStore } = await import("@/store/useFileStore");
      const projectDir = useFileStore.getState().currentFilePath;

      const track = vc.captionTracks.find((t) => t.id === trackId);
      const lang = track?.language ?? "en";

      // Build invoke args: send raw bytes for data URIs, file path otherwise
      let invokeArgs: Record<string, unknown>;
      if (narration.src.startsWith("data:")) {
        const resp = await fetch(narration.src);
        const buf = Array.from(new Uint8Array(await resp.arrayBuffer()));
        invokeArgs = { audioData: buf, model: "base", language: lang };
      } else {
        const audioPath = projectDir ? `${projectDir}/${narration.src}` : narration.src;
        invokeArgs = { audioPath, model: "base", language: lang };
      }

      const segments = await invoke<
        Array<{
          id: string;
          words: Array<{ text: string; start_ms: number; end_ms: number; probability: number }>;
        }>
      >("transcribe_audio", invokeArgs);

      const captionSegments: CaptionSegment[] = segments.map((seg) => ({
        id: seg.id,
        words: seg.words.map((w) => ({
          text: w.text,
          startMs: w.start_ms,
          endMs: w.end_ms,
          confidence: w.probability,
        })),
      }));

      useLumvasStore.getState().setCaptionSegments(trackId, captionSegments);
    } catch (err) {
      console.error("Transcription failed:", err);
      alert(`Transcription failed: ${err}`);
    }
  };

  return (
    <div className={styles.panelSection}>
      <h3 className={styles.panelTitle}>Captions</h3>

      {vc.captionTracks.length === 0 && (
        <button
          style={{
            width: "100%",
            padding: "8px 0",
            fontSize: 12,
            fontWeight: 500,
            color: "#888",
            background: "transparent",
            border: "1px dashed #3a3a3e",
            borderRadius: 6,
            cursor: "pointer",
          }}
          onClick={handleAddTrack}
        >
          + Add Caption Track
        </button>
      )}

      {vc.captionTracks.map((track) => (
        <div key={track.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#8a2be2",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: "#ddd" }}>{track.label}</span>
            <button
              style={{
                fontSize: 14,
                color: "#666",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 4px",
              }}
              onClick={() => removeCaptionTrack(track.id)}
            >
              ×
            </button>
          </div>

          {/* Style picker */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, fontSize: 11 }}>
            <span style={{ color: "#888" }}>Style</span>
            <select
              value={track.style}
              onChange={(e) => updateCaptionTrack(track.id, { style: e.target.value as CaptionStyle })}
              style={{ fontSize: 11, padding: "3px 6px", flex: 1 }}
            >
              {CAPTION_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Appearance */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, fontSize: 11 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#888" }}>
              Size
              <input
                type="number"
                value={track.appearance.fontSize ?? 32}
                onChange={(e) =>
                  updateCaptionTrack(track.id, {
                    appearance: { ...track.appearance, fontSize: Number(e.target.value) },
                  })
                }
                style={{ width: 45, fontSize: 11, padding: "3px 6px" }}
              />
            </label>
            <select
              value={track.appearance.position}
              onChange={(e) =>
                updateCaptionTrack(track.id, {
                  appearance: {
                    ...track.appearance,
                    position: e.target.value as "bottom" | "top" | "center",
                  },
                })
              }
              style={{ fontSize: 11, padding: "3px 6px" }}
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
              <option value="center">Center</option>
            </select>
          </div>

          {/* Segments count */}
          <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>
            {track.segments.length} segments, {track.segments.reduce((n, s) => n + s.words.length, 0)} words
          </div>

          {/* Actions */}
          <button
            style={{
              width: "100%",
              padding: "7px 0",
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              background: "#8a2be2",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onClick={() => handleTranscribe(track.id)}
          >
            Generate (Whisper)
          </button>
        </div>
      ))}
    </div>
  );
}
