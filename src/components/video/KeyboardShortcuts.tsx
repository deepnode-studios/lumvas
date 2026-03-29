import { useEffect } from "react";

const SHORTCUTS: { group: string; items: { keys: string[]; description: string }[] }[] = [
  {
    group: "Playback",
    items: [
      { keys: ["Space"], description: "Play / Pause" },
      { keys: ["K"], description: "Play / Pause (JKL mode)" },
      { keys: ["J"], description: "Skip back 5 seconds" },
      { keys: ["L"], description: "Skip forward 5 seconds" },
      { keys: ["Home"], description: "Go to start" },
      { keys: ["End"], description: "Go to end" },
    ],
  },
  {
    group: "Navigation",
    items: [
      { keys: ["←"], description: "Step back 100ms" },
      { keys: ["→"], description: "Step forward 100ms" },
      { keys: ["Shift", "←"], description: "Step back 1 second" },
      { keys: ["Shift", "→"], description: "Step forward 1 second" },
    ],
  },
  {
    group: "Editing",
    items: [
      { keys: ["Ctrl", "C"], description: "Copy selected element / scene" },
      { keys: ["Ctrl", "V"], description: "Paste clipboard" },
      { keys: ["Ctrl", "D"], description: "Duplicate selected element / scene" },
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
    ],
  },
  {
    group: "View",
    items: [
      { keys: ["?"], description: "Open / close this shortcuts panel" },
    ],
  },
];

interface Props {
  onClose: () => void;
}

export function KeyboardShortcuts({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1d1d1f", border: "1px solid #3a3a3e", borderRadius: 12,
          padding: "24px 28px", minWidth: 420, maxWidth: 560, maxHeight: "80vh",
          overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.5px" }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#666", fontSize: 18, cursor: "pointer", padding: "0 4px" }}
          >
            ×
          </button>
        </div>

        {SHORTCUTS.map((group) => (
          <div key={group.group} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", color: "#666", textTransform: "uppercase", marginBottom: 8 }}>
              {group.group}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.description} style={{ borderBottom: "1px solid #2a2a2e" }}>
                    <td style={{ padding: "5px 0", verticalAlign: "middle", width: "40%" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {item.keys.map((k) => (
                          <kbd
                            key={k}
                            style={{
                              display: "inline-block", padding: "2px 6px", fontSize: 11,
                              background: "#2a2a2e", border: "1px solid #444", borderRadius: 4,
                              color: "#e0e0e0", fontFamily: "monospace",
                            }}
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "5px 8px", fontSize: 12, color: "#aaa", verticalAlign: "middle" }}>
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
