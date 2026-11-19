// Parte la marca v3 en las piezas que anima la intro (src/intro-v3/), sin redibujar nada:
//  - el logotipo (marca/v3/logo.svg) por letras: cada subtrazo M…Z tal cual, agrupado por letra (O, C, E, Λ, N; la ®
//    es su propio trazo);
//  - el símbolo (marca/v3/simbolo-simetrico.svg): para cada forma en S, su contorno empezando en el punto más cercano a
//    la estrella del centro, hacia adelante y hacia atrás (los dos trazos nacen de la estrella y se encuentran lejos);
//  - las guías de las máscaras de cada letra (el anillo de la O y la C, el esqueleto de la N), medidas de la tinta.
// Escribe src/intro-v3/letras.json. Correr desde la raíz del repo: node tools/marca/letras.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const LOGO = resolve(ROOT, 'marca/v3/logo.svg')
const SIMBOLO = resolve(ROOT, 'marca/v3/simbolo-simetrico.svg')
const OUT = resolve(ROOT, 'src/intro-v3/letras.json')

/** Mismo hash que src/intro-v3/intro.ts (FNV-1a de 32 bits): la intro avisa si el JSON no sale de estos SVG. */
export function fnv(s) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

const viewBox = (svg) => svg.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number)
const paths = (svg) => [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1])

/** Subtrazos de un `d` (cada uno empieza en M): el texto exacto, sin tocar. */
const subpaths = (d) => d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean)

/** Segmentos absolutos de un subtrazo (la marca solo usa M, C, L y Z absolutos). */
function parse(sub) {
  const tok = sub.match(/[MCLZ]|-?\d*\.?\d+(?:e-?\d+)?/gi)
  let i = 0
  const num = () => Number(tok[i++])
  const segs = []
  let start = null
  let cur = null
  while (i < tok.length) {
    const c = tok[i++]
    if (c === 'M') {
      cur = [num(), num()]
      start = cur
    } else if (c === 'L') {
      const p = [num(), num()]
      segs.push({ k: 'L', p: [cur, p] })
      cur = p
    } else if (c === 'C') {
      const a = [num(), num()], b = [num(), num()], p = [num(), num()]
      segs.push({ k: 'C', p: [cur, a, b, p] })
      cur = p
    } else if (c === 'Z' || c === 'z') {
      if (Math.hypot(cur[0] - start[0], cur[1] - start[1]) > 1e-6) segs.push({ k: 'L', p: [cur, start] })
      cur = start
    } else throw new Error(`comando inesperado en la marca: ${c}`)
  }
  return segs
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
function at(s, t) {
  if (s.k === 'L') return lerp(s.p[0], s.p[1], t)
  const [p0, p1, p2, p3] = s.p
  const a = lerp(p0, p1, t), b = lerp(p1, p2, t), c = lerp(p2, p3, t)
  return lerp(lerp(a, b, t), lerp(b, c, t), t)
}
/** Parte un segmento en t (de Casteljau). */
function split(s, t) {
  if (s.k === 'L') {
    const m = lerp(s.p[0], s.p[1], t)
    return [{ k: 'L', p: [s.p[0], m] }, { k: 'L', p: [m, s.p[1]] }]
  }
  const [p0, p1, p2, p3] = s.p
  const a = lerp(p0, p1, t), b = lerp(p1, p2, t), c = lerp(p2, p3, t)
  const d = lerp(a, b, t), e = lerp(b, c, t), m = lerp(d, e, t)
  return [{ k: 'C', p: [p0, a, d, m] }, { k: 'C', p: [m, e, c, p3] }]
}
const reverse = (segs) => segs.slice().reverse().map((s) => ({ k: s.k, p: s.p.slice().reverse() }))
const f = (n) => (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, '') || '0'
function toD(segs) {
  let d = `M${f(segs[0].p[0][0])} ${f(segs[0].p[0][1])}`
  for (const s of segs) d += s.k === 'L' ? `L${f(s.p[1][0])} ${f(s.p[1][1])}` : `C${s.p.slice(1).map((q) => `${f(q[0])} ${f(q[1])}`).join(' ')}`
  return d
}
function bbox(segs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const s of segs)
    for (let i = 0; i <= 48; i++) {
      const [x, y] = at(s, i / 48)
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
    }
  return [x0, y0, x1, y1].map((n) => Math.round(n * 100) / 100)
}

