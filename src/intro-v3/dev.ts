// Solo desarrollo (dev-intro.html): la intro sobre el espacio de M1a, con su ancla en la barra.
import './dev.css'
import { bootIntro, INTRO_KEY } from './intro'

const lang = new URLSearchParams(location.search).get('lang')
if (lang === 'en' || lang === 'pt') document.documentElement.lang = lang
const replay = document.querySelector<HTMLButtonElement>('[data-replay]')
if (replay) {
  const l = (document.documentElement.lang as 'es' | 'en' | 'pt') || 'es'
  replay.textContent = replay.dataset[l] ?? replay.textContent
  replay.addEventListener('click', () => {
    try {
      localStorage.removeItem(INTRO_KEY)
    } catch {
      /* noop */
    }
    bootIntro()
  })
}
bootIntro({
  onStar: () => console.debug('[intro-v3] onStar'),
  onWordComplete: () => console.debug('[intro-v3] onWordComplete'),
})
