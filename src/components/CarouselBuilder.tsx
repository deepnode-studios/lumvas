"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useLumvasStore, selectSlideContent, createElement } from "@/store/useLumvasStore";
import { useFileStore } from "@/store/useFileStore";
import { writeMediaFromDataUri } from "@/utils/lumvasFile";
import type { ElementType, SlideElement, FlexAlign, FlexJustify, FlexDirection, BackgroundPattern, IconLibrary, ChartType, ChartDataPoint } from "@/types/schema";
import { legacyNameToLucide } from "@/data/iconLibraries";
import { TemplateGallery } from "./TemplateGallery";
import { PanelSection } from "./PanelSection";
import { ColorPicker } from "./ColorPicker";
import { FontPicker } from "./FontPicker";
import { GradientEditor } from "./GradientEditor";
import { IconPicker } from "./IconPicker";
import styles from "@/styles/workspace.module.css";
import builderStyles from "./carouselBuilder.module.css";

const ELEMENT_TYPES: { type: ElementType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "image", label: "Image" },
  { type: "button", label: "Button" },
  { type: "list", label: "List" },
  { type: "divider", label: "Divider" },
  { type: "spacer", label: "Spacer" },
  { type: "logo", label: "Logo" },
  { type: "icon", label: "Icon" },
  { type: "chart", label: "Chart" },
  { type: "group", label: "Group" },
];

