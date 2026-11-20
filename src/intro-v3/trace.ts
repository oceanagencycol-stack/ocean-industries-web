/**
 * Los contornos del símbolo para trazarlos desde la estrella (sin redibujar nada): cada forma en S de
 * marca/v3/simbolo-simetrico.svg, empezando en su punto más cercano a la estrella del centro, hacia adelante y hacia
 * atrás. Se calcula al montar la intro (≈ 1 ms): siempre sale del SVG vigente.
 */
type P = [number, number]
type Seg = { k: 'L' | 'C'; p: P[] }

/** Segmentos absolutos de un subtrazo (el símbolo solo usa M, C, L y Z absolutos). */
function parse(sub: string): Seg[] {
  const tok = sub.match(/[MCLZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []
  let i = 0
  const num = () => Number(tok[i++])
  const segs: Seg[] = []
  let start: P = [0, 0]
  let cur: P = [0, 0]
  while (i < tok.length) {
    const c = tok[i++]
    if (c === 'M') start = cur = [num(), num()]
    else if (c === 'L') {
      const p: P = [num(), num()]
      segs.push({ k: 'L', p: [cur, p] })
      cur = p
    } else if (c === 'C') {
      const a: P = [num(), num()], b: P = [num(), num()], p: P = [num(), num()]
      segs.push({ k: 'C', p: [cur, a, b, p] })
      cur = p
    } else if (c === 'Z' || c === 'z') {
      if (Math.hypot(cur[0] - start[0], cur[1] - start[1]) > 1e-6) segs.push({ k: 'L', p: [cur, start] })
      cur = start
    } else throw new Error(`[intro-v3] comando inesperado en el símbolo: ${c}`)
  }
  return segs
}
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
function at(s: Seg, t: number): P {
  if (s.k === 'L') return lerp(s.p[0], s.p[1], t)
  const [p0, p1, p2, p3] = s.p
  const a = lerp(p0, p1, t), b = lerp(p1, p2, t), c = lerp(p2, p3, t)
  return lerp(lerp(a, b, t), lerp(b, c, t), t)
}
function split(s: Seg, t: number): [Seg, Seg] {
  if (s.k === 'L') {
    const m = lerp(s.p[0], s.p[1], t)
    return [{ k: 'L', p: [s.p[0], m] }, { k: 'L', p: [m, s.p[1]] }]
  }
  const [p0, p1, p2, p3] = s.p
  const a = lerp(p0, p1, t), b = lerp(p1, p2, t), c = lerp(p2, p3, t)
  const d = lerp(a, b, t), e = lerp(b, c, t), m = lerp(d, e, t)
  return [{ k: 'C', p: [p0, a, d, m] }, { k: 'C', p: [m, e, c, p3] }]
}
const f = (n: number) => String(Math.round(n * 100) / 100)
function toD(segs: Seg[]): string {
  let d = `M${f(segs[0].p[0][0])} ${f(segs[0].p[0][1])}`
  for (const s of segs) d += s.k === 'L' ? `L${f(s.p[1][0])} ${f(s.p[1][1])}` : `C${s.p.slice(1).map((q) => `${f(q[0])} ${f(q[1])}`).join(' ')}`
  return d
}

export interface SymbolTraces {
  /** La estrella: el centro de la simetría por giro de 180°. */
  center: P
  /** Por forma en S: el contorno desde la estrella hacia adelante y hacia atrás. */
  traces: { fwd: string; rev: string }[]
}

export function symbolTraces(d: string): SymbolTraces {
  const subs = d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean)
  if (subs.length !== 2) throw new Error('[intro-v3] el símbolo debería tener dos formas en S')
  const all = subs.map(parse)
  const pa = all[0][0].p[0], pb = all[1][0].p[0]
  const center: P = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2]
  const traces = all.map((segs) => {
    let best = { d: Infinity, k: 0, t: 0 }
    segs.forEach((s, k) => {
      for (let i = 0; i <= 200; i++) {
        const [x, y] = at(s, i / 200)
        const dd = Math.hypot(x - center[0], y - center[1])
        if (dd < best.d) best = { d: dd, k, t: i / 200 }
      }
    })
    const t = Math.min(Math.max(best.t, 0.001), 0.999)
    const [a, b] = split(segs[best.k], t)
    const fwd = [b, ...segs.slice(best.k + 1), ...segs.slice(0, best.k), a]
    const rev = fwd.slice().reverse().map((s) => ({ k: s.k, p: s.p.slice().reverse() }))
    return { fwd: toD(fwd), rev: toD(rev) }
  })
  return { center, traces }
}
