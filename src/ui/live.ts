/**
 * The live section's conversation: a real script of Valeria's (the customer asks, the agent answers with a fact and
 * closes by booking). It plays when it comes into view, rests out of view, repeats a few times and then shows the whole
 * conversation. With reduced motion, the whole conversation shows at once: never an empty box.
 */
import { lang, onLang, type Lang } from './i18n'
import { sound } from '../core/audio'

type Line = ['cli' | 'bot', string]

const SCRIPT: Record<Lang, Line[]> = {
  es: [
    ['cli', 'Hola, ¿ustedes hacen agentes para WhatsApp?'],
    ['bot', 'Sí. Montamos el agente sobre tu número actual y responde solo, 24/7.'],
    ['cli', '¿Cuánto se demora?'],
    ['bot', 'Demo funcionando en 48 horas. ¿Le agendo una llamada de 20 minutos?'],
    ['cli', 'Dale, mañana en la mañana'],
    ['bot', 'Listo: mañana 10:00 a. m. Le llega el enlace por aquí. ✅'],
  ],
  en: [
    ['cli', 'Hi, do you build WhatsApp agents?'],
    ['bot', 'We do. We set it up on your current number and it replies on its own, 24/7.'],
    ['cli', 'How long does it take?'],
    ['bot', 'Working demo in 48 hours. Shall I book you a 20-minute call?'],
    ['cli', 'Sure, tomorrow morning'],
    ['bot', 'Done: tomorrow 10:00 a.m. The link comes right here. ✅'],
  ],
  pt: [
    ['cli', 'Oi, vocês fazem agentes para WhatsApp?'],
    ['bot', 'Fazemos. Montamos no seu número atual e ele responde sozinho, 24/7.'],
    ['cli', 'Quanto tempo leva?'],
    ['bot', 'Demo funcionando em 48 horas. Posso agendar uma call de 20 minutos?'],
    ['cli', 'Pode ser, amanhã de manhã'],
    ['bot', 'Pronto: amanhã 10:00. O link chega por aqui. ✅'],
  ],
}

const MAX_RUNS = 3

export function initLive(): void {
  const box = document.getElementById('liveChat')
  if (!box) return
  const reduced = document.documentElement.classList.contains('no-motion')
  let timer = 0
  let runs = 0
  let inView = false

  const bubble = (who: 'cli' | 'bot', text: string, quiet = false) => {
    const p = document.createElement('p')
    p.className = `msg ${who === 'cli' ? 'msg--in' : 'msg--out'}`
    p.textContent = text
    box.appendChild(p)
    while (box.children.length > 5) box.removeChild(box.firstChild!)
    if (!quiet) sound.play(who === 'bot' ? 'msgIn' : 'msgOut', { gain: 0.5 })
  }
  const typing = () => {
    const p = document.createElement('p')
    p.className = 'msg msg--out msg--typing'
    p.innerHTML = '<i></i><i></i><i></i>'
    box.appendChild(p)
    while (box.children.length > 5) box.removeChild(box.firstChild!)
    return p
  }
  const whole = () => {
    window.clearTimeout(timer)
    box.textContent = ''
    SCRIPT[lang()].forEach(([w, x]) => bubble(w, x, true))
  }

  function run(): void {
    window.clearTimeout(timer)
    box!.textContent = ''
    const g = SCRIPT[lang()]
    let i = 0
    const step = () => {
      if (!inView) return
      if (i >= g.length) {
        runs++
        if (runs < MAX_RUNS) timer = window.setTimeout(run, 4200)
        return
      }
      const [who, text] = g[i++]
      if (who === 'bot') {
        const t = typing()
        timer = window.setTimeout(() => {
          t.remove()
          bubble('bot', text)
          timer = window.setTimeout(step, 1500)
        }, 950)
      } else {
        bubble('cli', text)
        timer = window.setTimeout(step, 1200)
      }
    }
    step()
  }

  if (reduced || !('IntersectionObserver' in window)) {
    whole()
    onLang(whole)
    return
  }
  whole() // the opening frame: the whole conversation, until it comes into view
  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[entries.length - 1]
      const was = inView
      inView = e.isIntersecting
      if (inView && !was) {
        if (runs < MAX_RUNS) run()
      } else if (!inView) {
        window.clearTimeout(timer)
        whole()
      }
    },
    { threshold: 0.35 },
  )
  io.observe(box)
  document.addEventListener('visibilitychange', () => document.hidden && window.clearTimeout(timer))
  onLang(() => (inView && runs < MAX_RUNS ? run() : whole()))
}
