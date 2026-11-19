/**
 * El mundo de la v3: una **película de placas fotográficas** sobre la toma de scroll (camera.ts).
 *
 * Un solo quad a pantalla completa en WebGL2 (sin three.js) dibuja la placa actual y la siguiente, cada una con su
 * movimiento de cámara (zoom hacia su punto focal, paneo y una paralaje leve: lo cercano, según un degradado de
 * profundidad fingida, se mueve más) y el cruce propio de cada paso:
 *   espacio → satélite   destello: la estrella de OCEAN (SDF horneado del símbolo) se enciende y funde las placas
 *   satélite → mar       atmósfera: un barrido luminoso cruza la pantalla con un desenfoque radial breve
 *   mar → agua           superficie: la línea del agua sube por la pantalla; debajo, ondas y cáusticas
 *   agua → máquina       enciende: la luz baja casi a negro y el sumergible enciende (sube la exposición en su haz)
 *   máquina → emerge     emerge: la línea del agua sube y lo que queda debajo escurre
 *   emerge → cumbre      nubes: las nubes cubren, aclaran a nieve y se abren sobre la cumbre
 * Encima, un solo buffer de partículas que cambia de papel (estrellas → nieve marina → nieve), y en la misma pasada el
 * grano de película (por píxel, semilla por cuadro, más visible en medios tonos) y el dither.
 *
 * El bucle duerme: sin scroll ni puntero baja a 30 fps y a los 4 s deja de pedir cuadros. Nada se aloca por cuadro.
 * Las placas llegan por partes: miniaturas de 32 px al arrancar (la cámara nunca espera), luego la actual y la
 * siguiente, y el resto en reposo. Versión quieta (sin WebGL2, movimiento reducido, ahorro de datos o WebGL por
 * software): `html.world-still` y la página muestra sus `<picture>`.
 */
import DATA from './plates.json'
import THUMBS from './plates.thumbs.json'
import symbolSvg from '../../marca/v3/simbolo-simetrico.svg?raw'
import { ScrollTrack, Spring, seekParam } from './camera'

/* ------------------------------------------------------------------ */
/*  Datos                                                              */
/* ------------------------------------------------------------------ */
interface PlateSpec {
  id: string
  src: string
  alt: string
  focal: [number, number]
  vx: number
  star?: [number, number]
  move: { zoom: [number, number]; pan: [number, number] }
  depth: [number, number]
  into?: string
}
interface Thumb {
  d: string
  v: string
  w: number
  h: number
  vleft: number
  vwidth: number
}
export const PLATES = DATA.plates as PlateSpec[]
const TH = THUMBS as Record<string, Thumb>
/** los tramos de la página, en orden (`data-tramo`) */
export const TRAMOS = PLATES.map((p) => p.id)
const N = PLATES.length
const SEGS = N - 1
const CROSS: Record<string, number> = { destello: 0, atmosfera: 1, superficie: 2, enciende: 3, emerge: 4, nubes: 5 }
/** medio ancho de la ventana de cada cruce (en placas): el cruce ocupa p ∈ [i + 0,5 − W, i + 0,5 + W] */
const W = 0.2

/* ------------------------------------------------------------------ */
/*  Shaders                                                            */
/* ------------------------------------------------------------------ */
const QUAD_VS = /* glsl */ `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`

/** El fragmento, uno por cruce (TYPE −1 = una sola placa): sin ramas en tiempo de ejecución (SwiftShader y algunas
 *  GPU de teléfono pagan todas las ramas). */
