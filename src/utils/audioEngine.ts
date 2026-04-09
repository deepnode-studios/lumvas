/**
 * Web Audio API engine for synchronized multi-track playback.
 * Manages loading, playing, pausing, and volume control for multiple audio tracks.
 * Supports volume keyframe automation and ducking (auto-lower music when narration plays).
 */

import type { AudioKeyframe, AudioDuckingConfig, Easing } from "@/types/schema";

interface LoadedTrack {
  buffer: AudioBuffer;
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  startMs: number;
  trimStartMs: number;
  trimEndMs: number | null;
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
  /** Volume automation keyframes */
  volumeKeyframes?: AudioKeyframe[];
  /** Ducking config */
  ducking?: AudioDuckingConfig;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private tracks = new Map<string, LoadedTrack>();
  private playStartTime = 0;
  private playOffsetMs = 0;
  private _isPlaying = false;

  private getContext(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  /** Pre-create the AudioContext so first playback is instant */
  warmUp(): void {
    const ctx = this.getContext();
    // Resume immediately so it's never in suspended state from the start
    if (ctx.state === "suspended") ctx.resume();
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /** Load an audio track from an ArrayBuffer. Returns actual duration in ms. */
  async loadTrack(
    id: string,
    audioData: ArrayBuffer,
    opts: {
      startMs: number;
      volume: number;
      trimStartMs?: number;
      trimEndMs?: number;
      fadeInMs?: number;
      fadeOutMs?: number;
      volumeKeyframes?: AudioKeyframe[];
      ducking?: AudioDuckingConfig;
    },
  ): Promise<number> {
    const ctx = this.getContext();
    const buffer = await ctx.decodeAudioData(audioData.slice(0));
    const gain = ctx.createGain();
    gain.gain.value = opts.volume;
    gain.connect(ctx.destination);

    this.tracks.set(id, {
      buffer,
      source: null,
      gain,
      startMs: opts.startMs,
      trimStartMs: opts.trimStartMs ?? 0,
      trimEndMs: opts.trimEndMs ?? null,
      volume: opts.volume,
      fadeInMs: opts.fadeInMs ?? 0,
      fadeOutMs: opts.fadeOutMs ?? 0,
      volumeKeyframes: opts.volumeKeyframes,
      ducking: opts.ducking,
    });

    return Math.round(buffer.duration * 1000);
  }

  /** Remove a track */
  removeTrack(id: string): void {
    const track = this.tracks.get(id);
    if (track?.source) {
      try { track.source.stop(); } catch { /* already stopped */ }
    }
    track?.gain.disconnect();
    this.tracks.delete(id);
  }

  /** Start all tracks from a given video time */
  playAll(fromMs: number): void {
    const ctx = this.getContext();
    this.stopAllSources();
    this._isPlaying = true;

    const startSources = () => {
      this.playOffsetMs = fromMs;
      this.playStartTime = ctx.currentTime;
      for (const [, track] of this.tracks) {
        this.startTrackSource(track, fromMs);
      }
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(startSources);
    } else {
      startSources();
    }
  }

  /** Pause: stop sources but keep AudioContext running */
  pauseAll(): void {
    this._isPlaying = false;
    this.stopAllSources();
    // DO NOT suspend the context - that causes resume delays
  }

  /** Stop all tracks and reset */
  stopAll(): void {
    this._isPlaying = false;
    this.stopAllSources();
  }

  /** Seek to a new position. If playing, restart sources from the new position. */
  seekTo(timeMs: number): void {
    if (!this._isPlaying) return;
    const ctx = this.getContext();
    if (ctx.state === "suspended") return;
    this.stopAllSources();
    this.playOffsetMs = timeMs;
    this.playStartTime = ctx.currentTime;
    for (const [, track] of this.tracks) {
      this.startTrackSource(track, timeMs);
    }
  }

  /** Set volume for a specific track */
  setTrackVolume(id: string, volume: number): void {
    const track = this.tracks.get(id);
    if (track) {
      track.volume = volume;
      track.gain.gain.value = volume;
    }
  }

  /** Get current playback time in video ms */
  getCurrentTimeMs(): number {
    if (!this.ctx) return this.playOffsetMs;
    return this.playOffsetMs + (this.ctx.currentTime - this.playStartTime) * 1000;
  }

  /**
   * Interpolate volume at a given time from volume keyframes.
   * Returns the interpolated volume (0–1), or the track's static volume if no keyframes.
   */
  private interpolateVolumeKeyframes(track: LoadedTrack, videoTimeMs: number): number {
    const kfs = track.volumeKeyframes;
    if (!kfs || kfs.length === 0) return track.volume;

    if (videoTimeMs <= kfs[0].timeMs) return kfs[0].volume;
    if (videoTimeMs >= kfs[kfs.length - 1].timeMs) return kfs[kfs.length - 1].volume;

    let before = kfs[0];
    let after = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (videoTimeMs >= kfs[i].timeMs && videoTimeMs <= kfs[i + 1].timeMs) {
        before = kfs[i];
        after = kfs[i + 1];
        break;
      }
    }

    const range = after.timeMs - before.timeMs;
    const t = range > 0 ? (videoTimeMs - before.timeMs) / range : 0;
    return before.volume + (after.volume - before.volume) * t;
  }

  /**
   * Check if a trigger track is currently active (has audio playing) at the given time.
   * Used for ducking — determines if the target track should be lowered.
   */
  private isTrackActiveAt(trackId: string, videoTimeMs: number): boolean {
    const track = this.tracks.get(trackId);
    if (!track) return false;
    const trackStartInVideo = track.startMs;
    const trackEndInVideo = track.startMs + (track.trimEndMs != null
      ? track.trimEndMs - (track.trimStartMs ?? 0)
      : track.buffer.duration * 1000 - (track.trimStartMs ?? 0));
    return videoTimeMs >= trackStartInVideo && videoTimeMs <= trackEndInVideo;
  }

  /**
   * Apply volume keyframes and ducking for a given video time.
   * Should be called periodically during playback (e.g., via requestAnimationFrame).
   */
  applyVolumeAutomation(videoTimeMs: number): void {
    if (!this.ctx) return;
    for (const [id, track] of this.tracks) {
      let vol = this.interpolateVolumeKeyframes(track, videoTimeMs);

      // Apply ducking
      if (track.ducking) {
        const triggerActive = this.isTrackActiveAt(track.ducking.triggerTrackId, videoTimeMs);
        if (triggerActive) {
          vol *= track.ducking.duckAmount;
        }
      }

      // Set gain (smoothed to avoid clicks)
      track.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }

  /** Clean up all resources */
  dispose(): void {
    this.stopAllSources();
    for (const [, track] of this.tracks) track.gain.disconnect();
    this.tracks.clear();
    this.ctx?.close();
    this.ctx = null;
  }

  private startTrackSource(track: LoadedTrack, fromMs: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const trackStartInVideo = track.startMs;
    const offsetInTrack = Math.max(0, fromMs - trackStartInVideo) / 1000 + track.trimStartMs / 1000;
    const delayFromNow = Math.max(0, (trackStartInVideo - fromMs) / 1000);

    const bufferDuration = track.buffer.duration;
    const trimEnd = track.trimEndMs != null ? track.trimEndMs / 1000 : bufferDuration;
    const remainingDuration = trimEnd - offsetInTrack;

    if (remainingDuration <= 0 && delayFromNow <= 0) return;

    const source = ctx.createBufferSource();
    source.buffer = track.buffer;
    source.connect(track.gain);

    // Fade-in
    if (track.fadeInMs > 0 && delayFromNow <= 0) {
      track.gain.gain.setValueAtTime(0, ctx.currentTime);
      track.gain.gain.linearRampToValueAtTime(track.volume, ctx.currentTime + track.fadeInMs / 1000);
    } else if (track.fadeInMs > 0 && delayFromNow > 0) {
      // Track hasn't started yet — schedule fade-in from when it starts
      track.gain.gain.setValueAtTime(0, ctx.currentTime + delayFromNow);
      track.gain.gain.linearRampToValueAtTime(track.volume, ctx.currentTime + delayFromNow + track.fadeInMs / 1000);
    } else {
      track.gain.gain.setValueAtTime(track.volume, ctx.currentTime);
    }

    // Fade-out: schedule volume ramp to 0 before track ends
    if (track.fadeOutMs > 0 && remainingDuration > 0) {
      const fadeOutStart = (delayFromNow > 0 ? delayFromNow : 0) + remainingDuration - track.fadeOutMs / 1000;
      if (fadeOutStart > 0) {
        track.gain.gain.setValueAtTime(track.volume, ctx.currentTime + fadeOutStart);
        track.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOutStart + track.fadeOutMs / 1000);
      }
    }

    // Schedule volume keyframes as Web Audio gain automation events
    if (track.volumeKeyframes && track.volumeKeyframes.length > 0) {
      const baseTime = ctx.currentTime;
      for (const kf of track.volumeKeyframes) {
        const kfOffsetSec = (kf.timeMs - fromMs) / 1000;
        if (kfOffsetSec < 0) continue;
        track.gain.gain.linearRampToValueAtTime(kf.volume, baseTime + kfOffsetSec);
      }
    }

    if (delayFromNow > 0) {
      source.start(ctx.currentTime + delayFromNow, track.trimStartMs / 1000, remainingDuration > 0 ? trimEnd - track.trimStartMs / 1000 : undefined);
    } else {
      source.start(0, offsetInTrack, remainingDuration > 0 ? remainingDuration : undefined);
    }

    track.source = source;
  }

  private stopAllSources(): void {
    for (const [, track] of this.tracks) {
      if (track.source) {
        try { track.source.stop(); } catch { /* already stopped */ }
        track.source = null;
      }
    }
  }
}
