/**
 * El guion técnico de la película: todo en «unidades de toma» (u). La toma i va de u = i a u = i + 1; los cortes en
 * segundos los da film.json (sale de tools/v4-film.sh). Así se puede volver a montar la película sin tocar el relato.
 *
 *   S0 Tierra de noche → amanecer → satélite        S4 sumergible → muro de hielo → línea de agua
 *   S1 satélite → atmósfera → mar con velero        S5 línea de agua → glaciar → cumbre
 *   S2 mar → superficie → buzo bajo la luz          S6 cumbre → luz blanca
 *   S3 buzo → abismo → sumergible
 */
import type { Look } from './stage'

export type Key<T> = [u: number, v: T]

/** gradación por momento: la noche cálida, el día frío, el abismo cerrado, la nieve alta */
export const LOOKS: Key<Look>[] = [
  [0.0, { exposure: 1.02, contrast: 1.08, saturation: 1.05, tint: [1, 1, 1.02], vignette: 0.62, grain: 0.045, fade: 0 }],
  [0.9, { exposure: 1.0, contrast: 1.1, saturation: 0.9, tint: [0.98, 1, 1.03], vignette: 0.5, grain: 0.04, fade: 0 }],
  [1.5, { exposure: 1.06, contrast: 1.04, saturation: 0.85, tint: [0.97, 1, 1.04], vignette: 0.4, grain: 0.04, fade: 0 }],
  [2.1, { exposure: 0.96, contrast: 1.12, saturation: 0.85, tint: [0.96, 1, 1.05], vignette: 0.55, grain: 0.045, fade: 0 }],
  [2.97, { exposure: 1.04, contrast: 1.16, saturation: 0.9, tint: [0.92, 1, 1.08], vignette: 0.6, grain: 0.05, fade: 0 }],
  [3.55, { exposure: 0.78, contrast: 1.22, saturation: 0.85, tint: [0.9, 0.98, 1.08], vignette: 0.8, grain: 0.06, fade: 0 }],
  [3.97, { exposure: 0.98, contrast: 1.14, saturation: 0.9, tint: [0.94, 1, 1.06], vignette: 0.62, grain: 0.05, fade: 0 }],
  [4.93, { exposure: 1.0, contrast: 1.06, saturation: 0.95, tint: [0.98, 1, 1.02], vignette: 0.42, grain: 0.04, fade: 0 }],
  [5.92, { exposure: 1.04, contrast: 1.1, saturation: 0.85, tint: [0.98, 1, 1.03], vignette: 0.45, grain: 0.04, fade: 0 }],
  [6.45, { exposure: 1.08, contrast: 1.02, saturation: 0.8, tint: [1, 1, 1.02], vignette: 0.3, grain: 0.03, fade: 0.04 }],
  [6.75, { exposure: 1.16, contrast: 0.95, saturation: 0.7, tint: [1, 1, 1.01], vignette: 0.1, grain: 0.025, fade: 0.55 }],
  [6.97, { exposure: 1.2, contrast: 0.9, saturation: 0.6, tint: [1, 1, 1], vignette: 0, grain: 0.02, fade: 1 }],
]

/** el medio que atraviesa la cámara (estrellas, aire, agua, nieve) */
export const MEDIA: Key<[number, number, number, number]>[] = [
  [0.0, [1, 0, 0, 0]],
  [1.2, [1, 0, 0, 0]],
  [1.4, [0, 0.55, 0, 0]],
  [2.4, [0, 0.35, 0, 0]],
  [2.62, [0, 0, 1, 0]],
  [4.75, [0, 0, 1, 0]],
  [4.92, [0, 0, 0, 0]],
  [5.35, [0, 0, 0, 0]],
  [5.7, [0, 0, 0, 0.8]],
  [6.85, [0, 0, 0, 0.6]],
  [7.0, [0, 0, 0, 0]],
]

/** destellos de cruce: [centro u, ancho u, intensidad] */
export const FLASHES: [number, number, number][] = [
  [1.62, 0.06, 0.12], // la nube
  [2.6, 0.05, 0.55], // la superficie
  [4.87, 0.05, 0.25], // la línea de agua
]

