/** La conversación de ejemplo avanza con el tramo de agentes. */
import { lang, onLang, type Lang } from './i18n'

type Line = ['cli' | 'bot', string]

export const SCRIPT: Record<Lang, Line[]> = {
  es: [
    ['cli', 'Hola, ¿ustedes hacen agentes para WhatsApp?'],
    ['bot', 'Sí. Lo montamos sobre tu número actual y responde solo, 24/7.'],
    ['cli', '¿Cuánto se demora?'],
    ['bot', 'Tienes la demo funcionando en 48 horas. ¿Te agendo una videollamada para verla?'],
    ['cli', 'Dale, mañana en la mañana'],
    ['bot', 'Listo: mañana a las 10:00 a. m. Te llega el enlace por aquí. ✅'],
  ],
  en: [
    ['cli', 'Hi, do you build WhatsApp agents?'],
    ['bot', 'We do. We set it up on your current number and it replies on its own, 24/7.'],
    ['cli', 'How long does it take?'],
    ['bot', 'You get a working demo in 48 hours. Want me to book a video call to walk you through it?'],
    ['cli', 'Sure, tomorrow morning'],
    ['bot', 'Done: tomorrow at 10:00 a.m. You’ll get the link right here. ✅'],
  ],
  pt: [
    ['cli', 'Oi, vocês fazem agentes para WhatsApp?'],
    ['bot', 'Fazemos. Montamos no seu número atual e ele responde sozinho, 24/7.'],
    ['cli', 'Quanto tempo leva?'],
    ['bot', 'Você tem a demo funcionando em 48 horas. Quer que eu agende uma videochamada para mostrar?'],
    ['cli', 'Pode ser, amanhã de manhã'],
    ['bot', 'Pronto: amanhã às 10:00. O link chega por aqui. ✅'],
  ],
}

export function initLive(): void {
  const box = document.getElementById('liveChat')
  const scene = box?.closest('.live__chat')
  if (!box || !scene) return
  const chat = { box, scene }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let visible = false
  let lastCount = 0
  let lastLang: Lang | undefined
  let frame = 0

  function paint(): void {
    const language = lang()
    const lines = SCRIPT[language]
    let count = 2
    if (reduced.matches || document.documentElement.classList.contains('motion-paused')) count = lines.length
    else if (visible) {
      const rect = chat.scene.getBoundingClientRect()
      const travel = innerHeight * 0.70 + rect.height * 0.4
      const progress = (innerHeight * 0.87 - rect.top) / Math.max(1, travel)
      count += Math.min(lines.length - count, Math.max(0, Math.floor(progress * (lines.length - 1))))
    }
    if (count === lastCount && language === lastLang) return
    lastCount = count
    lastLang = language

    const messages = lines.slice(0, count).map(([who, body]) => {
      const message = document.createElement('p')
      message.className = `msg ${who === 'cli' ? 'msg--in' : 'msg--out'}`
      message.textContent = body
      return message
    })
    chat.box.replaceChildren(...messages)
  }

  function schedule(): void {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      paint()
    })
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) schedule()
    })
    observer.observe(scene)
    window.addEventListener('scroll', () => { if (visible) schedule() }, { passive: true })
  }
  window.addEventListener('ocean:motion-preference', schedule)
  reduced.addEventListener('change', schedule)
  onLang(paint)
  paint()
}
