/**
 * Página de desarrollo de la maqueta en gris (dev-world.html): las secciones de los tramos, la pista del scroll y el
 * mundo. three.js llega con import dinámico (greybox.ts) después del primer pintado; Lenis solo en escritorio y con
 * `autoRaf: false` (el bucle del mundo lo mueve y duerme con él); en el teléfono, scroll nativo.
 *
 * QA: `?qa=seek=<0..1>` posa la toma; `?qa=trace` guarda cada cuadro; `?q=high|mid|low` y `?dpr=` fuerzan calidad.
 * Todo lo de QA vive en `window.__world`.
 */
import '@fontsource-variable/archivo/wdth.css'
import { newPose, pose, ScrollTrack, seekParam } from './camera'
import type { World } from './greybox'

type Tier = 'high' | 'mid' | 'low'

const params = new URLSearchParams(location.search)
const qa = params.get('qa') ?? ''
const seek = seekParam()
const trace = /trace/.test(qa)
const coarse = matchMedia('(pointer: coarse)').matches
const mobile = coarse || /Android|iP(hone|ad|od)/.test(navigator.userAgent)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

if (qa) document.documentElement.classList.add('qa')
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

const canvas = document.getElementById('world') as HTMLCanvasElement
const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-shot]'))
const track = new ScrollTrack(sections)

interface QAHook {
  ready: boolean
  error?: string
  world?: World
  track: ScrollTrack
  anchors: () => { y: number; s: number }[]
  [k: string]: unknown
}
const hook: QAHook = { ready: false, track, anchors: () => track.anchors(), poseAt: (s: number) => pose(s, newPose()) }
;(window as unknown as { __world: QAHook }).__world = hook

function pickTier(): Tier {
  const f = params.get('q')
  if (f === 'high' || f === 'mid' || f === 'low') return f
  if (mobile) return 'mid'
  const cores = navigator.hardwareConcurrency ?? 4
  return cores >= 8 ? 'high' : 'mid'
}

/** Después del primer pintado y con el hilo libre: three.js no compite con el texto. */
function whenCalm(): Promise<void> {
  return new Promise((res) => {
    requestAnimationFrame(() => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
      if (ric) ric(() => res(), { timeout: 600 })
      else setTimeout(res, 50)
    })
  })
}

async function boot(): Promise<void> {
  const probe = document.createElement('canvas').getContext('webgl2')
  if (!probe) {
    document.documentElement.classList.add('no-world')
    hook.error = 'sin WebGL2'
    return
  }
  probe.getExtension('WEBGL_lose_context')?.loseContext()
  await whenCalm()

  // Lenis solo en escritorio (y nunca al posar la toma ni con movimiento reducido)
  let lenis: import('lenis').default | null = null
  if (!mobile && seek === null && !reduced) {
    const { default: Lenis } = await import('lenis')
    lenis = new Lenis({ autoRaf: false, lerp: 0.12, smoothWheel: true })
  }

  const { createWorld } = await import('./greybox')
  const world = await createWorld(canvas, { tier: pickTier(), mobile, track, lenis, seek, trace })
  hook.world = world

  // lo que despierta al mundo
  const wake = world.wake
  addEventListener('scroll', wake, { passive: true })
  addEventListener('wheel', wake, { passive: true })
  addEventListener('touchstart', wake, { passive: true })
  addEventListener('touchmove', wake, { passive: true })
  addEventListener('keydown', wake, { passive: true })
  addEventListener('resize', wake, { passive: true })
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wake()
  })
  if (!coarse && seek === null) {
    addEventListener(
      'pointermove',
      (e) => world.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1)),
      { passive: true },
    )
  }

  if (seek !== null) await world.seek(seek)
  else world.start()
  canvas.classList.add('is-on')
  hook.ready = true
}

boot().catch((e: unknown) => {
  hook.error = String(e instanceof Error ? e.stack || e.message : e)
  console.error(e)
})
