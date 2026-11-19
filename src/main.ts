/**
 * El arranque de la v3 de OCEAN (docs/v3/CONCEPTO.md, ARQUITECTURA.md).
 *
 *  - La página es HTML real y se lee entera sin JavaScript: cada tramo trae su placa de respaldo (<picture>).
 *  - La intro (src/intro-v3, por su API) se decide antes de pintar (script de arranque: html.intro-due); mientras
 *    corre, la portada espera y entra cuando el negro se abre.
 *  - Una película con dos encuadres sigue el scroll y enlaza el relato con los ejemplos y el contacto.
 *  - Una sola gramática de entrada (src/v3/reveal.ts). Sin GSAP, sin Lenis, sin three.js en el primer trozo.
 *  - Lo que funcionaba en la v2 sigue: idioma, WhatsApp por contexto, escenas, Valeria, el chat, Cal.com, Wompi,
 *    los reels y GA4 (solo en el dominio real).
 */
import './styles/fonts.css'
import './styles/v3.css'
import './styles/demos.css'
import './styles/sequence.css'
import './styles/film.css'
import { initFilm } from './v3/film'

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
import { hasRealIntro, playIntro } from './v3/bridge'

const html = document.documentElement
const params = new URLSearchParams(location.search)
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
const reduced = html.classList.contains('no-motion') || motionQuery.matches
if (reduced) html.classList.add('no-motion')
const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
const saveData = conn?.saveData === true || /(^|-)2g$/.test(conn?.effectiveType ?? '')
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
      if (params.get('intro') === '1') {
        const destination = new URL(location.href)
        destination.searchParams.delete('intro')
        history.replaceState(null, '', destination)
      }
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
    const destination = new URL(location.pathname, location.origin)
    destination.searchParams.set('intro', '1')
    location.assign(destination)
  })
}

initFilm(intro, saveData)
if (params.has('qa')) {
  ;(window as Window & { __ocean?: unknown }).__ocean = {
    seekDemo,
    to: (y: number) => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }),
  }
}
