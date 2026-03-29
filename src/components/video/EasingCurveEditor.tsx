import { useRef, useEffect, useCallback, useState } from "react";

export type CubicBezier = [number, number, number, number]; // [x1, y1, x2, y2]

const PRESETS: { label: string; value: CubicBezier }[] = [
  { label: "Linear",     value: [0, 0, 1, 1] },
  { label: "Ease Out",   value: [0, 0, 0.2, 1] },
  { label: "Ease In",    value: [0.8, 0, 1, 1] },
  { label: "Ease In-Out",value: [0.4, 0, 0.6, 1] },
  { label: "Spring",     value: [0.34, 1.56, 0.64, 1] },
  { label: "Bounce",     value: [0.68, -0.55, 0.265, 1.55] },
];

const PAD = 20;
const SIZE = 120;
const INNER = SIZE - PAD * 2;

function bezierPoint(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function toCanvas(nx: number, ny: number): [number, number] {
  return [PAD + nx * INNER, PAD + (1 - ny) * INNER];
}

function fromCanvas(cx: number, cy: number): [number, number] {
  return [(cx - PAD) / INNER, 1 - (cy - PAD) / INNER];
}

interface Props {
  value: CubicBezier;
  onChange: (v: CubicBezier) => void;
}

export function EasingCurveEditor({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<0 | 1 | null>(null); // 0 = first CP, 1 = second CP

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const [x1, y1, x2, y2] = value;
    const [cp1x, cp1y] = toCanvas(x1, y1);
    const [cp2x, cp2y] = toCanvas(x2, y2);
    const [startX, startY] = toCanvas(0, 0);
    const [endX, endY] = toCanvas(1, 1);

    // Grid
    ctx.strokeStyle = "#2a2a2e";
    ctx.lineWidth = 0.5 / dpr;
    for (let i = 0; i <= 4; i++) {
      const x = PAD + (i / 4) * INNER;
      const y = PAD + (i / 4) * INNER;
      ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, PAD + INNER); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(PAD + INNER, y); ctx.stroke();
    }

    // Diagonal guide
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5 / dpr;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Control point lines
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1 / dpr;
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(cp1x, cp1y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX, endY); ctx.lineTo(cp2x, cp2y); ctx.stroke();

    // Curve
    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 2 / dpr;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    const steps = 60;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const cx = bezierPoint(t, 0, x1, x2, 1);
      const cy = bezierPoint(t, 0, y1, y2, 1);
      const [px, py] = toCanvas(cx, cy);
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Anchor points
    ctx.fillStyle = "#444";
    ctx.beginPath(); ctx.arc(startX, startY, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(endX, endY, 3, 0, Math.PI * 2); ctx.fill();

    // Control point handles
    ctx.fillStyle = "#4ecdc4";
    ctx.beginPath(); ctx.arc(cp1x, cp1y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath(); ctx.arc(cp2x, cp2y, 5, 0, Math.PI * 2); ctx.fill();
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    draw();
  }, []);

  useEffect(() => { draw(); }, [draw]);

  const hitCP = (ex: number, ey: number): 0 | 1 | null => {
    const [cp1x, cp1y] = toCanvas(value[0], value[1]);
    const [cp2x, cp2y] = toCanvas(value[2], value[3]);
    if (Math.hypot(ex - cp1x, ey - cp1y) < 8) return 0;
    if (Math.hypot(ex - cp2x, ey - cp2y) < 8) return 1;
    return null;
  };

  const getRelXY = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const [ex, ey] = getRelXY(e);
    const hit = hitCP(ex, ey);
    if (hit !== null) { setDrag(hit); e.preventDefault(); }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drag === null) return;
    const [ex, ey] = getRelXY(e);
    let [nx, ny] = fromCanvas(ex, ey);
    nx = Math.max(0, Math.min(1, nx));
    if (drag === 0) onChange([nx, ny, value[2], value[3]]);
    else onChange([value[0], value[1], nx, ny]);
  };

  const onMouseUp = () => setDrag(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <canvas
        ref={canvasRef}
        style={{ cursor: drag !== null ? "grabbing" : "crosshair", borderRadius: 6, background: "#1a1a1e", border: "1px solid #333" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange(p.value)}
            style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 4, cursor: "pointer",
              background: "#26262a", border: "1px solid #383840", color: "#aaa",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