const quadFS = (type: number) => /* glsl */ `#version 300 es
#define TYPE ${type}
precision highp float;
uniform sampler2D uA; uniform sampler2D uB; uniform sampler2D uStar;
uniform vec4 uRectA; uniform vec4 uCamA; uniform vec4 uPanA;
uniform vec4 uRectB; uniform vec4 uCamB; uniform vec4 uPanB;
uniform float uK; uniform float uTime; uniform vec2 uRes;
uniform vec3 uStarA; uniform float uAspA; uniform float uSeed; uniform float uGrain;
out vec4 frag;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
float bump(float x, float a, float b){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return sin(t * 3.14159265); }

/** pantalla (0–1, y hacia abajo) → imagen: recorte que cubre, zoom hacia el foco, paneo con paralaje */
vec2 plateUV(vec2 s, vec4 rect, vec4 cam, vec4 pan){
  vec2 uv = rect.xy + s * rect.zw;
  uv = cam.yz + (uv - cam.yz) / cam.x;
  float d = clamp(0.5 + dot(uv - 0.5, pan.zw), 0.0, 1.0);
  uv += pan.xy * (1.0 + cam.w * (d - 0.5));
  return clamp(uv, vec2(0.0005), vec2(0.9995));
}
vec3 A(vec2 s){ return texture(uA, plateUV(s, uRectA, uCamA, uPanA)).rgb; }
vec3 B(vec2 s){ return texture(uB, plateUV(s, uRectB, uCamB, uPanB)).rgb; }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

/** la línea del agua (y hacia abajo), con su ola */
float waterLine(vec2 s, float k){
  // la ola se mide en alturas de pantalla (en un teléfono angosto no se vuelve un serrucho)
  float x = s.x * uRes.x / uRes.y;
  float y = mix(1.12, -0.12, k);
  return y + 0.012 * sin(x * 9.5 + uTime * 2.1) + 0.005 * sin(x * 24.0 - uTime * 3.7);
}
/** cáusticas de agua (la red de luz que dibuja la superficie en el fondo), iterativas y sin rejilla */
float caustic(vec2 uv, float t){
  vec2 p = mod(uv * 6.2831853, 6.2831853) - 250.0;
  vec2 i = p;
  float c = 1.0;
  for (int n = 0; n < 4; n++){
    float tt = t * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

void main(){
  vec2 s = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  float k = uK;
  vec3 col;
#if TYPE < 0
  col = A(s);
#elif TYPE == 0
  {
    // destello: la estrella de OCEAN se enciende donde está la estrella de la placa y funde las dos
    col = mix(A(s), B(s), smoothstep(0.38, 0.62, k));
    vec2 uv = plateUV(s, uRectA, uCamA, uPanA);
    vec2 d = (uv - uStarA.xy) * vec2(uAspA, 1.0);
    float size = uStarA.z * (0.5 + 1.6 * smoothstep(0.0, 0.5, k));
    vec2 t = d / size;
    float sd = texture(uStar, clamp(t * 0.5 + 0.5, 0.0, 1.0)).r - 0.5;
    sd += length(max(abs(t) - 1.0, 0.0));
    float b = bump(k, 0.0, 1.0);
    float shape = 1.0 - smoothstep(-0.01, 0.02, sd);
    float glow = exp(-max(sd, 0.0) * 14.0);
    float halo = exp(-dot(d, d) / (size * size * 2.5));
    float flare = exp(-abs(d.y) / (size * 0.04)) * exp(-abs(d.x) / (size * 3.5));
    col += vec3(1.0) * (shape * 2.2 + glow * 0.6 + halo * 0.45 + flare * 0.5) * b;
    col += vec3(0.85, 0.9, 1.0) * 0.12 * b * b;
  }
#elif TYPE == 1
  {
    // atmósfera: un barrido luminoso en diagonal; detrás de él, la placa nueva; desenfoque radial breve
    vec2 dir = normalize(vec2(1.0, 0.55));
    float x = dot(s - 0.5, dir) / 1.2 + 0.5;
    float c = mix(-0.25, 1.25, k);
    float blur = bump(k, 0.0, 1.0) * 0.07;
    vec3 a = vec3(0.0), bb = vec3(0.0);
    for (int i = 0; i < 4; i++){
      vec2 si = 0.5 + (s - 0.5) * (1.0 - blur * float(i) / 3.0);
      a += A(si); bb += B(si);
    }
    a *= 0.25; bb *= 0.25;
    col = mix(bb, a, smoothstep(c - 0.12, c + 0.12, x));
    float band = exp(-pow((x - c) / 0.09, 2.0));
    col += vec3(0.9, 0.95, 1.0) * band * 1.4 + vec3(0.6, 0.7, 0.8) * bump(k, 0.15, 0.85) * 0.12;
  }
#elif TYPE == 2 || TYPE == 4
  {
    // superficie (entrar) y emerge (salir): la línea del agua sube; debajo, la placa nueva
    float wl = waterLine(s, k);
    float dy = s.y - wl;
    vec3 col0;
    if (dy > 0.0) {
      vec2 si = s;
#if TYPE == 2
      {
        // bajo el agua: ondas que se calman, cáusticas
        float calm = 1.0 - 0.7 * k;
        si += vec2(sin(s.y * 38.0 + uTime * 2.3), cos(s.x * 31.0 + uTime * 1.7)) * 0.006 * calm;
        col0 = B(si);
        col0 += vec3(0.7, 0.8, 0.9) * caustic(s * vec2(uRes.x / uRes.y, 1.0) * 1.6, uTime * 0.6) * 0.32 * calm * exp(-dy * 5.0);
        col0 *= 1.0 - 0.25 * exp(-dy * 12.0);
      }
#else
      {
        // fuera del agua: lo que acaba de salir escurre (gotas que bajan bajo la línea)
        float h = vnoise(vec2(s.x * 90.0, 3.7));
        float drop = smoothstep(0.75, 0.95, h);
        float run = exp(-dy / (0.04 + 0.16 * h)) * drop * (1.0 - smoothstep(0.75, 1.0, k));
        si.y -= run * 0.006;
        col0 = B(si) * (1.0 + 0.18 * run);
      }
#endif
    } else {
#if TYPE == 4
      col0 = A(s + vec2(sin(s.y * 30.0 + uTime * 1.5), cos(s.x * 24.0 + uTime)) * 0.004) * 0.85;
#else
      col0 = A(s);
#endif
    }
    float men = exp(-pow(dy / 0.0028, 2.0));
    col = col0 + vec3(0.85, 0.92, 1.0) * men * 0.45;
  }
#elif TYPE == 3
  {
    // enciende: la luz del haz baja casi a negro, y el sumergible enciende sus faros
    float eA = mix(1.0, 0.06, smoothstep(0.0, 0.48, k));
    vec3 b = B(s);
    float m = smoothstep(0.32, 0.8, luma(b));
    float on = smoothstep(0.46, 0.72, k);
    float flare = bump(k, 0.55, 1.0);
    vec3 bOn = b * on * (1.0 + m * 2.2 * flare);
    col = mix(A(s) * eA, bOn, smoothstep(0.44, 0.58, k));
  }
#else
  {
    // nubes: cubren, aclaran a nieve y se abren sobre la cumbre
    vec2 p = s * vec2(uRes.x / uRes.y, 1.0) * 2.2 + vec2(uTime * 0.015, 0.0);
    float n = fbm(p);
    float cover = 1.0 - abs(k - 0.5) * 2.0;
    // las nubes llegan por arriba primero
    float m = smoothstep(0.05, 0.5, cover * 0.78 + (n - 0.5) * 1.4 - 0.22 + (0.5 - s.y) * 0.25 * cover) * 0.94;
    vec3 base = mix(A(s) * (1.0 + 0.3 * smoothstep(0.0, 0.5, k)), B(s) * (1.0 + 0.25 * (1.0 - smoothstep(0.5, 1.0, k))), smoothstep(0.47, 0.53, k));
    vec3 snow = vec3(0.74, 0.79, 0.84) * (0.9 + 0.2 * n);
    col = mix(base, snow, m);
  }
#endif
  // viñeta suave, de lineal a pantalla, grano y dither
  vec2 c = s - 0.5;
  col *= 1.0 - 0.22 * smoothstep(0.35, 0.95, length(c * vec2(1.0, 1.2)) * 1.2);
  vec3 o = pow(max(col, 0.0), vec3(1.0 / 2.2));
  o = o / (1.0 + max(0.0, luma(o) - 1.0) * 0.6);
  float l = luma(o);
  vec2 fc = gl_FragCoord.xy;
  float g = hash12(fc + uSeed * 317.0) + hash12(fc * 1.37 + uSeed * 191.0 + 13.7) - 1.0;
  o += g * uGrain * (0.12 + 3.2 * l * (1.0 - l));
  o += (hash12(fc + uSeed * 71.0 + 5.1) + hash12(fc + uSeed * 53.0 + 91.7) - 1.0) / 255.0;
  frag = vec4(o, 1.0);
}`

