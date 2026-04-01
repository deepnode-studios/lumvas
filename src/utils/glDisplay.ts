/**
 * Minimal WebGL display layer — uploads an ImageBitmap (or canvas) as a
 * texture and draws a fullscreen quad. Falls back to Canvas2D drawImage
 * if WebGL is unavailable.
 */

/* ─── Shaders ─── */

const VERT_SRC = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_uv = a_uv;
}`;

const FRAG_SRC = `
precision mediump float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main() {
  gl_FragColor = texture2D(u_tex, v_uv);
}`;

/* ─── Types ─── */

type FrameSource = ImageBitmap | HTMLCanvasElement | OffscreenCanvas;

export interface GLDisplay {
  /** Initialise on a visible <canvas>. Call once. */
  init(canvas: HTMLCanvasElement): void;
  /** Display a pre-rendered frame. <1 ms. */
  displayFrame(source: FrameSource): void;
  /** Update viewport after canvas resize. */
  resize(width: number, height: number): void;
  /** Release GPU resources. */
  dispose(): void;
  /** True if using WebGL, false if Canvas2D fallback. */
  readonly isWebGL: boolean;
}

/* ─── WebGL implementation ─── */

function createWebGLDisplay(): GLDisplay {
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let texture: WebGLTexture | null = null;
  let vao: WebGLBuffer | null = null;
  let canvas: HTMLCanvasElement | null = null;

  function compileShader(type: number, src: string): WebGLShader {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return s;
  }

  return {
    get isWebGL() { return gl !== null; },

    init(c: HTMLCanvasElement) {
      canvas = c;
      gl = c.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: false });
      if (!gl) return; // caller should check isWebGL and fall back

      // Program
      const vs = compileShader(gl.VERTEX_SHADER, VERT_SRC);
      const fs = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
      program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.useProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      // Fullscreen quad: position (clip space) + UV
      // Two triangles covering [-1,1] with UVs [0,1] (Y flipped for texture)
      const verts = new Float32Array([
        // pos        uv
        -1, -1,    0, 1,
         1, -1,    1, 1,
        -1,  1,    0, 0,
         1,  1,    1, 0,
      ]);
      vao = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vao);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(program, "a_pos");
      const aUv = gl.getAttribLocation(program, "a_uv");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

      // Texture
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.viewport(0, 0, c.width, c.height);
    },

    displayFrame(source: FrameSource) {
      if (!gl || !texture || !program) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as any);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } catch {
        // SecurityError from tainted canvas — fall back to Canvas2D blit
        if (canvas) {
          const ctx2d = canvas.getContext("2d");
          if (ctx2d) ctx2d.drawImage(source as any, 0, 0, canvas.width, canvas.height);
        }
      }
    },

    resize(w: number, h: number) {
      if (!gl || !canvas) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    },

    dispose() {
      if (!gl) return;
      if (texture) gl.deleteTexture(texture);
      if (vao) gl.deleteBuffer(vao);
      if (program) gl.deleteProgram(program);
      gl = null;
      program = null;
      texture = null;
      vao = null;
      canvas = null;
    },
  };
}

/* ─── Canvas2D fallback ─── */

function createCanvas2DFallback(): GLDisplay {
  let ctx: CanvasRenderingContext2D | null = null;
  let canvas: HTMLCanvasElement | null = null;

  return {
    get isWebGL() { return false; },

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = c.getContext("2d")!;
    },

    displayFrame(source: FrameSource) {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(source as any, 0, 0, canvas.width, canvas.height);
    },

    resize(w: number, h: number) {
      if (!canvas) return;
      canvas.width = w;
      canvas.height = h;
    },

    dispose() {
      ctx = null;
      canvas = null;
    },
  };
}

/* ─── Factory ─── */

/** Create a display layer. Tries WebGL first, falls back to Canvas2D. */
export function createDisplay(): GLDisplay {
  const display = createWebGLDisplay();
  return display;
  // init() will set gl=null if WebGL fails; caller checks isWebGL
}

/** Create with automatic fallback after init. */
export function createDisplayWithFallback(canvas: HTMLCanvasElement): GLDisplay {
  const glDisp = createWebGLDisplay();
  glDisp.init(canvas);
  if (glDisp.isWebGL) return glDisp;
  // WebGL unavailable, use Canvas2D
  const fallback = createCanvas2DFallback();
  fallback.init(canvas);
  return fallback;
}
