import { convertFileSrc } from "@tauri-apps/api/core";

/**
 * Resolve a media reference to a URL the webview can render.
 * - data: URIs → pass through
 * - http/https URLs → pass through
 * - empty string → empty string
 * - relative path (e.g. "media/img-abc.png") → asset:// protocol via Tauri
 */
export function resolveMediaSrc(ref: string | undefined, projectDir: string | null | undefined): string {
  if (!ref) return "";
  if (ref.startsWith("data:") || ref.startsWith("http") || ref.startsWith("asset:")) {
    return ref;
  }
  if (ref === "") return "";
  // Relative path → convert to Tauri asset URL
  if (projectDir) {
    const absolutePath = `${projectDir}/${ref}`;
    return convertFileSrc(absolutePath);
  }
  return ref;
}
