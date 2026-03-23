"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import type { IconLibrary } from "@/types/schema";
import {
  ICON_LIBRARIES,
  getIconEntries,
  getLucideEntries,
  RenderIcon,
  type IconEntry,
} from "@/data/iconLibraries";
import ip from "./iconPicker.module.css";

interface IconPickerProps {
  library: IconLibrary;
  value?: string;
  onLibraryChange: (library: IconLibrary) => void;
  onChange: (iconName: string) => void;
}

export function IconPicker({
  library,
  value,
  onLibraryChange,
  onChange,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<IconEntry[]>(getLucideEntries);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });

  // Load entries when library changes
  useEffect(() => {
    let cancelled = false;
    getIconEntries(library).then((e) => {
      if (!cancelled) setEntries(e);
    });
    return () => {
      cancelled = true;
    };
  }, [library]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLocaleLowerCase("en-US");
    return entries.filter(
      (e) =>
        e.name.toLocaleLowerCase("en-US").includes(q) ||
        e.label.toLocaleLowerCase("en-US").includes(q)
    );
  }, [search, entries]);

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: Math.max(4, r.left - 100),
      width: 300,
    });
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
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  const currentLabel =
    entries.find((e) => e.name === value)?.label ?? value ?? "Select";

  return (
    <>
      <button
        ref={triggerRef}
        className={ip.trigger}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {value && (
          <RenderIcon library={library} name={value} size={16} />
        )}
        <span className={ip.triggerLabel}>{currentLabel}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className={ip.popover}
            data-popover="icon-picker"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {/* Library tabs */}
            <div className={ip.categories}>
              {ICON_LIBRARIES.map((lib) => (
                <button
                  key={lib.id}
                  className={`${ip.catBtn} ${library === lib.id ? ip.catActive : ""}`}
                  onClick={() => {
                    onLibraryChange(lib.id);
                    setSearch("");
                  }}
                  type="button"
                >
                  {lib.label}
                </button>
              ))}
            </div>

            <input
              className={ip.search}
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />

            <div className={ip.grid}>
              {filtered.slice(0, 200).map((icon) => (
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
                  <RenderIcon
                    library={library}
                    name={icon.name}
                    size={20}
                  />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className={ip.empty}>No icons found</div>
              )}
              {filtered.length > 200 && (
                <div className={ip.empty}>
                  {filtered.length - 200} more — refine your search
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
