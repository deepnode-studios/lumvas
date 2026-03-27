import { create } from "zustand";
import { useLumvasStore, selectVideoContent } from "./useLumvasStore";
import type { VideoContentNode } from "@/types/schema";

export type InspectorTarget =
  | { type: "scene"; sceneId: string }
  | { type: "element"; sceneId: string; elementId: string }
  | { type: "audio"; trackId: string }
  | { type: "caption"; trackId: string }
  | null;

interface TimelineStore {
  // Playback
  isPlaying: boolean;
  currentTimeMs: number;
  playbackSpeed: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (timeMs: number) => void;
  setPlaybackSpeed: (speed: number) => void;

  // Timeline UI
  zoomLevel: number; // pixels per second
  setZoomLevel: (z: number) => void;
  scrollOffsetMs: number;
  setScrollOffsetMs: (ms: number) => void;

  // Selection
  selectedTrackId: string | null;
  setSelectedTrack: (id: string | null) => void;
  selectedAudioTrackId: string | null;
  setSelectedAudioTrack: (id: string | null) => void;

  // Inspector target — what the right panel shows
  inspectorTarget: InspectorTarget;
  setInspectorTarget: (target: InspectorTarget) => void;

  // Snapping
  snapEnabled: boolean;
  toggleSnap: () => void;
}

/** Get total video duration: max of scene durations and audio track end times */
export function getTotalDurationMs(): number {
  const state = useLumvasStore.getState();
  if (state.contentType !== "video") return 0;
  const content = selectVideoContent(state);
  const sceneDuration = content.scenes.reduce((sum, s) => sum + s.durationMs, 0);
  let maxAudioEnd = 0;
  for (const track of content.audioTracks) {
    const end = (track.startMs ?? 0) + (track.durationMs ?? 0);
    if (end > maxAudioEnd) maxAudioEnd = end;
  }
  return Math.max(sceneDuration, maxAudioEnd);
}

/** Get the scene ID at a given time */
export function getSceneAtTime(timeMs: number): string | null {
  const state = useLumvasStore.getState();
  if (state.contentType !== "video") return null;
  const content = selectVideoContent(state);
  let elapsed = 0;
  for (const scene of content.scenes) {
    if (timeMs >= elapsed && timeMs < elapsed + scene.durationMs) {
      return scene.id;
    }
    elapsed += scene.durationMs;
  }
  return content.scenes.at(-1)?.id ?? null;
}

/** Get the absolute start time of a scene */
export function getSceneStartMs(sceneId: string): number {
  const state = useLumvasStore.getState();
  if (state.contentType !== "video") return 0;
  const content = selectVideoContent(state);
  let elapsed = 0;
  for (const scene of content.scenes) {
    if (scene.id === sceneId) return elapsed;
    elapsed += scene.durationMs;
  }
  return 0;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  isPlaying: false,
  currentTimeMs: 0,
  playbackSpeed: 1,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentTimeMs: 0 }),
  seekTo: (timeMs) => set({ currentTimeMs: Math.max(0, timeMs) }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  zoomLevel: 100, // 100px per second
  setZoomLevel: (z) => set({ zoomLevel: Math.max(20, Math.min(500, z)) }),
  scrollOffsetMs: 0,
  setScrollOffsetMs: (ms) => set({ scrollOffsetMs: Math.max(0, ms) }),

  selectedTrackId: null,
  setSelectedTrack: (id) => set({ selectedTrackId: id }),
  selectedAudioTrackId: null,
  setSelectedAudioTrack: (id) => set({ selectedAudioTrackId: id }),

  inspectorTarget: null,
  setInspectorTarget: (target) => set({ inspectorTarget: target }),

  snapEnabled: true,
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
}));
