/**
 * El arranque de la v4 de OCEAN: la web como una sola toma (docs/v4/PELICULA.md).
 *
 *  - La página es HTML real y se lee entera sin JavaScript (la portada quieta, el texto, los formularios).
 *  - Una película continua (siete tomas encadenadas por sus placas) sigue el scroll a través de un escenario WebGL2
 *    (src/v4/stage.ts) y de una línea de tiempo (src/v4/film.ts) que mueve también el texto, la telemetría y los rótulos.
 *  - Lo que funcionaba sigue: idioma, WhatsApp por contexto, Valeria, el chat, Cal.com, Wompi, los reels, el sonido
 *    por tramo y GA4 (solo en el dominio real).
 */
import './styles/fonts.css'
import './styles/v3.css'
import './styles/v4.css'
import './styles/epilogue.css'

import { initLang } from './ui/i18n'
import { initWhatsApp } from './ui/wa'
import { initMenu } from './ui/menu'
import { initLive } from './ui/live'
import { initChat } from './ui/chat'
import { initPay } from './ui/pay'
import { initReels } from './ui/reels'
import { initBooking } from './ui/booking'
import { initAnalytics } from './ui/analytics'
import { initChrome } from './v3/chrome'
import { initSound } from './v3/sound-gate'
import { initReveal } from './v3/reveal'
import { initFilm } from './v4/film'

const html = document.documentElement
const reduced = html.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches
if (reduced) html.classList.add('no-motion')
const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number }
const lite = nav.connection?.saveData === true || /(^|-)(2g|3g)$/.test(nav.connection?.effectiveType ?? '') || (nav.deviceMemory ?? 8) < 4

initLang()
initWhatsApp()
initChrome()
initMenu()
initLive()
initPay()
initReels()
initBooking()
initChat()
initAnalytics()
initSound()
initReveal()
initFilm({ reduced, lite })