const ELEMENT_ICONS: Record<ElementType, string> = {
  text: "T",
  image: "img",
  button: "btn",
  list: "li",
  divider: "—",
  spacer: "↕",
  logo: "◎",
  icon: "★",
  group: "[ ]",
  chart: "▥",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadMediaFile(file: File, prefix: string = "img"): Promise<string> {
  const b64 = await fileToBase64(file);
  const projectDir = useFileStore.getState().currentFilePath;
  if (projectDir) {
    return await writeMediaFromDataUri(projectDir, b64, prefix);
  }
  return b64;
}

function ElementEditor({
  el,
  slideId,
}: {
  el: SlideElement;
  slideId: string;
}) {
  const updateElement = useLumvasStore((s) => s.updateElement);
  const assetItems = useLumvasStore((s) => s.assets.items);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<SlideElement>) =>
    updateElement(slideId, el.id, patch);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await uploadMediaFile(file, "img");
    update({ content: data });
  };

  return (
    <div className={builderStyles.elementEditor}>
      {/* Content */}
      {(el.type === "text" || el.type === "button") && (
        <div className={styles.fieldRow}>
          <label>Content</label>
          <input
            type="text"
            value={el.content}
            onChange={(e) => update({ content: e.target.value })}
          />
        </div>
      )}

      {el.type === "list" && (
        <div className={styles.fieldRow} style={{ alignItems: "flex-start" }}>
          <label>Items</label>
          <textarea
            className={builderStyles.textarea}
            value={el.content}
            placeholder="One item per line"
            onChange={(e) => update({ content: e.target.value })}
          />
        </div>
      )}

      {el.type === "image" && (
        <div className={styles.fieldRow}>
          <label>Image</label>
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
          <button
            className={styles.btnSmall}
            onClick={() => imgInputRef.current?.click()}
          >
            {el.content ? "Change" : "Upload"}
          </button>
          {el.content && (
            <button
              className={styles.btnSmall}
              onClick={() => update({ content: "" })}
            >
              Remove
            </button>
          )}
        </div>
      )}

      {/* Text styling */}
      {(el.type === "text" || el.type === "button" || el.type === "list") && (
        <>
          <div className={styles.fieldRow}>
            <label>Font</label>
            <FontPicker
              value={el.fontId}
              onChange={(v) => update({ fontId: v })}
            />
          </div>

          <div className={styles.fieldRow}>
            <label>Size</label>
            <input
              type="number"
              value={el.fontSize ?? 24}
              min={8}
              max={200}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
            />
          </div>

          <div className={styles.fieldRow}>
            <label>Weight</label>
            <select
              value={el.fontWeight ?? 400}
              onChange={(e) => update({ fontWeight: Number(e.target.value) })}
            >
              {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div className={styles.fieldRow}>
            <label>Align</label>
            <select
              value={el.textAlign ?? "left"}
              onChange={(e) =>
                update({ textAlign: e.target.value as "left" | "center" | "right" })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className={styles.fieldRow}>
            <label>Color</label>
            <ColorPicker
              value={el.color ?? "primary"}
              onChange={(v) => update({ color: v === "primary" ? undefined : v })}
            />
          </div>

          <div className={styles.fieldRow}>
            <label>Opacity</label>
            <input
              type="number"
              value={el.opacity ?? 1}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
            />
          </div>

          {el.type === "text" && (
            <>
              <div className={styles.fieldRow}>
                <label>Style</label>
                <select
                  value={el.fontStyle ?? "normal"}
                  onChange={(e) => update({ fontStyle: e.target.value as "normal" | "italic" })}
                >
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                </select>
              </div>

              <div className={styles.fieldRow}>
                <label>Gradient</label>
                <select
                  value={el.backgroundGradient ? "on" : "none"}
                  onChange={(e) =>
                    update({
                      backgroundGradient: e.target.value === "on"
                        ? el.backgroundGradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        : undefined,
                    })
                  }
                >
                  <option value="none">None</option>
                  <option value="on">On</option>
                </select>
              </div>
              {el.backgroundGradient && (
                <div className={styles.fieldRow}>
                  <label></label>
                  <GradientEditor
                    value={el.backgroundGradient}
                    onChange={(v) => update({ backgroundGradient: v })}
                  />
                </div>
              )}
            </>
          )}

          <div className={styles.fieldRow}>
            <label>Transform</label>
            <select
              value={el.textTransform ?? "none"}
              onChange={(e) =>
                update({ textTransform: e.target.value as "none" | "uppercase" | "lowercase" | "capitalize" })
              }
            >
              <option value="none">None</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </div>
        </>
      )}

      {/* Button-specific */}
      {el.type === "button" && (
        <>
          <div className={styles.fieldRow}>
            <label>Btn bg</label>
            <ColorPicker
              value={el.backgroundColor ?? "secondary"}
              onChange={(v) => update({ backgroundColor: v })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Gradient</label>
            <select
              value={el.backgroundGradient ? "on" : "none"}
              onChange={(e) =>
                update({
                  backgroundGradient: e.target.value === "on"
                    ? el.backgroundGradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : undefined,
                })
              }
            >
              <option value="none">None</option>
              <option value="on">On</option>
            </select>
          </div>
          {el.backgroundGradient && (
            <div className={styles.fieldRow}>
              <label></label>
              <GradientEditor
                value={el.backgroundGradient}
                onChange={(v) => update({ backgroundGradient: v })}
              />
            </div>
          )}
          <div className={styles.fieldRow}>
            <label>Btn text</label>
            <ColorPicker
              value={el.textColor ?? "background"}
              onChange={(v) => update({ textColor: v })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Pad X</label>
            <input
              type="number"
              value={el.paddingX ?? 56}
              min={0}
              onChange={(e) => update({ paddingX: Number(e.target.value) })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Pad Y</label>
            <input
              type="number"
              value={el.paddingY ?? 20}
              min={0}
              onChange={(e) => update({ paddingY: Number(e.target.value) })}
            />
          </div>
        </>
      )}

      {/* Image sizing */}
      {el.type === "image" && (
        <>
          <div className={styles.fieldRow}>
            <label>Width</label>
            <input
              type="text"
              value={el.width ?? "100%"}
              onChange={(e) => update({ width: e.target.value })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Height</label>
            <input
              type="text"
              value={el.height ?? "auto"}
              onChange={(e) => update({ height: e.target.value })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Fit</label>
            <select
              value={el.objectFit ?? "cover"}
              onChange={(e) =>
                update({ objectFit: e.target.value as "cover" | "contain" | "fill" })
              }
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Fill</option>
            </select>
          </div>
          <div className={styles.fieldRow}>
            <label>Radius</label>
            <input
              type="number"
              value={el.borderRadius ?? 12}
              min={0}
              onChange={(e) => update({ borderRadius: Number(e.target.value) })}
            />
          </div>
        </>
      )}

      {/* Logo */}
      {el.type === "logo" && (() => {
        const selectedAsset = el.assetId
          ? assetItems.find((a) => a.id === el.assetId)
          : assetItems[0];
        return (
          <>
            {assetItems.length > 0 && (
              <div className={styles.fieldRow}>
                <label>Asset</label>
                <select
                  value={el.assetId ?? ""}
                  onChange={(e) => update({ assetId: e.target.value || undefined })}
                >
                  <option value="">First asset</option>
                  {assetItems.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedAsset?.tintable && (
              <div className={styles.fieldRow}>
                <label>Color</label>
                <ColorPicker
                  value={el.color ?? "primary"}
                  onChange={(v) => update({ color: v === "primary" ? undefined : v })}
                />
              </div>
            )}
            <div className={styles.fieldRow}>
              <label>Width</label>
              <input
                type="text"
                value={el.width ?? ""}
                placeholder="auto"
                onChange={(e) => update({ width: e.target.value || undefined })}
              />
            </div>
            <div className={styles.fieldRow}>
              <label>Max width</label>
              <input
                type="text"
                value={el.maxWidth ?? "120px"}
                onChange={(e) => update({ maxWidth: e.target.value })}
              />
            </div>
            <div className={styles.fieldRow}>
              <label>Height</label>
              <input
                type="text"
                value={el.height ?? "80px"}
                onChange={(e) => update({ height: e.target.value })}
              />
            </div>
          </>
        );
      })()}

      {/* Icon */}
      {el.type === "icon" && (() => {
        const lib = (el.iconLibrary ?? "lucide") as IconLibrary;
        const iconVal = lib === "lucide" && el.iconName
          ? legacyNameToLucide(el.iconName)
          : (el.iconName ?? "Star");
        return (
        <>
          <div className={styles.fieldRow}>
            <label>Icon</label>
            <IconPicker
              library={lib}
              value={iconVal}
              onLibraryChange={(v) => update({ iconLibrary: v, iconName: undefined })}
              onChange={(v) => update({ iconName: v })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Size</label>
            <input
              type="number"
              value={el.iconSize ?? 48}
              min={12}
              max={512}
              onChange={(e) => update({ iconSize: Number(e.target.value) })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Color</label>
            <ColorPicker
              value={el.color ?? "primary"}
              onChange={(v) => update({ color: v === "primary" ? undefined : v })}
            />
          </div>
          {lib === "lucide" && (
            <div className={styles.fieldRow}>
              <label>Stroke</label>
              <input
                type="number"
                value={el.strokeWidth ?? 2}
                min={0.5}
                max={4}
                step={0.5}
                onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
              />
            </div>
          )}
          <div className={styles.fieldRow}>
            <label>Opacity</label>
            <input
              type="number"
              value={el.opacity ?? 1}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
            />
          </div>
        </>
        );
      })()}

      {/* Chart */}
      {el.type === "chart" && (() => {
        const chartData: ChartDataPoint[] = el.chartData ?? [];
        const updateDataPoint = (idx: number, patch: Partial<ChartDataPoint>) => {
          const next = chartData.map((d, i) => (i === idx ? { ...d, ...patch } : d));
          update({ chartData: next });
        };
        const addDataPoint = () => {
          update({ chartData: [...chartData, { label: `Item ${chartData.length + 1}`, value: 50 }] });
        };
        const removeDataPoint = (idx: number) => {
          update({ chartData: chartData.filter((_, i) => i !== idx) });
        };
        return (
          <>
            <div className={styles.fieldRow}>
              <label>Chart Type</label>
              <select
                value={el.chartType ?? "bar"}
                onChange={(e) => update({ chartType: e.target.value as ChartType })}
              >
                <option value="bar">Bar Chart</option>
                <option value="donut">Donut Chart</option>
                <option value="progress">Progress Bars</option>
              </select>
            </div>
            <div className={styles.fieldRow}>
              <label>Font Size</label>
              <input
                type="number"
                value={el.fontSize ?? 14}
                min={8}
                max={48}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
              />
            </div>
            <div className={styles.fieldRow}>
              <label>Color</label>
              <ColorPicker
                value={el.color ?? "primary"}
                onChange={(v) => update({ color: v === "primary" ? undefined : v })}
              />
            </div>
            {el.chartType === "donut" && (
              <div className={styles.fieldRow}>
                <label>Size</label>
                <input
                  type="number"
                  value={parseInt(el.height ?? "200") || 200}
                  min={80}
                  max={600}
                  step={10}
                  onChange={(e) => update({ height: `${e.target.value}` })}
                />
              </div>
            )}
            <div className={styles.fieldRow}>
              <label>Labels</label>
              <input
                type="checkbox"
                checked={el.showLabels !== false}
                onChange={(e) => update({ showLabels: e.target.checked })}
              />
            </div>
            <div className={styles.fieldRow}>
              <label>Values</label>
              <input
                type="checkbox"
                checked={el.showValues !== false}
                onChange={(e) => update({ showValues: e.target.checked })}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: "block" }}>Data Points</label>
              {chartData.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                  <input
                    type="text"
                    value={d.label}
                    style={{ flex: 1, minWidth: 0 }}
                    placeholder="Label"
                    onChange={(e) => updateDataPoint(i, { label: e.target.value })}
                  />
                  <input
                    type="number"
                    value={d.value}
                    style={{ width: 60 }}
                    onChange={(e) => updateDataPoint(i, { value: Number(e.target.value) })}
                  />
                  <ColorPicker
                    value={d.color ?? ""}
                    onChange={(v) => updateDataPoint(i, { color: v || undefined })}
                  />
                  <button
                    className={styles.btnDanger}
                    onClick={() => removeDataPoint(i)}
                    title="Remove"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button className={styles.btnSmall} onClick={addDataPoint}>
                + Add Data Point
              </button>
            </div>
          </>
        );
      })()}

      {/* Group layout */}
      {el.type === "group" && (
        <>
          <div className={styles.fieldRow}>
            <label>Direction</label>
            <select
              value={el.direction ?? "row"}
              onChange={(e) => update({ direction: e.target.value as FlexDirection })}
            >
              <option value="row">Horizontal</option>
              <option value="column">Vertical</option>
            </select>
          </div>
          <div className={styles.fieldRow}>
            <label>Align</label>
            <select
              value={el.alignItems ?? "center"}
              onChange={(e) => update({ alignItems: e.target.value as FlexAlign })}
            >
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="flex-end">End</option>
            </select>
          </div>
          <div className={styles.fieldRow}>
            <label>Justify</label>
            <select
              value={el.justifyContent ?? "center"}
              onChange={(e) => update({ justifyContent: e.target.value as FlexJustify })}
            >
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="flex-end">End</option>
              <option value="space-between">Between</option>
              <option value="space-evenly">Evenly</option>
            </select>
          </div>
          <div className={styles.fieldRow}>
            <label>Gap</label>
            <input
              type="number"
              value={el.gap ?? 16}
              min={0}
              onChange={(e) => update({ gap: Number(e.target.value) })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Padding</label>
            <input
              type="number"
              value={el.padding ?? 0}
              min={0}
              onChange={(e) => update({ padding: Number(e.target.value) })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Width</label>
            <input
              type="text"
              value={el.width ?? "100%"}
              onChange={(e) => update({ width: e.target.value })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Bg color</label>
            <ColorPicker
              value={el.backgroundColor}
              onChange={(v) => update({ backgroundColor: v })}
              allowNone
              noneLabel="None"
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Gradient</label>
            <select
              value={el.backgroundGradient ? "on" : "none"}
              onChange={(e) =>
                update({
                  backgroundGradient: e.target.value === "on"
                    ? el.backgroundGradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : undefined,
                })
              }
            >
              <option value="none">None</option>
              <option value="on">On</option>
            </select>
          </div>
          {el.backgroundGradient && (
            <div className={styles.fieldRow}>
              <label></label>
              <GradientEditor
                value={el.backgroundGradient}
                onChange={(v) => update({ backgroundGradient: v })}
              />
            </div>
          )}
          <div className={styles.fieldRow}>
            <label>Radius</label>
            <input
              type="number"
              value={el.borderRadius ?? 0}
              min={0}
              onChange={(e) => update({ borderRadius: Number(e.target.value) })}
            />
          </div>
          <div className={styles.fieldRow}>
            <label>Opacity</label>
            <input
              type="number"
              value={el.opacity ?? 1}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
            />
          </div>
        </>
      )}

      {/* Spacer height */}
      {el.type === "spacer" && (
        <div className={styles.fieldRow}>
          <label>Height</label>
          <input
            type="text"
            value={el.height ?? "40px"}
            onChange={(e) => update({ height: e.target.value })}
          />
        </div>
      )}

      {/* Size behavior */}
      <div className={styles.fieldRow}>
        <label>Expand</label>
        <input
          type="number"
          value={el.flex ?? ""}
          min={0}
          step={1}
          placeholder="off"
          onChange={(e) =>
            update({ flex: e.target.value ? Number(e.target.value) : undefined })
          }
        />
        <label>Shrink</label>
        <input
          type="number"
          value={el.flexShrink ?? ""}
          min={0}
          step={1}
          placeholder="1"
          onChange={(e) =>
            update({ flexShrink: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>
      <div className={styles.fieldRow}>
        <label>Self align</label>
        <select
          value={el.alignSelf ?? ""}
          onChange={(e) =>
            update({ alignSelf: (e.target.value || undefined) as SlideElement["alignSelf"] })
          }
        >
          <option value="">Auto</option>
          <option value="flex-start">Start</option>
          <option value="center">Center</option>
          <option value="flex-end">End</option>
          <option value="stretch">Stretch</option>
        </select>
      </div>

      {/* Universal spacing */}
      <div className={styles.fieldRow}>
        <label>M top</label>
        <input
          type="number"
          value={el.marginTop ?? 0}
          onChange={(e) => update({ marginTop: Number(e.target.value) })}
        />
        <label>M btm</label>
        <input
          type="number"
          value={el.marginBottom ?? 0}
          onChange={(e) => update({ marginBottom: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

function findElDeep(elements: SlideElement[], id: string): SlideElement | undefined {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.children) {
      const found = findElDeep(el.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Drag data passed via dataTransfer */
interface DragPayload {
  elementId: string;
}

type DropPosition = "before" | "after" | "inside";

function ElementListItem({
  el,
  index,
  siblingCount,
  slideId,
  parentId,
  depth,
  activeElementId,
  setActiveElement,
  removeElement,
  addElement,
  moveElement,
  dragState,
  setDragState,
}: {
  el: SlideElement;
  index: number;
  siblingCount: number;
  slideId: string;
  parentId: string | null;
  depth: number;
  activeElementId: string | null;
  setActiveElement: (id: string) => void;
  removeElement: (slideId: string, elementId: string) => void;
  addElement: (slideId: string, element: SlideElement, parentId?: string | null) => void;
  moveElement: (slideId: string, elementId: string, targetParentId: string | null, targetIndex: number) => void;
  dragState: { overId: string | null; position: DropPosition } | null;
  setDragState: (state: { overId: string | null; position: DropPosition } | null) => void;
}) {
  const isGroup = el.type === "group";
  const children = el.children ?? [];
  const rowRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    const payload: DragPayload = { elementId: el.id };
    e.dataTransfer.setData("application/lumvas-element", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }, [el.id]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("application/lumvas-element")) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const ratio = y / rect.height;

    let position: DropPosition;
    if (isGroup && ratio > 0.25 && ratio < 0.75) {
      position = "inside";
    } else if (ratio < 0.5) {
      position = "before";
    } else {
      position = "after";
    }

    setDragState({ overId: el.id, position });
  }, [el.id, isGroup, setDragState]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData("application/lumvas-element");
    if (!raw) return;

    const payload: DragPayload = JSON.parse(raw);
    if (payload.elementId === el.id) {
      setDragState(null);
      return;
    }

    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const ratio = y / rect.height;

    let targetParentId: string | null;
    let targetIndex: number;

    if (isGroup && ratio > 0.25 && ratio < 0.75) {
      // Drop inside group (at the end)
      targetParentId = el.id;
      targetIndex = children.length;
    } else if (ratio < 0.5) {
      // Drop before this element
      targetParentId = parentId;
      targetIndex = index;
    } else {
      // Drop after this element
      targetParentId = parentId;
      targetIndex = index + 1;
    }

    moveElement(slideId, payload.elementId, targetParentId, targetIndex);
    setDragState(null);
  }, [el.id, index, parentId, slideId, isGroup, children.length, moveElement, setDragState]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving this element (not entering a child)
    const related = e.relatedTarget as Node | null;
    if (rowRef.current && related && rowRef.current.contains(related)) return;
    if (dragState?.overId === el.id) {
      setDragState(null);
    }
  }, [dragState, el.id, setDragState]);

  // Determine indicator styling
  const isDropTarget = dragState?.overId === el.id;
  const dropPosition = isDropTarget ? dragState.position : null;

  return (
    <>
      <div
        ref={rowRef}
        className={`${builderStyles.slideItem} ${
          el.id === activeElementId ? builderStyles.slideItemActive : ""
        } ${isDropTarget && dropPosition === "inside" ? builderStyles.dropInside : ""}`}
        style={{
          paddingLeft: 10 + depth * 16,
          borderTop: isDropTarget && dropPosition === "before" ? "2px solid var(--accent)" : undefined,
          borderBottom: isDropTarget && dropPosition === "after" ? "2px solid var(--accent)" : undefined,
        }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        onClick={() => setActiveElement(el.id)}
      >
        <span className={builderStyles.dragHandle}>⠿</span>
        <span className={builderStyles.elementIcon}>
          {ELEMENT_ICONS[el.type]}
        </span>
        <span className={builderStyles.slideLabel}>
          {el.type === "text" || el.type === "button"
            ? el.content.slice(0, 24) || el.type
            : isGroup
            ? `group (${children.length})`
            : el.type === "chart"
            ? `chart (${el.chartType ?? "bar"})`
            : el.type}
        </span>
        <div className={builderStyles.slideActions}>
          <button
            className={styles.btnDanger}
            onClick={(e) => {
              e.stopPropagation();
              removeElement(slideId, el.id);
            }}
          >
            &times;
          </button>
        </div>
      </div>
      {/* Render group children */}
      {isGroup &&
        children.map((child, ci) => (
          <ElementListItem
            key={child.id}
            el={child}
            index={ci}
            siblingCount={children.length}
            slideId={slideId}
            parentId={el.id}
            depth={depth + 1}
            activeElementId={activeElementId}
            setActiveElement={setActiveElement}
            removeElement={removeElement}
            addElement={addElement}
            moveElement={moveElement}
            dragState={dragState}
            setDragState={setDragState}
          />
        ))}
      {/* Add child button row for groups */}
      {isGroup && el.id === activeElementId && (
        <div
          className={builderStyles.addElementRow}
          style={{ paddingLeft: 10 + (depth + 1) * 16, marginTop: 2, marginBottom: 2 }}
        >
          {ELEMENT_TYPES.filter((t) => t.type !== "group").map((t) => (
            <button
              key={t.type}
              className={styles.btnSmall}
              onClick={(e) => {
                e.stopPropagation();
                addElement(slideId, createElement(t.type), el.id);
              }}
              title={`Add ${t.label} to group`}
            >
              +{t.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ElementEditorSection({ el, slideId }: { el: SlideElement; slideId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [el.id]);
  return (
    <div ref={ref}>
      <PanelSection title={`Edit: ${el.type}`}>
        <ElementEditor el={el} slideId={slideId} />
      </PanelSection>
    </div>
  );
}

export function CarouselBuilder() {
  const slides = useLumvasStore((s) => selectSlideContent(s).slides);
  const activeSlideId = useLumvasStore((s) => s.activeSlideId);
  const activeElementId = useLumvasStore((s) => s.activeElementId);
  const updateSlide = useLumvasStore((s) => s.updateSlide);
  const removeSlide = useLumvasStore((s) => s.removeSlide);
  const reorderSlides = useLumvasStore((s) => s.reorderSlides);
  const setActiveSlide = useLumvasStore((s) => s.setActiveSlide);
  const setActiveElement = useLumvasStore((s) => s.setActiveElement);
  const addElement = useLumvasStore((s) => s.addElement);
  const removeElement = useLumvasStore((s) => s.removeElement);
  const moveElement = useLumvasStore((s) => s.moveElement);
  const assetItems = useLumvasStore((s) => s.assets.items);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [saveMode, setSaveMode] = useState(false);
  const [dragState, setDragState] = useState<{ overId: string | null; position: DropPosition } | null>(null);

  const active = slides.find((s) => s.id === activeSlideId);
  const activeEl = activeElementId ? findElDeep(active?.elements ?? [], activeElementId) : undefined;

  return (
    <>
      {/* Template Gallery Modal */}
      <TemplateGallery
        open={templateOpen}
        onClose={() => { setTemplateOpen(false); setSaveMode(false); }}
        saveSlideId={saveMode ? activeSlideId : null}
      />

      {/* ── Slide list ── */}
      <PanelSection title="Slides">
        <div className={builderStyles.slideList}>
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className={`${builderStyles.slideItem} ${
                slide.id === activeSlideId ? builderStyles.slideItemActive : ""
              }`}
              onClick={() => setActiveSlide(slide.id)}
            >
              <span className={builderStyles.slideIndex}>{i + 1}</span>
              <span className={builderStyles.slideLabel}>
                {slide.elements.length} elements
              </span>
              <div className={builderStyles.slideActions}>
                {i > 0 && (
                  <button
                    className={styles.btnSmall}
                    onClick={(e) => { e.stopPropagation(); reorderSlides(i, i - 1); }}
                  >
                    &uarr;
                  </button>
                )}
                {i < slides.length - 1 && (
                  <button
                    className={styles.btnSmall}
                    onClick={(e) => { e.stopPropagation(); reorderSlides(i, i + 1); }}
                  >
                    &darr;
                  </button>
                )}
                <button
                  className={styles.btnDanger}
                  onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className={builderStyles.addSlideRow}>
          <button
            className={styles.btnPrimary}
            onClick={() => { setSaveMode(false); setTemplateOpen(true); }}
          >
            + From Template
          </button>
          {active && (
            <button
              className={styles.btnSmall}
              onClick={() => { setSaveMode(true); setTemplateOpen(true); }}
            >
              Save as Template
            </button>
          )}
        </div>
      </PanelSection>

      {/* ── Slide layout ── */}
      {active && (
        <PanelSection title="Slide Layout">

          <div className={styles.fieldRow}>
            <label>Direction</label>
            <select
              value={active.direction ?? "column"}
              onChange={(e) =>
                updateSlide(active.id, { direction: e.target.value as FlexDirection })
              }
            >
              <option value="column">Vertical</option>
              <option value="row">Horizontal</option>
            </select>
          </div>

          <div className={styles.fieldRow}>
            <label>Align</label>
            <select
              value={active.alignItems ?? "center"}
              onChange={(e) =>
                updateSlide(active.id, { alignItems: e.target.value as FlexAlign })
              }
            >
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="flex-end">End</option>
            </select>
          </div>

          <div className={styles.fieldRow}>
            <label>Justify</label>
            <select
              value={active.justifyContent ?? "center"}
              onChange={(e) =>
                updateSlide(active.id, { justifyContent: e.target.value as FlexJustify })
              }
            >
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="flex-end">End</option>
              <option value="space-between">Between</option>
              <option value="space-evenly">Evenly</option>
            </select>
          </div>

          <div className={styles.fieldRow}>
            <label>Padding</label>
            <input
              type="number"
              value={active.padding ?? 80}
              min={0}
              onChange={(e) => updateSlide(active.id, { padding: Number(e.target.value) })}
            />
          </div>

          <div className={styles.fieldRow}>
            <label>Gap</label>
            <input
              type="number"
              value={active.gap ?? 24}
              min={0}
              onChange={(e) => updateSlide(active.id, { gap: Number(e.target.value) })}
            />
          </div>

          {/* Background preset */}
          <div className={styles.fieldRow}>
            <label>Background</label>
            <select
              value={active.style?.backgroundPresetId ?? ""}
              onChange={(e) => {
                const v = e.target.value || undefined;
                if (v) {
                  // Link to preset — set presetId and clear manual bg fields
                  updateSlide(active.id, {
                    style: { backgroundPresetId: v },
                  });
                } else {
                  // Unlink — remove presetId, keep other fields
                  const next = { ...active.style };
                  delete next.backgroundPresetId;
                  updateSlide(active.id, {
                    style: Object.values(next).some(Boolean) ? next : undefined,
                  });
                }
              }}
            >
              <option value="">Custom</option>
              {(useLumvasStore.getState().theme.backgroundPresets ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          {!active.style?.backgroundPresetId && active.style && Object.keys(active.style).some(
            (k) => k !== "primaryColor" && k !== "secondaryColor" && active.style![k as keyof typeof active.style] !== undefined
          ) && (
            <button
              className={styles.btnSmall}
              onClick={() => {
                const id = `bg-${Math.random().toString(36).slice(2, 10)}`;
                const { backgroundPresetId: _, primaryColor, secondaryColor, ...bgFields } = active.style!;
                useLumvasStore.getState().addBackgroundPreset({
                  id,
                  label: "From slide",
                  style: bgFields,
                });
                updateSlide(active.id, {
                  style: { ...active.style, backgroundPresetId: id },
                });
              }}
              style={{ marginBottom: 4 }}
            >
              Save as preset
            </button>
          )}

          {/* Per-slide color overrides (always shown) */}
          <div className={styles.fieldRow}>
            <label>Text</label>
            <ColorPicker
              value={active.style?.primaryColor}
              onChange={(v) => {
                const next = { ...active.style, primaryColor: v };
                if (!v) delete next.primaryColor;
                updateSlide(active.id, {
                  style: Object.values(next).some(Boolean) ? next : undefined,
                });
              }}
              allowNone
              noneLabel="Inherit"
            />
          </div>

          <div className={styles.fieldRow}>
            <label>Accent</label>
            <ColorPicker
              value={active.style?.secondaryColor}
              onChange={(v) => {
                const next = { ...active.style, secondaryColor: v };
                if (!v) delete next.secondaryColor;
                updateSlide(active.id, {
                  style: Object.values(next).some(Boolean) ? next : undefined,
                });
              }}
              allowNone
              noneLabel="Inherit"
            />
          </div>

          {/* Background style fields — hidden when a preset is linked */}
          {!active.style?.backgroundPresetId && (
            <>
              <div className={styles.fieldRow}>
                <label>Slide bg</label>
                <ColorPicker
                  value={active.style?.backgroundColor}
                  onChange={(v) => {
                    const next = { ...active.style, backgroundColor: v };
                    if (!v) delete next.backgroundColor;
                    updateSlide(active.id, {
                      style: Object.values(next).some(Boolean) ? next : undefined,
                    });
                  }}
                  allowNone
                  noneLabel="Inherit"
                />
              </div>

              {/* Gradient */}
              <div className={styles.fieldRow}>
                <label>Gradient</label>
                <select
                  value={active.style?.backgroundGradient ? "on" : "none"}
                  onChange={(e) => {
                    const next = { ...active.style };
                    if (e.target.value === "none") {
                      delete next.backgroundGradient;
                    } else {
                      next.backgroundGradient = next.backgroundGradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                    }
                    updateSlide(active.id, {
                      style: Object.values(next).some(Boolean) ? next : undefined,
                    });
                  }}
                >
                  <option value="none">None</option>
                  <option value="on">On</option>
                </select>
              </div>
              {active.style?.backgroundGradient && (
                <div className={styles.fieldRow}>
                  <label></label>
                  <GradientEditor
                    value={active.style.backgroundGradient}
                    onChange={(v) =>
                      updateSlide(active.id, {
                        style: { ...active.style, backgroundGradient: v },
                      })
                    }
                  />
                </div>
              )}

              {/* Pattern */}
              <div className={styles.fieldRow}>
                <label>Pattern</label>
                <select
                  value={active.style?.backgroundPattern ?? "none"}
                  onChange={(e) => {
                    const v = e.target.value as BackgroundPattern;
                    const next = { ...active.style, backgroundPattern: v === "none" ? undefined : v };
                    if (v === "none") delete next.backgroundPattern;
                    updateSlide(active.id, {
                      style: Object.values(next).some(Boolean) ? next : undefined,
                    });
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
              {active.style?.backgroundPattern && active.style.backgroundPattern !== "none" && (
                <>
                  <div className={styles.fieldRow}>
                    <label>Pat color</label>
                    <ColorPicker
                      value={active.style.backgroundPatternColor ?? "primary"}
                      onChange={(v) =>
                        updateSlide(active.id, {
                          style: { ...active.style, backgroundPatternColor: v },
                        })
                      }
                    />
                  </div>
                  <div className={styles.fieldRow}>
                    <label>Pat opacity</label>
                    <input
                      type="number"
                      value={active.style.backgroundPatternOpacity ?? 0.15}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(e) =>
                        updateSlide(active.id, {
                          style: { ...active.style, backgroundPatternOpacity: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <div className={styles.fieldRow}>
                    <label>Pat scale</label>
                    <input
                      type="number"
                      value={active.style.backgroundPatternScale ?? 1}
                      min={0.25}
                      max={5}
                      step={0.25}
                      onChange={(e) =>
                        updateSlide(active.id, {
                          style: { ...active.style, backgroundPatternScale: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                </>
              )}

              {/* Background image from assets */}
              <div className={styles.fieldRow}>
                <label>Bg image</label>
                <select
                  value={active.style?.backgroundAssetId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value || undefined;
                    const next = { ...active.style, backgroundAssetId: v };
                    if (!v) delete next.backgroundAssetId;
                    updateSlide(active.id, {
                      style: Object.values(next).some(Boolean) ? next : undefined,
                    });
                  }}
                >
                  <option value="">None</option>
                  {assetItems.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>
              {active.style?.backgroundAssetId && (
                <>
                  <div className={styles.fieldRow}>
                    <label>Img size</label>
                    <select
                      value={active.style.backgroundAssetSize ?? "cover"}
                      onChange={(e) =>
                        updateSlide(active.id, {
                          style: { ...active.style, backgroundAssetSize: e.target.value as "cover" | "contain" | "repeat" },
                        })
                      }
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
                      value={active.style.backgroundAssetOpacity ?? 0.3}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(e) =>
                        updateSlide(active.id, {
                          style: { ...active.style, backgroundAssetOpacity: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <div className={styles.fieldRow}>
                    <label>Img pos</label>
                    <select
                      value={active.style.backgroundAssetPosition ?? "center"}
                      onChange={(e) =>
                        updateSlide(active.id, {
                          style: { ...active.style, backgroundAssetPosition: e.target.value },
                        })
                      }
                    >
                      <option value="center">Center</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                      <option value="top left">Top Left</option>
                      <option value="top right">Top Right</option>
                      <option value="bottom left">Bottom Left</option>
                      <option value="bottom right">Bottom Right</option>
                    </select>
                  </div>
                </>
              )}

              {/* Color overlay */}
              <div className={styles.fieldRow}>
                <label>Overlay</label>
                <ColorPicker
                  value={active.style?.backgroundOverlayColor}
                  onChange={(v) => {
                    const next = { ...active.style, backgroundOverlayColor: v };
                    if (!v) {
                      delete next.backgroundOverlayColor;
                      delete next.backgroundOverlayOpacity;
                    }
                    updateSlide(active.id, {
                      style: Object.values(next).some(Boolean) ? next : undefined,
                    });
                  }}
                  allowNone
                  noneLabel="None"
                />
              </div>
              {active.style?.backgroundOverlayColor && (
                <div className={styles.fieldRow}>
                  <label>Ovr opacity</label>
                  <input
                    type="number"
                    value={active.style.backgroundOverlayOpacity ?? 0.5}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(e) =>
                      updateSlide(active.id, {
                        style: { ...active.style, backgroundOverlayOpacity: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              )}
            </>
          )}
        </PanelSection>
      )}

      {/* ── Elements list ── */}
      {active && (
        <PanelSection title="Elements">
          <div
            className={builderStyles.slideList}
            onDragEnd={() => setDragState(null)}
          >
            {active.elements.map((el, i) => (
              <ElementListItem
                key={el.id}
                el={el}
                index={i}
                siblingCount={active.elements.length}
                slideId={active.id}
                parentId={null}
                depth={0}
                activeElementId={activeElementId}
                setActiveElement={setActiveElement}
                removeElement={removeElement}
                addElement={addElement}
                moveElement={moveElement}
                dragState={dragState}
                setDragState={setDragState}
              />
            ))}
          </div>
          <div className={builderStyles.addElementRow}>
            {ELEMENT_TYPES.map((t) => (
              <button
                key={t.type}
                className={styles.btnSmall}
                onClick={() => addElement(active.id, createElement(t.type))}
                title={`Add ${t.label}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </PanelSection>
      )}

      {/* ── Element editor ── */}
      {active && activeEl && (
        <ElementEditorSection el={activeEl} slideId={active.id} />
      )}
    </>
  );
}
