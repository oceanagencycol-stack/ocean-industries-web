/**
 * El preloader: baja la película entera antes de empezar (así ninguna búsqueda del scroll espera a la red) y, mientras
 * baja, dibuja el borde de la Tierra exactamente donde está en el primer cuadro. El símbolo de OCEAN viaja por la línea
 * como la cabeza del trazo y termina donde sale el sol. Al 100 % el negro se abre: la línea ya es el borde de la Tierra.
 *
 * El borde salió del primer cuadro (ajuste de círculo a la línea azul, error medio < 1 px): centro (1997,8; 3006,5),
 * radio 2686,4 en el cuadro de 1920 × 1068.
 */
const LIMB = { cx: 1997.85 / 1920, cy: 3006.54 / 1068, r: 2686.4, w: 1920, h: 1068 }
const MIN_MS = 2300

export type Project = (vx: number, vy: number, out: [number, number]) => [number, number]

export interface Preload {
  /** la película como blob local (o null si hubo que usar la red directa) */
  url: Promise<string | null>
  /** se resuelve cuando el negro empieza a abrirse */
  opened: Promise<void>
}

const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
const ease = (x: number) => 1 - Math.pow(1 - x, 3)

export function preload(src: string, project: Project, opts: { reduced: boolean; quick: boolean; decoded: Promise<void> }): Preload {
  const root = document.querySelector<HTMLElement>('.pre')
  const svg = root?.querySelector<SVGSVGElement>('.pre__svg')
  const rim = root?.querySelector<SVGPathElement>('.pre__rim')
  const halo = root?.querySelector<SVGPathElement>('.pre__halo')
  const head = root?.querySelector<HTMLElement>('.pre__head')
  const num = root?.querySelector<HTMLElement>('[data-pre-n]')
  const mb = root?.querySelector<HTMLElement>('[data-pre-mb]')
  const html = document.documentElement

  let real = 0
  let loaded = 0
  let total = 0
  let done = false
  let resolveOpened: () => void = () => {}
  const opened = new Promise<void>((r) => (resolveOpened = r))

  // ---- la descarga ----
  const url = (async (): Promise<string | null> => {
    const abort = new AbortController()
    let idle = window.setTimeout(() => abort.abort(), 12000)
    try {
      const res = await fetch(src, { cache: 'force-cache', signal: abort.signal })
      if (!res.ok || !res.body) throw new Error(String(res.status))
      total = Number(res.headers.get('content-length')) || 0
      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      for (;;) {
        const { done: end, value } = await reader.read()
        if (end) break
        clearTimeout(idle)
        idle = window.setTimeout(() => abort.abort(), 12000)
        chunks.push(value)
        loaded += value.byteLength
        real = total ? loaded / total : Math.min(0.95, real + 0.01)
      }
      real = 1
      return URL.createObjectURL(new Blob(chunks as BlobPart[], { type: 'video/mp4' }))
    } catch {
      real = 1
      return null
    } finally {
      clearTimeout(idle)
    }
  })()

  let decoded = false
  opts.decoded.then(() => { decoded = true })
  if (!root || !svg || !rim || !halo || !head || !num) {
    opts.decoded.then(() => resolveOpened())
    return { url, opened }
  }

  // ---- la línea: el borde de la Tierra en coordenadas de pantalla ----
  const pts: [number, number][] = []
  let len = 0
  const tmp: [number, number] = [0, 0]
  function geometry() {
    const W = innerWidth, H = innerHeight
    svg!.setAttribute('viewBox', `0 0 ${W} ${H}`)
    pts.length = 0
    // ángulos donde el borde cruza la pantalla, de izquierda a derecha
    const a0 = -Math.acos(clamp(((-0.06 - LIMB.cx) * LIMB.w) / LIMB.r, -1, 1))
    const a1 = -Math.acos(clamp(((1.04 - LIMB.cx) * LIMB.w) / LIMB.r, -1, 1))
    const N = 90
    for (let i = 0; i <= N; i++) {
      const a = a0 + ((a1 - a0) * i) / N
      const vx = LIMB.cx + (Math.cos(a) * LIMB.r) / LIMB.w
      const vy = LIMB.cy + (Math.sin(a) * LIMB.r) / LIMB.h
      project(vx, vy, tmp)
      pts.push([tmp[0], tmp[1]])
    }
    const d = 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')
    rim!.setAttribute('d', d)
    halo!.setAttribute('d', d)
    len = rim!.getTotalLength()
    for (const p of [rim!, halo!]) p.style.strokeDasharray = `${len} ${len}`
  }
  geometry()
  addEventListener('resize', geometry)

  const t0 = performance.now()
  const minMs = opts.quick ? 250 : MIN_MS
  let shown = 0
  let openAt = 0
  let previous = t0
  root.classList.toggle('pre--quick', opts.quick || opts.reduced)

  function frame(now: number) {
    const timeK = clamp((now - t0) / minMs)
    const target = Math.min(real, decoded ? 1 : 0.98, ease(timeK))
    shown += (target - shown) * (1 - Math.exp(-(now - previous) / 45))
    previous = now
    if (target >= 1 && shown > 0.995) shown = 1
    const off = len * (1 - shown)
    rim!.style.strokeDashoffset = String(off)
    halo!.style.strokeDashoffset = String(off)
    // la cabeza del trazo: el símbolo de OCEAN sobre la línea
    const i = Math.min(pts.length - 1, Math.round(shown * (pts.length - 1)))
    const p = pts[i]
    if (p) head!.style.transform = `translate3d(${p[0]}px, ${p[1]}px, 0) rotate(${shown * 220}deg)`
    num!.textContent = String(Math.round(shown * 100))
    root!.style.setProperty('--k', shown.toFixed(3))
    if (mb && total) mb.textContent = `${(loaded / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB`

    if (shown >= 1 && !done) {
      done = true
      openAt = now
      root!.classList.add('is-done')
      html.classList.add('pre-open')
      resolveOpened()
    }
    if (done && now - openAt > (opts.quick ? 500 : 1400)) {
      root!.remove()
      removeEventListener('resize', geometry)
      html.classList.remove('pre-on')
      return
    }
    requestAnimationFrame(frame)
  }
  html.classList.add('pre-on')
  if (opts.reduced) {
    // sin dibujo: el número y luego un fundido
    opts.decoded.then(() => {
      root.classList.add('is-done')
      html.classList.add('pre-open')
      resolveOpened()
      setTimeout(() => {
        root.remove()
        removeEventListener('resize', geometry)
        html.classList.remove('pre-on')
      }, 450)
    })
    return { url, opened }
  }
  requestAnimationFrame(frame)
  return { url, opened }
}
