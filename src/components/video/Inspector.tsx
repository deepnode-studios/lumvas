import { useState } from "react";
import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { useTimelineStore, getSceneAtTime, getSceneStartMs, type InspectorTarget } from "@/store/useTimelineStore";
import type {
  SceneElement, AnimationPreset, AudioTrackType, CaptionStyle,
  CaptionTrack, CaptionSegment, AudioTrack, VideoScene,
} from "@/types/schema";
import styles from "./videoWorkspace.module.css";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ===== CONSTANTS ===== */

const ANIMATION_PRESETS: { value: AnimationPreset; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade-in", label: "Fade In" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "scale-in", label: "Scale In" },
  { value: "pop-in", label: "Pop In" },
  { value: "drop-in", label: "Drop In" },
  { value: "blur-in", label: "Blur In" },
  { value: "zoom-in", label: "Zoom In" },
  { value: "typewriter", label: "Typewriter" },
];

const AUDIO_TRACK_TYPES: { value: AudioTrackType; label: string; color: string }[] = [
  { value: "narration", label: "Narration", color: "#4ecdc4" },
  { value: "music", label: "Music", color: "#ff6b6b" },
  { value: "sfx", label: "SFX", color: "#ffe66d" },
];

const CAPTION_STYLES: { value: CaptionStyle; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "karaoke", label: "Karaoke" },
  { value: "word-reveal", label: "Word Reveal" },
  { value: "line-reveal", label: "Line Reveal" },
  { value: "bounce", label: "Bounce" },
  { value: "typewriter", label: "Typewriter" },
];

/* ===== SHARED UI ===== */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12 }}>
      <span style={{ color: "#777", minWidth: 55, fontSize: 11 }}>{label}</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className={styles.panelTitle}>{children}</h3>;
}

/* ===== SCENE INSPECTOR ===== */

function SceneInspector({ scene, sceneIndex }: { scene: VideoScene; sceneIndex: number }) {
  const updateScene = useLumvasStore((s) => s.updateScene);
  const addScene = useLumvasStore((s) => s.addScene);
  const removeScene = useLumvasStore((s) => s.removeScene);
  const addSceneElement = useLumvasStore((s) => s.addSceneElement);
  const vc = useLumvasStore((s) => selectVideoContent(s));

  const handleAddElement = (type: "text" | "image" | "icon" | "divider" | "spacer") => {
    addSceneElement(scene.id, {
      id: uid(),
      type,
      content: type === "text" ? "New Text" : "",
      timing: { enterMs: 0, enterAnimation: { preset: "fade-in", durationMs: 500 } },
    });
  };

  return (
    <>
      <div className={styles.panelSection}>
        <SectionTitle>Scene {sceneIndex + 1}</SectionTitle>
        <Row label="Duration">
          <input
            type="number"
            value={scene.durationMs}
            step={100}
            onChange={(e) => updateScene(scene.id, { durationMs: Math.max(100, Number(e.target.value)) })}
            style={{ width: 80, fontSize: 12, padding: "5px 8px" }}
          />
          <span style={{ color: "#555", fontSize: 11 }}>ms</span>
        </Row>
        <Row label="Layout">
          <select
            value={scene.direction ?? "column"}
            onChange={(e) => updateScene(scene.id, { direction: e.target.value as any })}
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          >
            <option value="column">Column</option>
            <option value="row">Row</option>
          </select>
        </Row>
        <Row label="Align">
          <select
            value={scene.alignItems ?? "center"}
            onChange={(e) => updateScene(scene.id, { alignItems: e.target.value as any })}
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          >
            <option value="flex-start">Start</option>
            <option value="center">Center</option>
            <option value="flex-end">End</option>
            <option value="stretch">Stretch</option>
          </select>
        </Row>
        <Row label="Justify">
          <select
            value={scene.justifyContent ?? "center"}
            onChange={(e) => updateScene(scene.id, { justifyContent: e.target.value as any })}
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          >
            <option value="flex-start">Start</option>
            <option value="center">Center</option>
            <option value="flex-end">End</option>
            <option value="space-between">Space Between</option>
            <option value="space-around">Space Around</option>
          </select>
        </Row>
        <Row label="Padding">
          <input
            type="number"
            value={scene.padding ?? 0}
            onChange={(e) => updateScene(scene.id, { padding: Number(e.target.value) })}
            style={{ width: 60, fontSize: 11, padding: "3px 6px" }}
          />
        </Row>
        <Row label="Gap">
          <input
            type="number"
            value={scene.gap ?? 0}
            onChange={(e) => updateScene(scene.id, { gap: Number(e.target.value) })}
            style={{ width: 60, fontSize: 11, padding: "3px 6px" }}
          />
        </Row>

        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <button
            style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600, color: "#fff", background: "#0a84ff", border: "none", borderRadius: 6, cursor: "pointer" }}
            onClick={() => addScene()}
          >
            + Scene
          </button>
          {vc.scenes.length > 1 && (
            <button
              style={{ padding: "7px 12px", fontSize: 12, fontWeight: 600, color: "#ff453a", background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.3)", borderRadius: 6, cursor: "pointer" }}
              onClick={() => removeScene(scene.id)}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Add elements */}
      <div className={styles.panelSection}>
        <SectionTitle>Add Element</SectionTitle>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(["text", "image", "icon", "divider", "spacer"] as const).map((type) => (
            <button
              key={type}
              style={{ padding: "5px 10px", fontSize: 11, fontWeight: 500, color: "#aaa", background: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: 4, cursor: "pointer" }}
              onClick={() => handleAddElement(type)}
            >
              + {type}
            </button>
          ))}
        </div>
      </div>

      {/* Element list */}
      <div className={styles.panelSection}>
        <SectionTitle>Elements ({scene.elements.length})</SectionTitle>
        {scene.elements.map((el) => (
          <div
            key={el.id}
            style={{ padding: "6px 8px", fontSize: 11, color: "#aaa", borderRadius: 4, cursor: "pointer", marginBottom: 2, background: "#2a2a2e" }}
            onClick={() => {
              useLumvasStore.getState().setActiveElement(el.id);
              useTimelineStore.getState().setInspectorTarget({ type: "element", sceneId: scene.id, elementId: el.id });
            }}
          >
            <span style={{ color: "#4ecdc4", fontWeight: 600, marginRight: 6 }}>{el.type}</span>
            {el.content?.slice(0, 20) || "(empty)"}
          </div>
        ))}
      </div>
    </>
  );
}

