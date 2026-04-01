/**
 * Deep diagnostic for video rendering pipeline.
 * Run in browser console: __deepVideoDebug()
 */

import { log } from "./logger";

export function setupDeepDebug() {
  (window as any).__deepVideoDebug = async () => {
    const results: Record<string, unknown> = {};

    // 1. Check if frame files exist on disk
    const { exists, readDir } = await import("@tauri-apps/plugin-fs");

    // Find the temp frame dir
    const tmpDirs = await readDir("/tmp").catch(() => []);
    const frameDirs = tmpDirs.filter(e => e.name?.startsWith("lumvas-frames-"));
    results.frameDirsFound = frameDirs.map(d => d.name);
    console.log("1. Frame dirs in /tmp:", frameDirs.map(d => d.name));

    if (frameDirs.length === 0) {
      console.error("NO frame directories found. FFmpeg extraction failed.");
      return results;
    }

    const frameDir = `/tmp/${frameDirs[frameDirs.length - 1].name}`;
    const frameFiles = await readDir(frameDir).catch(() => []);
    results.frameFileCount = frameFiles.length;
    results.firstFiles = frameFiles.slice(0, 5).map(f => f.name);
    console.log(`2. Frame dir ${frameDir}: ${frameFiles.length} files`, frameFiles.slice(0, 3).map(f => f.name));

    // 2. Check if asset:// URL loads an image
    const testFile = `${frameDir}/frame_00001.jpg`;
    const assetUrl = `asset://localhost/${testFile}`;
    console.log("3. Testing asset URL:", assetUrl);

    const img = new Image();
    img.src = assetUrl;
    await new Promise<void>((resolve) => {
      img.onload = () => {
        results.assetUrlWorks = true;
        results.imageSize = { w: img.naturalWidth, h: img.naturalHeight };
        console.log("   ✅ asset:// URL WORKS!", img.naturalWidth, "x", img.naturalHeight);
        resolve();
      };
      img.onerror = (e) => {
        results.assetUrlWorks = false;
        results.imageError = String(e);
        console.error("   ❌ asset:// URL FAILED", e);
        resolve();
      };
      setTimeout(() => {
        if (!img.complete) {
          results.assetUrlWorks = false;
          results.imageTimeout = true;
          console.error("   ❌ asset:// URL TIMED OUT (3s)");
          resolve();
        }
      }, 3000);
    });

    // 3. Try file:// URL as alternative
    const fileUrl = `file://${testFile}`;
    console.log("4. Testing file:// URL:", fileUrl);
    const img2 = new Image();
    img2.src = fileUrl;
    await new Promise<void>((resolve) => {
      img2.onload = () => { console.log("   ✅ file:// URL WORKS"); results.fileUrlWorks = true; resolve(); };
      img2.onerror = () => { console.log("   ❌ file:// URL FAILED"); results.fileUrlWorks = false; resolve(); };
      setTimeout(resolve, 2000);
    });

    // 4. Try reading file as bytes and creating blob URL
    try {
      const { readFile } = await import("@tauri-apps/plugin-fs");
      const bytes = await readFile(testFile);
      console.log("5. readFile succeeded:", bytes.length, "bytes, first 4:", [...bytes.slice(0, 4)]);
      results.fileReadOk = true;
      results.fileSize = bytes.length;
      results.firstBytes = [...bytes.slice(0, 4)]; // JPEG starts with FF D8 FF

      const blob = new Blob([bytes], { type: "image/jpeg" });
      const blobUrl = URL.createObjectURL(blob);
      const img3 = new Image();
      img3.src = blobUrl;
      await new Promise<void>((resolve) => {
        img3.onload = () => { console.log("   ✅ Blob URL WORKS"); results.blobUrlWorks = true; resolve(); };
        img3.onerror = () => { console.log("   ❌ Blob URL FAILED"); results.blobUrlWorks = false; resolve(); };
        setTimeout(resolve, 2000);
      });
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("5. readFile FAILED:", e);
      results.fileReadOk = false;
    }

    // 5. Check what convertFileSrc produces
    try {
      const { convertFileSrc } = await import("@tauri-apps/api/core");
      const converted = convertFileSrc(testFile);
      console.log("6. convertFileSrc result:", converted);
      results.convertFileSrc = converted;

      const img4 = new Image();
      img4.src = converted;
      await new Promise<void>((resolve) => {
        img4.onload = () => { console.log("   ✅ convertFileSrc URL WORKS"); results.convertFileSrcWorks = true; resolve(); };
        img4.onerror = () => { console.log("   ❌ convertFileSrc URL FAILED"); results.convertFileSrcWorks = false; resolve(); };
        setTimeout(resolve, 2000);
      });
    } catch (e) {
      console.log("6. convertFileSrc not available:", e);
    }

    // 6. Check canvas rendering pipeline
    console.log("7. Testing canvas drawImage with loaded image...");
    if (img.complete && img.naturalWidth > 0) {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d")!;
      try {
        ctx.drawImage(img, 0, 0, 100, 100);
        const pixel = ctx.getImageData(50, 50, 1, 1).data;
        results.canvasDrawWorks = true;
        results.centerPixel = [pixel[0], pixel[1], pixel[2], pixel[3]];
        console.log("   ✅ Canvas drawImage works. Center pixel RGBA:", pixel[0], pixel[1], pixel[2], pixel[3]);
      } catch (e) {
        results.canvasDrawWorks = false;
        console.error("   ❌ Canvas drawImage FAILED (CORS?):", e);
      }
    }

    // 7. Check the WebGL display
    const previewCanvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (previewCanvas) {
      const gl = previewCanvas.getContext("webgl");
      results.hasWebGL = !!gl;
      results.previewCanvasSize = { w: previewCanvas.width, h: previewCanvas.height };
      console.log("8. Preview canvas:", previewCanvas.width, "x", previewCanvas.height, "WebGL:", !!gl);
    } else {
      console.log("8. No canvas element found in DOM");
    }

    console.log("\n=== FULL RESULTS ===");
    console.log(JSON.stringify(results, null, 2));
    return results;
  };
}
