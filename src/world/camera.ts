/**
 * La toma (v3, maqueta en gris): un plano secuencia que es **función del scroll**.
 *
 * - `s` ∈ [0, 1] es el punto de la toma. Cada tramo del HTML declara dónde empieza en la toma (`data-shot` en su
 *   sección); el scroll se traduce a `s` con anclas leídas de la posición real de las secciones (`ResizeObserver`:
 *   nunca vh fijos). Entre anclas, lineal; la cámara no salta porque la sigue un resorte críticamente amortiguado.
 * - La pose de la cámara (posición, rumbo, cabeceo, giro y campo de visión) sale de `pose(s)`: claves con
 *   interpolación de Hermite con tangentes de tres puntos (C1 en `s`, aunque las claves no estén a la misma distancia).
 *   Los ángulos se interpolan como ángulos (no puntos a los que mirar): la cámara nunca da una vuelta por pasar cerca
 *   de lo que mira.
 * - `?qa=seek=<0..1>` posa la toma en un punto exacto, sin resorte (capturas idénticas entre corridas).
 *
 * Este archivo no importa three.js: entra en el primer bundle; el mundo (greybox.ts) llega después.
 */

/* ------------------------------------------------------------------ */
/*  Las claves de la toma                                              */
/* ------------------------------------------------------------------ */
/** Una clave: punto de la toma, posición (mundo), cabeceo, rumbo y giro (grados) y campo vertical (grados). */
type Key = readonly [s: number, x: number, y: number, z: number, pitch: number, yaw: number, roll: number, fov: number]

/**
 * El mundo de la maqueta (unidades ≈ metros de cine, no de mapa): la superficie del mar en y = 0, tangente a una
 * Tierra de radio 6000 con centro en (0, −6000, 0); el fondo en y = −62; la montaña con su eje en (0, ·, 150) (detrás
 * de la caída) y la cumbre en y = 90; las nubes entre y = 18 y 27. Rumbo 0 = mirando hacia −z; positivo gira a la izquierda.
 */
const KEYS: readonly Key[] = [
  // 1 · Espacio: el borde de la Tierra en diagonal, la luna y la estrella arriba
  [0.0, 0, 330, 260, -6, 0, -20, 42],
  [0.06, 0, 300, 228, -8, 1.5, -18, 42],
  // la caída: la cámara baja y se inclina hacia el mar de noche (la montaña queda detrás: no se ve hasta el fondo)
  [0.11, 0, 222, 172, -13, 2.5, -12, 44],
  [0.175, 0, 96, 96, -24, 2, -4, 46],
  [0.23, 0, 16, 30, -24, 0, 0, 48],
  // 2 · Océano: rozando el agua, se cruza la superficie (s ≈ 0,275) y se mira hacia arriba (el borde de la ventana
  // de Snell pasa por el cuadro)
  [0.262, 0, 3.5, 14, -40, 0, 0, 50],
  [0.288, 0, -1.8, 9, -30, 0, 0, 52],
  [0.335, 0, -11, 6, 48, 0, 0, 58],
  // el haz de luz y la nieve marina, bajando detrás de la luz del buzo
  [0.39, 0, -18, 5, -50, 0, 0, 52],
  [0.45, 1, -31, 9, -26, 4, 0, 50],
  // el fondo: la cámara se da la vuelta y encuentra la pared
  [0.515, 3, -45, 14, -10, 70, 0, 50],
  [0.575, 2, -50, 40, 12, 172, 0, 52],
  // 3 · Montaña: la subida pegada a la pared, se cruza otra vez la superficie (s ≈ 0,69) y las nubes
  [0.625, 0, -36, 57, 20, 180, 0, 52],
  [0.67, 0, -12, 68, 24, 180, 0, 52],
  [0.7, 0, 2, 74, 26, 180, 0, 52],
  [0.76, 0, 20, 85, 26, 178, 0, 52],
  [0.815, 6, 34, 95, 22, 172, 0, 50],
  // Cumbre: la cámara se aparta por la arista y descansa frente al macizo al amanecer
  [0.88, 40, 50, 62, 12, 156, 0, 46],
  [0.95, 66, 58, 34, 10, 150, 0, 44],
  [1.0, 78, 62, 20, 9, 148, 0, 43],
]

