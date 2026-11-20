const LIMB = { cx: 1997.85 / 1920, cy: 3006.54 / 1068, r: 2686.4, w: 1920, h: 1068 }
const MIN_MS = 850

export type Project = (vx: number, vy: number, out: [number, number]) => [number, number]

export interface Preload {
  /** la película como blob local (o null si hubo que usar la red directa) */
  url: Promise<string | null>
  /** se resuelve cuando el negro empieza a abrirse */
  opened: Promise<void>
}

const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
export function preload(src: string, project: Project, opts: { reduced: boolean; quick: boolean; decoded: Promise<void> }): Preload {
  const root = document.querySelector<HTMLElement>('.pre')
  const svg = root?.querySelector<SVGSVGElement>('.pre__svg')
  const rim = root?.querySelector<SVGPathElement>('.pre__rim')
  const brand = root?.querySelector<HTMLElement>('.pre__brand')
  const dock = document.querySelector<SVGSVGElement>('.nav__logo')
  const html = document.documentElement

  let real = 0
  let loaded = 0
  let total = 0
  let percent = -1
  const start = performance.now()
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
        const next = Math.floor(real * 100)
        if (next !== percent) {
          percent = next
          root?.style.setProperty('--loaded', String(next / 100))
        }
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

  if (!root || !brand || !dock || !svg || !rim) {
    opts.decoded.then(() => { root?.remove(); resolveOpened() })
    return { url, opened }
  }

  const tmp: [number, number] = [0, 0]
  function geometry() {
    svg!.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`)
    let path = ''
    const a0 = -Math.acos(clamp(((-0.06 - LIMB.cx) * LIMB.w) / LIMB.r, -1, 1))
    const a1 = -Math.acos(clamp(((1.04 - LIMB.cx) * LIMB.w) / LIMB.r, -1, 1))
    const N = 90
    for (let i = 0; i <= N; i++) {
      const a = a0 + ((a1 - a0) * i) / N
      const vx = LIMB.cx + (Math.cos(a) * LIMB.r) / LIMB.w
      const vy = LIMB.cy + (Math.sin(a) * LIMB.r) / LIMB.h
      project(vx, vy, tmp)
      path += (i ? 'L' : 'M') + tmp[0].toFixed(2) + ' ' + tmp[1].toFixed(2)
    }
    rim!.setAttribute('d', path)
  }

  const short = opts.quick || opts.reduced
  root.classList.toggle('pre--quick', short)
  html.classList.add('pre-on')
  opts.decoded.then(async () => {
    if (!short) await new Promise(resolve => setTimeout(resolve, Math.max(0, MIN_MS - (performance.now() - start))))
    if (!root.isConnected) { resolveOpened(); return }
    if (!short) geometry()
    const duration = short ? 220 : 940
    const original = brand.getBoundingClientRect()
    function destination() {
      const target = dock!.getBoundingClientRect()
      return `translate(${target.left - original.left}px, ${target.top - original.top}px) scale(${target.width / original.width})`
    }
    root.style.setProperty('--loaded', '1')
    root.classList.add('is-done')
    html.classList.add('pre-open')
    resolveOpened()
    const move = brand.animate(short ? [{ opacity: 1 }, { opacity: 0 }] :
      [{ transform: 'none' }, { transform: destination() }], {
      duration, easing: 'cubic-bezier(.45,0,.16,1)', fill: 'forwards',
    })
    // On rotation the header moves. Finish the handoff at the live header position.
    const finish = () => {
      root.remove()
      html.classList.remove('pre-on')
      removeEventListener('resize', finish)
    }
    addEventListener('resize', finish, { once: true })
    move.finished.then(finish, finish)
  })
  return { url, opened }
}
