import type { SceneTransition } from "@/types/schema";

/**
 * Composite a "next scene" canvas on top of the current canvas according to
 * the transition preset + progress (0 = current scene only, 1 = next scene only).
 */
export function applySceneTransition(
  ctx: CanvasRenderingContext2D,
  nextCanvas: HTMLCanvasElement,
  transition: SceneTransition,
  progress: number,
  w: number,
  h: number,
) {
  switch (transition.preset) {
    case "crossfade":
    case "dissolve": {
      ctx.save();
      ctx.globalAlpha = progress;
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }

    case "slide-left": {
      // Current slides out to the left, next slides in from the right
      ctx.save();
      ctx.drawImage(nextCanvas, w * (1 - progress), 0);
      ctx.restore();
      break;
    }

    case "slide-right": {
      ctx.save();
      ctx.drawImage(nextCanvas, -w * (1 - progress), 0);
      ctx.restore();
      break;
    }

    case "slide-up": {
      ctx.save();
      ctx.drawImage(nextCanvas, 0, h * (1 - progress));
      ctx.restore();
      break;
    }

    case "slide-down": {
      ctx.save();
      ctx.drawImage(nextCanvas, 0, -h * (1 - progress));
      ctx.restore();
      break;
    }

    case "zoom": {
      // Next scene scales up from center
      const scale = 0.5 + progress * 0.5;
      const tx = (w - w * scale) / 2;
      const ty = (h - h * scale) / 2;
      ctx.save();
      ctx.globalAlpha = progress;
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }

    case "wipe-left": {
      // Reveal next scene from right to left
      const revealW = w * progress;
      ctx.save();
      ctx.beginPath();
      ctx.rect(w - revealW, 0, revealW, h);
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }

    case "wipe-right": {
      const revealW = w * progress;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, revealW, h);
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }

    default:
      // "none" or unknown: just cut (don't composite)
      if (progress >= 1) ctx.drawImage(nextCanvas, 0, 0);
  }
}
