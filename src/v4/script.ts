/**
 * El guion técnico de la película: todo en «unidades de toma» (u). La toma i va de u = i a u = i + 1; los cortes en
 * segundos los da film.json (sale de tools/v6-film.py). Así se puede volver a montar la película sin tocar el relato.
 *
 * v6 · La nave (docs/v6/GUION.md): del espacio al fondo del mar, paleta oscura premium.
 *   S0 órbita sobre la Tierra de noche            S4 entrada al agua → rayos con el cardumen
 *   S1 reentrada con plasma azul                  S5 rayos → abismo (la nave de frente, el piloto)
 *   S2 sobre las nubes de tormenta, con luna      S6 abismo → la roca del fondo; 4 s quietos: la marca se graba
 *   S3 rasante sobre el mar oscuro
 */
import type { Look } from './stage'

export type Key<T> = [u: number, v: T]

/** gradación por momento: la noche, el cielo de tormenta, el agua, el abismo; nunca se lava a blanco */
export const LOOKS: Key<Look>[] = [
  [0.0, { exposure: 1.0, contrast: 1.08, saturation: 0.95, tint: [1, 1, 1.02], vignette: 0.62, grain: 0.045, fade: 0 }],
  [1.0, { exposure: 0.98, contrast: 1.12, saturation: 0.85, tint: [0.96, 1, 1.05], vignette: 0.55, grain: 0.045, fade: 0 }],
  [2.0, { exposure: 1.0, contrast: 1.1, saturation: 0.8, tint: [0.95, 1, 1.05], vignette: 0.5, grain: 0.04, fade: 0 }],
  [3.0, { exposure: 0.98, contrast: 1.12, saturation: 0.82, tint: [0.95, 1, 1.06], vignette: 0.55, grain: 0.045, fade: 0 }],
  [4.0, { exposure: 1.0, contrast: 1.12, saturation: 0.85, tint: [0.93, 1, 1.07], vignette: 0.55, grain: 0.045, fade: 0 }],
  [4.6, { exposure: 1.02, contrast: 1.1, saturation: 0.88, tint: [0.93, 1, 1.06], vignette: 0.5, grain: 0.045, fade: 0 }],
  [5.45, { exposure: 0.9, contrast: 1.18, saturation: 0.85, tint: [0.92, 0.99, 1.08], vignette: 0.72, grain: 0.055, fade: 0 }],
  [6.4, { exposure: 0.96, contrast: 1.14, saturation: 0.88, tint: [0.94, 1, 1.06], vignette: 0.62, grain: 0.05, fade: 0 }],
  [7.0, { exposure: 0.93, contrast: 1.14, saturation: 0.88, tint: [0.94, 1, 1.06], vignette: 0.68, grain: 0.05, fade: 0 }],
]

/** el medio que atraviesa la cámara (estrellas, aire, agua, nieve) */
export const MEDIA: Key<[number, number, number, number]>[] = [
  [0.0, [1, 0, 0, 0]],
  [0.95, [1, 0, 0, 0]],
  [1.3, [0, 0.5, 0, 0]],
  [3.9, [0, 0.35, 0, 0]],
  [4.25, [0, 0, 1, 0]],
  [7.0, [0, 0, 1, 0]],
]

/** destellos de cruce: [centro u, ancho u, intensidad] */
export const FLASHES: [number, number, number][] = [
  [1.32, 0.08, 0.16], // el plasma de la reentrada
  [4.22, 0.05, 0.5], // el impacto en el agua
]

/** el foco del encuadre (coordenadas del video, 0–1): lo que tiene que quedar en pantalla en el teléfono */
export const FOCUS: Key<[number, number]>[] = [
  [0.0, [0.6, 0.48]],
  [0.95, [0.58, 0.45]],
  [1.1, [0.52, 0.5]],
  [2.05, [0.5, 0.45]],
  [3.05, [0.52, 0.5]],
  [4.0, [0.58, 0.64]],
  [4.3, [0.52, 0.6]],
  [4.7, [0.5, 0.6]],
  [5.0, [0.5, 0.58]],
  [5.5, [0.5, 0.5]],
  [6.25, [0.47, 0.5]],
  [6.4, [0.5, 0.42]],
  [7.0, [0.51, 0.4]],
]

