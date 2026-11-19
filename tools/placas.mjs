// Las placas de la toma (v3): de media/v3/direccion/<src>.jpg a public/v3/world/.
//
//   node tools/placas.mjs
//
// Por placa (src/world/plates.json):
//   <id>-2560|1920|1280.avif y .webp   escritorio (16:9 de la fuente, solo se reduce)
//   <id>-v.avif y .webp                teléfono: recorte vertical 1080×1920 centrado en `vx`
// y src/world/plates.thumbs.json: una miniatura de 32 px (escritorio) y otra de 18×32 (teléfono) en WebP base64, que
// el mundo pinta mientras llega la buena (la cámara nunca espera).
// Presupuesto (AVIF): 1920 ≤ 260 KB, vertical ≤ 180 KB; los demás anchos, por área. La calidad se busca por placa:
// la más alta que entra. Falla si una no entra ni a la calidad mínima.
import sharp from 'sharp'
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'media/v3/direccion')
const OUT = join(ROOT, 'public/v3/world')
const { plates } = JSON.parse(readFileSync(join(ROOT, 'src/world/plates.json'), 'utf8'))
mkdirSync(OUT, { recursive: true })

const KB = 1024
const AVIF_1920 = 260 * KB
const AVIF_V = 180 * KB
const WIDTHS = [2560, 1920, 1280]

/** la calidad más alta (de `qs`) cuyo archivo entra en `budget` */
async function fit(pipeline, fmt, budget, qs) {
  let last = null
  for (const q of qs) {
    const opts = fmt === 'avif' ? { quality: q, effort: 5, chromaSubsampling: '4:2:0' } : { quality: q, effort: 5, smartSubsample: true }
    const buf = await pipeline.clone()[fmt](opts).toBuffer()
    last = { buf, q }
    if (buf.length <= budget) return last
  }
  return { ...last, over: true }
}

const rows = []
const thumbs = {}
let failed = false
for (const p of plates) {
  const file = join(SRC, `${p.src}.jpg`)
  const meta = await sharp(file).metadata()
  // escritorio
  for (const w of WIDTHS) {
    const base = sharp(file).resize({ width: Math.min(w, meta.width), kernel: 'lanczos3' })
    const budget = Math.round(AVIF_1920 * (w / 1920) ** 2)
    const a = await fit(base, 'avif', budget, [84, 78, 72, 66, 60, 54, 48, 42])
    const wb = await fit(base, 'webp', Math.round(budget * 1.6), [88, 82, 76, 70, 64, 58])
    writeFileSync(join(OUT, `${p.id}-${w}.avif`), a.buf)
    writeFileSync(join(OUT, `${p.id}-${w}.webp`), wb.buf)
    rows.push([`${p.id}-${w}`, a.buf.length, a.q, budget, wb.buf.length, wb.q])
    if (a.over && w === 1920) failed = true
  }
  // teléfono: recorte vertical 9:16 de toda la altura, centrado en vx
  const cw = Math.round((meta.height * 9) / 16)
  const left = Math.max(0, Math.min(meta.width - cw, Math.round(p.vx * meta.width - cw / 2)))
  const vert = sharp(file).extract({ left, top: 0, width: cw, height: meta.height }).resize({ width: 1080, height: 1920, kernel: 'lanczos3' })
  const va = await fit(vert, 'avif', AVIF_V, [84, 78, 72, 66, 60, 54, 48, 42])
  const vw = await fit(vert, 'webp', Math.round(AVIF_V * 1.6), [88, 82, 76, 70, 64, 58])
  writeFileSync(join(OUT, `${p.id}-v.avif`), va.buf)
  writeFileSync(join(OUT, `${p.id}-v.webp`), vw.buf)
  rows.push([`${p.id}-v`, va.buf.length, va.q, AVIF_V, vw.buf.length, vw.q])
  if (va.over) failed = true
  // miniaturas (la placa entera y el recorte vertical)
  const td = await sharp(file).resize({ width: 32 }).webp({ quality: 60 }).toBuffer()
  const tv = await sharp(file).extract({ left, top: 0, width: cw, height: meta.height }).resize({ width: 18, height: 32 }).webp({ quality: 60 }).toBuffer()
  thumbs[p.id] = { d: `data:image/webp;base64,${td.toString('base64')}`, v: `data:image/webp;base64,${tv.toString('base64')}`, w: meta.width, h: meta.height, vleft: left / meta.width, vwidth: cw / meta.width }
}
writeFileSync(join(ROOT, 'src/world/plates.thumbs.json'), JSON.stringify(thumbs, null, 1) + '\n')

const k = (n) => `${(n / KB).toFixed(0)} KB`
console.log('placa'.padEnd(18), 'AVIF'.padStart(8), 'q', 'tope'.padStart(8), 'WebP'.padStart(9), 'q')
for (const [n, a, qa, b, w, qw] of rows) console.log(n.padEnd(18), k(a).padStart(8), String(qa).padStart(2), k(b).padStart(8), k(w).padStart(9), String(qw).padStart(2), a > b ? '  ✗ pasa el presupuesto' : '')
const total = rows.reduce((s, r) => s + r[1], 0)
console.log(`AVIF en total: ${k(total)} · ${statSync(OUT) ? OUT.replace(ROOT + '/', '') : ''}`)
if (failed) {
  console.error('una placa no entra en su presupuesto ni a la calidad mínima')
  process.exit(1)
}
