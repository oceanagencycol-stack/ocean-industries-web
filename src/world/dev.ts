/**
 * Página de desarrollo del mundo (dev-world.html): las secciones `[data-tramo]`, Lenis en escritorio y mountWorld().
 * Es lo mismo que hará la página real (ver src/world/README.md).
 *
 * QA: `?qa=seek=<0..1>` posa la toma; `?qa=trace` guarda cada cuadro; `?q=…` deja correr el mundo con WebGL por
 * software (SwiftShader); `?dpr=` fuerza la resolución. Todo lo de QA vive en `window.__world`.
 */
import '@fontsource-variable/archivo/wdth.css'
import { seekParam } from './camera'
import type { WorldHandle } from './plates'

const params = new URLSearchParams(location.search)
const qa = params.get('qa') ?? ''
const seek = seekParam()
const mobile = matchMedia('(pointer: coarse)').matches || /Android|iP(hone|ad|od)/.test(navigator.userAgent)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
if (qa) document.documentElement.classList.add('qa')
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

interface QAHook {
  ready: boolean
  error?: string
  world?: WorldHandle
  [k: string]: unknown
}
const hook: QAHook = { ready: false }
;(window as unknown as { __world: QAHook }).__world = hook

/** Después del primer pintado y con el hilo libre: el mundo no compite con el texto. */
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
  await whenCalm()
  let lenis: import('lenis').default | null = null
  if (!mobile && seek === null && !reduced) {
    const { default: Lenis } = await import('lenis')
    lenis = new Lenis({ autoRaf: false, lerp: 0.12, smoothWheel: true })
  }
  const { mountWorld } = await import('./plates')
  const canvas = document.getElementById('world') as HTMLCanvasElement
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-tramo]'))
  const world = await mountWorld({ canvas, sections, lenis, seek, trace: /trace/.test(qa) })
  hook.world = world
  hook.track = (world as unknown as { scrollTrack?: unknown }).scrollTrack
  hook.ready = true
}

boot().catch((e: unknown) => {
  hook.error = String(e instanceof Error ? e.stack || e.message : e)
  console.error(e)
})
