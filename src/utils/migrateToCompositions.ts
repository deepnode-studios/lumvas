/**
 * Migrate legacy VideoContentNode (sequential scenes[]) to
 * the new composition-based architecture (compositions[] + rootCompositionId).
 *
 * This runs once on document load when scenes[] is present but compositions[] is not.
 */

import type {
  VideoContentNode,
  VideoScene,
  Composition,
  CompLayer,
  SceneElement,
} from "@/types/schema";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Convert a legacy scene-based VideoContentNode to composition-based.
 * Returns a new VideoContentNode with compositions[] and rootCompositionId.
 * The original scenes[] field is removed.
 */
export function migrateScenesToCompositions(legacy: VideoContentNode): VideoContentNode {
  const scenes = legacy.scenes;
  if (!scenes || scenes.length === 0) {
    // Nothing to migrate — create empty root comp
    const rootId = "comp-root";
    return {
      ...legacy,
      scenes: undefined,
      compositions: [{
        id: rootId,
        name: "Root",
        durationMs: 1000,
        layers: [],
      }],
      rootCompositionId: rootId,
    };
  }

  const compositions: Composition[] = [];
  const rootLayers: CompLayer[] = [];
  let cursor = 0; // running timeline position for sequential scene placement

  for (const scene of scenes) {
    // Create a child composition for each scene
    const childComp = sceneToComposition(scene);
    compositions.push(childComp);

    // Create a comp-ref layer in the root composition
    rootLayers.push({
      id: `layer-${uid()}`,
      name: childComp.name,
      source: { type: "composition", compositionId: childComp.id },
      startMs: cursor,
      durationMs: scene.durationMs,
      enabled: true,
    });

    cursor += scene.durationMs;
  }

  // Create the root composition
  const rootId = "comp-root";
  const rootComp: Composition = {
    id: rootId,
    name: "Root",
    durationMs: cursor,
    layers: rootLayers,
  };
  compositions.unshift(rootComp);

  // Migrate global audio tracks as layers on the root comp
  for (const audio of legacy.audioTracks) {
    rootComp.layers.push({
      id: `layer-audio-${uid()}`,
      name: audio.label,
      source: { type: "audio", audio },
      startMs: audio.startMs,
      durationMs: audio.durationMs,
      enabled: true,
    });
  }

  return {
    ...legacy,
    scenes: undefined,
    compositions,
    rootCompositionId: rootId,
    audioTracks: legacy.audioTracks, // keep for backward compat
    captionTracks: legacy.captionTracks,
    settings: legacy.settings,
  };
}

/** Convert a single VideoScene into a Composition */
function sceneToComposition(scene: VideoScene): Composition {
  const layers: CompLayer[] = [];

  for (const el of scene.elements) {
    layers.push(elementToLayer(el, scene.durationMs));
  }

  return {
    id: scene.id, // preserve scene ID for existing references
    name: scene.id.replace(/^scene-/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    durationMs: scene.durationMs,
    // Don't carry over scene background — child comps should be transparent
    // so the root comp's background/video layers show through
    alignItems: scene.alignItems,
    justifyContent: scene.justifyContent,
    direction: scene.direction,
    padding: scene.padding,
    gap: scene.gap,
    layers,
  };
}

/** Convert a SceneElement (with timing) into a CompLayer */
function elementToLayer(el: SceneElement, sceneDurationMs: number): CompLayer {
  const enterMs = el.timing.enterMs;
  const exitMs = el.timing.exitMs ?? sceneDurationMs;

  return {
    id: `layer-${el.id}`,
    name: el.content?.slice(0, 30) || el.type,
    source: { type: "element", element: el },
    startMs: enterMs,
    durationMs: exitMs - enterMs,
    enabled: true,
    effects: el.timing.effects,
    opacity: el.opacity,
    blendMode: el.blendMode,
  };
}

/** Check if a VideoContentNode needs migration */
export function needsMigration(vc: VideoContentNode): boolean {
  return !!(vc.scenes && vc.scenes.length > 0 && (!vc.compositions || vc.compositions.length === 0));
}
