/**
 * El arranque de la v3 de OCEAN (docs/v3/CONCEPTO.md, ARQUITECTURA.md).
 *
 *  - La página es HTML real y se lee entera sin JavaScript: cada tramo trae su placa de respaldo (<picture>).
 *  - La intro (src/intro-v3, por su API) se decide antes de pintar (script de arranque: html.intro-due); mientras
 *    corre, la portada espera y entra cuando el negro se abre.
 *  - El mundo (src/world, WebGL2, por su API) se pide en un momento tranquilo: después del primer pintado y con el
 *    hilo libre, nunca con movimiento reducido ni ahorro de datos, y nunca precargado. Si monta, las placas se
 *    esconden (html.has-world); si no, se quedan: esa es la versión quieta.
 *  - Una sola gramática de entrada (src/v3/reveal.ts). Sin GSAP, sin Lenis, sin three.js en el primer trozo.
 *  - Lo que funcionaba en la v2 sigue: idioma, WhatsApp por contexto, escenas, Valeria, el chat, Cal.com, Wompi,
 *    los reels y GA4 (solo en el dominio real).
 */
import './styles/fonts.css'
import './styles/v3.css'
import './styles/demos.css'

import { store } from './core/storage'
import { initLang, lang } from './ui/i18n'
import { initWhatsApp } from './ui/wa'
import { initMenu } from './ui/menu'
import { initDemos, seekDemo } from './ui/demos'
import { initLive } from './ui/live'
import { initChat } from './ui/chat'
import { initPay } from './ui/pay'
import { initReels } from './ui/reels'
import { initBooking } from './ui/booking'
import { initAnalytics } from './ui/analytics'
import { initChrome } from './v3/chrome'
import { initSound, markReplay } from './v3/sound-gate'
import { initReveal, holdHero, releaseHero } from './v3/reveal'
import { hasRealIntro, hasRealWorld, loadWorld, playIntro, type WorldHandle } from './v3/bridge'

const html = document.documentElement
const params = new URLSearchParams(location.search)
const reduced = html.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches
if (reduced) html.classList.add('no-motion')
const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
const saveData = conn?.saveData === true || /(^|-)2g$/.test(conn?.effectiveType ?? '')
// QA: ?qa=1&noworld deja la página sin el mundo (capturas rápidas en el sandbox sin GPU)
const noWorld = params.has('noworld')
const MOTION_KEY = 'ocean-motion-paused'

/* ---------- la página ---------- */
initLang()
initWhatsApp()
initChrome()
initMenu()
initDemos()
initLive()
initPay()
initReels()
initBooking()
initChat()
initAnalytics()
initSound()

const introDue = html.classList.contains('intro-due')
if (introDue) holdHero()
initReveal()

/* ---------- la intro ---------- */
if (introDue) {
  void playIntro(document.querySelector('[data-intro-dock]'), lang()).finally(() => {
    document.querySelectorAll('[data-intro-veil]').forEach((v) => v.remove())
    html.classList.remove('intro-due')
    releaseHero()
  })
}

// «Repetir la intro»: solo donde hay intro de verdad y movimiento
const replay = document.querySelector<HTMLButtonElement>('[data-replay]')
if (replay && hasRealIntro && !reduced) {
  replay.hidden = false
  replay.addEventListener('click', () => {
    store.remove('ocean-v3-intro-at')
    markReplay()
    history.replaceState(null, '', location.pathname)
    window.scrollTo(0, 0)
    location.reload()
  })
}

/* ---------- el mundo ---------- */
const canvas = document.getElementById('world') as HTMLCanvasElement | null
let world: WorldHandle | null = null
let mounting = false

async function mount(): Promise<void> {
  if (!canvas || world || mounting) return
  mounting = true
  try {
    const m = await loadWorld()
    const h = await m.mountWorld({ canvas, sections: document.querySelectorAll<HTMLElement>('[data-tramo]') })
    if (h && typeof h.dispose === 'function') {
      world = h
      html.classList.add('has-world')
      showMotionToggle()
    }
  } catch (err) {
    console.warn('[ocean] el mundo no montó: queda la versión quieta', err)
  } finally {
    mounting = false
  }
}

function unmount(): void {
  world?.dispose()
  world = null
  html.classList.remove('has-world')
}

/** Un momento tranquilo para lo pesado: después de pintar y, donde existe, con el hilo libre. */
function whenCalm(maxMs = 2000): Promise<void> {
  type Ric = (cb: () => void, opts?: { timeout: number }) => number
  const ric = (window as Window & { requestIdleCallback?: Ric }).requestIdleCallback
  return new Promise((resolve) =>
    requestAnimationFrame(() => window.setTimeout(() => (ric ? ric(() => resolve(), { timeout: maxMs }) : window.setTimeout(resolve, 80)), 0)),
  )
}

// «Pausar el movimiento» (WCAG 2.2.2): suelta el mundo y deja las placas quietas; se recuerda
const motionBtn = document.querySelector<HTMLButtonElement>('[data-motion-toggle]')
function paintMotion(paused: boolean): void {
  if (!motionBtn) return
  motionBtn.setAttribute('aria-pressed', String(paused))
  const words = paused
    ? { es: 'Reanudar el movimiento', en: 'Resume motion', pt: 'Retomar o movimento' }
    : { es: 'Pausar el movimiento', en: 'Pause motion', pt: 'Pausar o movimento' }
  motionBtn.dataset.es = words.es
  motionBtn.dataset.en = words.en
  motionBtn.dataset.pt = words.pt
  motionBtn.textContent = words[lang()]
}
function showMotionToggle(): void {
  if (!motionBtn) return
  motionBtn.hidden = false
  paintMotion(store.get(MOTION_KEY) === '1')
}
motionBtn?.addEventListener('click', () => {
  const paused = store.get(MOTION_KEY) !== '1'
  store.set(MOTION_KEY, paused ? '1' : '0')
  paintMotion(paused)
  if (paused) unmount()
  else void mount()
})

const worldOK = !!canvas && !noWorld && !reduced && !saveData
if (worldOK && hasRealWorld && store.get(MOTION_KEY) === '1') showMotionToggle()
else if (worldOK) void whenCalm().then(mount)

// ---- QA (solo con ?qa en la dirección): posar escenas y saltar sin animación ----
if (params.has('qa')) {
  ;(window as Window & { __ocean?: unknown }).__ocean = {
    seekDemo,
    get world() {
      return world
    },
    to: (y: number) => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }),
  }
}
