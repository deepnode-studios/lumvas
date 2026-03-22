"use client";

import { useEffect, useRef } from "react";
import { useJsonvasStore, FONT_OPTIONS } from "@/store/useJsonvasStore";

/**
 * Extracts the primary font family name from a CSS font-family string.
 * e.g. "'Playfair Display', serif" → "Playfair Display"
 */
function extractFamilyName(fontValue: string): string {
  const first = fontValue.split(",")[0].trim();
  return first.replace(/^['"]|['"]$/g, "");
}

/** Set of system font family names (no Google loading needed) */
const SYSTEM_FAMILIES = new Set(
  FONT_OPTIONS.filter((f) => f.category === "system").map((f) => extractFamilyName(f.value))
);

/** Known Google font family names from our list */
const GOOGLE_FAMILIES = new Set(
  FONT_OPTIONS.filter((f) => f.category === "google").map((f) => extractFamilyName(f.value))
);

/**
 * Dynamically loads Google Fonts by injecting <link> tags into <head>.
 * Watches all font token values in the theme and loads any Google fonts.
 * Also handles custom font-family strings that look like Google font names.
 */
export function useGoogleFonts() {
  const fonts = useJsonvasStore((s) => s.theme.fonts);
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const families: string[] = [];

    for (const font of fonts) {
      const name = extractFamilyName(font.value);

      // Skip system fonts
      if (SYSTEM_FAMILIES.has(name)) continue;

      // Skip already loaded
      if (loadedRef.current.has(name)) continue;

      families.push(name);
    }

    if (families.length === 0) return;

    for (const family of families) {
      loadedRef.current.add(family);

      const linkId = `gfont-${family.replace(/\s+/g, "-").toLocaleLowerCase('en-US')}`;
      if (document.getElementById(linkId)) continue;

      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
  }, [fonts]);
}

/**
 * Checks if a font-family value is a Google font (known or likely).
 */
export function isGoogleFont(value: string): boolean {
  const name = extractFamilyName(value);
  if (SYSTEM_FAMILIES.has(name)) return false;
  if (GOOGLE_FAMILIES.has(name)) return true;
  // Assume custom entries are Google fonts if not system
  return true;
}