/** Dónde empieza cada tramo en la toma (el HTML lo repite en `data-shot`; esto es el respaldo). */
export const TRAMOS = [
  { id: 'espacio-1', shot: 0 },
  { id: 'espacio-2', shot: 0.11 },
  { id: 'oceano-1', shot: 0.24 },
  { id: 'oceano-2', shot: 0.36 },
  { id: 'oceano-3', shot: 0.48 },
  { id: 'montana-1', shot: 0.6 },
  { id: 'montana-2', shot: 0.72 },
  { id: 'cumbre', shot: 0.86 },
] as const

/** Una pose: lo que la cámara necesita en un punto de la toma. Se reutiliza (nada se aloca por cuadro). */
export interface Pose {
  x: number
  y: number
  z: number
  /** radianes */
  pitch: number
  yaw: number
  roll: number
  /** campo de visión vertical, grados (el mundo lo ensancha en vertical para que el horizontal no baje de un mínimo) */
  fov: number
}

export const newPose = (): Pose => ({ x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0, fov: 45 })

const N = KEYS.length
const CH = 7 // canales: x y z pitch yaw roll fov
/** tangentes de tres puntos por canal, precalculadas */
const TAN = new Float64Array(N * CH)
for (let i = 0; i < N; i++) {
  for (let c = 0; c < CH; c++) {
    const v = (k: number) => KEYS[k][c + 1] as number
    const s = (k: number) => KEYS[k][0]
    let m: number
    if (i === 0) m = (v(1) - v(0)) / (s(1) - s(0))
    else if (i === N - 1) m = (v(N - 1) - v(N - 2)) / (s(N - 1) - s(N - 2))
    else {
      // derivada de la parábola por los tres puntos (Bessel): continua aunque el paso cambie
      const h0 = s(i) - s(i - 1)
      const h1 = s(i + 1) - s(i)
      const d0 = (v(i) - v(i - 1)) / h0
      const d1 = (v(i + 1) - v(i)) / h1
      m = (d0 * h1 + d1 * h0) / (h0 + h1)
    }
    TAN[i * CH + c] = m
  }
}

const DEG = Math.PI / 180
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** La pose en el punto `s` de la toma (escribe en `out`). */
export function pose(s: number, out: Pose): Pose {
  s = clamp01(s)
  let i = 0
  while (i < N - 2 && s > KEYS[i + 1][0]) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const h = b[0] - a[0]
  const t = clamp01((s - a[0]) / h)
  const t2 = t * t
  const t3 = t2 * t
  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2
  const ch = (c: number) => h00 * (a[c + 1] as number) + h10 * h * TAN[i * CH + c] + h01 * (b[c + 1] as number) + h11 * h * TAN[(i + 1) * CH + c]
  out.x = ch(0)
  out.y = ch(1)
  out.z = ch(2)
  out.pitch = ch(3) * DEG
  out.yaw = ch(4) * DEG
  out.roll = ch(5) * DEG
  out.fov = ch(6)
  return out
}

/* ------------------------------------------------------------------ */
/*  El resorte                                                         */
/* ------------------------------------------------------------------ */
/**
 * Resorte críticamente amortiguado sobre `s` (solución exacta por paso: estable a cualquier dt), con dos reglas:
 * nunca pasa de largo el objetivo (si lo cruzara, se queda en él: la toma es monótona mientras el scroll lo sea) y su
 * velocidad tiene tope (`VMAX` tomas por segundo: un salto con la tecla Inicio vuela de vuelta, no se teletransporta).
 */
export class Spring {
  s = 0
  v = 0
  /** rigidez (1/s): ~0,8 s para asentarse */
  omega = 5.5
  /** tope de velocidad, tomas por segundo */
  vmax = 0.4

  reset(s: number): void {
    this.s = s
    this.v = 0
  }

  /** Avanza `dt` segundos hacia `target`. Devuelve true si sigue moviéndose. */
  step(target: number, dt: number): boolean {
    if (dt <= 0) return !this.settled(target)
    const w = this.omega
    const x = this.s - target
    const e = Math.exp(-w * dt)
    const c = this.v + w * x
    let nx = (x + c * dt) * e
    let nv = (this.v - w * c * dt) * e
    // tope de velocidad: el paso no supera vmax·dt
    const lim = this.vmax * dt
    const d = nx - x
    if (d > lim || d < -lim) {
      const dd = d > 0 ? lim : -lim
      nx = x + dd
      nv = dd / dt
    }
    // nunca pasa de largo: si cruzó el objetivo, se queda en él
    if ((x < 0 && nx > 0) || (x > 0 && nx < 0)) {
      nx = 0
      nv = 0
    }
    this.s = target + nx
    this.v = nv
    if (this.settled(target)) {
      this.s = target
      this.v = 0
      return false
    }
    return true
  }