/** Partículas en pantalla: estrellas (quietas, con paralaje), nieve marina (sube cuando la cámara baja), nieve. */
const PTS_VS = /* glsl */ `#version 300 es
in vec4 aP;
uniform float uKind; uniform float uTime; uniform float uI; uniform vec2 uDrift; uniform float uDpr; uniform vec2 uRes;
out float vA;
void main(){
  vec2 p = aP.xy; float z = aP.z; float r = aP.w;
  float size; float a;
  if (uKind < 0.5) {
    p += uDrift * (0.15 + 0.85 * z);
    size = (1.0 + pow(r, 10.0) * 1.8) * uDpr;
    a = (0.15 + pow(r, 5.0) * 0.9) * (0.85 + 0.15 * sin(uTime * (1.0 + r * 3.0) + r * 40.0));
  } else if (uKind < 1.5) {
    p += uDrift * (0.3 + 0.7 * z);
    p.y += uTime * 0.006 * (0.3 + z);
    p.x += sin(uTime * 0.25 + r * 6.2831) * 0.006;
    size = (1.0 + z * z * 3.2) * uDpr;
    a = 0.12 + z * 0.4;
  } else {
    p += uDrift * (0.3 + 0.7 * z);
    p.y += uTime * (0.035 + 0.07 * z);
    p.x += uTime * (0.012 + 0.02 * z) + sin(uTime * 0.6 + r * 6.2831) * 0.01;
    size = (1.0 + z * z * 3.6) * uDpr;
    a = 0.25 + z * 0.6;
  }
  p = fract(p);
  gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
  gl_PointSize = size;
  vA = a * uI;
}`
const PTS_FS = /* glsl */ `#version 300 es
precision mediump float;
uniform vec3 uColor;
in float vA;
out vec4 frag;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vA;
  if (a < 0.003) discard;
  frag = vec4(uColor * a, a);
}`

/* ------------------------------------------------------------------ */
/*  Ayudas                                                             */
/* ------------------------------------------------------------------ */
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const window4 = (x: number, a: number, b: number, c: number, d: number) => smoothstep(a, b, x) * (1 - smoothstep(c, d, x))

function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    gl.attachShader(p, sh)
  }
  // el quad lee aPos en la posición 0 en todos sus programas (comparten el VAO)
  gl.bindAttribLocation(p, 0, 'aPos')
  gl.linkProgram(p)
  return p
}

function checkProgram(gl: WebGL2RenderingContext, p: WebGLProgram, name: string): void {
  if (gl.getProgramParameter(p, gl.LINK_STATUS)) return
  const shaders = gl.getAttachedShaders(p) ?? []
  const logs = shaders.map((s) => gl.getShaderInfoLog(s)).filter(Boolean)
  throw new Error(`[world] ${name}: ${gl.getProgramInfoLog(p)} ${logs.join(' ')}`)
}

