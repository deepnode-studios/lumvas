"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLumvasStore } from "@/store/useLumvasStore";
import { ColorPicker } from "./ColorPicker";
import g from "./gradientEditor.module.css";

/* ─── Types ─── */

interface GradientStop {
  color: string;
  position: number; // 0–100
}

type RadialShape = "circle" | "ellipse";

interface ParsedGradient {
  type: "linear" | "radial";
  angle: number;
  radialShape: RadialShape;
  radialPosition: string; // e.g. "center", "50% 100%", "top left"
  stops: GradientStop[];
}

/* ─── Parser / Builder ─── */

function parseGradient(css: string): ParsedGradient {
  const fallback: ParsedGradient = {
    type: "linear",
    angle: 135,
    radialShape: "circle",
    radialPosition: "center",
    stops: [
      { color: "#667eea", position: 0 },
      { color: "#764ba2", position: 100 },
    ],
  };

  if (!css) return fallback;

  const isRadial = css.startsWith("radial-gradient");
  const type = isRadial ? "radial" : "linear";

  // Extract the part inside the parentheses
  const match = css.match(/\(([\s\S]+)\)/);
  if (!match) return fallback;

  const inner = match[1].trim();

  // Split on commas, but not commas inside nested parens
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of inner) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());

  // First part might be angle/shape or a color stop
  let angle = 135;
  let radialShape: RadialShape = "circle";
  let radialPosition = "center";
  let stopParts = parts;

  if (!isRadial) {
    const first = parts[0];
    const degMatch = first.match(/^(\d+(?:\.\d+)?)deg$/);
    const toMatch = first.match(/^to\s+(.+)$/);
    if (degMatch) {
      angle = parseFloat(degMatch[1]);
      stopParts = parts.slice(1);
    } else if (toMatch) {
      const dir = toMatch[1].toLocaleLowerCase('en-US');
      const dirMap: Record<string, number> = {
        top: 0,
        "top right": 45,
        right: 90,
        "bottom right": 135,
        bottom: 180,
        "bottom left": 225,
        left: 270,
        "top left": 315,
      };
      angle = dirMap[dir] ?? 135;
      stopParts = parts.slice(1);
    }
  } else {
    // Radial: parse shape and position (e.g. "circle at 50% 100%", "ellipse at center")
    const first = parts[0].trim();
    const isShapePart =
      /^(circle|ellipse|closest|farthest)/i.test(first) ||
      /^at\s+/i.test(first);
    if (isShapePart) {
      const atMatch = first.match(/^(circle|ellipse)?\s*at\s+(.+)$/i);
      if (atMatch) {
        radialShape = (atMatch[1]?.toLocaleLowerCase('en-US') as RadialShape) || "circle";
        radialPosition = atMatch[2].trim();
      } else {
        radialShape = first.toLocaleLowerCase('en-US').startsWith("ellipse") ? "ellipse" : "circle";
      }
      stopParts = parts.slice(1);
    }
  }

  // Parse color stops
  const stops: GradientStop[] = [];
  for (let i = 0; i < stopParts.length; i++) {
    const part = stopParts[i].trim();
    // Try to separate color from position
    const posMatch = part.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/);
    if (posMatch) {
      stops.push({ color: posMatch[1].trim(), position: parseFloat(posMatch[2]) });
    } else {
      // No explicit position, distribute evenly
      const pos =
        stopParts.length === 1
          ? 50
          : (i / (stopParts.length - 1)) * 100;
      stops.push({ color: part, position: Math.round(pos) });
    }
  }

  if (stops.length < 2) return fallback;

  return { type, angle, radialShape, radialPosition, stops };
}

function buildGradient(parsed: ParsedGradient): string {
  const stopsStr = parsed.stops
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ");

  if (parsed.type === "radial") {
    const pos = parsed.radialPosition || "center";
    return `radial-gradient(${parsed.radialShape} at ${pos}, ${stopsStr})`;
  }
  return `linear-gradient(${parsed.angle}deg, ${stopsStr})`;
}

