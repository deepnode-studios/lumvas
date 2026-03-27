"use client";

import { useState } from "react";
import { useLumvasStore, DOCUMENT_SIZES, FONT_OPTIONS } from "@/store/useLumvasStore";
import { PanelSection } from "./PanelSection";
import { ColorPicker } from "./ColorPicker";
import { GradientEditor } from "./GradientEditor";
import type { ColorToken, FontToken, BackgroundPreset, BackgroundPattern } from "@/types/schema";
import styles from "@/styles/workspace.module.css";
import paletteStyles from "./palette.module.css";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function PaletteColorRow({ color }: { color: ColorToken }) {
  const updatePaletteColor = useLumvasStore((s) => s.updatePaletteColor);
  const removePaletteColor = useLumvasStore((s) => s.removePaletteColor);
  const [editing, setEditing] = useState(false);

  return (
    <div className={paletteStyles.colorRow}>
      <input
        type="color"
        value={color.value}
        onChange={(e) => updatePaletteColor(color.id, { value: e.target.value })}
        className={paletteStyles.swatch}
      />
      {editing ? (
        <div className={paletteStyles.editFields}>
          <input
            type="text"
            value={color.label}
            placeholder="Label"
            className={paletteStyles.inlineInput}
            onChange={(e) => updatePaletteColor(color.id, { label: e.target.value })}
          />
          <input
            type="text"
            value={color.description}
            placeholder="Description (e.g. Used for headings)"
            className={paletteStyles.inlineInput}
            onChange={(e) => updatePaletteColor(color.id, { description: e.target.value })}
          />
          <input
            type="text"
            value={color.id}
            placeholder="Token ID"
            className={paletteStyles.inlineInput}
            onChange={(e) => updatePaletteColor(color.id, { id: e.target.value })}
          />
        </div>
      ) : (
        <div className={paletteStyles.colorInfo}>
          <span className={paletteStyles.colorLabel}>{color.label || color.id}</span>
          <span className={color.description ? paletteStyles.colorDesc : paletteStyles.colorDescEmpty}>
            {color.description || "No description"}
          </span>
          <span className={paletteStyles.colorMeta}>
            {color.value} &middot; {color.id}
          </span>
        </div>
      )}
      <div className={paletteStyles.colorActions}>
        <button
          className={styles.btnSmall}
          onClick={() => setEditing(!editing)}
          style={{ padding: "2px 6px", fontSize: 10 }}
        >
          {editing ? "Done" : "Edit"}
        </button>
        <button
          className={styles.btnDanger}
          onClick={() => removePaletteColor(color.id)}
          style={{ padding: "2px 6px", fontSize: 10 }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}

const CUSTOM_FONT_VALUE = "__custom__";
const systemFonts = FONT_OPTIONS.filter((f) => f.category === "system");
const googleFonts = FONT_OPTIONS.filter((f) => f.category === "google");

function FontRow({ font }: { font: FontToken }) {
  const updateFont = useLumvasStore((s) => s.updateFont);
  const removeFont = useLumvasStore((s) => s.removeFont);
  const [editing, setEditing] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  const isBuiltIn = font.id === "header" || font.id === "body";
  const isKnown = FONT_OPTIONS.some((f) => f.value === font.value);

  const handleSelectChange = (val: string) => {
    if (val === CUSTOM_FONT_VALUE) {
      setCustomMode(true);
    } else {
      setCustomMode(false);
      // Auto-set label to the font name for new selections
      const opt = FONT_OPTIONS.find((f) => f.value === val);
      updateFont(font.id, { value: val, ...(opt ? {} : {}) });
    }
  };

  return (
    <div className={paletteStyles.colorRow}>
      <span
        className={paletteStyles.fontPreview}
        style={{ fontFamily: font.value }}
      >
        Aa
      </span>
      {editing ? (
        <div className={paletteStyles.editFields}>
          <input
            type="text"
            value={font.label}
            placeholder="Label"
            className={paletteStyles.inlineInput}
            onChange={(e) => updateFont(font.id, { label: e.target.value })}
          />
          {customMode || !isKnown ? (
            <>
              <input
                type="text"
                value={font.value}
                placeholder="e.g. Montserrat, sans-serif"
                className={paletteStyles.inlineInput}
                onChange={(e) => updateFont(font.id, { value: e.target.value })}
                autoFocus={customMode}
              />
              <button
                className={styles.btnSmall}
                onClick={() => setCustomMode(false)}
                style={{ fontSize: 10, alignSelf: "flex-start" }}
              >
                Browse list
              </button>
            </>
          ) : (
            <>
              <select
                className={paletteStyles.inlineInput}
                value={font.value}
                onChange={(e) => handleSelectChange(e.target.value)}
              >
                <optgroup label="System">
                  {systemFonts.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Google Fonts">
                  {googleFonts.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other">
                  <option value={CUSTOM_FONT_VALUE}>Custom Google font...</option>
                </optgroup>
              </select>
            </>
          )}
          {!isBuiltIn && (
            <input
              type="text"
              value={font.id}
              placeholder="Token ID"
              className={paletteStyles.inlineInput}
              onChange={(e) => updateFont(font.id, { id: e.target.value })}
            />
          )}
        </div>
      ) : (
        <div className={paletteStyles.colorInfo}>
          <span className={paletteStyles.colorLabel}>{font.label}</span>
          <span className={paletteStyles.colorMeta}>
            {font.value.split(",")[0].replace(/['"]/g, "")} &middot; {font.id}
          </span>
        </div>
      )}
      <div className={paletteStyles.colorActions}>
        <button
          className={styles.btnSmall}
          onClick={() => { setEditing(!editing); setCustomMode(false); }}
          style={{ padding: "2px 6px", fontSize: 10 }}
        >
          {editing ? "Done" : "Edit"}
        </button>
        {!isBuiltIn && (
          <button
            className={styles.btnDanger}
            onClick={() => removeFont(font.id)}
            style={{ padding: "2px 6px", fontSize: 10 }}
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

function bgPreviewStyle(preset: BackgroundPreset): React.CSSProperties {
  const s = preset.style;
  return {
    background: s.backgroundGradient || s.backgroundColor || "#eee",
  };
}

function BackgroundPresetRow({ preset }: { preset: BackgroundPreset }) {
  const updateBackgroundPreset = useLumvasStore((s) => s.updateBackgroundPreset);
  const removeBackgroundPreset = useLumvasStore((s) => s.removeBackgroundPreset);
  const assets = useLumvasStore((s) => s.assets.items);
  const [editing, setEditing] = useState(false);

  // Count how many slides use this preset
  const slides = useLumvasStore((s) => s.content.slides);
  const usageCount = slides.filter(
    (sl) => sl.style?.backgroundPresetId === preset.id
  ).length;

  const updateStyle = (patch: Partial<BackgroundPreset["style"]>) => {
    updateBackgroundPreset(preset.id, { style: { ...preset.style, ...patch } });
  };

  const removeStyleKey = (key: keyof BackgroundPreset["style"]) => {
    const next = { ...preset.style };
    delete next[key];
    updateBackgroundPreset(preset.id, { style: next });
  };

  return (
    <div className={paletteStyles.presetBlock}>
      <div className={paletteStyles.colorRow}>
        <div className={paletteStyles.bgPreview} style={bgPreviewStyle(preset)} />
        <div className={paletteStyles.colorInfo}>
          <span className={paletteStyles.colorLabel}>{preset.label}</span>
          <span className={paletteStyles.colorMeta}>
            {preset.id} &middot; {usageCount} slide{usageCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className={paletteStyles.colorActions}>
          <button
            className={styles.btnSmall}
            onClick={() => setEditing(!editing)}
            style={{ padding: "2px 6px", fontSize: 10 }}
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            className={styles.btnDanger}
            onClick={() => removeBackgroundPreset(preset.id)}
            style={{ padding: "2px 6px", fontSize: 10 }}
          >
            &times;
          </button>
        </div>
      </div>

      {editing && (
        <div className={paletteStyles.presetFields}>
          <div className={styles.fieldRow}>
            <label>Label</label>
            <input
              type="text"
              value={preset.label}
              placeholder="Label"
              onChange={(e) => updateBackgroundPreset(preset.id, { label: e.target.value })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>ID</label>
            <input
              type="text"
              value={preset.id}
              placeholder="Preset ID"
              onChange={(e) => updateBackgroundPreset(preset.id, { id: e.target.value })}
            />
          </div>

          <div className={styles.fieldRow}>
            <label>Color</label>
            <ColorPicker
              value={preset.style.backgroundColor}
              onChange={(v) => {
                if (v) updateStyle({ backgroundColor: v });
                else removeStyleKey("backgroundColor");
              }}
              allowNone
              noneLabel="None"
            />
          </div>

          <div className={styles.fieldRow}>
            <label>Gradient</label>
            <select
              value={preset.style.backgroundGradient ? "on" : "none"}
              onChange={(e) => {
                if (e.target.value === "none") {
                  removeStyleKey("backgroundGradient");
                } else {
                  updateStyle({
                    backgroundGradient: preset.style.backgroundGradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  });
                }
              }}
            >
              <option value="none">None</option>
              <option value="on">On</option>
            </select>
          </div>
          {preset.style.backgroundGradient && (
            <div className={styles.fieldRow}>
              <label></label>
              <GradientEditor
                value={preset.style.backgroundGradient}
                onChange={(v) => updateStyle({ backgroundGradient: v })}
              />
            </div>
          )}

          <div className={styles.fieldRow}>
            <label>Pattern</label>
            <select
              value={preset.style.backgroundPattern ?? "none"}
              onChange={(e) => {
                const v = e.target.value as BackgroundPattern;
                if (v === "none") {
                  const next = { ...preset.style };
                  delete next.backgroundPattern;
                  delete next.backgroundPatternColor;
                  delete next.backgroundPatternOpacity;
                  delete next.backgroundPatternScale;
                  updateBackgroundPreset(preset.id, { style: next });
                } else {
                  updateStyle({ backgroundPattern: v });
                }
              }}
            >
              <option value="none">None</option>
              <option value="dots">Dots</option>
              <option value="grid">Grid</option>
              <option value="lines">Lines</option>
              <option value="diagonal">Diagonal</option>
              <option value="crosshatch">Crosshatch</option>
              <option value="waves">Waves</option>
              <option value="checkerboard">Checkerboard</option>
            </select>
          </div>
          {preset.style.backgroundPattern && preset.style.backgroundPattern !== "none" && (
            <>
              <div className={styles.fieldRow}>
                <label>Pat color</label>
                <ColorPicker
                  value={preset.style.backgroundPatternColor ?? "primary"}
                  onChange={(v) => updateStyle({ backgroundPatternColor: v })}
                />
              </div>
              <div className={styles.fieldRow}>
                <label>Pat opacity</label>
                <input
                  type="number"
                  value={preset.style.backgroundPatternOpacity ?? 0.15}
                  min={0} max={1} step={0.05}
                  onChange={(e) => updateStyle({ backgroundPatternOpacity: Number(e.target.value) })}
                />
              </div>
              <div className={styles.fieldRow}>
                <label>Pat scale</label>
                <input
                  type="number"
                  value={preset.style.backgroundPatternScale ?? 1}
                  min={0.25} max={5} step={0.25}
                  onChange={(e) => updateStyle({ backgroundPatternScale: Number(e.target.value) })}
                />
              </div>
            </>
          )}

          <div className={styles.fieldRow}>
            <label>Bg image</label>
            <select
              value={preset.style.backgroundAssetId ?? ""}
              onChange={(e) => {
                const v = e.target.value || undefined;
                if (v) {
                  updateStyle({ backgroundAssetId: v });
                } else {
                  const next = { ...preset.style };
                  delete next.backgroundAssetId;
                  delete next.backgroundAssetSize;
                  delete next.backgroundAssetOpacity;
                  delete next.backgroundAssetPosition;
                  updateBackgroundPreset(preset.id, { style: next });
                }
              }}
            >
              <option value="">None</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>
          {preset.style.backgroundAssetId && (
            <>
              <div className={styles.fieldRow}>
                <label>Img size</label>
                <select
                  value={preset.style.backgroundAssetSize ?? "cover"}
                  onChange={(e) => updateStyle({ backgroundAssetSize: e.target.value as "cover" | "contain" | "repeat" })}
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="repeat">Repeat</option>
                </select>
              </div>
              <div className={styles.fieldRow}>
                <label>Img opacity</label>
                <input
                  type="number"
                  value={preset.style.backgroundAssetOpacity ?? 0.3}
                  min={0} max={1} step={0.05}
                  onChange={(e) => updateStyle({ backgroundAssetOpacity: Number(e.target.value) })}
                />
              </div>
            </>
          )}

          <div className={styles.fieldRow}>
            <label>Overlay</label>
            <ColorPicker
              value={preset.style.backgroundOverlayColor}
              onChange={(v) => {
                if (v) {
                  updateStyle({ backgroundOverlayColor: v });
                } else {
                  const next = { ...preset.style };
                  delete next.backgroundOverlayColor;
                  delete next.backgroundOverlayOpacity;
                  updateBackgroundPreset(preset.id, { style: next });
                }
              }}
              allowNone
              noneLabel="None"
            />
          </div>
          {preset.style.backgroundOverlayColor && (
            <div className={styles.fieldRow}>
              <label>Ovr opacity</label>
              <input
                type="number"
                value={preset.style.backgroundOverlayOpacity ?? 0.5}
                min={0} max={1} step={0.05}
                onChange={(e) => updateStyle({ backgroundOverlayOpacity: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ThemeEditor() {
  const theme = useLumvasStore((s) => s.theme);
  const updateTheme = useLumvasStore((s) => s.updateTheme);
  const addPaletteColor = useLumvasStore((s) => s.addPaletteColor);
  const addFont = useLumvasStore((s) => s.addFont);
  const addBackgroundPreset = useLumvasStore((s) => s.addBackgroundPreset);
  const documentSize = useLumvasStore((s) => s.documentSize);
  const setDocumentSize = useLumvasStore((s) => s.setDocumentSize);
  const language = useLumvasStore((s) => s.language) ?? "en";
  const setLanguage = useLumvasStore((s) => s.setLanguage);
  const bgPresets = theme.backgroundPresets ?? [];

  const sizeKey = `${documentSize.width}x${documentSize.height}`;

  const handleAddColor = () => {
    const id = `color-${uid()}`;
    addPaletteColor({
      id,
      label: "New Color",
      description: "",
      value: "#6366f1",
    });
  };

  return (
    <>
      <PanelSection title="Document">
        <div className={styles.fieldRow}>
          <label>Size</label>
          <select
            value={sizeKey}
            onChange={(e) => {
              const picked = DOCUMENT_SIZES.find(
                (s) => `${s.width}x${s.height}` === e.target.value
              );
              if (picked) setDocumentSize(picked);
            }}
          >
            {DOCUMENT_SIZES.map((s) => (
              <option key={`${s.width}x${s.height}`} value={`${s.width}x${s.height}`}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldRow}>
          <label>Width</label>
          <input
            type="number"
            value={documentSize.width}
            min={320}
            max={3840}
            step={10}
            onChange={(e) =>
              setDocumentSize({
                ...documentSize,
                width: Number(e.target.value),
                label: "Custom",
              })
            }
          />
        </div>

        <div className={styles.fieldRow}>
          <label>Height</label>
          <input
            type="number"
            value={documentSize.height}
            min={320}
            max={3840}
            step={10}
            onChange={(e) =>
              setDocumentSize({
                ...documentSize,
                height: Number(e.target.value),
                label: "Custom",
              })
            }
          />
        </div>

        <div className={styles.fieldRow}>
          <label>Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="tr">Turkish</option>
            <option value="de">German</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="pt">Portuguese</option>
            <option value="it">Italian</option>
            <option value="nl">Dutch</option>
            <option value="pl">Polish</option>
            <option value="ru">Russian</option>
            <option value="ar">Arabic</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
          </select>
        </div>
      </PanelSection>

      <PanelSection title="Theme">
        <div className={styles.fieldRow}>
          <label>Background</label>
          <input
            type="color"
            value={theme.backgroundColor}
            onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
          />
          <span className={styles.colorPreview}>{theme.backgroundColor}</span>
        </div>

        <div className={styles.fieldRow}>
          <label>Primary</label>
          <input
            type="color"
            value={theme.primaryColor}
            onChange={(e) => updateTheme({ primaryColor: e.target.value })}
          />
          <span className={styles.colorPreview}>{theme.primaryColor}</span>
        </div>

        <div className={styles.fieldRow}>
          <label>Secondary</label>
          <input
            type="color"
            value={theme.secondaryColor}
            onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
          />
          <span className={styles.colorPreview}>{theme.secondaryColor}</span>
        </div>

        <div className={styles.fieldRow}>
          <label>Size (px)</label>
          <input
            type="number"
            value={theme.fontSize}
            min={10}
            max={32}
            onChange={(e) => updateTheme({ fontSize: Number(e.target.value) })}
          />
        </div>

        <div className={styles.fieldRow}>
          <label>Weight</label>
          <select
            value={theme.fontWeight}
            onChange={(e) => updateTheme({ fontWeight: Number(e.target.value) })}
          >
            {[300, 400, 500, 600, 700, 800].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldRow}>
          <label>Radius (px)</label>
          <input
            type="number"
            value={theme.borderRadius}
            min={0}
            max={48}
            onChange={(e) =>
              updateTheme({ borderRadius: Number(e.target.value) })
            }
          />
        </div>
      </PanelSection>

      {/* ── Fonts ── */}
      <PanelSection title="Fonts">
        <p className={paletteStyles.hint}>
          Define font variables. Use their ID as a font token in elements.
        </p>

        <div className={paletteStyles.list}>
          {theme.fonts.map((font) => (
            <FontRow key={font.id} font={font} />
          ))}
        </div>

        <button
          className={styles.btnSmall}
          onClick={() => {
            const id = `font-${uid()}`;
            addFont({ id, label: "New Font", value: "Inter, sans-serif" });
          }}
          style={{ marginTop: 8 }}
        >
          + Add Font
        </button>
      </PanelSection>

      {/* ── Color Palette ── */}
      <PanelSection title="Color Palette">
        <p className={paletteStyles.hint}>
          Add named colors. Use their ID as a color token in elements.
        </p>

        {theme.palette.length > 0 && (
          <div className={paletteStyles.list}>
            {theme.palette.map((color) => (
              <PaletteColorRow key={color.id} color={color} />
            ))}
          </div>
        )}

        <button
          className={styles.btnSmall}
          onClick={handleAddColor}
          style={{ marginTop: 8 }}
        >
          + Add Color
        </button>
      </PanelSection>

      {/* ── Background Presets ── */}
      <PanelSection title="Backgrounds">
        <p className={paletteStyles.hint}>
          Save background styles as reusable presets. Link them to slides for consistent backgrounds.
        </p>

        {bgPresets.length > 0 && (
          <div className={paletteStyles.list}>
            {bgPresets.map((preset) => (
              <BackgroundPresetRow key={preset.id} preset={preset} />
            ))}
          </div>
        )}

        <button
          className={styles.btnSmall}
          onClick={() => {
            const id = `bg-${uid()}`;
            addBackgroundPreset({
              id,
              label: "New Background",
              style: {
                backgroundGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              },
            });
          }}
          style={{ marginTop: 8 }}
        >
          + New Preset
        </button>
      </PanelSection>
    </>
  );
}