/** La estrella de OCEAN (el centro del símbolo simétrico): SDF horneado del SVG, como en la maqueta en gris. */
const STAR = { cx: 343.7, cy: 294.4, left: [116.75, 285.0], top: [351.6, 158.4], right: [570.65, 303.8], bottom: [335.8, 430.4] } as const
function bakeStarSDF(n = 128): Uint8Array {
  const span = STAR.right[0] - STAR.left[0]
  const cv = document.createElement('canvas')
  cv.width = cv.height = n
  const cx = cv.getContext('2d', { willReadFrequently: true })!
  const k = n / span
  const ox = STAR.cx - span / 2
  const oy = STAR.cy - span / 2
  cx.fillStyle = '#000'
  cx.fillRect(0, 0, n, n)
  cx.setTransform(k, 0, 0, k, -ox * k, -oy * k)
  cx.fillStyle = '#fff'
  cx.fill(new Path2D(symbolSvg.match(/\sd="([^"]+)"/)?.[1] ?? ''))
  const ink = cx.getImageData(0, 0, n, n).data
  const P = (p: readonly number[]) => [(p[0] - ox) * k, (p[1] - oy) * k]
  const quad = [P(STAR.left), P(STAR.top), P(STAR.right), P(STAR.bottom)]
  const inQuad = (x: number, y: number) => {
    for (let i = 0; i < 4; i++) {
      const a = quad[i], b = quad[(i + 1) % 4]
      if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false
    }
    return true
  }
  const inside = new Uint8Array(n * n)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) inside[y * n + x] = ink[(y * n + x) * 4] < 128 && inQuad(x + 0.5, y + 0.5) ? 1 : 0
  const dist = (target: number) => {
    const D = new Float32Array(n * n).map((_, i) => (inside[i] === target ? 0 : 1e6))
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= n || y >= n ? 1e6 : D[y * n + x])
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) D[y * n + x] = Math.min(D[y * n + x], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4)
    for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) D[y * n + x] = Math.min(D[y * n + x], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4)
    return D.map((v) => v / 3)
  }
  const toIn = dist(1)
  const toOut = dist(0)
  const out = new Uint8Array(n * n)
  // la textura se lee con y hacia abajo, igual que la pantalla del quad; 1 unidad de SDF = media textura
  for (let i = 0; i < n * n; i++) {
    const sd = inside[i] ? -(toOut[i] - 0.5) : toIn[i] - 0.5
    out[i] = Math.round(255 * clamp01(0.5 + sd / (n / 2)))
  }
  return out
}

/* ------------------------------------------------------------------ */
/*  Cuándo no hay mundo                                                */
/* ------------------------------------------------------------------ */
/** La razón para quedarse en la versión quieta, o null. `?q=` (QA) la ignora salvo que falte WebGL2. */
export function stillReason(): string | null {
  const q = new URLSearchParams(location.search).get('q')
  const probe = document.createElement('canvas').getContext('webgl2')
  if (!probe) return 'sin WebGL2'
  let gpu = ''
  const ext = probe.getExtension('WEBGL_debug_renderer_info')
  if (ext) gpu = String(probe.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '')
  probe.getExtension('WEBGL_lose_context')?.loseContext()
  if (q) return null
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'movimiento reducido'
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return 'ahorro de datos'
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) return 'WebGL por software'
  return null
}

/* ------------------------------------------------------------------ */
/*  El mundo                                                           */
/* ------------------------------------------------------------------ */
export interface MountOptions {
  /** el lienzo fijo (100vw × 100lvh, `aria-hidden`) */
  canvas: HTMLCanvasElement
  /** las secciones `[data-tramo]` de la página, en el orden de PLATES (array o NodeList); su tope ancla la toma */
  sections: ArrayLike<HTMLElement>
  /** Lenis en escritorio, con `autoRaf: false` (el bucle del mundo lo mueve y duerme con él) */
  lenis?: { raf(t: number): void; isScrolling: unknown } | null
  /** carpeta de las placas (por defecto `/v3/world/`) */
  base?: string
  /** QA: posar la toma (`?qa=seek=`) o guardar cada cuadro (`?qa=trace`); por defecto se leen de la URL */
  seek?: number | null
  trace?: boolean
}

export interface WorldHandle {
  readonly live: boolean
  /** Fija la toma en `s` (0–1) sin resorte, o la devuelve al scroll con null. Se resuelve con el cuadro pintado. */
  setProgress(s: number | null): Promise<void>
  /** algo pasó (lo llaman solos scroll, rueda, puntero, toques y tamaño) */
  wake(): void
  dispose(): void
}

interface TraceSample {
  t: number
  s: number
  target: number
  y: number
}

type Tex = { tex: WebGLTexture; full: boolean; loading: boolean; aspect: number }

export class World implements WorldHandle {
  readonly live = true
  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private opts: MountOptions
  private track: ScrollTrack
  private spring = new Spring()
  /** los programas del quad: [0] una placa, [1 + t] el cruce t */
  private quads: WebGLProgram[] = []
  private Us: Record<string, WebGLUniformLocation | null>[] = []
  private pts: WebGLProgram
  private PU: Record<string, WebGLUniformLocation | null> = {}
  private vaoQuad: WebGLVertexArrayObject
  private vaoPts: WebGLVertexArrayObject
  private nPts: number
  private starTex: WebGLTexture
  private texs: Tex[] = []
  private portrait = false
  private variant = ''
  private avif = true
  private base: string
  private dpr = 1
  private width = 1
  private height = 1