/* ─── Presets ─── */

const GRADIENT_PRESETS = [
  { label: "Sunset", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { label: "Ocean", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { label: "Purple", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { label: "Warm", value: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)" },
  { label: "Night", value: "linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)" },
  { label: "Forest", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { label: "Flame", value: "linear-gradient(135deg, #f83600 0%, #f9d423 100%)" },
  { label: "Dark", value: "linear-gradient(135deg, #434343 0%, #000000 100%)" },
  { label: "Radial Glow", value: "radial-gradient(circle, #667eea 0%, #764ba2 100%)" },
  { label: "Radial Warm", value: "radial-gradient(circle, #ffecd2 0%, #fcb69f 100%)" },
];

/* ─── Component ─── */

export interface GradientEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function GradientEditor({ value, onChange }: GradientEditorProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const theme = useLumvasStore((s) => s.theme);

  const resolveColor = useCallback(
    (val: string | undefined): string => {
      if (!val) return "#000000";
      if (val === "primary") return theme.primaryColor;
      if (val === "secondary") return theme.secondaryColor;
      if (val === "background") return theme.backgroundColor;
      const pc = theme.palette.find((c) => c.id === val);
      if (pc) return pc.value;
      return val;
    },
    [theme]
  );

  const parsed = parseGradient(value);

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popW = Math.max(rect.width, 280);
    const popH = 420; // max-height from CSS
    const gap = 4;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Vertical: prefer below, flip above if not enough space
    let top = rect.bottom + gap;
    if (top + popH > vh && rect.top - gap - popH > 0) {
      top = rect.top - gap - popH;
    }
    // Clamp to viewport
    top = Math.max(4, Math.min(top, vh - popH - 4));

    // Horizontal: prefer left-aligned with trigger, shift left if overflows
    let left = rect.left;
    if (left + popW > vw - 4) {
      left = vw - popW - 4;
    }
    left = Math.max(4, left);

    setPos({ top, left, width: popW });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();

    const handleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        triggerRef.current?.contains(t) ||
        popoverRef.current?.contains(t)
      )
        return;
      // Don't close if clicking inside a child ColorPicker popover
      if (t.closest?.("[data-popover]")) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  const update = (patch: Partial<ParsedGradient>) => {
    onChange(buildGradient({ ...parsed, ...patch }));
  };

  const updateStop = (index: number, patch: Partial<GradientStop>) => {
    const newStops = parsed.stops.map((s, i) =>
      i === index ? { ...s, ...patch } : s
    );
    onChange(buildGradient({ ...parsed, stops: newStops }));
  };

  const addStop = () => {
    const last = parsed.stops[parsed.stops.length - 1];
    const secondLast = parsed.stops[parsed.stops.length - 2];
    const newPos = Math.min(100, Math.round((last.position + (secondLast?.position ?? 0)) / 2));
    const newStops = [
      ...parsed.stops,
      { color: "#888888", position: newPos },
    ].sort((a, b) => a.position - b.position);
    onChange(buildGradient({ ...parsed, stops: newStops }));
  };

  const removeStop = (index: number) => {
    if (parsed.stops.length <= 2) return;
    const newStops = parsed.stops.filter((_, i) => i !== index);
    onChange(buildGradient({ ...parsed, stops: newStops }));
  };

  // Angle dial interaction
  const dialRef = useRef<HTMLDivElement>(null);
  const draggingAngle = useRef(false);

  const calcAngle = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!dialRef.current) return parsed.angle;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientX - cx, -(e.clientY - cy));
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  }, [parsed.angle]);

  const handleDialDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingAngle.current = true;
      const angle = calcAngle(e);
      update({ angle });

      const onMove = (ev: MouseEvent) => {
        if (!draggingAngle.current) return;
        const a = calcAngle(ev);
        onChange(buildGradient({ ...parseGradient(value), angle: a }));
      };
      const onUp = () => {
        draggingAngle.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [calcAngle, update, onChange, value]
  );

  const popoverContent = open
    ? createPortal(
        <div
          ref={popoverRef}
          className={g.popover}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {/* Preview */}
          <div className={g.preview} style={{ background: value }} />

          {/* Type + Angle */}
          <div className={g.section}>
            <span className={g.sectionLabel}>Type</span>
            <div className={g.row}>
              <select
                value={parsed.type}
                onChange={(e) =>
                  update({ type: e.target.value as "linear" | "radial" })
                }
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </div>
          </div>

          {parsed.type === "linear" && (
            <div className={g.section}>
              <span className={g.sectionLabel}>Angle</span>
              <div className={g.row}>
                <div
                  ref={dialRef}
                  className={g.angleDial}
                  onMouseDown={handleDialDown}
                >
                  <div
                    className={g.angleDot}
                    style={{
                      transform: `rotate(${parsed.angle}deg)`,
                    }}
                  />
                </div>
                <input
                  type="number"
                  value={parsed.angle}
                  min={0}
                  max={360}
                  onChange={(e) => update({ angle: Number(e.target.value) })}
                />
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  deg
                </span>
              </div>
            </div>
          )}

          {parsed.type === "radial" && (
            <div className={g.section}>
              <span className={g.sectionLabel}>Shape</span>
              <div className={g.row}>
                <select
                  value={parsed.radialShape}
                  onChange={(e) => update({ radialShape: e.target.value as RadialShape })}
                >
                  <option value="circle">Circle</option>
                  <option value="ellipse">Ellipse</option>
                </select>
              </div>
              <span className={g.sectionLabel} style={{ marginTop: 6 }}>Position</span>
              <div className={g.row}>
                <select
                  value={parsed.radialPosition}
                  onChange={(e) => update({ radialPosition: e.target.value })}
                >
                  <option value="center">Center</option>
                  <option value="50% 0%">Top</option>
                  <option value="100% 0%">Top Right</option>
                  <option value="100% 50%">Right</option>
                  <option value="100% 100%">Bottom Right</option>
                  <option value="50% 100%">Bottom</option>
                  <option value="0% 100%">Bottom Left</option>
                  <option value="0% 50%">Left</option>
                  <option value="0% 0%">Top Left</option>
                </select>
              </div>
            </div>
          )}

          {/* Color stops */}
          <div className={g.section}>
            <span className={g.sectionLabel}>Colors</span>
            {parsed.stops.map((stop, i) => (
              <div key={i} className={g.stopRow}>
                <ColorPicker
                  value={stop.color}
                  onChange={(v) => updateStop(i, { color: resolveColor(v) })}
                />
                <input
                  type="range"
                  className={g.stopSlider}
                  min={0}
                  max={100}
                  value={stop.position}
                  onChange={(e) =>
                    updateStop(i, { position: Number(e.target.value) })
                  }
                />
                <input
                  type="number"
                  className={g.stopPos}
                  min={0}
                  max={100}
                  value={stop.position}
                  onChange={(e) =>
                    updateStop(i, { position: Number(e.target.value) })
                  }
                />
                {parsed.stops.length > 2 && (
                  <button
                    className={g.stopRemove}
                    onClick={() => removeStop(i)}
                    title="Remove stop"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button className={g.addStopBtn} onClick={addStop}>
              + Add color
            </button>
          </div>

          {/* Presets */}
          <div className={g.section}>
            <span className={g.sectionLabel}>Presets</span>
            <div className={g.presets}>
              {GRADIENT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className={g.presetSwatch}
                  style={{ background: p.value }}
                  title={p.label}
                  onClick={() => onChange(p.value)}
                />
              ))}
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={g.container}>
      <button
        ref={triggerRef}
        className={g.trigger}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className={g.gradientSwatch} style={{ background: value }} />
        <span className={g.label}>Edit gradient</span>
        <span className={g.chevron}>&#9662;</span>
      </button>
      {popoverContent}
    </div>
  );
}
