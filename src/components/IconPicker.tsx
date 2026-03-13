"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ICONS,
  ICON_CATEGORIES,
  ICON_CATEGORY_LABELS,
  getIcon,
  type IconDef,
  type IconCategory,
} from "@/data/icons";
import ip from "./iconPicker.module.css";

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<IconCategory | "all">("all");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });

  const currentIcon = getIcon(value ?? "star");

  const filtered = useMemo(() => {
    let list: IconDef[] = activeCategory === "all"
      ? ICONS
      : ICONS.filter((i) => i.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.label.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeCategory]);

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: Math.max(4, r.left - 100),
      width: 280,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const handleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (triggerRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  return (
    <>
      <button
        ref={triggerRef}
        className={ip.trigger}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {currentIcon && (
          <svg
            width={16}
            height={16}
            viewBox={currentIcon.viewBox}
            fill={currentIcon.fill ? "currentColor" : "none"}
            stroke={currentIcon.fill ? "none" : "currentColor"}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {currentIcon.paths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </svg>
        )}
        <span className={ip.triggerLabel}>{currentIcon?.label ?? value ?? "Select"}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className={ip.popover}
            data-popover="icon-picker"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <input
              className={ip.search}
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />

            <div className={ip.categories}>
              <button
                className={`${ip.catBtn} ${activeCategory === "all" ? ip.catActive : ""}`}
                onClick={() => setActiveCategory("all")}
                type="button"
              >
                All
              </button>
              {ICON_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`${ip.catBtn} ${activeCategory === cat ? ip.catActive : ""}`}
                  onClick={() => setActiveCategory(cat)}
                  type="button"
                >
                  {ICON_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <div className={ip.grid}>
              {filtered.map((icon) => (
                <button
                  key={icon.name}
                  className={`${ip.iconBtn} ${icon.name === value ? ip.iconActive : ""}`}
                  onClick={() => {
                    onChange(icon.name);
                    setOpen(false);
                  }}
                  title={icon.label}
                  type="button"
                >
                  <svg
                    width={20}
                    height={20}
                    viewBox={icon.viewBox}
                    fill={icon.fill ? "currentColor" : "none"}
                    stroke={icon.fill ? "none" : "currentColor"}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {icon.paths.map((d, i) => (
                      <path key={i} d={d} />
                    ))}
                  </svg>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className={ip.empty}>No icons found</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