// ---------- el logotipo, por letras ----------
const logoSvg = readFileSync(LOGO, 'utf8')
const [wordD, regD] = paths(logoSvg)
if (!wordD || !regD) throw new Error('logo.svg: se esperaban dos trazos (la palabra y la ®)')
const subs = subpaths(wordD)
if (subs.join('') !== wordD.replace(/\s+(?=M)/g, '')) throw new Error('los subtrazos no rehacen el trazo')
const boxes = subs.map((s) => bbox(parse(s)))
// Una letra = los subtrazos cuya caja está dentro de la del primero que la abre (la O tiene su contraforma adentro).
const groups = []
subs.forEach((s, i) => {
  const b = boxes[i]
  const g = groups.find((g) => b[0] >= g.box[0] - 0.01 && b[2] <= g.box[2] + 0.01)
  if (g) g.idx.push(i)
  else groups.push({ idx: [i], box: b })
})
// La E son tres barras con la misma x: tres cajas iguales en x se agrupan arriba como una letra; se separan después.
const ids = ['O', 'C', 'E', 'A', 'N']
if (groups.length !== 5) throw new Error(`se esperaban 5 letras y salieron ${groups.length}`)
const letters = groups.map((g, n) => {
  const segs = g.idx.flatMap((i) => parse(subs[i]))
  return { id: ids[n], parts: g.idx.map((i) => subs[i]), box: bbox(segs) }
})
const E = letters[2]
if (E.parts.length !== 3) throw new Error('la E debería tener tres barras')
const O = letters[0], C = letters[1], N = letters[4]
// Guías de las máscaras (no se ven: solo dicen por dónde entra la luz).
const ring = (L) => {
  const [x0, y0, x1, y1] = L.box
  const w = O.box[2] - O.box[0] // la C es el anillo de la O con un corte: mismo ancho
  return { cx: Math.round((x0 + w / 2) * 100) / 100, cy: Math.round(((y0 + y1) / 2) * 100) / 100, rx: w / 2, ry: (y1 - y0) / 2 }
}
const oRing = ring(O)
const cRing = ring(C)
// El corte de la C: ángulo del extremo de arriba (el primer punto del trazo) respecto del centro del anillo.
const cStart = parse(C.parts[0])[0].p[0]
const cutDeg = Math.round((Math.atan2(cRing.cy - cStart[1], cStart[0] - cRing.cx) * 180) / Math.PI * 10) / 10
// La N: astas y diagonal. El ancho de un asta es la distancia entre los dos primeros puntos del trazo.
const nSegs = parse(N.parts[0])
const stem = Math.round((nSegs[0].p[1][0] - nSegs[0].p[0][0]) * 100) / 100
const [nx0, ny0, nx1, ny1] = N.box
const nSkel = [
  [nx0 + stem / 2, ny1],
  [nx0 + stem / 2, ny0],
  [nx1 - stem / 2, ny1],
  [nx1 - stem / 2, ny0],
].map((p) => p.map((n) => Math.round(n * 100) / 100))

// ---------- el símbolo ----------
const symSvg = readFileSync(SIMBOLO, 'utf8')
const [symD] = paths(symSvg)
const symSubs = subpaths(symD)
if (symSubs.length !== 2) throw new Error('el símbolo debería tener dos formas en S')
const symSegs = symSubs.map(parse)
// La estrella: el centro de la simetría por giro de 180° (el punto medio de los dos puntos de partida).
const pa = symSegs[0][0].p[0], pb = symSegs[1][0].p[0]
const center = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2].map((n) => Math.round(n * 1000) / 1000)
const traces = symSegs.map((segs) => {
  // el punto del contorno más cercano a la estrella
  let best = { d: Infinity, k: 0, t: 0 }
  segs.forEach((s, k) => {
    for (let i = 0; i <= 400; i++) {
      const t = i / 400
      const [x, y] = at(s, t)
      const d = Math.hypot(x - center[0], y - center[1])
      if (d < best.d) best = { d, k, t }
    }
  })
  let { k, t } = best
  t = Math.min(Math.max(t, 0.001), 0.999)
  const [a, b] = split(segs[k], t)
  const fwd = [b, ...segs.slice(k + 1), ...segs.slice(0, k), a]
  return { fwd: toD(fwd), rev: toD(reverse(fwd)), from: at(segs[k], t).map((n) => Math.round(n * 100) / 100) }
})

const out = {
  _: 'Generado por tools/marca/letras.mjs desde marca/v3/logo.svg y marca/v3/simbolo-simetrico.svg. No editar a mano.',
  logo: { hash: fnv(wordD + regD), viewBox: viewBox(logoSvg) },
  letters: letters.map(({ id, parts, box }) => ({ id, parts, box })),
  reg: { box: bbox(parse(subpaths(regD)[0])) },
  guides: { o: oRing, c: { ...cRing, cutDeg }, n: { stem, skel: nSkel } },
  symbol: { hash: fnv(symD), viewBox: viewBox(symSvg), center, traces, boxes: symSegs.map(bbox) },
}
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
console.log(`letras.json: ${letters.map((l) => `${l.id}×${l.parts.length}`).join(' ')} · estrella ${center.join(',')} · corte de la C ${cutDeg}° · ${(JSON.stringify(out).length / 1024).toFixed(1)} KB`)
