/**
 * Web Audio API engine for synchronized multi-track playback.
 * Manages loading, playing, pausing, and volume control for multiple audio tracks.
 */

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
