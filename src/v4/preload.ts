const LIMB = { cx: 1997.85 / 1920, cy: 3006.54 / 1068, r: 2686.4, w: 1920, h: 1068 }
// Comienzo y duración en ms. Las tres barras de la E se leen como un solo gesto.
const PEN: Record<string, readonly [number, number]> = {
  O: [0, 630], C: [310, 565],
  E1: [660, 310], E2: [745, 310], E3: [830, 310],
  A: [1030, 500], N: [1330, 595],
}

async function writeWord(root: HTMLElement, speed: number): Promise<void> {
  const drawing: Promise<Animation>[] = []
  for (const stroke of root.querySelectorAll<SVGGeometryElement>('.pre__pen [data-l]')) {
    const [delay, duration] = PEN[stroke.dataset.l!]
    const pen = stroke.animate([
      { strokeDashoffset: '1.28', opacity: 0 },
      { strokeDashoffset: '1', opacity: 1, offset: .10 },
      { strokeDashoffset: '0', opacity: 1 },
    ], { delay: delay / speed, duration: duration / speed, easing: 'cubic-bezier(.42,0,.26,1)', fill: 'both' })
    drawing.push(pen.finished)
  }
  await Promise.allSettled(drawing)
  root.classList.add('pre--signed')
}

/**
 * El isotipo se arma antes de la firma: una estrella de luz se abre en el negro y las dos mitades giran juntas alrededor
 * de ella (un remolino: la estrella fluida) hasta cerrarse en su forma exacta. Solo transforma el maestro; no lo redibuja.
 */
function assembleMark(root: HTMLElement, speed: number): Promise<unknown> {
  const mark = root.querySelector<SVGSVGElement>('.pre__mark')
  if (!mark) return Promise.resolve()
  const ms = (t: number) => t / speed
  const runs: Animation[] = []
  const glow = mark.querySelector('.pre__glow')
  const star = mark.querySelector('.pre__star')
  if (glow) runs.push(glow.animate([
    { opacity: 0, transform: 'scale(.2)' },
    { opacity: 1, transform: 'scale(1)', offset: .22 },
    { opacity: .55, transform: 'scale(1.1)', offset: .55 },
    { opacity: 0, transform: 'scale(1.4)' },
  ], { duration: ms(1500), easing: 'cubic-bezier(.3,0,.2,1)', fill: 'both' }))
  if (star) runs.push(star.animate([
    { opacity: 0, transform: 'scale(.15) rotate(-35deg)' },
    { opacity: 1, transform: 'scale(1.05) rotate(0deg)', offset: .3 },
    { opacity: 1, transform: 'scale(.9) rotate(0deg)', offset: .55 },
    { opacity: 0, transform: 'scale(.55) rotate(0deg)' },
  ], { duration: ms(1350), easing: 'cubic-bezier(.3,0,.2,1)', fill: 'both' }))
  // las dos corrientes llegan desde lados opuestos (la simetría se conserva: una es la otra girada 180°)
  for (const half of mark.querySelectorAll<SVGElement>('.pre__mark__half')) {
    const s = half.classList.contains('pre__mark__half--a') ? -1 : 1
    runs.push(half.animate([
      { opacity: 0, transform: `translate(${s * 210}px, ${s * 150}px) rotate(-75deg) scale(1.12)` },
      { opacity: 1, offset: .32 },
      { opacity: 1, transform: 'translate(0, 0) rotate(0deg) scale(1)' },
    ], { delay: ms(260), duration: ms(1080), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }))
  }
  return Promise.allSettled(runs.map(a => a.finished))
}

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
  root.classList.toggle('pre--still', opts.reduced)
  html.classList.add('pre-on')
  if (!short) {
    geometry()
    root.classList.add('pre--writing')
    addEventListener('resize', geometry)
  }
  // el isotipo se arma y, cuando sus mitades ya giran, el logotipo empieza a escribirse
  const speed = opts.quick ? 3.5 : 1
  const signature = opts.reduced ? Promise.resolve() : Promise.all([
    assembleMark(root, speed),
    new Promise(resolve => setTimeout(resolve, 640 / speed)).then(() => writeWord(root, speed)),
  ])
  Promise.all([opts.decoded, signature]).then(() => {
    removeEventListener('resize', geometry)
    if (!root.isConnected) { resolveOpened(); return }
    const duration = opts.reduced ? 220 : opts.quick ? 370 : 940
    const original = brand.getBoundingClientRect()
    function destination() {
      const target = dock!.getBoundingClientRect()
      return `translate(${target.left - original.left}px, ${target.top - original.top}px) scale(${target.width / original.width})`
    }
    root.style.setProperty('--loaded', '1')
    root.classList.add('is-done')
    html.classList.add('pre-open')
    resolveOpened()
    const move = brand.animate(opts.reduced ? [{ opacity: 1 }, { opacity: 0 }] :
      [{ transform: 'none' }, { transform: destination() }], {
      duration, easing: 'cubic-bezier(.45,0,.16,1)', fill: 'forwards',
    })
    // el logotipo sube a la barra; el isotipo se recoge en su propio giro y se apaga
    const mark = root.querySelector<SVGSVGElement>('.pre__mark')
    mark?.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: opts.reduced ? 'none' : 'scale(.8) rotate(35deg)' }], {
      duration: duration * 0.75, easing: 'cubic-bezier(.45,0,.16,1)', fill: 'forwards',
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