  // bucle
  private raf = 0
  private sleeping = true
  private last = 0
  private lastActive = 0
  private odd = false
  private acc = 0
  private time = 12
  private seed = 0.37
  private frame = 0
  private seekValue: number | null
  private needsResize = true
  private ro: ResizeObserver
  private pointer = [0, 0]
  private pointerTarget = [0, 0]
  private disposed = false
  private kindNow = -1
  /** hasta que llegan las miniaturas nada despierta al bucle (el ResizeObserver avisa antes) */
  private ready = false
  private listeners: [EventTarget, string, EventListener][] = []

  // QA
  rafs = 0
  renders = 0
  readonly samples: TraceSample[] = []
  private waiters: (() => void)[] = []
  // uniformes reutilizados (nada se aloca por cuadro)
  private rect = new Float32Array(4)
  private cam = new Float32Array(4)
  private pan = new Float32Array(4)

  constructor(opts: MountOptions, gl: WebGL2RenderingContext) {
    this.opts = opts
    this.canvas = opts.canvas
    this.gl = gl
    this.base = opts.base ?? '/v3/world/'
    this.seekValue = opts.seek === undefined ? seekParam() : opts.seek
    // la toma: el tope de cada tramo (salvo el primero) llega cuando su placa ya entró (p = k − 0,3)
    const sections = Array.from(opts.sections)
    sections.forEach((el, k) => {
      if (el.dataset.shot === undefined) el.dataset.shot = String(k === 0 ? 0 : (k - 0.3) / SEGS)
    })
    this.track = new ScrollTrack(sections)
    if (this.seekValue !== null) this.spring.reset(this.seekValue)

    for (let t = -1; t < 6; t++) this.quads.push(compile(gl, QUAD_VS, quadFS(t)))
    this.pts = compile(gl, PTS_VS, PTS_FS)
    for (const q of this.quads) {
      const U: Record<string, WebGLUniformLocation | null> = {}
      for (const n of ['uA', 'uB', 'uStar', 'uRectA', 'uCamA', 'uPanA', 'uRectB', 'uCamB', 'uPanB', 'uK', 'uTime', 'uRes', 'uStarA', 'uAspA', 'uSeed', 'uGrain']) U[n] = gl.getUniformLocation(q, n)
      this.Us.push(U)
    }
    for (const n of ['uKind', 'uTime', 'uI', 'uDrift', 'uDpr', 'uRes', 'uColor']) this.PU[n] = gl.getUniformLocation(this.pts, n)

    // el quad (un triángulo que cubre la pantalla)
    this.vaoQuad = gl.createVertexArray()!
    gl.bindVertexArray(this.vaoQuad)
    const qb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, qb)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    // las partículas: un solo buffer, determinista
    const mobile = matchMedia('(pointer: coarse)').matches
    this.nPts = mobile ? 900 : 1600
    const r = rng(20261118)
    const pd = new Float32Array(this.nPts * 4)
    for (let i = 0; i < pd.length; i++) pd[i] = r()
    this.vaoPts = gl.createVertexArray()!
    gl.bindVertexArray(this.vaoPts)
    const pb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, pb)
    gl.bufferData(gl.ARRAY_BUFFER, pd, gl.STATIC_DRAW)
    const pa = gl.getAttribLocation(this.pts, 'aP')
    gl.enableVertexAttribArray(pa)
    gl.vertexAttribPointer(pa, 4, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    // la estrella
    this.starTex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.starTex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 128, 128, 0, gl.RED, gl.UNSIGNED_BYTE, bakeStarSDF(128))
    this.texParams(false)

    this.ro = new ResizeObserver(() => {
      this.needsResize = true
      this.wake()
    })
    this.ro.observe(this.canvas)
    this.canvas.addEventListener('webglcontextlost', this.onLost)
  }

  private onLost = (e: Event): void => {
    e.preventDefault()
    this.stop()
    document.documentElement.classList.add('world-still')
  }

  private texParams(mips: boolean): void {
    const gl = this.gl
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  /* ---------------- placas ---------------- */
  /** Las miniaturas de 32 px de todas las placas: la cámara nunca espera. */
  async init(): Promise<void> {
    this.on(window, 'pointermove', ((e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || this.seekValue !== null) return
      this.pointerTarget[0] = (e.clientX / innerWidth) * 2 - 1
      this.pointerTarget[1] = (e.clientY / innerHeight) * 2 - 1
      this.wake()
    }) as EventListener)
    for (const ev of ['scroll', 'wheel', 'touchstart', 'touchmove', 'keydown', 'resize']) this.on(window, ev, this.wake)
    this.on(document, 'visibilitychange', () => {
      if (!document.hidden) this.wake()
    })
    this.measure()
    await this.loadThumbs()
    this.ready = true
  }

  private on(t: EventTarget, ev: string, fn: EventListener): void {
    t.addEventListener(ev, fn, { passive: true })
    this.listeners.push([t, ev, fn])
  }

  private async loadThumbs(): Promise<void> {
    const gl = this.gl
    await Promise.all(
      PLATES.map(async (p, i) => {
        const th = TH[p.id]
        const bmp = await createImageBitmap(await (await fetch(this.portrait ? th.v : th.d)).blob())
        const t = this.texs[i] ?? { tex: gl.createTexture()!, full: false, loading: false, aspect: 1 }
        this.texs[i] = t
        gl.bindTexture(gl.TEXTURE_2D, t.tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp)
        this.texParams(false)
        t.full = false
        t.aspect = this.portrait ? 9 / 16 : th.w / th.h
        bmp.close()
      }),
    )
  }

  /** La placa buena: AVIF (WebP si el navegador no lo decodifica), decodificada fuera del hilo y subida con mipmaps. */
  private async loadFull(i: number): Promise<void> {
    const t = this.texs[i]
    if (!t || t.full || t.loading) return
    t.loading = true
    const variant = this.variant
    const name = `${PLATES[i].id}-${variant}`
    let bmp: ImageBitmap | null = null
    for (const ext of this.avif ? ['avif', 'webp'] : ['webp']) {
      try {
        const res = await fetch(`${this.base}${name}.${ext}`)
        if (!res.ok) throw new Error(String(res.status))
        bmp = await createImageBitmap(await res.blob())
        break
      } catch {
        if (ext === 'avif') this.avif = false
      }
    }
    t.loading = false
    if (!bmp || this.disposed || variant !== this.variant) {
      bmp?.close()
      return
    }
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, t.tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp)
    gl.generateMipmap(gl.TEXTURE_2D)
    this.texParams(true)
    t.full = true
    bmp.close()
    this.wake()
  }

  /** La actual y la siguiente primero; las demás cuando el hilo está libre. */
  private loadAround(p: number): void {
    const i = Math.min(N - 1, Math.max(0, Math.round(p)))
    const order = [i, i + 1, i - 1, i + 2].filter((j) => j >= 0 && j < N)
    for (const j of order) void this.loadFull(j)
  }
  private loadRest = (): void => {
    const next = this.texs.findIndex((t) => !t.full && !t.loading)
    if (next < 0 || this.disposed) return
    void this.loadFull(next).then(() => idle(this.loadRest))
  }

  /** ¿Cuál placa pide esta pantalla? Vertical en el teléfono; en escritorio, el ancho que cubre sus píxeles. */
  private measure(): boolean {
    const w = this.canvas.clientWidth || innerWidth
    const h = this.canvas.clientHeight || innerHeight
    const forced = Number(new URLSearchParams(location.search).get('dpr'))
    this.dpr = forced > 0 ? forced : Math.min(devicePixelRatio || 1, 2)
    // el quad es barato, pero en un teléfono de DPR 3 no hace falta más de ~2,2 MP
    const cap = Math.sqrt(2.6e6 / Math.max(1, w * h))
    if (!(forced > 0)) this.dpr = Math.max(1, Math.min(this.dpr, cap))
    this.width = w
    this.height = h
    const bw = Math.round(w * this.dpr)
    const bh = Math.round(h * this.dpr)
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw
      this.canvas.height = bh
    }
    const portrait = w / h < 0.8
    const variant = portrait ? 'v' : bw >= 2000 ? '2560' : bw >= 1400 ? '1920' : '1280'
    if (variant === this.variant) return false
    const flip = portrait !== this.portrait
    // un escritorio que se achica conserva la placa grande que ya tiene
    if (!flip && this.variant && variant !== 'v' && Number(variant) < Number(this.variant)) return false
    this.portrait = portrait
    this.variant = variant
    this.texs.forEach((t) => (t.full = false))
    // vertical ↔ horizontal: otra imagen (otro recorte): primero sus miniaturas
    if (flip && this.texs.length) void this.loadThumbs()
    return true
  }

  /* ---------------- un cuadro ---------------- */
  /** El recorte, la cámara y el paneo de la placa j en el punto p de la toma (en this.rect/cam/pan). */
  private plateCam(j: number, p: number): void {
    const P = PLATES[j]
    const th = TH[P.id]
    const sa = this.width / this.height
    const ia = this.texs[j]?.aspect ?? th.w / th.h
    // foco en la imagen que se usa (el recorte vertical corre el foco)
    let fx = P.focal[0]
    const fy = P.focal[1]
    if (this.portrait) fx = clamp01((fx - th.vleft) / th.vwidth)
    // recorte que cubre la pantalla, con el foco en su mismo lugar relativo
    let w = 1
    let h = 1
    if (sa < ia) w = sa / ia
    else h = ia / sa
    this.rect[0] = fx * (1 - w)
    this.rect[1] = fy * (1 - h)
    this.rect[2] = w
    this.rect[3] = h
    // la vida de la placa: u ∈ [−1, 1]; la última descansa en u = 0
    const u = Math.max(-1, Math.min(1, p - j))
    const e = (u + 1) / 2
    const zoom = lerp(P.move.zoom[0], P.move.zoom[1], j === N - 1 ? Math.min(1, e * 2) : e)
    this.cam[0] = zoom
    this.cam[1] = fx
    this.cam[2] = fy
    this.cam[3] = 0.9
    this.pan[0] = P.move.pan[0] * u + this.pointer[0] * 0.006
    this.pan[1] = P.move.pan[1] * u + this.pointer[1] * 0.004
    this.pan[2] = P.depth[0]
    this.pan[3] = P.depth[1]
  }

  private draw(): void {
    const gl = this.gl
    const s = this.spring.s
    const p = s * SEGS
    const i = Math.min(SEGS - 1, Math.floor(p))
    const t = p - i
    const k = smoothstep(0.5 - W, 0.5 + W, t)
    const type = CROSS[PLATES[i].into ?? ''] ?? 0
    this.loadAround(p)

    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.disable(gl.BLEND)
    // fuera de un cruce, una sola placa (la de antes o la de después) con el programa más simple
    const single = k <= 0 || k >= 1
    const a = k >= 1 ? i + 1 : i
    const prog = single ? 0 : 1 + type
    const U = this.Us[prog]
    gl.useProgram(this.quads[prog])
    gl.bindVertexArray(this.vaoQuad)
    this.plateCam(a, p)
    gl.uniform4fv(U.uRectA, this.rect)
    gl.uniform4fv(U.uCamA, this.cam)
    gl.uniform4fv(U.uPanA, this.pan)
    gl.uniform1f(U.uTime, this.time)
    gl.uniform2f(U.uRes, this.canvas.width, this.canvas.height)
    gl.uniform1f(U.uSeed, this.seed)
    gl.uniform1f(U.uGrain, 0.04)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texs[a].tex)
    gl.uniform1i(U.uA, 0)
    if (!single) {
      const starA = PLATES[i].star
      gl.uniform3f(U.uStarA, starA ? starA[0] : 0.5, starA ? starA[1] : 0.5, 0.05)
      gl.uniform1f(U.uAspA, this.texs[i]?.aspect ?? 1.79)
      this.plateCam(i + 1, p)
      gl.uniform4fv(U.uRectB, this.rect)
      gl.uniform4fv(U.uCamB, this.cam)
      gl.uniform4fv(U.uPanB, this.pan)
      gl.uniform1f(U.uK, k)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, this.texs[i + 1].tex)
      gl.uniform1i(U.uB, 1)
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, this.starTex)
      gl.uniform1i(U.uStar, 2)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // partículas: estrellas → nieve marina → nieve (el papel cambia cuando su intensidad es 0)
    let kind: number
    let inten: number
    if (p < 2) {
      kind = 0
      inten = 1 - smoothstep(1.3, 1.55, p)
    } else if (p < 5) {
      kind = 1
      inten = window4(p, 2.45, 2.7, 4.3, 4.55)
    } else {
      kind = 2
      inten = smoothstep(5.45, 5.75, p) * 0.9
    }
    if (inten > 0.002) {
      const PU = this.PU
      gl.useProgram(this.pts)
      gl.bindVertexArray(this.vaoPts)
      gl.enable(gl.BLEND)
      // premultiplicado: aditivo para la luz (estrellas, nieve marina), normal para la nieve
      if (kind === 2) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      else gl.blendFunc(gl.ONE, gl.ONE)
      if (kind !== this.kindNow) {
        this.kindNow = kind
        gl.uniform1f(PU.uKind, kind)
        if (kind === 0) gl.uniform3f(PU.uColor, 0.95, 0.97, 1)
        else if (kind === 1) gl.uniform3f(PU.uColor, 0.62, 0.72, 0.8)
        else gl.uniform3f(PU.uColor, 0.92, 0.95, 0.97)
      }
      gl.uniform1f(PU.uTime, this.time)
      gl.uniform1f(PU.uI, inten)
      // la cámara baja (las partículas suben), luego sube (bajan); un poco de deriva con el paneo
      gl.uniform2f(PU.uDrift, kind === 0 ? -p * 0.02 : kind === 1 ? p * 0.004 : 0, kind === 0 ? -p * 0.03 : kind === 1 ? -p * 0.35 : p * 0.1)
      gl.uniform1f(PU.uDpr, this.dpr)
      gl.uniform2f(PU.uRes, this.canvas.width, this.canvas.height)
      gl.drawArrays(gl.POINTS, 0, kind === 0 ? this.nPts : Math.round(this.nPts * 0.7))
      gl.disable(gl.BLEND)
    }
    gl.bindVertexArray(null)
    this.renders++
  }

  /* ---------------- el bucle ---------------- */
  start(): void {
    this.wake()
    idle(this.loadRest)
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.sleeping = true
  }

  wake = (): void => {
    if (this.disposed || !this.ready) return
    this.lastActive = performance.now()
    if (this.sleeping && !document.hidden && this.raf === 0) {
      this.sleeping = false
      this.last = this.lastActive
      this.raf = requestAnimationFrame(this.loop)
    }
  }

  private loop = (now: number): void => {
    this.rafs++
    this.raf = 0
    if (document.hidden) {
      this.sleeping = true
      return
    }
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.opts.lenis?.raf(now)
    if (this.needsResize) {
      this.needsResize = false
      this.measure()
    }
    const target = this.seekValue ?? this.track.shotAt(scrollY)
    const moving = this.seekValue === null && this.spring.step(target, dt)
    const kp = 1 - Math.exp(-dt * 3)
    this.pointer[0] += (this.pointerTarget[0] - this.pointer[0]) * kp
    this.pointer[1] += (this.pointerTarget[1] - this.pointer[1]) * kp
    const pointerMoving = Math.abs(this.pointer[0] - this.pointerTarget[0]) + Math.abs(this.pointer[1] - this.pointerTarget[1]) > 1e-3
    if (moving || pointerMoving || this.opts.lenis?.isScrolling) this.lastActive = now
    const idleMs = now - this.lastActive
    this.acc += dt
    if (idleMs > 4000 && this.renders > 0) {
      this.sleeping = true
      return
    }
    this.raf = requestAnimationFrame(this.loop)
    if (idleMs > 400 && (this.odd = !this.odd)) return
    const step = this.acc
    this.acc = 0
    if (this.seekValue === null) {
      this.time += step
      this.frame++
      this.seed = (this.frame * 0.6180339) % 1
    }
    this.draw()
    // posada (seek/setProgress): nada cambia hasta el próximo pedido; el bucle duerme ya
    if (this.seekValue !== null) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
      this.sleeping = true
    }
    if (this.opts.trace) this.samples.push({ t: now, s: this.spring.s, target, y: scrollY })
    if (this.waiters.length) {
      const w = this.waiters
      this.waiters = []
      requestAnimationFrame(() => w.forEach((f) => f()))
    }
  }

  /* ---------------- API y QA ---------------- */
  setProgress(s: number | null, time?: number): Promise<void> {
    if (s === null) {
      this.seekValue = null
      this.wake()
      return Promise.resolve()
    }
    if (time !== undefined) {
      this.time = time
      this.seed = (time * 7.31) % 1
    }
    this.seekValue = clamp01(s)
    this.spring.reset(this.seekValue)
    scrollTo(0, this.track.scrollFor(this.seekValue))
    return new Promise((res) => {
      this.waiters.push(res)
      this.wake()
    })
  }
  /** QA: igual que setProgress, esperando además a que las placas de ese punto estén enteras */
  async seek(s: number, time?: number): Promise<void> {
    const p = clamp01(s) * SEGS
    const i = Math.min(SEGS - 1, Math.floor(p))
    this.loadAround(p)
    const need = [i, i + 1]
    for (let n = 0; n < 400 && need.some((j) => !this.texs[j].full); n++) await new Promise((r) => setTimeout(r, 25))
    return this.setProgress(s, time)
  }
  get shot(): number {
    return this.spring.s
  }
  get isSleeping(): boolean {
    return this.sleeping
  }
  get pixelRatio(): number {
    return this.dpr
  }
  get scrollTrack(): ScrollTrack {
    return this.track
  }
  get loaded(): string[] {
    return this.texs.map((t, i) => `${PLATES[i].id}:${t.full ? this.variant : 'miniatura'}`)
  }
  /** ms por cuadro (mediana de n), cada uno esperado con la lectura de un píxel. Solo QA. */
  bench(n = 6): number {
    const gl = this.gl
    const px = new Uint8Array(4)
    const ts: number[] = []
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    for (let j = 0; j < n; j++) {
      const t0 = performance.now()
      this.draw()
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
      ts.push(performance.now() - t0)
    }
    ts.sort((a, b) => a - b)
    return ts[ts.length >> 1]
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.ro.disconnect()
    this.track.dispose()
    for (const [t, ev, fn] of this.listeners) t.removeEventListener(ev, fn)
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    const gl = this.gl
    this.texs.forEach((t) => gl.deleteTexture(t.tex))
    gl.deleteTexture(this.starTex)
    this.quads.forEach((q) => gl.deleteProgram(q))
    gl.deleteProgram(this.pts)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    document.documentElement.classList.remove('world-on')
  }

  checkPrograms(): void {
    this.quads.forEach((q, t) => checkProgram(this.gl, q, `placas ${t - 1}`))
    checkProgram(this.gl, this.pts, 'partículas')
  }
}

function idle(fn: () => void): void {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
  if (ric) ric(fn, { timeout: 2000 })
  else setTimeout(fn, 200)
}

/**
 * Monta el mundo sobre un lienzo fijo y las secciones `[data-tramo]` de la página y se resuelve cuando el primer cuadro
 * ya está pintado (pone `html.world-on`). Si no hay mundo (sin WebGL2, movimiento reducido, ahorro de datos, WebGL por
 * software o un shader que no compila), pone `html.world-still` y devuelve **null**: la página se queda con sus
 * `<picture>`.
 */
export async function mountWorld(opts: MountOptions): Promise<WorldHandle | null> {
  const reason = stillReason()
  const root = document.documentElement
  const still = (why: string): null => {
    root.classList.add('world-still')
    root.dataset.worldStill = why
    return null
  }
  if (reason) return still(reason)
  const gl = opts.canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' })
  if (!gl) return still('sin WebGL2')
  const w = new World(opts, gl)
  try {
    w.checkPrograms()
  } catch (e) {
    w.dispose()
    console.error(e)
    return still('shader')
  }
  await w.init()
  if (w['seekValue'] !== null) await w.seek(w['seekValue'] as number)
  else w.start()
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  root.classList.add('world-on')
  return w
}