  settled(target: number): boolean {
    return Math.abs(this.s - target) < 2e-5 && Math.abs(this.v) < 2e-4
  }
}

/* ------------------------------------------------------------------ */
/*  Scroll → toma                                                      */
/* ------------------------------------------------------------------ */
/**
 * Las anclas: el tope de cada sección (en px de scroll) ↦ su `data-shot`; el final del documento ↦ 1. Se recalculan
 * cuando cambia el tamaño de cualquier sección, del documento o de la ventana (nunca en el bucle).
 */
export class ScrollTrack {
  /** px de scroll de cada ancla (crecientes) */
  private ys = new Float64Array(16)
  /** punto de la toma de cada ancla (creciente) */
  private ss = new Float64Array(16)
  private n = 0
  private ro: ResizeObserver
  private sections: HTMLElement[]
  maxScroll = 0
  /** cuántas veces se midieron las anclas (QA) */
  measures = 0

  constructor(sections: HTMLElement[]) {
    this.sections = sections
    this.ro = new ResizeObserver(() => this.measure())
    for (const el of sections) this.ro.observe(el)
    this.ro.observe(document.documentElement)
    addEventListener('resize', this.measure, { passive: true })
    this.measure()
  }

  measure = (): void => {
    const doc = document.documentElement
    const vh = doc.clientHeight || innerHeight
    this.maxScroll = Math.max(0, doc.scrollHeight - vh)
    const sy = scrollY
    let n = 0
    const push = (y: number, s: number) => {
      y = Math.min(this.maxScroll, Math.max(0, y))
      // monótonas: un ancla que no avanza en px reemplaza a la anterior (la toma nunca salta en el mismo px)
      if (n > 0 && y <= this.ys[n - 1] + 0.5) {
        if (s > this.ss[n - 1]) {
          this.ys[n - 1] = y
          this.ss[n - 1] = s
        }
        return
      }
      if (n > 0 && s < this.ss[n - 1]) return
      this.ys[n] = y
      this.ss[n] = s
      n++
    }
    push(0, 0)
    for (let i = 0; i < this.sections.length && n < 15; i++) {
      const el = this.sections[i]
      const shot = Number(el.dataset.shot ?? TRAMOS[i]?.shot ?? 0)
      const top = el.getBoundingClientRect().top + sy
      push(top, shot)
    }
    push(this.maxScroll, 1)
    this.n = n
    this.measures++
  }

  /** El punto de la toma para un scroll en px. */
  shotAt(y: number): number {
    const n = this.n
    if (n < 2 || this.maxScroll <= 0) return 0
    if (y <= this.ys[0]) return this.ss[0]
    for (let i = 1; i < n; i++) {
      if (y <= this.ys[i]) {
        const y0 = this.ys[i - 1]
        const y1 = this.ys[i]
        return this.ss[i - 1] + ((this.ss[i] - this.ss[i - 1]) * (y - y0)) / (y1 - y0)
      }
    }
    return this.ss[n - 1]
  }

  /** El scroll (px) que corresponde a un punto de la toma (la inversa: para posar `?qa=seek`). */
  scrollFor(s: number): number {
    const n = this.n
    if (n < 2) return 0
    if (s <= this.ss[0]) return this.ys[0]
    for (let i = 1; i < n; i++) {
      if (s <= this.ss[i]) {
        const s0 = this.ss[i - 1]
        const s1 = this.ss[i]
        return s1 > s0 ? this.ys[i - 1] + ((this.ys[i] - this.ys[i - 1]) * (s - s0)) / (s1 - s0) : this.ys[i]
      }
    }
    return this.ys[n - 1]
  }

  /** Las anclas, para el QA (no se usa en el bucle). */
  anchors(): { y: number; s: number }[] {
    return Array.from({ length: this.n }, (_, i) => ({ y: this.ys[i], s: this.ss[i] }))
  }

  dispose(): void {
    this.ro.disconnect()
    removeEventListener('resize', this.measure)
  }
}

/** `?qa=seek=0.42` → 0.42 (o null). */
export function seekParam(): number | null {
  const qa = new URLSearchParams(location.search).get('qa') ?? ''
  const m = qa.match(/seek=([0-9.]+)/)
  if (!m) return null
  const v = Number(m[1])
  return Number.isFinite(v) ? clamp01(v) : null
}
