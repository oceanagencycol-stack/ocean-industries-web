/**
 * El arranque de la v3 de OCEAN (docs/v3/CONCEPTO.md, ARQUITECTURA.md).
 *
 *  - La página es HTML real y se lee entera sin JavaScript: cada tramo trae su placa de respaldo (<picture>).
 *  - La intro (src/intro-v3, por su API) se decide antes de pintar (script de arranque: html.intro-due); mientras
 *    corre, la portada espera y entra cuando el negro se abre.
 *  - Las tomas ambientales se cargan por tramo después de pintar. El mundo WebGL2 sigue disponible para QA.
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
import { mountCinema } from './v3/cinema'
import { hasRealIntro, hasRealWorld, loadWorld, playIntro, type WorldHandle } from './v3/bridge'

const html = document.documentElement
const params = new URLSearchParams(location.search)
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
const reduced = html.classList.contains('no-motion') || motionQuery.matches
if (reduced) html.classList.add('no-motion')
const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
const saveData = conn?.saveData === true || /(^|-)2g$/.test(conn?.effectiveType ?? '')
// QA: ?qa=1&noworld deja la página sin el mundo (capturas rápidas en el sandbox sin GPU)
const noWorld = params.has('noworld')
const useWorld = params.has('world') || params.has('q')
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
const intro = introDue
  ? playIntro(document.querySelector('[data-intro-dock]'), lang()).finally(() => {
      document.querySelectorAll('[data-intro-veil]').forEach((v) => v.remove())
      html.classList.remove('intro-due')
      releaseHero()
    })
  : Promise.resolve()

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
let cinema: ReturnType<typeof mountCinema> = null
let mounting = false
let ready = false
let paused = store.get(MOTION_KEY) === '1'

function shouldMove(): boolean {
  return ready && !noWorld && !motionQuery.matches && !saveData && !paused
}

async function mountWorld(): Promise<void> {
  if (!canvas || world || mounting || !shouldMove()) return
  mounting = true
  try {
    const m = await loadWorld()
    if (!shouldMove()) return
    const h = await m.mountWorld({ canvas, sections: document.querySelectorAll<HTMLElement>('[data-tramo]') })
    if (h && typeof h.dispose === 'function') {
      if (!shouldMove()) {
        h.dispose()
        return
      }
      world = h
      html.classList.add('has-world')
      showMotionToggle(true)
    }
  } catch (err) {
    console.warn('[ocean] el mundo no montó: queda la versión quieta', err)
  } finally {
    mounting = false
  }
}

function unmount(): void {
  cinema?.dispose()
  cinema = null
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

// La preferencia se comparte entre la barra y el pie.
const motionButtons = document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]')
function showMotionToggle(show: boolean): void {
  const words = paused
    ? { es: 'Reanudar el movimiento', en: 'Resume motion', pt: 'Retomar o movimento' }
    : { es: 'Pausar el movimiento', en: 'Pause motion', pt: 'Pausar o movimento' }
  for (const button of motionButtons) {
    button.hidden = !show
    button.setAttribute('aria-pressed', String(paused))
    const label = button.querySelector<HTMLElement>('[data-motion-label]') ?? button
    label.dataset.es = words.es
    label.dataset.en = words.en
    label.dataset.pt = words.pt
    label.textContent = words[lang()]
  }
}

function syncMotion(): void {
  if (!shouldMove()) {
    unmount()
    showMotionToggle(ready && !noWorld && !saveData && !motionQuery.matches && paused)
  } else if (useWorld && hasRealWorld) {
    void mountWorld()
    showMotionToggle(!!world)
  } else {
    cinema ??= mountCinema()
    showMotionToggle(!!cinema)
  }
}

for (const button of motionButtons) {
  button.addEventListener('click', () => {
    paused = !paused
    store.set(MOTION_KEY, paused ? '1' : '0')
    syncMotion()
  })
}
motionQuery.addEventListener('change', syncMotion)
void intro.catch(() => undefined).then(() => whenCalm()).then(() => {
  ready = true
  syncMotion()
})

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
