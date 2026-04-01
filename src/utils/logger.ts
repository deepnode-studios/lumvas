/**
 * Structured logger that writes to Tauri log files AND browser console.
 *
 * Log files are written to the platform log directory:
 *   Linux:   ~/.local/share/com.lumvas.app/logs/
 *   macOS:   ~/Library/Logs/com.lumvas.app/
 *   Windows: %APPDATA%/com.lumvas.app/logs/
 *
 * Usage:
 *   import { log } from "@/utils/logger";
 *   log.info("render", "Frame rendered", { frameNum: 42, ms: 3.2 });
 *   log.error("video", "Failed to load", { src, error: e.message });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

// Tauri log plugin bindings (lazy-loaded)
let tauriLog: {
  debug: (msg: string) => Promise<void>;
  info: (msg: string) => Promise<void>;
  warn: (msg: string) => Promise<void>;
  error: (msg: string) => Promise<void>;
} | null = null;

let tauriLogLoading = false;

async function ensureTauriLog() {
  if (tauriLog || tauriLogLoading) return;
  tauriLogLoading = true;
  try {
    const mod = await import("@tauri-apps/plugin-log");
    tauriLog = {
      debug: mod.debug,
      info: mod.info,
      warn: mod.warn,
      error: mod.error,
    };
  } catch {
    // Not in Tauri context — console-only mode
    tauriLog = null;
  }
  tauriLogLoading = false;
}

// Init immediately
ensureTauriLog();

function formatEntry(entry: LogEntry): string {
  const dataStr = entry.data ? " " + JSON.stringify(entry.data) : "";
  return `[${entry.scope}] ${entry.message}${dataStr}`;
}

function emit(level: LogLevel, scope: string, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    scope,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  const formatted = formatEntry(entry);

  // Console output (always)
  switch (level) {
    case "debug": console.debug(`%c[${scope}]`, "color: #888", message, data ?? ""); break;
    case "info":  console.info(`%c[${scope}]`, "color: #4ade80", message, data ?? ""); break;
    case "warn":  console.warn(`[${scope}]`, message, data ?? ""); break;
    case "error": console.error(`[${scope}]`, message, data ?? ""); break;
  }

  // Tauri log file output (async, fire-and-forget)
  if (tauriLog) {
    switch (level) {
      case "debug": tauriLog.debug(formatted); break;
      case "info":  tauriLog.info(formatted); break;
      case "warn":  tauriLog.warn(formatted); break;
      case "error": tauriLog.error(formatted); break;
    }
  }

  // Also push to in-memory ring buffer for the debug panel
  pushToRing(entry);
}

/* ─── In-memory ring buffer (last 500 entries) ─── */

const RING_SIZE = 500;
const ring: LogEntry[] = [];
const ringListeners = new Set<() => void>();

function pushToRing(entry: LogEntry) {
  ring.push(entry);
  if (ring.length > RING_SIZE) ring.shift();
  for (const l of ringListeners) l();
}

/* ─── Public API ─── */

export const log = {
  debug: (scope: string, message: string, data?: Record<string, unknown>) => emit("debug", scope, message, data),
  info:  (scope: string, message: string, data?: Record<string, unknown>) => emit("info", scope, message, data),
  warn:  (scope: string, message: string, data?: Record<string, unknown>) => emit("warn", scope, message, data),
  error: (scope: string, message: string, data?: Record<string, unknown>) => emit("error", scope, message, data),

  /** Get all entries in the ring buffer */
  getEntries: (): readonly LogEntry[] => ring,

  /** Subscribe to new entries. Returns unsubscribe function. */
  subscribe: (listener: () => void): (() => void) => {
    ringListeners.add(listener);
    return () => ringListeners.delete(listener);
  },

  /** Clear the ring buffer */
  clear: () => { ring.length = 0; for (const l of ringListeners) l(); },
};

// Expose globally for console debugging
(window as any).__lumvasLog = log;

// Startup marker
log.info("app", "Lumvas logger initialized — logs go to console + Tauri log file");
