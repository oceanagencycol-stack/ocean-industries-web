// La tesela de grano de película de la v3 (CONCEPTO, «Grano»): 256 × 256, sin costura, generada por código.
// Grano fino y nítido: ruido gaussiano con una pizca de correlación (el grano de 35 mm no es ruido de un píxel
// exacto), cuantizado a 4 niveles de gris alrededor del gris medio (soft-light no cambia el tono promedio) y guardado
// como PNG gris de 2 bits, ≈ 17 KB. Determinista: la misma semilla da el mismo archivo.
// node tools/grano.mjs  →  public/v3/grano.png
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const N = 256
const OUT = resolve(process.cwd(), 'public/v3/grano.png')

// PRNG pequeño y determinista (mulberry32) + Box-Muller
let seed = 0x0cea4
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand())

const raw = new Float32Array(N * N).map(gauss)
// correlación leve: el centro pesa 4, los cuatro vecinos 1 (con vuelta: la tesela no tiene costura)
const g = new Float32Array(N * N)
const at = (x, y) => raw[((y + N) % N) * N + ((x + N) % N)]
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) g[y * N + x] = (4 * at(x, y) + at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1)) / 8
// normaliza a desviación 1
let m = 0, v = 0
for (const a of g) m += a
m /= g.length
for (const a of g) v += (a - m) ** 2
const sd = Math.sqrt(v / g.length)
// 4 niveles simétricos: 0, 85, 170, 255 (umbrales en ±0,9 σ: casi todo en los dos medios, chispas en los extremos)
const level = (z) => (z < -0.9 ? 0 : z < 0 ? 1 : z < 0.9 ? 2 : 3)

// PNG gris de 2 bits: cada fila = 1 byte de filtro + 64 bytes (4 píxeles por byte)
const rowBytes = N / 4
const data = Buffer.alloc((rowBytes + 1) * N)
for (let y = 0; y < N; y++) {
  data[y * (rowBytes + 1)] = 0
  for (let x = 0; x < N; x++) {
    const l = level((g[y * N + x] - m) / sd)
    data[y * (rowBytes + 1) + 1 + (x >> 2)] |= l << (6 - 2 * (x & 3))
  }
}
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, body) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length)
  const tb = Buffer.concat([Buffer.from(type, 'ascii'), body])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc(tb))
  return Buffer.concat([len, tb, c])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(N, 0)
ihdr.writeUInt32BE(N, 4)
ihdr[8] = 2 // bits por muestra
ihdr[9] = 0 // gris
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(data, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
mkdirSync(resolve(OUT, '..'), { recursive: true })
writeFileSync(OUT, png)
const kb = png.length / 1024
console.log(`grano.png: ${N}×${N}, ${kb.toFixed(1)} KB${kb > 25 ? ' — PASA DE 25 KB' : ''}`)
if (kb > 25) process.exit(1)
