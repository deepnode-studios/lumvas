import { useEffect, useRef } from "react";
import { useTimelineStore } from "@/store/useTimelineStore";
import { useLumvasStore, selectVideoContent } from "@/store/useLumvasStore";
import { useFileStore } from "@/store/useFileStore";
import { AudioEngine } from "@/utils/audioEngine";
import type { AudioTrack } from "@/types/schema";

// Cache Tauri module imports so they resolve once
let _readFile: ((path: string) => Promise<Uint8Array>) | null = null;
let _convertFileSrc: ((path: string) => string) | null = null;
let _tauriResolved = false;

async function resolveTauriModules() {
  if (_tauriResolved) return;
  _tauriResolved = true;
  try {
    const fs = await import("@tauri-apps/plugin-fs");
    _readFile = fs.readFile;
  } catch { /* not in Tauri */ }
  try {
    const core = await import("@tauri-apps/api/core");
    _convertFileSrc = core.convertFileSrc;
  } catch { /* not in Tauri */ }
}

async function fetchAudioBytes(
  track: AudioTrack,
  projectDir: string | null,
): Promise<ArrayBuffer | null> {
  try {
    if (track.src.startsWith("data:")) {
      const resp = await fetch(track.src);
      return resp.arrayBuffer();
    }

    if (!projectDir) return null;
    const fullPath = `${projectDir}/${track.src}`;

    if (_readFile) {
      try {
        const bytes = await _readFile(fullPath);
        // bytes.buffer may be a shared/larger ArrayBuffer; slice to exact range
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      } catch { /* fall through */ }
    }

    if (_convertFileSrc) {
      try {
        const url = _convertFileSrc(fullPath);
        const resp = await fetch(url);
        return resp.arrayBuffer();
      } catch { /* fall through */ }
    }

    return null;
  } catch {
    return null;
  }
}

export function usePlayback() {
  const engineRef = useRef<AudioEngine | null>(null);
  const loadedIds = useRef<Set<string>>(new Set());
  const loadingIds = useRef<Set<string>>(new Set());

  // Create engine + pre-warm AudioContext + resolve Tauri imports on mount
  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;
    engine.warmUp();

    resolveTauriModules().then(() => {
      syncTracks(engine, loadedIds.current, loadingIds.current);
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
      loadedIds.current.clear();
      loadingIds.current.clear();
    };
  }, []);

  // React to audio track additions/removals
  useEffect(() => {
    const unsub = useLumvasStore.subscribe((state, prev) => {
      if (state.contentType !== "video") return;
      const engine = engineRef.current;
      if (!engine) return;

      const vc = selectVideoContent(state);
      const prevVc = prev.contentType === "video" ? selectVideoContent(prev) : null;
      if (prevVc && vc.audioTracks === prevVc.audioTracks) return;

      syncTracks(engine, loadedIds.current, loadingIds.current);
    });
    return unsub;
  }, []);

  // Sync play/pause/seek with timeline
  useEffect(() => {
    let lastTimeMs = useTimelineStore.getState().currentTimeMs;
    let seekThrottleId: ReturnType<typeof setTimeout> | null = null;

    const unsub = useTimelineStore.subscribe((state, prev) => {
      const engine = engineRef.current;
      if (!engine) return;

      // Play started
      if (state.isPlaying && !prev.isPlaying) {
        engine.playAll(state.currentTimeMs);
        lastTimeMs = state.currentTimeMs;
        return;
      }

      // Paused / stopped
      if (!state.isPlaying && prev.isPlaying) {
        engine.pauseAll();
        lastTimeMs = state.currentTimeMs;
        return;
      }

      // Seek while playing: user scrubbed the timeline
      // Throttle to avoid restarting sources 60 times per second during drag
      if (state.isPlaying && state.currentTimeMs !== lastTimeMs) {
        const delta = Math.abs(state.currentTimeMs - lastTimeMs);
        // Only re-sync audio if the jump is significant (>200ms means user scrubbed,
        // small deltas are just the normal RAF tick advancing the playhead)
        if (delta > 200) {
          if (seekThrottleId) clearTimeout(seekThrottleId);
          seekThrottleId = setTimeout(() => {
            engine.seekTo(state.currentTimeMs);
            seekThrottleId = null;
          }, 50);
        }
        lastTimeMs = state.currentTimeMs;
      }
    });

    return () => {
      unsub();
      if (seekThrottleId) clearTimeout(seekThrottleId);
    };
  }, []);

  return engineRef;
}

function syncTracks(
  engine: AudioEngine,
  loadedIds: Set<string>,
  loadingIds: Set<string>,
) {
  const state = useLumvasStore.getState();
  if (state.contentType !== "video") return;

  const vc = selectVideoContent(state);
  const projectDir = useFileStore.getState().currentFilePath;
  const currentIds = new Set(vc.audioTracks.map((t) => t.id));

  for (const id of loadedIds) {
    if (!currentIds.has(id)) {
      engine.removeTrack(id);
      loadedIds.delete(id);
    }
  }

  for (const track of vc.audioTracks) {
    if (loadedIds.has(track.id)) {
      engine.setTrackVolume(track.id, track.volume);
      continue;
    }
    if (loadingIds.has(track.id)) continue;

    loadingIds.add(track.id);

    fetchAudioBytes(track, projectDir)
      .then(async (buf) => {
        if (!buf) return;
        const realDurationMs = await engine.loadTrack(track.id, buf, {
          startMs: track.startMs ?? 0,
          volume: track.volume,
          trimStartMs: track.trimStartMs,
          trimEndMs: track.trimEndMs,
          fadeInMs: track.fadeInMs,
          fadeOutMs: track.fadeOutMs,
        });
        loadedIds.add(track.id);

        // Update store with actual decoded duration if it differs
        if (realDurationMs > 0 && realDurationMs !== track.durationMs) {
          useLumvasStore.getState().updateAudioTrack(track.id, { durationMs: realDurationMs });
        }
      })
      .catch((err) => {
        console.warn(`Failed to load audio track ${track.id}:`, err);
      })
      .finally(() => {
        loadingIds.delete(track.id);
      });
  }
}
