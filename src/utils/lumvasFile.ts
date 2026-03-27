/**
 * Lumvas Project Directory Format:
 *
 *   MyProject.lumvas/
 *     project.json    ← document structure, media referenced by relative path
 *     media/
 *       img-a1b2c3.png
 *       logo-d4e5f6.png
 *
 * Media data is never embedded in JSON. On upload, files are written to media/.
 * On render, paths are resolved to asset:// protocol URLs by the frontend.
 */

import type { LumvasDocument } from "@/types/schema";

/** Generate a short random ID for media filenames */
function mediaId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Get the file extension from a mime type */
function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
  };
  return map[mime] || "bin";
}

/** Decode a base64 data URI to raw bytes + mime type */
function dataUriToBytes(dataUri: string): { mime: string; bytes: Uint8Array } | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { mime: match[1], bytes };
}

function isDataUri(s: unknown): s is string {
  return typeof s === "string" && s.startsWith("data:");
}

/**
 * Write a media file from a base64 data URI into the project's media/ folder.
 * Returns the relative path (e.g. "media/img-a1b2c3.png").
 */
export async function writeMediaFromDataUri(
  projectDir: string,
  dataUri: string,
  prefix: string = "img",
): Promise<string> {
  const parsed = dataUriToBytes(dataUri);
  if (!parsed) throw new Error("Invalid data URI");
  const { mkdir, writeFile } = await import("@tauri-apps/plugin-fs");
  const mediaDir = `${projectDir}/media`;
  await mkdir(mediaDir, { recursive: true });
  const filename = `${prefix}-${mediaId()}.${extFromMime(parsed.mime)}`;
  const relPath = `media/${filename}`;
  await writeFile(`${projectDir}/${relPath}`, parsed.bytes);
  return relPath;
}

/**
 * Write raw bytes into the project's media/ folder.
 * Returns the relative path.
 */
export async function writeMediaFromFile(
  projectDir: string,
  sourcePath: string,
): Promise<string> {
  const { mkdir, copyFile } = await import("@tauri-apps/plugin-fs");
  const mediaDir = `${projectDir}/media`;
  await mkdir(mediaDir, { recursive: true });
  const ext = sourcePath.split(".").pop() || "bin";
  const filename = `img-${mediaId()}.${ext}`;
  const relPath = `media/${filename}`;
  await copyFile(sourcePath, `${projectDir}/${relPath}`);
  return relPath;
}

/**
 * Save a LumvasDocument to a project directory.
 * Any remaining base64 data URIs in the document are extracted to media/ files first.
 */
export async function saveProject(
  projectDir: string,
  doc: LumvasDocument,
): Promise<void> {
  const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
  await mkdir(projectDir, { recursive: true });

  // Clone to avoid mutating the store
  const clone: LumvasDocument = JSON.parse(JSON.stringify(doc));

  // Extract any remaining embedded base64 data to media files
  for (const asset of clone.assets?.items ?? []) {
    if (isDataUri(asset.data)) {
      asset.data = await writeMediaFromDataUri(projectDir, asset.data, "asset");
    }
  }
  for (const slide of clone.content?.slides ?? []) {
    await extractElementMedia(projectDir, slide.elements ?? []);
  }

  await writeTextFile(`${projectDir}/project.json`, JSON.stringify(clone, null, 2));
}

async function extractElementMedia(projectDir: string, elements: any[]): Promise<void> {
  for (const el of elements) {
    if ((el.type === "image" || el.type === "logo") && isDataUri(el.content)) {
      el.content = await writeMediaFromDataUri(projectDir, el.content, el.type);
    }
    if (el.children) await extractElementMedia(projectDir, el.children);
  }
}

/**
 * Load a LumvasDocument from a project directory.
 * Media paths stay as relative paths — the renderer resolves them at render time.
 */
export async function loadProject(projectDir: string): Promise<LumvasDocument> {
  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  const text = await readTextFile(`${projectDir}/project.json`);
  return JSON.parse(text) as LumvasDocument;
}
