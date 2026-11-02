/**
 * Talk to Ocean: the site's agent, in text, through /api/agente (a Vercel function that forwards to the n8n
 * workflow; the webhook's address lives in an environment variable, never here). The floating button hides where the
 * page already offers the same thing (the hero, the invitation, the calendar and the payments: [data-fab-hide]).
 *
 * The agent's answer is the machine speaking: a blue drop sounds and, on the home page's glass, a ring of blue light
 * runs out over the water (stage.pulse()). Every failure ends in WhatsApp: the visitor never hits a dead end.
 */
import { sound } from '../core/audio'
import { lang, onLang, t } from './i18n'
import { waLink } from './wa'
import { track } from './analytics'

const ENDPOINT = '/api/agente'

const GREETING = {
  es: 'Hola, soy OceanBot 👋 ¿En qué te puedo ayudar? Cuéntame un poco sobre tu negocio y vemos cómo podemos automatizarlo.',
  en: "Hi, I'm OceanBot 👋 How can I help? Tell me a bit about your business and let's see how we can automate it.",
  pt: 'Oi, sou o OceanBot 👋 Como posso ajudar? Conte um pouco sobre seu negócio e vemos como automatizá-lo.',
}

export interface ChatHooks {
  /** the agent answered (the glass sends a ring of light over the water) */
  onAnswer?: () => void
}

export function initChat(hooks: ChatHooks = {}): void {
  const fab = document.querySelector<HTMLButtonElement>('.fab')
  const panel = document.getElementById('chat')
  const log = document.getElementById('chatLog')
  const form = document.getElementById('chatForm') as HTMLFormElement | null
  const input = document.getElementById('chatInput') as HTMLInputElement | null
  const close = panel?.querySelector<HTMLButtonElement>('.chat__close')
  if (!fab || !panel || !log || !form || !input) return

  const session = `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  let greeted = false
  let busy = false

  const add = (text: string, who: 'user' | 'bot') => {
    const p = document.createElement('p')
    p.className = `msg msg--${who}`
    if (who === 'user') p.textContent = text
    else {
      // plain text from the agent: no markdown stars; links become links, safely
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      let clean = esc(text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'))
      clean = clean.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>')
      p.innerHTML = clean
    }
    log.appendChild(p)
    log.scrollTop = log.scrollHeight
  }
  const typing = () => {
    const p = document.createElement('p')
    p.className = 'msg msg--bot msg--typing'
    p.innerHTML = '<i></i><i></i><i></i>'
    log.appendChild(p)
    log.scrollTop = log.scrollHeight
    return p
  }

  function open(): void {
    panel!.hidden = false
    fab!.setAttribute('aria-expanded', 'true')
    fab!.classList.add('is-hidden')
    sound.duck(true)
    if (!greeted) {
      greeted = true
      window.setTimeout(() => add(t(GREETING), 'bot'), 180)
    }
    window.setTimeout(() => input!.focus(), 120)
    track('chat_open', {})
  }

  function shut(): void {
    panel!.hidden = true
    fab!.setAttribute('aria-expanded', 'false')
    fab!.classList.remove('is-hidden')
    sound.duck(false)
    fab!.focus({ preventScroll: true })
    paintFab()
  }

  fab.addEventListener('click', () => (panel.hidden ? open() : shut()))
  close?.addEventListener('click', shut)
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') shut()
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const text = input.value.trim()
    if (!text || busy) return
    busy = true
    add(text, 'user')
    sound.play('msgOut', { gain: 0.6 })
    input.value = ''
    const dots = typing()
    try {
      const ctrl = new AbortController()
      const to = window.setTimeout(() => ctrl.abort(), 30000)
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: session, lang: lang() }),
        signal: ctrl.signal,
      })
      window.clearTimeout(to)
      const data = (await res.json().catch(() => ({}))) as { reply?: string }
      dots.remove()
      add(data.reply || t({ es: 'No me llegó la respuesta. Escríbenos por WhatsApp y seguimos ahí.', en: "The answer didn't come through. Message us on WhatsApp and we'll continue there.", pt: 'A resposta não chegou. Fale conosco no WhatsApp e seguimos por lá.' }), 'bot')
      sound.play('msgIn', { gain: 0.7 })
      hooks.onAnswer?.()
    } catch {
      dots.remove()
      add(
        t({
          es: `Tuve un problema de conexión. Escríbenos por WhatsApp y te ayudamos al instante: ${waLink('general')}`,
          en: `I had a connection problem. Message us on WhatsApp and we'll help right away: ${waLink('general')}`,
          pt: `Tive um problema de conexão. Fale conosco no WhatsApp e ajudamos na hora: ${waLink('general')}`,
        }),
        'bot',
      )
    } finally {
      busy = false
    }
  })

  // ---- the button hides where the page already offers the same (hero, invitation, calendar, payments) ----
  const zones = Array.from(document.querySelectorAll<HTMLElement>('[data-fab-hide]'))
  const visible = new Set<Element>()
  const paintFab = () => {
    if (!panel.hidden) return
    fab.classList.toggle('is-hidden', visible.size > 0)
  }
  if ('IntersectionObserver' in window && zones.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)))
        paintFab()
      },
      { threshold: 0.25 },
    )
    zones.forEach((z) => io.observe(z))
  }
  // a new language before the visitor wrote anything: the greeting follows
  onLang(() => {
    if (!greeted || log.children.length !== 1) return
    log.textContent = ''
    add(t(GREETING), 'bot')
  })
}
