/**
 * La toma (v3): un plano secuencia que es **función del scroll**.
 *
 * - `s` ∈ [0, 1] es el punto de la toma. Cada tramo del HTML declara dónde empieza en la toma (`data-shot` en su
 *   sección; plates.ts lo pone si falta); el scroll se traduce a `s` con anclas leídas de la posición real de las
 *   secciones (`ResizeObserver`: nunca vh fijos). Entre anclas, lineal; la imagen no salta porque la sigue un resorte
 *   críticamente amortiguado que nunca se pasa de largo y tiene tope de velocidad.
 * - `?qa=seek=<0..1>` posa la toma en un punto exacto, sin resorte (capturas idénticas entre corridas).
 *
 * (La maqueta en gris del 18-nov, con su cámara 3D por claves, queda en la historia de git: commit 5a22c86.)
 */

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

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
      const shot = Number(el.dataset.shot ?? 0)
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
