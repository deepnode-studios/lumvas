import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { useTimelineStore, getSceneAtTime, getSceneStartMs } from "@/store/useTimelineStore";
import type { VideoScene, SceneElement, AnimationPreset, ElementTiming } from "@/types/schema";
import styles from "./videoWorkspace.module.css";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

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

const ELEMENT_TYPE_COLORS: Record<string, string> = {
  text: "#4ecdc4",
  image: "#ff6b6b",
  icon: "#ffe66d",
  button: "#a78bfa",
  divider: "#888",
  spacer: "#555",
};

function ElementTimingRow({
  el,
  sceneId,
  sceneDurationMs,
}: {
  el: SceneElement;
  sceneId: string;
  sceneDurationMs: number;
}) {
  const updateSceneElement = useLumvasStore((s) => s.updateSceneElement);
  const updateElementTiming = useLumvasStore((s) => s.updateElementTiming);
  const removeSceneElement = useLumvasStore((s) => s.removeSceneElement);
  const activeElementId = useLumvasStore((s) => s.activeElementId);
  const setActiveElement = useLumvasStore((s) => s.setActiveElement);
  const isActive = activeElementId === el.id;
  const typeColor = ELEMENT_TYPE_COLORS[el.type] ?? "#888";

  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 6,
        background: isActive ? "#2a2a2e" : "transparent",
        cursor: "pointer",
        marginBottom: 2,
        borderLeft: isActive ? `3px solid ${typeColor}` : "3px solid transparent",
        transition: "background 0.1s",
      }}
      onClick={() => setActiveElement(el.id)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: isActive ? 8 : 0 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            color: typeColor,
            width: 44,
            letterSpacing: "0.5px",
          }}
        >
          {el.type}
        </span>
        <span
          style={{
            fontSize: 12,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "#ccc",
          }}
        >
          {el.content?.slice(0, 30) || "(empty)"}
        </span>
        <button
          style={{
            fontSize: 14,
            color: "#666",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
          }}
          onClick={(e) => {
            e.stopPropagation();
            removeSceneElement(sceneId, el.id);
          }}
          title="Remove element"
        >
          ×
        </button>
      </div>

      {isActive && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
          {/* Content */}
          {(el.type === "text" || el.type === "button") && (
            <input
              type="text"
              value={el.content}
              onChange={(e) => updateSceneElement(sceneId, el.id, { content: e.target.value })}
              style={{
                fontSize: 12,
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid #3a3a3e",
                background: "#2a2a2e",
                color: "#ddd",
              }}
              placeholder="Text content"
            />
          )}

          {/* Timing */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#888", fontSize: 11 }}>
              Enter
              <input
                type="number"
                value={el.timing.enterMs}
                onChange={(e) => updateElementTiming(sceneId, el.id, { enterMs: Number(e.target.value) })}
                style={{ width: 60, fontSize: 11, padding: "3px 6px" }}
              />
              <span style={{ color: "#555" }}>ms</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#888", fontSize: 11 }}>
              Exit
              <input
                type="number"
                value={el.timing.exitMs ?? sceneDurationMs}
                onChange={(e) => updateElementTiming(sceneId, el.id, { exitMs: Number(e.target.value) })}
                style={{ width: 60, fontSize: 11, padding: "3px 6px" }}
              />
              <span style={{ color: "#555" }}>ms</span>
            </label>
          </div>

          {/* Enter animation */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
            <span style={{ color: "#4ecdc4", fontWeight: 600, width: 24 }}>In</span>
            <select
              value={el.timing.enterAnimation?.preset ?? "none"}
              onChange={(e) =>
                updateElementTiming(sceneId, el.id, {
                  enterAnimation: {
                    preset: e.target.value as AnimationPreset,
                    durationMs: el.timing.enterAnimation?.durationMs ?? 500,
                  },
                })
              }
              style={{ fontSize: 11, padding: "3px 6px", flex: 1 }}
            >
              {ANIMATION_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
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
          </div>

          {/* Exit animation */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
            <span style={{ color: "#ff6b6b", fontWeight: 600, width: 24 }}>Out</span>
            <select
              value={el.timing.exitAnimation?.preset ?? "none"}
              onChange={(e) =>
                updateElementTiming(sceneId, el.id, {
                  exitAnimation: {
                    preset: e.target.value as AnimationPreset,
                    durationMs: el.timing.exitAnimation?.durationMs ?? 500,
                  },
                })
              }
              style={{ fontSize: 11, padding: "3px 6px", flex: 1 }}
            >
              {ANIMATION_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font size for text */}
          {el.type === "text" && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#888" }}>
                Size
                <input
                  type="number"
                  value={el.fontSize ?? 24}
                  onChange={(e) => updateSceneElement(sceneId, el.id, { fontSize: Number(e.target.value) })}
                  style={{ width: 50, fontSize: 11, padding: "3px 6px" }}
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#888" }}>
                Weight
                <input
                  type="number"
                  value={el.fontWeight ?? 400}
                  step={100}
                  onChange={(e) => updateSceneElement(sceneId, el.id, { fontWeight: Number(e.target.value) })}
                  style={{ width: 50, fontSize: 11, padding: "3px 6px" }}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SceneEditor() {
  const currentTimeMs = useTimelineStore((s) => s.currentTimeMs);
  const vc = useLumvasStore((s) => selectVideoContent(s));
  const updateScene = useLumvasStore((s) => s.updateScene);
  const addScene = useLumvasStore((s) => s.addScene);
  const removeScene = useLumvasStore((s) => s.removeScene);
  const addSceneElement = useLumvasStore((s) => s.addSceneElement);

  const currentSceneId = getSceneAtTime(currentTimeMs);
  const scene = vc.scenes.find((s) => s.id === currentSceneId);

  const handleAddElement = (type: "text" | "image" | "icon" | "divider" | "spacer") => {
    if (!scene) return;
    const el: SceneElement = {
      id: uid(),
      type,
      content: type === "text" ? "New Text" : "",
      timing: {
        enterMs: 0,
        enterAnimation: { preset: "fade-in", durationMs: 500 },
      },
    };
    addSceneElement(scene.id, el);
  };

  if (!scene) {
    return (
      <div className={styles.panelSection}>
        <h3 className={styles.panelTitle}>Scene</h3>
        <p style={{ fontSize: 13, color: "#666" }}>No scene selected</p>
        <button
          style={{
            marginTop: 12,
            width: "100%",
            padding: "8px 0",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: "#0a84ff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
          onClick={() => addScene()}
        >
          + Add Scene
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Scene properties */}
      <div className={styles.panelSection}>
        <h3 className={styles.panelTitle}>Scene {vc.scenes.indexOf(scene) + 1}</h3>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, fontSize: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#888" }}>
            Duration
            <input
              type="number"
              value={scene.durationMs}
              step={100}
              onChange={(e) => updateScene(scene.id, { durationMs: Math.max(100, Number(e.target.value)) })}
              style={{ width: 70, fontSize: 12, padding: "5px 8px" }}
            />
            <span style={{ color: "#555" }}>ms</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={{
              flex: 1,
              padding: "7px 0",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: "#0a84ff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onClick={() => addScene()}
          >
            + Scene
          </button>
          {vc.scenes.length > 1 && (
            <button
              style={{
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "#ff453a",
                background: "rgba(255,69,58,0.1)",
                border: "1px solid rgba(255,69,58,0.3)",
                borderRadius: 6,
                cursor: "pointer",
              }}
              onClick={() => removeScene(scene.id)}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Elements */}
      <div className={styles.panelSection}>
        <h3 className={styles.panelTitle}>Elements</h3>

        {scene.elements.map((el) => (
          <ElementTimingRow key={el.id} el={el} sceneId={scene.id} sceneDurationMs={scene.durationMs} />
        ))}

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
          {(["text", "image", "icon", "divider", "spacer"] as const).map((type) => (
            <button
              key={type}
              style={{
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 500,
                color: "#aaa",
                background: "#2a2a2e",
                border: "1px solid #3a3a3e",
                borderRadius: 4,
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onClick={() => handleAddElement(type)}
            >
              + {type}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