/** altitud en metros (negativa: profundidad). No es un dato: es la lectura del instrumento de la película. */
export const ALT: Key<number>[] = [
  [0.0, 420000],
  [0.95, 400000],
  [1.5, 80000],
  [2.0, 9000],
  [2.95, 3000],
  [3.4, 40],
  [4.1, 8],
  [4.24, 0],
  [4.7, -120],
  [5.0, -300],
  [5.6, -2400],
  [6.0, -3600],
  [6.6, -4100],
  [7.0, -4120],
]

export interface Callout {
  id: string
  /** desde, hasta (u): entra y sale con un fundido corto */
  from: number
  to: number
  /** trayectoria del sujeto en coordenadas del video */
  path: Key<[number, number]>[]
  side?: 'left' | 'right'
  ang?: number
  len?: number
  /** solo en pantallas anchas */
  wide?: boolean
}

export const CALLOUTS: Callout[] = [
  { id: 'luces', from: 0.06, to: 0.44, path: [[0, [0.26, 0.8]], [0.45, [0.29, 0.78]]], ang: -36, len: 80 },
  { id: 'sub-a', from: 5.52, to: 5.95, path: [[5.5, [0.3, 0.62]], [5.95, [0.28, 0.63]]], side: 'left', ang: 212, len: 80, wide: true },
  { id: 'sub-b', from: 5.52, to: 5.95, path: [[5.5, [0.56, 0.63]], [5.95, [0.57, 0.64]]], ang: -24, len: 110 },
]

/** la línea de agua (y del video): la entrada al mar */
export const WATERLINE: Key<number>[] = [
  [4.0, 0.34],
  [4.24, 0.34],
]

/** la cara lisa de la roca del fondo en el último cuadro (coordenadas del video) y cuándo se graba la marca */
export const ROCA = { u0: 6.64, u1: 6.97, x0: 0.375, y0: 0.13, x1: 0.645, y1: 0.62 }

// ---------- interpolación (sin asignar memoria en el loop) ----------
const ease = (x: number) => x * x * (3 - 2 * x)

const span: [number, number, number] = [0, 0, 0]
function seg<T>(keys: Key<T>[], u: number) {

  const n = keys.length - 1

  if (n === 0) {
    span[0] = span[1] = span[2] = 0
    return span
  }
  let i = 0
  while (i < n - 1 && keys[i + 1][0] < u) i++
  const a = keys[i][0], b = keys[i + 1][0]
  span[0] = i
  span[1] = i + 1
  span[2] = ease(Math.max(0, Math.min(1, (u - a) / (b - a))))
  return span
}

export function num(keys: Key<number>[], u: number): number {
  const [i, j, t] = seg(keys, u)
  return keys[i][1] + (keys[j][1] - keys[i][1]) * t
}

export function vec<N extends number[]>(keys: Key<N>[], u: number, out: N): N {
  const [i, j, t] = seg(keys, u)
  const A = keys[i][1], B = keys[j][1]
  for (let k = 0; k < out.length; k++) out[k] = A[k] + (B[k] - A[k]) * t
  return out
}

export function look(u: number, out: Look): Look {
  const [i, j, t] = seg(LOOKS, u)
  const A = LOOKS[i][1], B = LOOKS[j][1]
  out.exposure = A.exposure + (B.exposure - A.exposure) * t
  out.contrast = A.contrast + (B.contrast - A.contrast) * t
  out.saturation = A.saturation + (B.saturation - A.saturation) * t
  out.vignette = A.vignette + (B.vignette - A.vignette) * t
  out.grain = A.grain + (B.grain - A.grain) * t
  out.fade = A.fade + (B.fade - A.fade) * t
  for (let k = 0; k < 3; k++) out.tint[k] = A.tint[k] + (B.tint[k] - A.tint[k]) * t
  return out
}

export function flash(u: number): number {
  let f = 0
  for (const [c, w, k] of FLASHES) {
    const d = (u - c) / w
    f += k * Math.exp(-d * d)
  }
  return f
}

/** la lectura del instrumento: km arriba de 10 km, m abajo; con el signo tipográfico de menos */
export function formatAlt(m: number, lang: string): string {
  const sep = lang === 'en' ? ',' : '.'

  if (m >= 10000) return `${group(m / 1000, sep)} km`
  if (Math.abs(m) < 0.5) return '0 m'
  return `${m < 0 ? '−' : ''}${group(Math.abs(m), sep)} m`
}

function group(n: number, sep: string) {
  const v = Math.round(n)
  return v < 1000 ? String(v) : Math.floor(v / 1000) + sep + String(v % 1000).padStart(3, '0')
}
