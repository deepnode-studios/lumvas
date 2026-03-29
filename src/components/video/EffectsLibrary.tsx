import { useState, useCallback, useRef } from "react";
import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { EFFECT_DEFINITIONS, EFFECT_CATEGORIES, EFFECT_COMBOS } from "@/data/effectsLibrary";
import type { Effect, EffectParamValue, Keyframe, KeyframeProperties, EffectDefinition } from "@/types/schema";
import styles from "./effectsLibrary.module.css";
import { EasingCurveEditor } from "./EasingCurveEditor";
import type { CubicBezier } from "./EasingCurveEditor";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultEffect(def: EffectDefinition): Effect {
  const params: Record<string, EffectParamValue> = {};
  for (const p of def.params) params[p.key] = p.default;
  return {
    id: generateId(),
    definitionId: def.id,
    trigger: def.defaultTrigger,
    durationMs: def.defaultDurationMs,
    delayMs: 0,
    enabled: true,
    params,
  };
}

/* ─── Param editor for a single effect param ─── */
function ParamEditor({
  def,
  value,
  onChange,
}: {
  def: import("@/types/schema").EffectParamDef;
  value: EffectParamValue;
  onChange: (v: EffectParamValue) => void;
}) {
  if (def.type === "number") {
    return (
      <div className={styles.paramRow}>
        <span className={styles.paramLabel}>{def.label}</span>
        <input
          type="number"
          className={styles.paramInput}
          value={value as number}
          min={def.min}
          max={def.max}
          step={def.step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    );
  }
  if (def.type === "color") {
    const theme = useLumvasStore((s) => s.theme);
    const swatches: { hex: string; label: string }[] = [
      { hex: theme.primaryColor, label: "primary" },
      { hex: theme.secondaryColor, label: "secondary" },
      ...(theme.palette ?? []).map((c) => ({ hex: c.value, label: c.id })),
    ];
    return (
      <div className={styles.paramRow} style={{ flexWrap: "wrap", gap: 4 }}>
        <span className={styles.paramLabel}>{def.label}</span>
        <input
          type="color"
          className={styles.paramColor}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
        {swatches.map((sw) => (
          <button
            key={sw.label}
            title={sw.label}
            onClick={() => onChange(sw.hex)}
            style={{
              width: 16, height: 16, borderRadius: "50%",
              background: sw.hex, border: (value as string) === sw.hex ? "2px solid #fff" : "1px solid #555",
              cursor: "pointer", padding: 0, flexShrink: 0,
            }}
          />
        ))}
      </div>
    );
  }
  if (def.type === "select") {
    // Parse cubic-bezier string if stored as custom override
    const easingToCubic = (v: string): CubicBezier | null => {
      const m = v.match(/cubic-bezier\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(",").map(Number);
      if (parts.length === 4) return parts as unknown as CubicBezier;
      return null;
    };
    const isEasing = def.key === "easing";
    const customCurve = isEasing ? easingToCubic(value as string) : null;
    const [showCurve, setShowCurve] = useState(false);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className={styles.paramRow}>
          <span className={styles.paramLabel}>{def.label}</span>
          <select
            className={styles.paramSelect}
            value={customCurve ? "custom" : (value as string)}
            onChange={(e) => { if (e.target.value !== "custom") onChange(e.target.value); }}
          >
            {def.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            {customCurve && <option value="custom">Custom</option>}
          </select>
          {isEasing && (
            <button
              onClick={() => setShowCurve((x) => !x)}
              style={{ fontSize: 10, padding: "2px 6px", background: showCurve ? "#a78bfa22" : "#26262a",
                border: "1px solid #383840", color: "#a78bfa", borderRadius: 4, cursor: "pointer", flexShrink: 0 }}
              title="Edit easing curve"
            >⌒</button>
          )}
        </div>
        {isEasing && showCurve && (
          <div style={{ paddingLeft: 8 }}>
            <EasingCurveEditor
              value={customCurve ?? [0, 0, 0.2, 1]}
              onChange={(cb) => onChange(`cubic-bezier(${cb.join(",")})`)}
            />
          </div>
        )}
      </div>
    );
  }
  if (def.type === "boolean") {
    return (
      <div className={styles.paramRow}>
        <span className={styles.paramLabel}>{def.label}</span>
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
        />
      </div>
    );
  }
  return null;
}

/* ─── Keyframe editor ─── */

const KEYFRAME_PROPS: { key: keyof KeyframeProperties; label: string }[] = [
  { key: "opacity", label: "Opacity" },
  { key: "x", label: "X" },
  { key: "y", label: "Y" },
  { key: "scale", label: "Scale" },
  { key: "rotation", label: "Rotation" },
  { key: "blur", label: "Blur" },
  { key: "drawProgress", label: "Draw%" },
  { key: "color", label: "Color" },
  { key: "backgroundColor", label: "BG Color" },
];

function KeyframeEditor({
  keyframes,
  onChange,
}: {
  keyframes: Keyframe[];
  onChange: (kfs: Keyframe[]) => void;
}) {
  const addKeyframe = () => {
    const newKf: Keyframe = { progress: 0.5, properties: { opacity: 1 } };
    onChange([...keyframes, newKf].sort((a, b) => a.progress - b.progress));
  };

  const updateKf = (idx: number, patch: Partial<Keyframe>) => {
    const next = keyframes.map((kf, i) => i === idx ? { ...kf, ...patch } : kf);
    onChange(next.sort((a, b) => a.progress - b.progress));
  };

  const removeKf = (idx: number) => {
    onChange(keyframes.filter((_, i) => i !== idx));
  };

  const setProperty = (idx: number, key: keyof KeyframeProperties, val: string) => {
    const kf = keyframes[idx];
    const props = { ...kf.properties };
    if (val === "") {
      delete props[key];
    } else if (key === "color" || key === "backgroundColor") {
      (props as Record<string, string | number | undefined>)[key] = val;
    } else {
      (props as Record<string, string | number | undefined>)[key] = parseFloat(val) || 0;
    }
    updateKf(idx, { properties: props });
  };

  return (
    <div className={styles.keyframeEditor}>
      <div className={styles.keyframeHeader}>
        <span className={styles.sectionLabel}>KEYFRAMES</span>
        <button className={styles.addKfBtn} onClick={addKeyframe}>+ Add</button>
      </div>
      {keyframes.length === 0 && (
        <div className={styles.emptyKf}>No keyframes — click + Add to create one.</div>
      )}
      {keyframes.map((kf, idx) => (
        <div key={idx} className={styles.keyframeRow}>
          <div className={styles.kfProgress}>
            <span className={styles.paramLabel}>t</span>
            <input
              type="number"
              className={styles.paramInput}
              value={kf.progress}
              min={0}
              max={1}
              step={0.01}
              onChange={(e) => updateKf(idx, { progress: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className={styles.kfProps}>
            {KEYFRAME_PROPS.map(({ key, label }) => {
              const v = kf.properties[key];
              const isColor = key === "color" || key === "backgroundColor";
              return (
                <div key={key} className={styles.kfPropRow}>
                  <span className={styles.kfPropLabel}>{label}</span>
                  {isColor ? (
                    <div className={styles.kfColorGroup}>
                      <input
                        type="color"
                        className={styles.paramColor}
                        value={(v as string | undefined) || "#000000"}
                        onChange={(e) => setProperty(idx, key, e.target.value)}
                      />
                      <button
                        className={styles.kfClearBtn}
                        onClick={() => setProperty(idx, key, "")}
                        title="Clear"
                      >×</button>
                    </div>
                  ) : (
                    <input
                      type="number"
                      className={styles.paramInput}
                      value={v !== undefined ? (v as number) : ""}
                      placeholder="—"
                      step={key === "opacity" || key === "scale" || key === "drawProgress" ? 0.01 : 1}
                      onChange={(e) => setProperty(idx, key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <button className={styles.removeKfBtn} onClick={() => removeKf(idx)} title="Remove keyframe">×</button>
        </div>
      ))}
    </div>
  );
}

/* ─── Applied effect row ─── */
function AppliedEffectRow({
  effect,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  effect: Effect;
  onUpdate: (patch: Partial<Effect>) => void;
  onRemove: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const def = EFFECT_DEFINITIONS.find((d) => d.id === effect.definitionId);
  if (!def) return null;

  const nonKeyframeParams = def.params.filter((p) => p.type !== "keyframes");
  const keyframeParam = def.params.find((p) => p.type === "keyframes");

  return (
    <div
      className={styles.appliedEffect}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={styles.appliedEffectHeader}>
        {onDragStart && (
          <span className={styles.dragHandle} title="Drag to reorder">⠿</span>
        )}
        <button
          className={styles.toggleEnabled}
          onClick={() => onUpdate({ enabled: !effect.enabled })}
          title={effect.enabled ? "Disable" : "Enable"}
        >
          {effect.enabled ? "✓" : "○"}
        </button>
        <span
          className={styles.appliedEffectName}
          onClick={() => setExpanded((x) => !x)}
          style={{ cursor: "pointer", opacity: effect.enabled ? 1 : 0.4 }}
        >
          {def.label}
          <span className={styles.appliedEffectCategory}>{def.category}</span>
        </span>
        <span className={styles.appliedEffectExpand} onClick={() => setExpanded((x) => !x)}>
          {expanded ? "▲" : "▼"}
        </span>
        <button className={styles.removeEffectBtn} onClick={onRemove} title="Remove">×</button>
      </div>

      {expanded && (
        <div className={styles.appliedEffectParams}>
          {/* Trigger + timing */}
          <div className={styles.paramRow}>
            <span className={styles.paramLabel}>Trigger</span>
            <select
              className={styles.paramSelect}
              value={effect.trigger}
              onChange={(e) => onUpdate({ trigger: e.target.value as Effect["trigger"] })}
            >
              <option value="enter">Enter</option>
              <option value="exit">Exit</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>

          {/* Duration (for enter/exit) */}
          {(effect.trigger === "enter" || effect.trigger === "exit") && (
            <>
              <div className={styles.paramRow}>
                <span className={styles.paramLabel}>Duration (ms)</span>
                <input
                  type="number"
                  className={styles.paramInput}
                  value={effect.durationMs ?? def.defaultDurationMs ?? 500}
                  min={0}
                  step={50}
                  onChange={(e) => onUpdate({ durationMs: Number(e.target.value) })}
                />
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramLabel}>Delay (ms)</span>
                <input
                  type="number"
                  className={styles.paramInput}
                  value={effect.delayMs ?? 0}
                  min={0}
                  step={50}
                  onChange={(e) => onUpdate({ delayMs: Number(e.target.value) })}
                />
              </div>
            </>
          )}

          {/* Lifetime range */}
          {effect.trigger === "lifetime" && (
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>Range</span>
              <input
                type="number"
                className={styles.paramInput}
                value={effect.startProgress ?? 0}
                min={0}
                max={1}
                step={0.01}
                onChange={(e) => onUpdate({ startProgress: Number(e.target.value) })}
                title="Start progress"
              />
              <span style={{ color: "#666" }}>–</span>
              <input
                type="number"
                className={styles.paramInput}
                value={effect.endProgress ?? 1}
                min={0}
                max={1}
                step={0.01}
                onChange={(e) => onUpdate({ endProgress: Number(e.target.value) })}
                title="End progress"
              />
            </div>
          )}

          {/* Per-param editors */}
          {nonKeyframeParams.map((pd) => (
            <ParamEditor
              key={pd.key}
              def={pd}
              value={effect.params[pd.key] ?? pd.default}
              onChange={(v) => onUpdate({ params: { ...effect.params, [pd.key]: v } })}
            />
          ))}

          {/* Keyframe editor */}
          {keyframeParam && (
            <KeyframeEditor
              keyframes={(effect.params.keyframes as Keyframe[] | undefined) ?? []}
              onChange={(kfs) => onUpdate({ params: { ...effect.params, keyframes: kfs } })}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Effect card (catalog) ─── */
function EffectCard({ def, onAdd }: { def: EffectDefinition; onAdd: () => void }) {
  return (
    <button className={styles.effectCard} onClick={onAdd} title={def.description} data-category={def.category}>
      <span className={styles.effectCardIcon}>{def.icon}</span>
      <span className={styles.effectCardLabel}>{def.label}</span>
    </button>
  );
}

/* ─── Main component ─── */
export function EffectsLibrary({ onClose }: { onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState<string>("intro");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const dragIdx = useRef<number | null>(null);
  const store = useLumvasStore();
  const activeElementId = useLumvasStore((s) => s.activeElementId);
  const activeSceneId = useLumvasStore((s) => s.activeSceneId);

  const activeScene = (() => {
    if (store.contentType !== "video") return null;
    const vc = selectVideoContent(store);
    return vc.scenes.find((s) => s.id === activeSceneId) ?? null;
  })();

  const activeElement = activeScene?.elements.find((e) => e.id === activeElementId) ?? null;
  const effects = activeElement?.timing.effects ?? [];

  const addEffect = useCallback((def: EffectDefinition) => {
    if (!activeSceneId || !activeElementId || !activeElement) return;
    const newEffect = defaultEffect(def);
    const newEffects = [...effects, newEffect];
    useLumvasStore.getState().updateElementTiming(activeSceneId, activeElementId, { effects: newEffects });
  }, [activeSceneId, activeElementId, activeElement, effects]);

  const addCombo = useCallback((comboId: string) => {
    if (!activeSceneId || !activeElementId || !activeElement) return;
    const combo = EFFECT_COMBOS.find((c) => c.id === comboId);
    if (!combo) return;
    const newComboEffects = combo.effects.map((e) => ({ ...e, id: generateId() }));
    const newEffects = [...effects, ...newComboEffects];
    useLumvasStore.getState().updateElementTiming(activeSceneId, activeElementId, { effects: newEffects });
  }, [activeSceneId, activeElementId, activeElement, effects]);

  const updateEffect = useCallback((effectId: string, patch: Partial<Effect>) => {
    if (!activeSceneId || !activeElementId) return;
    const newEffects = effects.map((e) => e.id === effectId ? { ...e, ...patch } : e);
    useLumvasStore.getState().updateElementTiming(activeSceneId, activeElementId, { effects: newEffects });
  }, [activeSceneId, activeElementId, effects]);

  const removeEffect = useCallback((effectId: string) => {
    if (!activeSceneId || !activeElementId) return;
    const newEffects = effects.filter((e) => e.id !== effectId);
    useLumvasStore.getState().updateElementTiming(activeSceneId, activeElementId, { effects: newEffects });
  }, [activeSceneId, activeElementId, effects]);

  const reorderEffects = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || !activeSceneId || !activeElementId) return;
    const newEffects = [...effects];
    const [moved] = newEffects.splice(fromIdx, 1);
    newEffects.splice(toIdx, 0, moved);
    useLumvasStore.getState().updateElementTiming(activeSceneId, activeElementId, { effects: newEffects });
  }, [activeSceneId, activeElementId, effects]);

  const q = catalogSearch.trim().toLowerCase();
  const filteredDefs = q
    ? EFFECT_DEFINITIONS.filter((d) =>
        d.label.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q),
      )
    : EFFECT_DEFINITIONS.filter((d) => d.category === activeCategory);

  const aq = appliedSearch.trim().toLowerCase();
  const filteredEffects = aq
    ? effects.filter((e) => {
        const def = EFFECT_DEFINITIONS.find((d) => d.id === e.definitionId);
        return def?.label.toLowerCase().includes(aq);
      })
    : effects;

  return (
    <div className={styles.drawer}>
      {/* Header */}
      <div className={styles.drawerHeader}>
        <span className={styles.drawerTitle}>✦ EFFECTS</span>
        {activeElement ? (
          <span className={styles.drawerSubtitle}>
            Applying to: <strong>{activeElement.content?.slice(0, 30) || activeElement.type}</strong>
          </span>
        ) : (
          <span className={styles.drawerSubtitle} style={{ color: "#666" }}>
            Select an element in the preview to apply effects
          </span>
        )}
        <button className={styles.closeBtn} onClick={onClose} title="Close FX panel">×</button>
      </div>

      <div className={styles.drawerBody}>
        {/* Left: catalog */}
        <div className={styles.catalog}>
          {/* Search */}
          <div className={styles.catalogSearch}>
            <input
              className={styles.searchInput}
              placeholder="Search effects…"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
          </div>

          {/* Category tabs (hidden when searching) */}
          {!catalogSearch && (
            <div className={styles.categoryTabs}>
              {EFFECT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.categoryTab} ${activeCategory === cat.id ? styles.categoryTabActive : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
              <button
                className={`${styles.categoryTab} ${activeCategory === "combos" ? styles.categoryTabActive : ""}`}
                onClick={() => setActiveCategory("combos")}
                style={{ color: "#fbbf24" }}
              >
                ✦ Combos
              </button>
            </div>
          )}

          {/* Effect card grid or combos */}
          {activeCategory === "combos" && !catalogSearch ? (
            <div className={styles.effectGrid}>
              {EFFECT_COMBOS.map((combo) => (
                <button
                  key={combo.id}
                  className={styles.effectCard}
                  onClick={() => addCombo(combo.id)}
                  title={combo.description}
                  style={{ minWidth: 72 }}
                >
                  <span className={styles.effectCardIcon} style={{ fontSize: 20 }}>{combo.icon}</span>
                  <span className={styles.effectCardLabel}>{combo.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.effectGrid}>
              {filteredDefs.map((def) => (
                <EffectCard
                  key={def.id}
                  def={def}
                  onAdd={() => addEffect(def)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Right: applied effects */}
        <div className={styles.applied}>
          <div className={styles.appliedHeader}>
            <span className={styles.sectionLabel}>APPLIED ({effects.length})</span>
            {effects.length > 1 && (
              <input
                className={styles.searchInput}
                placeholder="Filter…"
                value={appliedSearch}
                onChange={(e) => setAppliedSearch(e.target.value)}
                style={{ marginTop: 4, fontSize: 10 }}
              />
            )}
          </div>
          {effects.length === 0 ? (
            <div className={styles.emptyApplied}>
              Click an effect card to apply it to the selected element.
            </div>
          ) : (
            <div
              className={styles.appliedList}
              onDragOver={(e) => e.preventDefault()}
            >
              {filteredEffects.map((effect) => {
                const idx = effects.indexOf(effect);
                return (
                <AppliedEffectRow
                  key={effect.id}
                  effect={effect}
                  onUpdate={(patch) => updateEffect(effect.id, patch)}
                  onRemove={() => removeEffect(effect.id)}
                  onDragStart={() => { dragIdx.current = idx; }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={() => { if (dragIdx.current !== null) reorderEffects(dragIdx.current, idx); dragIdx.current = null; }}
                />
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
