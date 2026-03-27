const STORAGE_KEY = "lumvas-last-dialog-path";

export function getLastDialogPath(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function setLastDialogPath(path: string) {
  try {
    // Store the parent directory, not the file/folder itself
    const parent = path.replace(/\\/g, "/").replace(/\/[^/]*$/, "");
    if (parent) localStorage.setItem(STORAGE_KEY, parent);
  } catch { /* ignore */ }
}

export async function revealInFolder(path: string) {
  try {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    await revealItemInDir(path);
  } catch {
    // Fallback: try opening the directory itself
    try {
      const { openPath } = await import("@tauri-apps/plugin-opener");
      await openPath(path);
    } catch { /* ignore */ }
  }
}
