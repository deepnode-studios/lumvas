"use client";

import { createElement, useState, useEffect } from "react";
import { icons as lucideIconMap } from "lucide-react";
import type { IconLibrary } from "@/types/schema";

export type { IconLibrary };

export const ICON_LIBRARIES: { id: IconLibrary; label: string }[] = [
  { id: "lucide", label: "Lucide" },
  { id: "phosphor", label: "Phosphor" },
  { id: "remix", label: "Remix" },
];

export interface IconEntry {
  name: string;
  label: string;
}

function pascalToLabel(s: string): string {
  return s.replace(/([A-Z0-9]+)/g, " $1").trim();
}

function remixToLabel(name: string): string {
  // RiArrowRightLine -> Arrow Right Line
  return pascalToLabel(name.replace(/^Ri/, ""));
}

// ── Lucide ──
const LUCIDE_ENTRIES: IconEntry[] = Object.keys(lucideIconMap)
  .sort()
  .map((name) => ({ name, label: pascalToLabel(name) }));

// ── Phosphor (lazy loaded) ──
let phosphorMod: Record<string, any> | null = null;
let phosphorEntries: IconEntry[] | null = null;

const PH_SKIP = new Set(["IconContext", "IconBase", "SSR", "SSRBase"]);

async function ensurePhosphor(): Promise<{
  mod: Record<string, any>;
  entries: IconEntry[];
}> {
  if (!phosphorMod) {
    const mod = (await import("@phosphor-icons/react")) as Record<string, any>;
    phosphorMod = mod;
    phosphorEntries = Object.keys(mod)
      .filter(
        (k) =>
          /^[A-Z]/.test(k) &&
          !k.endsWith("Icon") &&
          !PH_SKIP.has(k) &&
          typeof mod[k] === "function"
      )
      .sort()
      .map((name) => ({ name, label: pascalToLabel(name) }));
  }
  return { mod: phosphorMod!, entries: phosphorEntries! };
}

// ── Remix (lazy loaded) ──
let remixMod: Record<string, any> | null = null;
let remixEntries: IconEntry[] | null = null;

async function ensureRemix(): Promise<{
  mod: Record<string, any>;
  entries: IconEntry[];
}> {
  if (!remixMod) {
    const mod = (await import("@remixicon/react")) as Record<string, any>;
    remixMod = mod;
    remixEntries = Object.keys(mod)
      .filter((k) => /^Ri/.test(k))
      .sort()
      .map((name) => ({ name, label: remixToLabel(name) }));
  }
  return { mod: remixMod!, entries: remixEntries! };
}

// ── Public API ──

export function getLucideEntries(): IconEntry[] {
  return LUCIDE_ENTRIES;
}

export async function getIconEntries(
  library: IconLibrary
): Promise<IconEntry[]> {
  switch (library) {
    case "lucide":
      return LUCIDE_ENTRIES;
    case "phosphor":
      return (await ensurePhosphor()).entries;
    case "remix":
      return (await ensureRemix()).entries;
  }
}

export function getLucideComponent(name: string): any {
  return (lucideIconMap as any)[name] ?? null;
}

export async function getIconComponent(
  library: IconLibrary,
  name: string
): Promise<any> {
  switch (library) {
    case "lucide":
      return (lucideIconMap as any)[name] ?? null;
    case "phosphor": {
      const { mod } = await ensurePhosphor();
      return mod[name] ?? null;
    }
    case "remix": {
      const { mod } = await ensureRemix();
      return mod[name] ?? null;
    }
  }
}

/** Convert old kebab-case icon name to Lucide PascalCase */
export function legacyNameToLucide(name: string): string {
  if (/^[A-Z]/.test(name)) return name; // already PascalCase
  return name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

interface RenderIconProps {
  library: IconLibrary;
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

/**
 * Icon renderer component. Loads Phosphor/Remix lazily on first use.
 * Lucide is always available synchronously.
 */
export function RenderIcon({
  library,
  name,
  size = 24,
  color,
  strokeWidth,
  style,
}: RenderIconProps) {
  const ready = useIconLibrary(library);

  if (!ready) return null;

  let Comp: any = null;

  switch (library) {
    case "lucide":
      Comp = (lucideIconMap as any)[name];
      break;
    case "phosphor":
      if (phosphorMod) Comp = phosphorMod[name];
      break;
    case "remix":
      if (remixMod) Comp = remixMod[name];
      break;
  }

  if (!Comp) return null;

  const props: any = { size, style };
  if (color) props.color = color;

  if (library === "lucide" && strokeWidth != null) {
    props.strokeWidth = strokeWidth;
  }
  if (library === "phosphor") {
    props.weight = "regular";
  }

  return createElement(Comp, props);
}

/**
 * Hook to preload an icon library. Returns true when the library is ready.
 * Lucide is always ready (bundled). Phosphor/Remix load on demand.
 */
export function useIconLibrary(library: IconLibrary): boolean {
  const [ready, setReady] = useState(
    library === "lucide" ||
      (library === "phosphor" && phosphorMod !== null) ||
      (library === "remix" && remixMod !== null)
  );

  useEffect(() => {
    if (library === "lucide") {
      setReady(true);
      return;
    }
    if (library === "phosphor" && phosphorMod) {
      setReady(true);
      return;
    }
    if (library === "remix" && remixMod) {
      setReady(true);
      return;
    }

    setReady(false);
    const loader =
      library === "phosphor" ? ensurePhosphor() : ensureRemix();
    loader.then(() => setReady(true));
  }, [library]);

  return ready;
}
