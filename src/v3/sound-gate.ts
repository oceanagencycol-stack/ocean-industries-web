/**
 * La puerta del sonido (pequeña, va en el arranque; el motor `sound.ts` y todo el audio NO).
 *
 *  - Con la página recién cargada no se pide ni un byte de audio.
 *  - El sonido se enciende con el primer clic o toque en la página (nunca con una tecla, ni al tocar un formulario, el
 *    idioma, el chat o «Saltar intro») o con el botón de sonido de la barra. Ese gesto crea y despierta el AudioContext
 *    en el mismo instante (Safari lo exige dentro del gesto) y luego baja el motor con import dinámico.
 *  - La elección se recuerda (`ocean-v3-sound`: 1 encendido, 0 apagado). Con ahorro de datos o 2G, apagado por defecto:
 *    solo el botón lo enciende. Movimiento reducido no toca el sonido (es otra preferencia).
 *  - Se apaga solo (sin cambiar la elección) mientras el chat está abierto o un reel suena, y vuelve al cerrarlos.
 *  - ?qa: expone `window.__oceanSound` para leer el estado.
 */
import { store } from '../core/storage'
import type { Engine } from './sound'

const PREF = 'ocean-v3-sound'
const REPLAY = 'ocean-v3-replay-sound'
type Nav = Navigator & { audioSession?: { type: string }; connection?: { saveData?: boolean; effectiveType?: string } }
type AnyWindow = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null
let engine: Engine | null = null
let starting = false
/** la persona quiere sonido (y el gesto ya llegó) */
let on = false
let suppressed = false
let btn: HTMLButtonElement | null = null
const params = new URLSearchParams(location.search)
const nav = navigator as Nav
const saveData = nav.connection?.saveData === true || /(^|-)2g$/.test(nav.connection?.effectiveType ?? '')

/** ¿el primer gesto cualquiera puede encender el sonido? */
const autoOn = (): boolean => {
  const p = store.get(PREF)
  return p === '1' || (p === null && !saveData)
}

function makeCtx(): AudioContext | null {
  if (ctx) return ctx
  const AC = window.AudioContext || (window as AnyWindow).webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC({ latencyHint: 'playback' })
    return ctx
  } catch {
    return null
  }
}

function paint(): void {
  if (!btn) return
  btn.setAttribute('aria-pressed', String(on))
  btn.classList.toggle('is-on', on)
  btn.classList.toggle('is-playing', on && !suppressed && ctx?.state === 'running')
}

function applySuppress(): void {
  engine?.setDuck(suppressed)
  paint()
}

function start(fromButton: boolean, early = false): void {
  if (engine || starting) return
  const c = makeCtx()
  if (!c) return
  starting = true
  on = true
  if (fromButton) {
    // iOS: encender el sonido a propósito sí pide la sesión «playback» (suena aunque el interruptor esté en silencio)
    try {
      if (nav.audioSession) nav.audioSession.type = 'playback'
    } catch {
      /* noop */
    }
  }
  void c.resume().catch(() => {})
  if (!early) {
    // desbloqueo de iOS: un instante de silencio dentro del gesto
    try {
      const b = c.createBuffer(1, 1, 22050)
      const s = c.createBufferSource()
      s.buffer = b
      s.connect(c.destination)
      s.start(0)
    } catch {
      /* noop */
    }
  }
  paint()
  import('./sound')
    .then((m) => {
      engine = m.createEngine(c, { on: true })
      starting = false
      applySuppress()
      c.addEventListener('statechange', paint)
    })
    .catch(() => {
      starting = false
      on = false
      paint()
    })
}

function toggle(): void {
  if (on) {
    on = false
    store.set(PREF, '0')
    engine?.setOn(false)
    paint()
    return
  }
  store.set(PREF, '1')
  if (engine && ctx) {
    on = true
    void ctx.resume().catch(() => {})
    engine.setOn(true)
    paint()
  } else start(true)
}

/** Los ganchos de la intro (bridge.ts): solo suenan si el motor ya está en marcha; si no, nada. */
export function introCue(name: 'star' | 'word'): void {
  engine?.cue(name)
}

/** «Repetir la intro» recarga la página: deja dicho que el sonido ya fue pedido con ese clic. */
export function markReplay(): void {
  try {
    sessionStorage.setItem(REPLAY, '1')
  } catch {
    /* noop */
  }
}

export function initSound(): void {
  btn = document.querySelector<HTMLButtonElement>('[data-sound-toggle]')
  btn?.addEventListener('click', toggle)

  // el primer clic o toque, y solo ese
  const IGNORE = 'input, textarea, select, form, label, [data-lang], .lang, .nav__menu, .oi-skip, #chat, [data-sound-toggle], [data-motion-toggle], .fab, .reel__sound'
  const first = (e: MouseEvent) => {
    if (!e.isTrusted || e.detail === 0) return // un «clic» sacado de una tecla (Enter/Espacio) no cuenta
    if ((e.target as Element | null)?.closest?.(IGNORE)) return
    if (!autoOn()) return
    document.removeEventListener('click', first, true)
    start(false)
  }
  if (autoOn()) document.addEventListener('click', first, true)

  // chat abierto o un reel con sonido: el mundo se calla y vuelve al cerrarlos
  const recompute = () => {
    const chat = document.getElementById('chat')
    const chatOpen = !!chat && !chat.hidden
    const reelLoud = !!document.querySelector('.reel__sound[aria-pressed="true"]')
    const next = chatOpen || reelLoud
    if (next === suppressed) return
    suppressed = next
    applySuppress()
  }
  const chat = document.getElementById('chat')
  if (chat) new MutationObserver(recompute).observe(chat, { attributes: true, attributeFilter: ['hidden'] })
  const grid = document.getElementById('reelsGrid')
  if (grid) new MutationObserver(recompute).observe(grid, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] })

  // volver de «Repetir la intro»: si el navegador deja sonar sin gesto (el clic de antes lo habilitó), arranca ya
  try {
    if (sessionStorage.getItem(REPLAY) === '1') {
      sessionStorage.removeItem(REPLAY)
      if (store.get(PREF) !== '0') {
        const c = makeCtx()
        if (c) {
          window.setTimeout(() => {
            if (c.state === 'running') start(false, true)
            else {
              void c.close().catch(() => {})
              ctx = null
            }
          }, 80)
        }
      }
    }
  } catch {
    /* noop */
  }

  if (params.has('qa')) {
    ;(window as Window & { __oceanSound?: unknown }).__oceanSound = {
      get state() {
        return { on, suppressed, started: !!engine, starting, pressed: btn?.getAttribute('aria-pressed'), pref: store.get(PREF), ...(engine?.debug() ?? {}) }
      },
    }
  }
  paint()
}