/** el foco del encuadre (coordenadas del video, 0–1): lo que tiene que quedar en pantalla en el teléfono */
export const FOCUS: Key<[number, number]>[] = [
  [0.0, [0.58, 0.55]],
  [0.6, [0.66, 0.4]],
  [1.05, [0.62, 0.35]],
  [1.4, [0.5, 0.5]],
  [1.97, [0.5, 0.62]],
  [2.6, [0.5, 0.5]],
  [2.97, [0.68, 0.55]],
  [3.26, [0.64, 0.5]],
  [3.97, [0.42, 0.45]],
  [4.24, [0.45, 0.5]],
  [4.93, [0.6, 0.5]],
  [5.5, [0.55, 0.5]],
  [5.92, [0.58, 0.5]],
  [7.0, [0.64, 0.45]],
]

/** altitud en metros (negativa: profundidad). No es un dato: es la lectura del instrumento de la película. */
export const ALT: Key<number>[] = [
  [0.0, 420000],
  [0.97, 405000],
  [1.25, 100000],
  [1.6, 12000],
  [1.97, 900],
  [2.5, 0],
  [2.97, -42],
  [3.6, -1800],
  [3.97, -3800],
  [4.24, -3650],
  [4.75, -60],
  [4.93, 0],
  [5.3, 600],
  [5.75, 5200],
  [5.92, 6880],
  [7.0, 6960],
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
  { id: 'luces', from: 0.02, to: 0.32, path: [[0, [0.6, 0.66]], [0.36, [0.6, 0.62]]], ang: -38, len: 110 },
  { id: 'sat-a', from: 0.98, to: 1.11, path: [[0.97, [0.36, 0.17]], [1.05, [0.42, 0.17]], [1.12, [0.32, 0.22]]], side: 'left', ang: 212, len: 80, wide: true },
  { id: 'sat-b', from: 0.98, to: 1.11, path: [[0.97, [0.61, 0.33]], [1.05, [0.64, 0.32]], [1.12, [0.68, 0.42]]], ang: -16, len: 120 },
  { id: 'velero', from: 1.98, to: 2.2, path: [[1.97, [0.5, 0.735]], [2.22, [0.5, 0.715]]], ang: -40, len: 70 },
  { id: 'buzo', from: 2.99, to: 3.24, path: [[2.97, [0.72, 0.62]], [3.1, [0.7, 0.53]], [3.26, [0.665, 0.48]]], ang: 160, len: 120 },
  { id: 'sub-a', from: 3.99, to: 4.22, path: [[3.97, [0.26, 0.24]], [4.1, [0.26, 0.37]], [4.24, [0.3, 0.38]]], ang: -36, len: 80, wide: true },
  { id: 'sub-b', from: 3.99, to: 4.22, path: [[3.97, [0.47, 0.55]], [4.1, [0.6, 0.56]], [4.24, [0.6, 0.6]]], ang: 150, len: 110 },
  { id: 'cima', from: 5.95, to: 6.5, path: [[5.92, [0.665, 0.3]], [6.6, [0.665, 0.29]]], ang: -30, len: 80 },
]

/** la línea de agua en el iceberg (y del video) */
export const WATERLINE: Key<number>[] = [
  [4.88, 0.5],
  [4.93, 0.5],
  [5.1, 0.555],
]

// ---------- interpolación (sin asignar memoria en el loop) ----------
const ease = (x: number) => x * x * (3 - 2 * x)

function seg<T>(keys: Key<T>[], u: number): [number, number, number] {
  if (u <= keys[0][0]) return [0, 0, 0]
  const n = keys.length - 1
  if (u >= keys[n][0]) return [n, n, 0]
  let i = 0
  while (i < n && keys[i + 1][0] < u) i++
  const a = keys[i][0], b = keys[i + 1][0]
  return [i, i + 1, ease((u - a) / (b - a))]
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
  const group = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep)
  if (m >= 10000) return `${group(m / 1000)} km`
  if (Math.abs(m) < 0.5) return '0 m'
  return `${m < 0 ? '−' : ''}${group(Math.abs(m))} m`
}
