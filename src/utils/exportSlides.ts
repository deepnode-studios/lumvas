import { useLumvasStore } from "@/store/useLumvasStore";
import { getLastDialogPath, setLastDialogPath, revealInFolder } from "./dialogPath";

/** Inject cross-origin stylesheets as same-origin <style> so html-to-image can read cssRules */
async function injectCrossOriginCSS(): Promise<HTMLStyleElement[]> {
  const injected: HTMLStyleElement[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      sheet.cssRules;
    } catch {
      if (sheet.href) {
        try {
          const css = await fetch(sheet.href).then((r) => r.text());
          const style = document.createElement("style");
          style.textContent = css;
          style.setAttribute("data-export-injected", "true");
          document.head.appendChild(style);
          injected.push(style);
          (sheet.ownerNode as HTMLLinkElement)?.setAttribute("data-export-disabled", "true");
          (sheet.ownerNode as HTMLLinkElement).disabled = true;
        } catch { /* skip */ }
      }
    }
  }
  return injected;
}

function cleanupInjectedCSS(injected: HTMLStyleElement[]) {
  for (const s of injected) s.remove();
  for (const link of document.querySelectorAll<HTMLLinkElement>("[data-export-disabled]")) {
    link.disabled = false;
    link.removeAttribute("data-export-disabled");
  }
}

/** Capture all export slides as data URLs */
async function captureSlides(
  toPng: (el: HTMLElement, opts: Record<string, unknown>) => Promise<string>,
): Promise<string[]> {
  const container = document.getElementById("export-slides");
  if (!container) return [];
  const doc = useLumvasStore.getState().getDocument();
  const w = doc.documentSize.width;
  const h = doc.documentSize.height;
  const results: string[] = [];
  for (let i = 0; i < container.children.length; i++) {
    const el = container.children[i] as HTMLElement;
    const dataUrl = await toPng(el, { width: w, height: h, pixelRatio: 2 });
    results.push(dataUrl);
  }
  return results;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Export slides as individual PNG files to a folder picked by native dialog */
export async function exportSlidesToFolder() {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const folder = await open({
    directory: true,
    title: "Choose export folder",
    defaultPath: getLastDialogPath(),
  });
  if (!folder) return;
  setLastDialogPath(folder as string);

  const { toPng } = await import("html-to-image");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  const injected = await injectCrossOriginCSS();
  try {
    const dataUrls = await captureSlides(toPng);
    let lastFile = "";
    for (let i = 0; i < dataUrls.length; i++) {
      const bytes = dataUrlToBytes(dataUrls[i]);
      lastFile = `${folder}/slide-${String(i + 1).padStart(2, "0")}.png`;
      await writeFile(lastFile, bytes);
    }
    if (lastFile) await revealInFolder(lastFile);
  } finally {
    cleanupInjectedCSS(injected);
  }
}

/** Export all slides merged into a single image, saved via native dialog */
export async function exportMerged(direction: "horizontal" | "vertical") {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({
    filters: [{ name: "PNG Image", extensions: ["png"] }],
    defaultPath: getLastDialogPath()
      ? `${getLastDialogPath()}/lumvas-merged-${direction}.png`
      : `lumvas-merged-${direction}.png`,
  });
  if (!path) return;
  setLastDialogPath(path);

  const { toPng } = await import("html-to-image");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  const injected = await injectCrossOriginCSS();
  try {
    const dataUrls = await captureSlides(toPng);
    if (dataUrls.length === 0) return;

    const images = await Promise.all(
      dataUrls.map(
        (url) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
          }),
      ),
    );

    const doc = useLumvasStore.getState().getDocument();
    const sw = doc.documentSize.width * 2;
    const sh = doc.documentSize.height * 2;

    const canvas = document.createElement("canvas");
    canvas.width = direction === "horizontal" ? sw * images.length : sw;
    canvas.height = direction === "vertical" ? sh * images.length : sh;

    const ctx = canvas.getContext("2d")!;
    for (let i = 0; i < images.length; i++) {
      const x = direction === "horizontal" ? sw * i : 0;
      const y = direction === "vertical" ? sh * i : 0;
      ctx.drawImage(images[i], x, y, sw, sh);
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (blob) {
      const buffer = new Uint8Array(await blob.arrayBuffer());
      await writeFile(path, buffer);
      await revealInFolder(path);
    }
  } finally {
    cleanupInjectedCSS(injected);
  }
}
