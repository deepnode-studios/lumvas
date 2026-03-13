/* ─── Icon Registry ─── */

export interface IconDef {
  name: string;
  label: string;
  category: string;
  viewBox: string;
  paths: string[];
  fill?: boolean; // true = filled icon (use fill), false/undefined = stroke icon
}

export const ICON_CATEGORIES = [
  "general",
  "arrows",
  "social",
  "media",
  "communication",
  "commerce",
  "content",
  "status",
  "shapes",
] as const;

export type IconCategory = (typeof ICON_CATEGORIES)[number];

export const ICON_CATEGORY_LABELS: Record<IconCategory, string> = {
  general: "General",
  arrows: "Arrows",
  social: "Social",
  media: "Media",
  communication: "Communication",
  commerce: "Commerce",
  content: "Content",
  status: "Status",
  shapes: "Shapes",
};

// Curated icon set — SVG paths sourced from Lucide (MIT) and Simple Icons (CC0)
export const ICONS: IconDef[] = [
  // ── General ──
  { name: "star", label: "Star", category: "general", viewBox: "0 0 24 24", paths: ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"] },
  { name: "heart", label: "Heart", category: "general", viewBox: "0 0 24 24", paths: ["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"] },
  { name: "home", label: "Home", category: "general", viewBox: "0 0 24 24", paths: ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"] },
  { name: "settings", label: "Settings", category: "general", viewBox: "0 0 24 24", paths: ["M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"] },
  { name: "search", label: "Search", category: "general", viewBox: "0 0 24 24", paths: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.35-4.35"] },
  { name: "user", label: "User", category: "general", viewBox: "0 0 24 24", paths: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"] },
  { name: "users", label: "Users", category: "general", viewBox: "0 0 24 24", paths: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"] },
  { name: "check", label: "Check", category: "general", viewBox: "0 0 24 24", paths: ["M20 6L9 17l-5-5"] },
  { name: "x", label: "Close", category: "general", viewBox: "0 0 24 24", paths: ["M18 6L6 18", "M6 6l12 12"] },
  { name: "plus", label: "Plus", category: "general", viewBox: "0 0 24 24", paths: ["M12 5v14", "M5 12h14"] },
  { name: "minus", label: "Minus", category: "general", viewBox: "0 0 24 24", paths: ["M5 12h14"] },
  { name: "eye", label: "Eye", category: "general", viewBox: "0 0 24 24", paths: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"] },
  { name: "lock", label: "Lock", category: "general", viewBox: "0 0 24 24", paths: ["M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z", "M7 11V7a5 5 0 0 1 10 0v4"] },
  { name: "unlock", label: "Unlock", category: "general", viewBox: "0 0 24 24", paths: ["M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z", "M7 11V7a5 5 0 0 1 9.9-1"] },
  { name: "shield", label: "Shield", category: "general", viewBox: "0 0 24 24", paths: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"] },
  { name: "zap", label: "Zap", category: "general", viewBox: "0 0 24 24", paths: ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"] },
  { name: "flame", label: "Flame", category: "general", viewBox: "0 0 24 24", paths: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"] },
  { name: "trophy", label: "Trophy", category: "general", viewBox: "0 0 24 24", paths: ["M6 9H4.5a2.5 2.5 0 0 1 0-5H6", "M18 9h1.5a2.5 2.5 0 0 0 0-5H18", "M4 22h16", "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22", "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22", "M18 2H6v7a6 6 0 0 0 12 0V2z"] },
  { name: "target", label: "Target", category: "general", viewBox: "0 0 24 24", paths: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z", "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"] },
  { name: "lightbulb", label: "Lightbulb", category: "general", viewBox: "0 0 24 24", paths: ["M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5", "M9 18h6", "M10 22h4"] },
  { name: "rocket", label: "Rocket", category: "general", viewBox: "0 0 24 24", paths: ["M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z", "M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z", "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0", "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"] },
  { name: "globe", label: "Globe", category: "general", viewBox: "0 0 24 24", paths: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"] },
  { name: "map-pin", label: "Map Pin", category: "general", viewBox: "0 0 24 24", paths: ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z", "M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"] },
  { name: "calendar", label: "Calendar", category: "general", viewBox: "0 0 24 24", paths: ["M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z", "M16 2v4", "M8 2v4", "M3 10h18"] },
  { name: "clock", label: "Clock", category: "general", viewBox: "0 0 24 24", paths: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 6v6l4 2"] },
  { name: "thumbs-up", label: "Thumbs Up", category: "general", viewBox: "0 0 24 24", paths: ["M7 10v12", "M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z"] },
  { name: "crown", label: "Crown", category: "general", viewBox: "0 0 24 24", paths: ["M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z", "M3 20h18"] },
  { name: "sparkles", label: "Sparkles", category: "general", viewBox: "0 0 24 24", paths: ["M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z", "M20 3v4", "M22 5h-4", "M4 17v2", "M5 18H3"] },
  { name: "wand", label: "Wand", category: "general", viewBox: "0 0 24 24", paths: ["M15 4V2", "M15 16v-2", "M8 9h2", "M20 9h2", "M17.8 11.8L19 13", "M15 9h0", "M17.8 6.2L19 5", "M11.2 6.2L10 5", "M11.2 11.8L10 13", "M3 21l9-9"] },
  { name: "hash", label: "Hash", category: "general", viewBox: "0 0 24 24", paths: ["M4 9h16", "M4 15h16", "M10 3L8 21", "M16 3l-2 18"] },
  { name: "at-sign", label: "At Sign", category: "general", viewBox: "0 0 24 24", paths: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.5 8.28"] },

  // ── Arrows ──
  { name: "arrow-right", label: "Arrow Right", category: "arrows", viewBox: "0 0 24 24", paths: ["M5 12h14", "M12 5l7 7-7 7"] },
  { name: "arrow-left", label: "Arrow Left", category: "arrows", viewBox: "0 0 24 24", paths: ["M19 12H5", "M12 19l-7-7 7-7"] },
  { name: "arrow-up", label: "Arrow Up", category: "arrows", viewBox: "0 0 24 24", paths: ["M12 19V5", "M5 12l7-7 7 7"] },
  { name: "arrow-down", label: "Arrow Down", category: "arrows", viewBox: "0 0 24 24", paths: ["M12 5v14", "M19 12l-7 7-7-7"] },
  { name: "arrow-up-right", label: "Arrow Up Right", category: "arrows", viewBox: "0 0 24 24", paths: ["M7 17L17 7", "M7 7h10v10"] },
  { name: "arrow-down-right", label: "Arrow Down Right", category: "arrows", viewBox: "0 0 24 24", paths: ["M7 7l10 10", "M17 7v10H7"] },
  { name: "chevron-right", label: "Chevron Right", category: "arrows", viewBox: "0 0 24 24", paths: ["M9 18l6-6-6-6"] },
  { name: "chevron-left", label: "Chevron Left", category: "arrows", viewBox: "0 0 24 24", paths: ["M15 18l-6-6 6-6"] },
  { name: "chevron-down", label: "Chevron Down", category: "arrows", viewBox: "0 0 24 24", paths: ["M6 9l6 6 6-6"] },
  { name: "chevron-up", label: "Chevron Up", category: "arrows", viewBox: "0 0 24 24", paths: ["M18 15l-6-6-6 6"] },
  { name: "chevrons-right", label: "Chevrons Right", category: "arrows", viewBox: "0 0 24 24", paths: ["M13 17l5-5-5-5", "M6 17l5-5-5-5"] },
  { name: "chevrons-left", label: "Chevrons Left", category: "arrows", viewBox: "0 0 24 24", paths: ["M11 17l-5-5 5-5", "M18 17l-5-5 5-5"] },
  { name: "move-right", label: "Move Right", category: "arrows", viewBox: "0 0 24 24", paths: ["M18 8L22 12L18 16", "M2 12H22"] },
  { name: "external-link", label: "External Link", category: "arrows", viewBox: "0 0 24 24", paths: ["M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", "M15 3h6v6", "M10 14L21 3"] },
  { name: "corner-down-right", label: "Corner Down Right", category: "arrows", viewBox: "0 0 24 24", paths: ["M15 10l5 5-5 5", "M4 4v7a4 4 0 0 0 4 4h12"] },
  { name: "repeat", label: "Repeat", category: "arrows", viewBox: "0 0 24 24", paths: ["M17 1l4 4-4 4", "M3 11V9a4 4 0 0 1 4-4h14", "M7 23l-4-4 4-4", "M21 13v2a4 4 0 0 1-4 4H3"] },
  { name: "refresh-cw", label: "Refresh", category: "arrows", viewBox: "0 0 24 24", paths: ["M21 2v6h-6", "M3 12a9 9 0 0 1 15-6.7L21 8", "M3 22v-6h6", "M21 12a9 9 0 0 1-15 6.7L3 16"] },

  // ── Social (filled icons) ──
  { name: "instagram", label: "Instagram", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"] },
  { name: "twitter", label: "X (Twitter)", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"] },
  { name: "linkedin", label: "LinkedIn", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"] },
  { name: "youtube", label: "YouTube", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"] },
  { name: "tiktok", label: "TikTok", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"] },
  { name: "github", label: "GitHub", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"] },
  { name: "facebook", label: "Facebook", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"] },
  { name: "dribbble", label: "Dribbble", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.81zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-2.15-1.91-4.96-3.073-8.04-3.073-.39 0-.77.025-1.15.067zm10.757 3.62c-.216.3-1.9 2.49-5.7 4.02.257.52.5 1.058.724 1.604.08.18.153.36.22.54 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.39-6.49z"] },
  { name: "spotify", label: "Spotify", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"] },
  { name: "pinterest", label: "Pinterest", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24 18.635 24 24 18.633 24 12.017 24 5.396 18.635 0 12.017 0z"] },
  { name: "threads", label: "Threads", category: "social", viewBox: "0 0 24 24", fill: true, paths: ["M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.26 1.33-3.017.88-.724 2.107-1.127 3.553-1.166 1.089-.03 2.09.106 2.985.388-.087-.86-.363-1.53-.83-1.992-.6-.594-1.543-.891-2.808-.886l-.025.001c-1.003.009-1.83.271-2.392.76-.477.415-.774.994-.88 1.717l-2.043-.272c.157-1.088.626-1.99 1.394-2.678.96-.861 2.267-1.314 3.782-1.313h.037c1.72-.006 3.073.48 4.02 1.44.792.804 1.237 1.904 1.355 3.291.464.178.896.393 1.292.65 1.156.748 1.998 1.754 2.432 2.906.746 1.975.508 4.583-1.544 6.595-1.803 1.77-4.044 2.548-7.266 2.573z"] },

  // ── Media ──
  { name: "play", label: "Play", category: "media", viewBox: "0 0 24 24", paths: ["M5 3l14 9-14 9V3z"] },
  { name: "pause", label: "Pause", category: "media", viewBox: "0 0 24 24", paths: ["M6 4h4v16H6z", "M14 4h4v16h-4z"] },
  { name: "skip-forward", label: "Skip Forward", category: "media", viewBox: "0 0 24 24", paths: ["M5 4l10 8-10 8V4z", "M19 5v14"] },
  { name: "volume-2", label: "Volume", category: "media", viewBox: "0 0 24 24", paths: ["M11 5L6 9H2v6h4l5 4V5z", "M19.07 4.93a10 10 0 0 1 0 14.14", "M15.54 8.46a5 5 0 0 1 0 7.07"] },
  { name: "camera", label: "Camera", category: "media", viewBox: "0 0 24 24", paths: ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z", "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"] },
  { name: "image", label: "Image", category: "media", viewBox: "0 0 24 24", paths: ["M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z", "M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M21 15l-5-5L5 21"] },
  { name: "video", label: "Video", category: "media", viewBox: "0 0 24 24", paths: ["M23 7l-7 5 7 5V7z", "M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"] },
  { name: "mic", label: "Microphone", category: "media", viewBox: "0 0 24 24", paths: ["M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z", "M19 10v2a7 7 0 0 1-14 0v-2", "M12 19v4", "M8 23h8"] },
  { name: "headphones", label: "Headphones", category: "media", viewBox: "0 0 24 24", paths: ["M3 18v-6a9 9 0 0 1 18 0v6", "M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z", "M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"] },
  { name: "music", label: "Music", category: "media", viewBox: "0 0 24 24", paths: ["M9 18V5l12-2v13", "M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z", "M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"] },

  // ── Communication ──
  { name: "mail", label: "Mail", category: "communication", viewBox: "0 0 24 24", paths: ["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", "M22 6l-10 7L2 6"] },
  { name: "phone", label: "Phone", category: "communication", viewBox: "0 0 24 24", paths: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"] },
  { name: "message-circle", label: "Message", category: "communication", viewBox: "0 0 24 24", paths: ["M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"] },
  { name: "send", label: "Send", category: "communication", viewBox: "0 0 24 24", paths: ["M22 2L11 13", "M22 2l-7 20-4-9-9-4 20-7z"] },
  { name: "bell", label: "Bell", category: "communication", viewBox: "0 0 24 24", paths: ["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 0 1-3.46 0"] },
  { name: "inbox", label: "Inbox", category: "communication", viewBox: "0 0 24 24", paths: ["M22 12h-6l-2 3H10l-2-3H2", "M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"] },
  { name: "share-2", label: "Share", category: "communication", viewBox: "0 0 24 24", paths: ["M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M8.59 13.51l6.83 3.98", "M15.41 6.51l-6.82 3.98"] },
  { name: "megaphone", label: "Megaphone", category: "communication", viewBox: "0 0 24 24", paths: ["M3 11l18-5v12L3 13v-2z", "M11.6 16.8a3 3 0 1 1-5.8-1.6"] },

  // ── Commerce ──
  { name: "shopping-cart", label: "Cart", category: "commerce", viewBox: "0 0 24 24", paths: ["M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", "M20 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", "M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"] },
  { name: "shopping-bag", label: "Shopping Bag", category: "commerce", viewBox: "0 0 24 24", paths: ["M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z", "M3 6h18", "M16 10a4 4 0 0 1-8 0"] },
  { name: "tag", label: "Tag", category: "commerce", viewBox: "0 0 24 24", paths: ["M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z", "M7 7h.01"] },
  { name: "credit-card", label: "Credit Card", category: "commerce", viewBox: "0 0 24 24", paths: ["M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z", "M1 10h22"] },
  { name: "gift", label: "Gift", category: "commerce", viewBox: "0 0 24 24", paths: ["M20 12v10H4V12", "M2 7h20v5H2z", "M12 22V7", "M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z", "M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"] },
  { name: "dollar-sign", label: "Dollar", category: "commerce", viewBox: "0 0 24 24", paths: ["M12 1v22", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"] },
  { name: "percent", label: "Percent", category: "commerce", viewBox: "0 0 24 24", paths: ["M19 5L5 19", "M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"] },
  { name: "badge-check", label: "Verified", category: "commerce", viewBox: "0 0 24 24", paths: ["M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z", "M9 12l2 2 4-4"] },

  // ── Content ──
  { name: "file", label: "File", category: "content", viewBox: "0 0 24 24", paths: ["M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z", "M13 2v7h7"] },
  { name: "folder", label: "Folder", category: "content", viewBox: "0 0 24 24", paths: ["M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"] },
  { name: "link", label: "Link", category: "content", viewBox: "0 0 24 24", paths: ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"] },
  { name: "bookmark", label: "Bookmark", category: "content", viewBox: "0 0 24 24", paths: ["M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"] },
  { name: "edit", label: "Edit", category: "content", viewBox: "0 0 24 24", paths: ["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"] },
  { name: "copy", label: "Copy", category: "content", viewBox: "0 0 24 24", paths: ["M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"] },
  { name: "download", label: "Download", category: "content", viewBox: "0 0 24 24", paths: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"] },
  { name: "upload", label: "Upload", category: "content", viewBox: "0 0 24 24", paths: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"] },
  { name: "list", label: "List", category: "content", viewBox: "0 0 24 24", paths: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"] },
  { name: "layout", label: "Layout", category: "content", viewBox: "0 0 24 24", paths: ["M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z", "M3 9h18", "M9 21V9"] },
  { name: "type", label: "Type", category: "content", viewBox: "0 0 24 24", paths: ["M4 7V4h16v3", "M9 20h6", "M12 4v16"] },
  { name: "pen-tool", label: "Pen Tool", category: "content", viewBox: "0 0 24 24", paths: ["M12 19l7-7 3 3-7 7-3-3z", "M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z", "M2 2l7.586 7.586", "M11 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"] },
  { name: "code", label: "Code", category: "content", viewBox: "0 0 24 24", paths: ["M16 18l6-6-6-6", "M8 6l-6 6 6 6"] },
  { name: "terminal", label: "Terminal", category: "content", viewBox: "0 0 24 24", paths: ["M4 17l6-6-6-6", "M12 19h8"] },

  // ── Status ──
  { name: "info", label: "Info", category: "status", viewBox: "0 0 24 24", paths: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-4", "M12 8h.01"] },
  { name: "alert-triangle", label: "Warning", category: "status", viewBox: "0 0 24 24", paths: ["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", "M12 17h.01"] },
  { name: "check-circle", label: "Check Circle", category: "status", viewBox: "0 0 24 24", paths: ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "M22 4L12 14.01l-3-3"] },
  { name: "x-circle", label: "X Circle", category: "status", viewBox: "0 0 24 24", paths: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M15 9l-6 6", "M9 9l6 6"] },
  { name: "help-circle", label: "Help", category: "status", viewBox: "0 0 24 24", paths: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", "M12 17h.01"] },
  { name: "alert-circle", label: "Alert", category: "status", viewBox: "0 0 24 24", paths: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8v4", "M12 16h.01"] },
  { name: "loader", label: "Loading", category: "status", viewBox: "0 0 24 24", paths: ["M12 2v4", "M12 18v4", "M4.93 4.93l2.83 2.83", "M16.24 16.24l2.83 2.83", "M2 12h4", "M18 12h4", "M4.93 19.07l2.83-2.83", "M16.24 7.76l2.83-2.83"] },
  { name: "trending-up", label: "Trending Up", category: "status", viewBox: "0 0 24 24", paths: ["M23 6l-9.5 9.5-5-5L1 18", "M17 6h6v6"] },
  { name: "trending-down", label: "Trending Down", category: "status", viewBox: "0 0 24 24", paths: ["M23 18l-9.5-9.5-5 5L1 6", "M17 18h6v-6"] },
  { name: "bar-chart", label: "Bar Chart", category: "status", viewBox: "0 0 24 24", paths: ["M12 20V10", "M18 20V4", "M6 20v-4"] },
  { name: "activity", label: "Activity", category: "status", viewBox: "0 0 24 24", paths: ["M22 12h-4l-3 9L9 3l-3 9H2"] },
  { name: "award", label: "Award", category: "status", viewBox: "0 0 24 24", paths: ["M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M8.21 13.89L7 23l5-3 5 3-1.21-9.12"] },

  // ── Shapes ──
  { name: "circle", label: "Circle", category: "shapes", viewBox: "0 0 24 24", paths: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"] },
  { name: "square", label: "Square", category: "shapes", viewBox: "0 0 24 24", paths: ["M3 3h18v18H3z"] },
  { name: "triangle", label: "Triangle", category: "shapes", viewBox: "0 0 24 24", paths: ["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"] },
  { name: "hexagon", label: "Hexagon", category: "shapes", viewBox: "0 0 24 24", paths: ["M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"] },
  { name: "octagon", label: "Octagon", category: "shapes", viewBox: "0 0 24 24", paths: ["M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z"] },
  { name: "diamond", label: "Diamond", category: "shapes", viewBox: "0 0 24 24", paths: ["M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0z"] },
  { name: "star-filled", label: "Star Filled", category: "shapes", viewBox: "0 0 24 24", fill: true, paths: ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"] },
  { name: "heart-filled", label: "Heart Filled", category: "shapes", viewBox: "0 0 24 24", fill: true, paths: ["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"] },
  { name: "circle-filled", label: "Circle Filled", category: "shapes", viewBox: "0 0 24 24", fill: true, paths: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"] },
];

// Fast lookup map
export const ICON_MAP = new Map<string, IconDef>(
  ICONS.map((icon) => [icon.name, icon])
);

export function getIcon(name: string): IconDef | undefined {
  return ICON_MAP.get(name);
}

export function getIconsByCategory(category: IconCategory): IconDef[] {
  return ICONS.filter((icon) => icon.category === category);
}
