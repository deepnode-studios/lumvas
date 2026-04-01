import type { LumvasDocument } from "@/types/schema";

export function validateLumvasDocument(obj: unknown): obj is LumvasDocument {
  if (!obj || typeof obj !== "object") return false;
  const d = obj as Record<string, unknown>;
  if (!d.assets || !d.theme || !d.content) return false;
  const c = d.content as Record<string, unknown>;

  if (d.contentType === "video") {
    // Video: needs scenes array OR compositions array
    return Array.isArray(c.scenes) || Array.isArray(c.compositions);
  }
  // Slides (default): needs slides array
  return Array.isArray(c.slides);
}
