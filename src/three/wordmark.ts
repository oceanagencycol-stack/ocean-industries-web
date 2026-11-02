/**
 * The Ocean wordmark as glass pieces: the outlines of the brand's own logo (src/brand/wordmark.svg, traced once from
 * the 2501 px master), extruded with rounded edges, one mesh per piece (the O, the "cean" with its wave, the four
 * letters of INDS., its point and the ®) so the intro can bring them up out of the water one after another. The logo
 * is never redrawn: these are its own outlines.
 *
 * Each piece is centred on itself (it turns around its own middle) and `center` says where it sits in the wordmark.
 * Units: the whole wordmark is WORD_W wide.
 */
import { BufferGeometry, ExtrudeGeometry, Vector3 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import wordmarkSVG from '../brand/wordmark.svg?raw'

export type PieceId = 'o' | 'cean' | 'i' | 'n' | 'd' | 's' | 'dot' | 'reg' | 'reg-r'

export interface Piece {
  id: PieceId
  geometry: BufferGeometry
  /** where the piece's middle sits in the wordmark */
  center: Vector3
  size: Vector3
  /** order in which it rises out of the water (0 first) */
  order: number
}

export const WORD_W = 4

/** depth, bevel and rising order by piece (units: the wordmark is WORD_W wide); z: front-to-back offset */
const SPEC: Record<PieceId, { depth: number; bevel: number; z: number; order: number }> = {
  o: { depth: 0.2, bevel: 0.012, z: -0.02, order: 0 },
  cean: { depth: 0.2, bevel: 0.012, z: 0.02, order: 1 },
  i: { depth: 0.1, bevel: 0.006, z: 0.04, order: 2 },
  n: { depth: 0.1, bevel: 0.006, z: 0.04, order: 2 },
  d: { depth: 0.1, bevel: 0.006, z: 0.04, order: 2 },
  s: { depth: 0.1, bevel: 0.006, z: 0.04, order: 2 },
  dot: { depth: 0.1, bevel: 0.006, z: 0.04, order: 2 },
  reg: { depth: 0.05, bevel: 0.004, z: 0.0, order: 3 },
  'reg-r': { depth: 0.05, bevel: 0.004, z: 0.0, order: 3 },
}

const nextTask = (): Promise<void> => {
  const sch = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  return sch?.yield ? sch.yield() : new Promise((r) => setTimeout(r, 0))
}

/** Builds the pieces, one per task (the page keeps answering in between). */
export async function buildWordmark(quality: { bevelSegments: number; curveSegments: number }): Promise<{ pieces: Piece[]; height: number }> {
  const data = new SVGLoader().parse(wordmarkSVG)
  const vb = (wordmarkSVG.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 1 1').split(/\s+/).map(Number)
  const unit = WORD_W / vb[2]
  const cx = vb[0] + vb[2] / 2
  const cy = vb[1] + vb[3] / 2
  const out: Piece[] = []
  for (const p of data.paths) {
    const id = ((p.userData?.node as Element | undefined)?.getAttribute('id') ?? '') as PieceId
    const s = SPEC[id]
    if (!s) continue
    await nextTask()
    const big = id === 'o' || id === 'cean'
    const extruded = new ExtrudeGeometry(p.toShapes(), {
      depth: s.depth / unit,
      curveSegments: big ? quality.curveSegments : Math.max(4, Math.round(quality.curveSegments * 0.6)),
      bevelEnabled: true,
      bevelThickness: (s.bevel * 2) / unit,
      bevelSize: s.bevel / unit,
      bevelSegments: big ? quality.bevelSegments : Math.max(2, quality.bevelSegments - 2),
    })
    extruded.translate(-cx, -cy, -s.depth / unit / 2)
    // SVG y runs down: a half turn around x (y and z flipped together) sets it upright without mirroring, so the
    // triangles keep their winding and the normals still point out
    extruded.scale(unit, -unit, -unit)
    const geo = toCreasedNormals(extruded, Math.PI / 5)
    extruded.dispose()
    geo.computeBoundingBox()
    const box = geo.boundingBox!
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    geo.translate(-center.x, -center.y, -center.z)
    center.z = s.z
    geo.computeBoundingSphere()
    out.push({ id, geometry: geo, center, size, order: s.order })
  }
  return { pieces: out, height: vb[3] * unit }
}
