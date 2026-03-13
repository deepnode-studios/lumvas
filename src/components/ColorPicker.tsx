"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useJsonvasStore } from "@/store/useJsonvasStore";
import cp from "./colorPicker.module.css";

export interface ColorPickerProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  allowNone?: boolean;
  noneLabel?: string;
  label?: string;
}

type Mode = "none" | "primary" | "secondary" | "background" | "palette" | "custom";

function classifyValue(
  value: string | undefined,
  paletteIds: string[],
): Mode {
  if (!value) return "none";
  if (value === "primary") return "primary";
  if (value === "secondary") return "secondary";
  if (value === "background") return "background";
  if (paletteIds.includes(value)) return "palette";
  return "custom";
}

export function ColorPicker({
  value,
  onChange,
  allowNone = false,
  noneLabel = "Inherit",
}: ColorPickerProps) {
  const theme = useJsonvasStore((s) => s.theme);
  const palette = theme.palette;
  const paletteIds = palette.map((c) => c.id);

  const mode = classifyValue(value, paletteIds);

  const resolvedHex = (() => {
    switch (mode) {
      case "none":
        return undefined;
      case "primary":
        return theme.primaryColor;
      case "secondary":
        return theme.secondaryColor;
      case "background":
        return theme.backgroundColor;
      case "palette": {
        const c = palette.find((c) => c.id === value);
        return c?.value;
      }
      case "custom":
        return value;
    }
  })();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popW = Math.max(rect.width, 200);
    const popH = 320; // max-height from CSS
    const gap = 4;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Vertical: prefer below, flip above if not enough space
    let top = rect.bottom + gap;
    if (top + popH > vh && rect.top - gap - popH > 0) {
      top = rect.top - gap - popH;
    }
    top = Math.max(4, Math.min(top, vh - popH - 4));

    // Horizontal: prefer left-aligned, shift left if overflows
    let left = rect.left;
    if (left + popW > vw - 4) {
      left = vw - popW - 4;
    }
    left = Math.max(4, left);

    setPos({ top, left, width: popW });
  }, []);

  // Position + close on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    updatePos();

    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        triggerRef.current?.contains(t) ||
        popoverRef.current?.contains(t)
      )
        return;
      setPopoverOpen(false);
    };

    const handleScroll = () => updatePos();

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [popoverOpen, updatePos]);

  const handleSelect = (newMode: Mode, id?: string) => {
    switch (newMode) {
      case "none":
        onChange(undefined);
        setPopoverOpen(false);
        break;
      case "primary":
        onChange("primary");
        setPopoverOpen(false);
        break;
      case "secondary":
        onChange("secondary");
        setPopoverOpen(false);
        break;
      case "background":
        onChange("background");
        setPopoverOpen(false);
        break;
      case "palette":
        onChange(id!);
        setPopoverOpen(false);
        break;
      case "custom":
        if (!value || mode !== "custom") onChange("#000000");
        break;
    }
  };

  const label = (() => {
    switch (mode) {
      case "none":
        return noneLabel;
      case "primary":
        return "Primary";
      case "secondary":
        return "Secondary";
      case "background":
        return "Background";
      case "palette": {
        const c = palette.find((c) => c.id === value);
        return c?.label || value;
      }
      case "custom":
        return value ?? "#000000";
    }
  })();

  const popoverContent = popoverOpen
    ? createPortal(
        <div
          ref={popoverRef}
          className={cp.popover}
          data-popover="color-picker"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {allowNone && (
            <button
              className={`${cp.option} ${mode === "none" ? cp.optionActive : ""}`}
              onClick={() => handleSelect("none")}
            >
              <span className={cp.swatchNone} />
              <span>{noneLabel}</span>
            </button>
          )}

          <div className={cp.group}>
            <span className={cp.groupLabel}>Theme</span>
            <button
              className={`${cp.option} ${mode === "primary" ? cp.optionActive : ""}`}
              onClick={() => handleSelect("primary")}
            >
              <span className={cp.swatch} style={{ background: theme.primaryColor }} />
              <span>Primary</span>
            </button>
            <button
              className={`${cp.option} ${mode === "secondary" ? cp.optionActive : ""}`}
              onClick={() => handleSelect("secondary")}
            >
              <span className={cp.swatch} style={{ background: theme.secondaryColor }} />
              <span>Secondary</span>
            </button>
            <button
              className={`${cp.option} ${mode === "background" ? cp.optionActive : ""}`}
              onClick={() => handleSelect("background")}
            >
              <span className={cp.swatch} style={{ background: theme.backgroundColor }} />
              <span>Background</span>
            </button>
          </div>

          {palette.length > 0 && (
            <div className={cp.group}>
              <span className={cp.groupLabel}>Palette</span>
              {palette.map((c) => (
                <button
                  key={c.id}
                  className={`${cp.option} ${mode === "palette" && value === c.id ? cp.optionActive : ""}`}
                  onClick={() => handleSelect("palette", c.id)}
                >
                  <span className={cp.swatch} style={{ background: c.value }} />
                  <span>{c.label}</span>
                  <span className={cp.tokenId}>{c.id}</span>
                </button>
              ))}
            </div>
          )}

          <div className={cp.group}>
            <span className={cp.groupLabel}>Custom</span>
            <div className={cp.customRow}>
              <input
                type="color"
                className={cp.nativeColor}
                value={mode === "custom" ? (value ?? "#000000") : "#000000"}
                onChange={(e) => onChange(e.target.value)}
              />
              <input
                type="text"
                className={cp.hexInput}
                placeholder="#000000"
                value={mode === "custom" ? (value ?? "") : ""}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => {
                  if (mode !== "custom") onChange("#000000");
                }}
              />
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={cp.container}>
      <button
        ref={triggerRef}
        className={cp.trigger}
        onClick={() => setPopoverOpen(!popoverOpen)}
        type="button"
      >
        {resolvedHex ? (
          <span className={cp.swatch} style={{ background: resolvedHex }} />
        ) : (
          <span className={cp.swatchNone} />
        )}
        <span className={cp.label}>{label}</span>
        <span className={cp.chevron}>&#9662;</span>
      </button>
      {popoverContent}
    </div>
  );
}