/* ===== ELEMENT INSPECTOR ===== */

function ElementInspector({ sceneId, elementId }: { sceneId: string; elementId: string }) {
  const vc = useLumvasStore((s) => selectVideoContent(s));
  const updateSceneElement = useLumvasStore((s) => s.updateSceneElement);
  const updateElementTiming = useLumvasStore((s) => s.updateElementTiming);
  const removeSceneElement = useLumvasStore((s) => s.removeSceneElement);

  const scene = vc.scenes.find((s) => s.id === sceneId);
  const el = scene?.elements.find((e) => e.id === elementId);
  if (!scene || !el) return <EmptyInspector message="Element not found" />;

  return (
    <>
      <div className={styles.panelSection}>
        <SectionTitle>{el.type.toUpperCase()}</SectionTitle>

        {/* Content */}
        {(el.type === "text" || el.type === "button") && (
          <Row label="Content">
            <textarea
              value={el.content ?? ""}
              onChange={(e) => updateSceneElement(sceneId, el.id, { content: e.target.value })}
              style={{ flex: 1, fontSize: 12, padding: "6px 8px", borderRadius: 4, border: "1px solid #3a3a3e", background: "#2a2a2e", color: "#ddd", resize: "vertical", minHeight: 40, fontFamily: "inherit" }}
            />
          </Row>
        )}

        {/* Font properties for text */}
        {el.type === "text" && (
          <>
            <Row label="Font Size">
              <input
                type="number"
                value={el.fontSize ?? 24}
                onChange={(e) => updateSceneElement(sceneId, el.id, { fontSize: Number(e.target.value) })}
                style={{ width: 60, fontSize: 11, padding: "3px 6px" }}
              />
            </Row>
            <Row label="Weight">
              <select
                value={el.fontWeight ?? 400}
                onChange={(e) => updateSceneElement(sceneId, el.id, { fontWeight: Number(e.target.value) })}
                style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
              >
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </Row>
            <Row label="Color">
              <input
                type="text"
                value={el.color ?? ""}
                onChange={(e) => updateSceneElement(sceneId, el.id, { color: e.target.value })}
                placeholder="theme default"
                style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
              />
            </Row>
          </>
        )}

        {/* Image asset ID */}
        {el.type === "image" && (
          <Row label="Asset ID">
            <input
              type="text"
              value={el.content ?? ""}
              onChange={(e) => updateSceneElement(sceneId, el.id, { content: e.target.value })}
              style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
            />
          </Row>
        )}
      </div>

      {/* Timing */}
      <div className={styles.panelSection}>
        <SectionTitle>Timing</SectionTitle>
        <Row label="Enter">
          <input
            type="number"
            value={el.timing.enterMs}
            onChange={(e) => updateElementTiming(sceneId, el.id, { enterMs: Number(e.target.value) })}
            style={{ width: 70, fontSize: 11, padding: "3px 6px" }}
          />
          <span style={{ color: "#555", fontSize: 10 }}>ms</span>
        </Row>
        <Row label="Exit">
          <input
            type="number"
            value={el.timing.exitMs ?? scene.durationMs}
            onChange={(e) => updateElementTiming(sceneId, el.id, { exitMs: Number(e.target.value) })}
            style={{ width: 70, fontSize: 11, padding: "3px 6px" }}
          />
          <span style={{ color: "#555", fontSize: 10 }}>ms</span>
        </Row>
      </div>

      {/* Animations */}
      <div className={styles.panelSection}>
        <SectionTitle>Animations</SectionTitle>
        <Row label="Enter">
          <select
            value={el.timing.enterAnimation?.preset ?? "none"}
            onChange={(e) =>
              updateElementTiming(sceneId, el.id, {
                enterAnimation: { preset: e.target.value as AnimationPreset, durationMs: el.timing.enterAnimation?.durationMs ?? 500 },
              })
            }
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          >
            {ANIMATION_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {el.timing.enterAnimation && el.timing.enterAnimation.preset !== "none" && (
            <input
              type="number"
              value={el.timing.enterAnimation.durationMs}
              onChange={(e) =>
                updateElementTiming(sceneId, el.id, {
                  enterAnimation: { ...el.timing.enterAnimation!, durationMs: Number(e.target.value) },
                })
              }
              style={{ width: 50, fontSize: 11, padding: "3px 6px" }}
              title="Duration (ms)"
            />
          )}
        </Row>
        <Row label="Exit">
          <select
            value={el.timing.exitAnimation?.preset ?? "none"}
            onChange={(e) =>
              updateElementTiming(sceneId, el.id, {
                exitAnimation: { preset: e.target.value as AnimationPreset, durationMs: el.timing.exitAnimation?.durationMs ?? 500 },
              })
            }
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          >
            {ANIMATION_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {el.timing.exitAnimation && el.timing.exitAnimation.preset !== "none" && (
            <input
              type="number"
              value={el.timing.exitAnimation.durationMs}
              onChange={(e) =>
                updateElementTiming(sceneId, el.id, {
                  exitAnimation: { ...el.timing.exitAnimation!, durationMs: Number(e.target.value) },
                })
              }
              style={{ width: 50, fontSize: 11, padding: "3px 6px" }}
              title="Duration (ms)"
            />
          )}
        </Row>
      </div>

      {/* Delete */}
      <div className={styles.panelSection}>
        <button
          style={{ width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600, color: "#ff453a", background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.3)", borderRadius: 6, cursor: "pointer" }}
          onClick={() => {
            removeSceneElement(sceneId, el.id);
            useTimelineStore.getState().setInspectorTarget({ type: "scene", sceneId });
          }}
        >
          Delete Element
        </button>
      </div>
    </>
  );
}

/* ===== AUDIO INSPECTOR ===== */

function AudioInspector({ trackId }: { trackId: string }) {
  const vc = useLumvasStore((s) => selectVideoContent(s));
  const updateAudioTrack = useLumvasStore((s) => s.updateAudioTrack);
  const removeAudioTrack = useLumvasStore((s) => s.removeAudioTrack);
  const track = vc.audioTracks.find((t) => t.id === trackId);
  if (!track) return <EmptyInspector message="Audio track not found" />;

  const typeInfo = AUDIO_TRACK_TYPES.find((t) => t.value === track.type) ?? AUDIO_TRACK_TYPES[0];

  return (
    <>
      <div className={styles.panelSection}>
        <SectionTitle>Audio Track</SectionTitle>
        <Row label="Label">
          <input
            type="text"
            value={track.label}
            onChange={(e) => updateAudioTrack(track.id, { label: e.target.value })}
            style={{ flex: 1, fontSize: 12, padding: "5px 8px" }}
          />
        </Row>
        <Row label="Type">
          <select
            value={track.type}
            onChange={(e) => updateAudioTrack(track.id, { type: e.target.value as AudioTrackType })}
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          >
            {AUDIO_TRACK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: typeInfo.color, flexShrink: 0 }} />
        </Row>
      </div>

      <div className={styles.panelSection}>
        <SectionTitle>Playback</SectionTitle>
        <Row label="Volume">
          <input
            type="range"
            min={0} max={1} step={0.05}
            value={track.volume}
            onChange={(e) => updateAudioTrack(track.id, { volume: Number(e.target.value) })}
            style={{ flex: 1, height: 3 }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#888", minWidth: 28 }}>
            {Math.round(track.volume * 100)}%
          </span>
        </Row>
        <Row label="Start">
          <input
            type="number"
            value={track.startMs ?? 0}
            step={100}
            onChange={(e) => updateAudioTrack(track.id, { startMs: Number(e.target.value) })}
            style={{ width: 80, fontSize: 11, padding: "3px 6px" }}
          />
          <span style={{ color: "#555", fontSize: 10 }}>ms</span>
        </Row>
        <Row label="Duration">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#aaa" }}>
            {((track.durationMs ?? 0) / 1000).toFixed(1)}s
          </span>
        </Row>
      </div>

      <div className={styles.panelSection}>
        <SectionTitle>Trim</SectionTitle>
        <Row label="Trim Start">
          <input
            type="number"
            value={track.trimStartMs ?? 0}
            step={100}
            onChange={(e) => updateAudioTrack(track.id, { trimStartMs: Number(e.target.value) })}
            style={{ width: 80, fontSize: 11, padding: "3px 6px" }}
          />
          <span style={{ color: "#555", fontSize: 10 }}>ms</span>
        </Row>
        <Row label="Trim End">
          <input
            type="number"
            value={track.trimEndMs ?? track.durationMs ?? 0}
            step={100}
            onChange={(e) => updateAudioTrack(track.id, { trimEndMs: Number(e.target.value) })}
            style={{ width: 80, fontSize: 11, padding: "3px 6px" }}
          />
          <span style={{ color: "#555", fontSize: 10 }}>ms</span>
        </Row>
      </div>

      <div className={styles.panelSection}>
        <SectionTitle>Fades</SectionTitle>
        <Row label="Fade In">
          <input
            type="number"
            value={track.fadeInMs ?? 0}
            step={100}
            onChange={(e) => updateAudioTrack(track.id, { fadeInMs: Number(e.target.value) })}
            style={{ width: 80, fontSize: 11, padding: "3px 6px" }}
          />
          <span style={{ color: "#555", fontSize: 10 }}>ms</span>
        </Row>
        <Row label="Fade Out">
          <input
            type="number"
            value={track.fadeOutMs ?? 0}
            step={100}
            onChange={(e) => updateAudioTrack(track.id, { fadeOutMs: Number(e.target.value) })}
            style={{ width: 80, fontSize: 11, padding: "3px 6px" }}
          />
          <span style={{ color: "#555", fontSize: 10 }}>ms</span>
        </Row>
      </div>

      <div className={styles.panelSection}>
        <button
          style={{ width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600, color: "#ff453a", background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.3)", borderRadius: 6, cursor: "pointer" }}
          onClick={() => {
            removeAudioTrack(track.id);
            useTimelineStore.getState().setInspectorTarget(null);
          }}
        >
          Remove Track
        </button>
      </div>
    </>
  );
}

/* ===== CAPTION INSPECTOR ===== */

/* ===== SEGMENT EDITOR ===== */

function SegmentEditor({ trackId, segments }: { trackId: string; segments: CaptionSegment[] }) {
  const [editingWord, setEditingWord] = useState<{ segIdx: number; wordIdx: number } | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedWord, setSelectedWord] = useState<{ segIdx: number; wordIdx: number } | null>(null);

  const allWords = segments.flatMap((s) => s.words);
  if (allWords.length === 0) {
    return <div style={{ fontSize: 11, color: "#555", padding: "8px 0" }}>No words yet. Generate captions first.</div>;
  }

  const update = (newSegs: CaptionSegment[]) => {
    // Clean up empty segments
    useLumvasStore.getState().setCaptionSegments(trackId, newSegs.filter((s) => s.words.length > 0));
  };

  const commitWordEdit = () => {
    if (!editingWord) return;
    const { segIdx, wordIdx } = editingWord;
    update(segments.map((seg, si) =>
      si !== segIdx ? seg : { ...seg, words: seg.words.map((w, wi) => (wi === wordIdx ? { ...w, text: editText } : w)) },
    ));
    setEditingWord(null);
  };

  // Move word to previous segment
  const moveToPrev = (segIdx: number, wordIdx: number) => {
    if (segIdx === 0) return;
    const word = segments[segIdx].words[wordIdx];
    const newSegs = segments.map((seg, si) => {
      if (si === segIdx - 1) return { ...seg, words: [...seg.words, word] };
      if (si === segIdx) return { ...seg, words: seg.words.filter((_, wi) => wi !== wordIdx) };
      return seg;
    });
    update(newSegs);
    setSelectedWord({ segIdx: segIdx - 1, wordIdx: segments[segIdx - 1].words.length });
  };

  // Move word to next segment
  const moveToNext = (segIdx: number, wordIdx: number) => {
    if (segIdx >= segments.length - 1) return;
    const word = segments[segIdx].words[wordIdx];
    const newSegs = segments.map((seg, si) => {
      if (si === segIdx) return { ...seg, words: seg.words.filter((_, wi) => wi !== wordIdx) };
      if (si === segIdx + 1) return { ...seg, words: [word, ...seg.words] };
      return seg;
    });
    update(newSegs);
    setSelectedWord({ segIdx: segIdx + 1, wordIdx: 0 });
  };

  // Isolate: make this word its own segment
  const isolateWord = (segIdx: number, wordIdx: number) => {
    const seg = segments[segIdx];
    if (seg.words.length === 1) return; // already alone
    const word = seg.words[wordIdx];
    const remaining = seg.words.filter((_, wi) => wi !== wordIdx);
    const newSeg: CaptionSegment = { id: `seg-iso-${uid()}`, words: [word] };
    // Insert the isolated segment after the current one
    const newSegs = [
      ...segments.slice(0, segIdx),
      { ...seg, words: remaining },
      newSeg,
      ...segments.slice(segIdx + 1),
    ];
    update(newSegs);
    setSelectedWord({ segIdx: segIdx + 1, wordIdx: 0 });
  };

  // Split segment after this word
  const splitHere = (segIdx: number, wordIdx: number) => {
    const seg = segments[segIdx];
    if (wordIdx >= seg.words.length - 1) return;
    const before = seg.words.slice(0, wordIdx + 1);
    const after = seg.words.slice(wordIdx + 1);
    const newSegs = [
      ...segments.slice(0, segIdx),
      { ...seg, words: before },
      { id: `seg-split-${uid()}`, words: after },
      ...segments.slice(segIdx + 1),
    ];
    update(newSegs);
  };

  // Merge selected word with the next word in the same segment
  const mergeWithNextWord = (segIdx: number, wordIdx: number) => {
    const seg = segments[segIdx];
    if (wordIdx >= seg.words.length - 1) return;
    const current = seg.words[wordIdx];
    const next = seg.words[wordIdx + 1];
    const merged = {
      ...current,
      text: current.text + next.text,
      endMs: next.endMs,
      confidence: current.confidence != null && next.confidence != null
        ? Math.min(current.confidence, next.confidence) : current.confidence,
    };
    update(segments.map((s, si) =>
      si !== segIdx ? s : {
        ...s,
        words: s.words.filter((_, wi) => wi !== wordIdx + 1).map((w, wi) => wi === wordIdx ? merged : w),
      },
    ));
    setSelectedWord({ segIdx, wordIdx });
  };

  // Delete word
  const deleteWord = (segIdx: number, wordIdx: number) => {
    update(segments.map((seg, si) =>
      si !== segIdx ? seg : { ...seg, words: seg.words.filter((_, wi) => wi !== wordIdx) },
    ));
    setEditingWord(null);
    setSelectedWord(null);
  };

  const isSelected = (si: number, wi: number) => selectedWord?.segIdx === si && selectedWord?.wordIdx === wi;
  const isEditing = (si: number, wi: number) => editingWord?.segIdx === si && editingWord?.wordIdx === wi;

  return (
    <div style={{ maxHeight: 350, overflowY: "auto" }}>
      {/* Word action bar — only shows applicable actions */}
      {selectedWord && !editingWord && (() => {
        const { segIdx, wordIdx } = selectedWord;
        const seg = segments[segIdx];
        if (!seg) return null;
        const wordCount = seg.words.length;
        const isFirst = wordIdx === 0;
        const isLast = wordIdx === wordCount - 1;
        const isOnly = wordCount === 1;
        const hasPrevSeg = segIdx > 0;
        const hasNextSeg = segIdx < segments.length - 1;
        const hasNextWord = !isLast;

        // ← prev: only if first (or only) word AND there's a previous segment
        const canMovePrev = (isFirst || isOnly) && hasPrevSeg;
        // next →: only if last (or only) word AND there's a next segment
        const canMoveNext = (isLast || isOnly) && hasNextSeg;
        // join →: merge text with next word in same segment
        const canJoin = hasNextWord;
        // split here: split segment after this word (only if not last word)
        const canSplit = hasNextWord;
        // isolate: only if first or last word and segment has >1 word
        const canIsolate = !isOnly && (isFirst || isLast);

        return (
          <div style={{
            display: "flex", gap: 3, padding: "4px 0", marginBottom: 6, flexWrap: "wrap",
            borderBottom: "1px solid #2a2a2e", position: "sticky", top: 0, background: "#222226", zIndex: 1,
          }}>
            {canMovePrev && (
              <button style={actionBtnStyle} onClick={() => moveToPrev(segIdx, wordIdx)} title="Move to previous segment">
                ← prev
              </button>
            )}
            {canMoveNext && (
              <button style={actionBtnStyle} onClick={() => moveToNext(segIdx, wordIdx)} title="Move to next segment">
                next →
              </button>
            )}
            {canJoin && (
              <button style={actionBtnStyle} onClick={() => mergeWithNextWord(segIdx, wordIdx)} title="Join with next word">
                join →
              </button>
            )}
            {canSplit && (
              <button style={actionBtnStyle} onClick={() => { splitHere(segIdx, wordIdx); setSelectedWord(null); }} title="Split segment after this word">
                split here
              </button>
            )}
            {canIsolate && (
              <button style={actionBtnStyle} onClick={() => isolateWord(segIdx, wordIdx)} title="Make this word its own segment">
                isolate
              </button>
            )}
            <button style={{ ...actionBtnStyle, color: "#ff453a" }} onClick={() => deleteWord(segIdx, wordIdx)} title="Delete word">
              ×
            </button>
            <div style={{ flex: 1 }} />
            <button style={{ ...actionBtnStyle, color: "#555" }} onClick={() => setSelectedWord(null)}>
              done
            </button>
          </div>
        );
      })()}

      {segments.map((seg, segIdx) => (
        <div key={seg.id} style={{ marginBottom: 4 }}>
          {/* Segment number */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
            <span style={{ fontSize: 9, color: "#444", fontWeight: 600, minWidth: 14 }}>{segIdx + 1}</span>
            <div style={{ flex: 1, height: 1, background: "#2a2a2e" }} />
          </div>

          {/* Word blocks */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2, paddingLeft: 14 }}>
            {seg.words.map((word, wordIdx) => (
              <div key={`${segIdx}-${wordIdx}`}>
                {isEditing(segIdx, wordIdx) ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitWordEdit();
                      if (e.key === "Escape") { setEditingWord(null); }
                    }}
                    onBlur={commitWordEdit}
                    autoFocus
                    style={{
                      width: Math.max(40, editText.length * 7 + 10), fontSize: 11,
                      padding: "2px 5px", background: "#0a84ff", color: "#fff",
                      border: "none", borderRadius: 3, outline: "none",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      display: "inline-block", fontSize: 11, padding: "2px 5px",
                      background: isSelected(segIdx, wordIdx) ? "#0a84ff" : "#2a2a2e",
                      color: isSelected(segIdx, wordIdx) ? "#fff" : "#ccc",
                      borderRadius: 3, cursor: "pointer",
                      border: isSelected(segIdx, wordIdx) ? "1px solid #3399ff" : "1px solid transparent",
                      transition: "all 0.1s",
                    }}
                    onClick={() => {
                      if (isSelected(segIdx, wordIdx)) {
                        // Double-click effect: second click enters edit mode
                        setEditingWord({ segIdx, wordIdx });
                        setEditText(word.text);
                      } else {
                        setSelectedWord({ segIdx, wordIdx });
                      }
                    }}
                  >
                    {word.text}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  fontSize: 10, padding: "2px 6px", color: "#0a84ff",
  background: "rgba(10,132,255,0.1)", border: "1px solid rgba(10,132,255,0.2)",
  borderRadius: 3, cursor: "pointer", whiteSpace: "nowrap",
};

const WHISPER_MODELS = [
  { value: "tiny", label: "Tiny (fast, less accurate)" },
  { value: "base", label: "Base (balanced)" },
  { value: "small", label: "Small (better accuracy)" },
  { value: "medium", label: "Medium (high accuracy)" },
  { value: "large", label: "Large (best, slow)" },
];

function CaptionInspector({ trackId }: { trackId: string }) {
  const vc = useLumvasStore((s) => selectVideoContent(s));
  const updateCaptionTrack = useLumvasStore((s) => s.updateCaptionTrack);
  const removeCaptionTrack = useLumvasStore((s) => s.removeCaptionTrack);
  const track = vc.captionTracks.find((t) => t.id === trackId);
  const [sttModel, setSttModel] = useState("base");
  const [stripPunctuation, setStripPunctuation] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [maxWordsPerLine, setMaxWordsPerLine] = useState(6);
  if (!track) return <EmptyInspector message="Caption track not found" />;

  const handleTranscribe = async () => {
    const narration = vc.audioTracks.find((t) => t.type === "narration");
    if (!narration) {
      alert("Add a narration audio track first.");
      return;
    }
    setIsTranscribing(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const { useFileStore } = await import("@/store/useFileStore");
      const projectDir = useFileStore.getState().currentFilePath;

      let invokeArgs: Record<string, unknown> = {
        model: sttModel,
        language: track.language,
        stripPunctuation,
      };
      if (narration.src.startsWith("data:")) {
        const resp = await fetch(narration.src);
        const buf = Array.from(new Uint8Array(await resp.arrayBuffer()));
        invokeArgs.audioData = buf;
      } else {
        invokeArgs.audioPath = projectDir ? `${projectDir}/${narration.src}` : narration.src;
      }

      const segments = await invoke<
        Array<{ id: string; words: Array<{ text: string; start_ms: number; end_ms: number; probability: number }> }>
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
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <>
      <div className={styles.panelSection}>
        <SectionTitle>Caption Track</SectionTitle>
        <Row label="Label">
          <input
            type="text"
            value={track.label}
            onChange={(e) => updateCaptionTrack(track.id, { label: e.target.value })}
            style={{ flex: 1, fontSize: 12, padding: "5px 8px" }}
          />
        </Row>
        <Row label="Language">
          <input
            type="text"
            value={track.language}
            onChange={(e) => updateCaptionTrack(track.id, { language: e.target.value })}
            placeholder="en"
            style={{ width: 60, fontSize: 11, padding: "3px 6px" }}
          />
        </Row>
      </div>

      <div className={styles.panelSection}>
        <SectionTitle>Style</SectionTitle>
        <Row label="Style">
          <select
            value={track.style}
            onChange={(e) => updateCaptionTrack(track.id, { style: e.target.value as CaptionStyle })}
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          >
            {CAPTION_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Row>
      </div>

      <div className={styles.panelSection}>
        <SectionTitle>Appearance</SectionTitle>
        <Row label="Font Size">
          <input
            type="number"
            value={track.appearance.fontSize ?? 32}
            onChange={(e) => updateCaptionTrack(track.id, { appearance: { ...track.appearance, fontSize: Number(e.target.value) } })}
            style={{ width: 60, fontSize: 11, padding: "3px 6px" }}
          />
        </Row>
        <Row label="Weight">
          <select
            value={track.appearance.fontWeight ?? 700}
            onChange={(e) => updateCaptionTrack(track.id, { appearance: { ...track.appearance, fontWeight: Number(e.target.value) } })}
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          >
            {[400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Row>
        <Row label="Color">
          <input
            type="color"
            value={track.appearance.color ?? "#ffffff"}
            onChange={(e) => updateCaptionTrack(track.id, { appearance: { ...track.appearance, color: e.target.value } })}
            style={{ width: 28, height: 22, padding: 0, border: "1px solid #3a3a3e", borderRadius: 3, cursor: "pointer" }}
          />
          <input
            type="text"
            value={track.appearance.color ?? "#ffffff"}
            onChange={(e) => updateCaptionTrack(track.id, { appearance: { ...track.appearance, color: e.target.value } })}
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          />
        </Row>
        <Row label="BG Color">
          <input
            type="color"
            value={track.appearance.backgroundColor ?? "#000000"}
            onChange={(e) => updateCaptionTrack(track.id, { appearance: { ...track.appearance, backgroundColor: e.target.value } })}
            style={{ width: 28, height: 22, padding: 0, border: "1px solid #3a3a3e", borderRadius: 3, cursor: "pointer" }}
          />
          <input
            type="number"
            value={Math.round((track.appearance.backgroundOpacity ?? 0.7) * 100)}
            min={0} max={100}
            onChange={(e) => updateCaptionTrack(track.id, { appearance: { ...track.appearance, backgroundOpacity: Number(e.target.value) / 100 } })}
            style={{ width: 45, fontSize: 11, padding: "3px 6px" }}
            title="Opacity %"
          />
          <span style={{ color: "#555", fontSize: 10 }}>%</span>
        </Row>
        <Row label="Highlight">
          <input
            type="color"
            value={track.appearance.highlightColor ?? "#FFD700"}
            onChange={(e) => updateCaptionTrack(track.id, { appearance: { ...track.appearance, highlightColor: e.target.value } })}
            style={{ width: 28, height: 22, padding: 0, border: "1px solid #3a3a3e", borderRadius: 3, cursor: "pointer" }}
          />
          <span style={{ fontSize: 10, color: "#666" }}>for karaoke</span>
        </Row>
        <Row label="Position">
          <select
            value={track.appearance.position}
            onChange={(e) => updateCaptionTrack(track.id, { appearance: { ...track.appearance, position: e.target.value as "bottom" | "top" | "center" } })}
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
            <option value="center">Center</option>
          </select>
        </Row>
        <Row label="Padding">
          <input
            type="number"
            value={track.appearance.padding ?? 12}
            onChange={(e) => updateCaptionTrack(track.id, { appearance: { ...track.appearance, padding: Number(e.target.value) } })}
            style={{ width: 60, fontSize: 11, padding: "3px 6px" }}
          />
        </Row>
      </div>

      <div className={styles.panelSection}>
        <SectionTitle>Transcription</SectionTitle>
        <Row label="Model">
          <select
            value={sttModel}
            onChange={(e) => setSttModel(e.target.value)}
            style={{ flex: 1, fontSize: 11, padding: "3px 6px" }}
          >
            {WHISPER_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Row>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#888", marginBottom: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={stripPunctuation}
            onChange={(e) => setStripPunctuation(e.target.checked)}
            style={{ accentColor: "#0a84ff" }}
          />
          Strip punctuation
        </label>
        <button
          style={{
            width: "100%", padding: "8px 0", fontSize: 11, fontWeight: 600,
            color: "#fff", background: isTranscribing ? "#555" : "#8a2be2",
            border: "none", borderRadius: 6, cursor: isTranscribing ? "wait" : "pointer",
            opacity: isTranscribing ? 0.7 : 1,
          }}
          onClick={handleTranscribe}
          disabled={isTranscribing}
        >
          {isTranscribing ? "Transcribing..." : "Generate (Whisper)"}
        </button>
      </div>

      <div className={styles.panelSection}>
        <SectionTitle>Segments</SectionTitle>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
          {track.segments.length} segments, {track.segments.reduce((n, s) => n + s.words.length, 0)} words
        </div>

        {/* Regroup by max words */}
        <Row label="Max words">
          <input
            type="number"
            min={1}
            max={20}
            value={maxWordsPerLine}
            onChange={(e) => setMaxWordsPerLine(Math.max(1, Number(e.target.value)))}
            style={{ width: 50, fontSize: 11, padding: "3px 6px" }}
          />
          <button
            style={{ fontSize: 10, padding: "3px 8px", color: "#0a84ff", background: "rgba(10,132,255,0.1)", border: "1px solid rgba(10,132,255,0.3)", borderRadius: 4, cursor: "pointer" }}
            onClick={() => {
              const allWords = track.segments.flatMap((s) => s.words);
              if (allWords.length === 0) return;
              const newSegs: CaptionSegment[] = [];
              for (let i = 0; i < allWords.length; i += maxWordsPerLine) {
                newSegs.push({
                  id: `seg-${newSegs.length + 1}`,
                  words: allWords.slice(i, i + maxWordsPerLine),
                });
              }
              useLumvasStore.getState().setCaptionSegments(trackId, newSegs);
            }}
          >
            Regroup
          </button>
        </Row>

        {/* Interactive segment editor */}
        <SegmentEditor trackId={trackId} segments={track.segments} />
      </div>

      <div className={styles.panelSection}>
        <button
          style={{ width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600, color: "#ff453a", background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.3)", borderRadius: 6, cursor: "pointer" }}
          onClick={() => {
            removeCaptionTrack(track.id);
            useTimelineStore.getState().setInspectorTarget(null);
          }}
        >
          Remove Track
        </button>
      </div>
    </>
  );
}

/* ===== EMPTY STATE ===== */

function EmptyInspector({ message }: { message?: string }) {
  const addCaptionTrack = useLumvasStore((s) => s.addCaptionTrack);

  return (
    <div className={styles.panelSection}>
      <SectionTitle>Inspector</SectionTitle>
      <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>
        {message ?? "Select a scene, element, audio track, or caption on the timeline to edit its properties."}
      </p>
      <button
        style={{ width: "100%", marginTop: 12, padding: "8px 0", fontSize: 12, fontWeight: 500, color: "#888", background: "transparent", border: "1px dashed #3a3a3e", borderRadius: 6, cursor: "pointer" }}
        onClick={() => {
          const track: CaptionTrack = {
            id: `cap-${uid()}`,
            label: "Captions",
            language: "en",
            segments: [],
            style: "karaoke",
            appearance: { fontSize: 32, fontWeight: 700, color: "#ffffff", backgroundColor: "#000000", backgroundOpacity: 0.7, position: "bottom", padding: 12, highlightColor: "#FFD700" },
          };
          addCaptionTrack(track);
          useTimelineStore.getState().setInspectorTarget({ type: "caption", trackId: track.id });
        }}
      >
        + Add Caption Track
      </button>
    </div>
  );
}

/* ===== MAIN INSPECTOR ===== */

export function Inspector() {
  const target = useTimelineStore((s) => s.inspectorTarget);
  const currentTimeMs = useTimelineStore((s) => s.currentTimeMs);
  const vc = useLumvasStore((s) => selectVideoContent(s));

  // Auto-select current scene if nothing is selected
  if (!target) {
    const sceneId = getSceneAtTime(currentTimeMs);
    if (sceneId) {
      const idx = vc.scenes.findIndex((s) => s.id === sceneId);
      const scene = vc.scenes[idx];
      if (scene) return <SceneInspector scene={scene} sceneIndex={idx} />;
    }
    return <EmptyInspector />;
  }

  switch (target.type) {
    case "scene": {
      const idx = vc.scenes.findIndex((s) => s.id === target.sceneId);
      const scene = vc.scenes[idx];
      if (!scene) return <EmptyInspector message="Scene not found" />;
      return <SceneInspector scene={scene} sceneIndex={idx} />;
    }
    case "element":
      return <ElementInspector sceneId={target.sceneId} elementId={target.elementId} />;
    case "audio":
      return <AudioInspector trackId={target.trackId} />;
    case "caption":
      return <CaptionInspector trackId={target.trackId} />;
    default:
      return <EmptyInspector />;
  }
}
