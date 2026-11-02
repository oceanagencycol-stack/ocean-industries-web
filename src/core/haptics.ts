/**
 * Haptics.
 *  - Android/Chrome: the Vibration API, with patterns timed to the intro (it needs an earlier gesture on the page).
 *  - iOS Safari has no Vibration API. Since iOS 18, toggling an <input type="checkbox" switch> gives a system tap:
 *    used only in direct answer to a touch (buttons), never on a timer.
 */
import { store } from './storage'

const PREF_KEY = 'ocean-haptics'

// desktop Chrome has navigator.vibrate too, and it does nothing: vibration is offered on touch screens only
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && coarse
const isIOS =
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

function iosTick(): void {
  try {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.className = 'haptic-switch'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    label.appendChild(input)
    document.body.appendChild(label)
    label.click()
    label.remove()
  } catch {
    /* noop */
  }
}

/** Patterns (ms: on, off, on…) */
export const HAPTIC = {
  tap: 10,
  appear: [10],
  heartbeat: [6],
  lock: [60, 40, 28],
  ring: [24, 30, 40],
  /** the three notes of the sound logo: 0.10 / 0.30 / 0.50 s */
  motif: [14, 186, 14, 186, 22],
  ping: [8, 24, 8],
} as const

class Haptics {
  enabled: boolean
  readonly supported = canVibrate || isIOS
  readonly patterns = canVibrate

  constructor() {
    this.enabled = store.get(PREF_KEY) !== '0'
  }

  setEnabled(on: boolean): void {
    this.enabled = on
    store.set(PREF_KEY, on ? '1' : '0')
    if (on) this.tap()
  }

  /** A timed pattern (Android/Chrome only). */
  pulse(pattern: number | readonly number[]): void {
    if (!this.enabled || !canVibrate) return
    // without an earlier gesture Chrome blocks vibration and logs a warning: don't even try
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
    if (ua && !ua.hasBeenActive) return
    try {
      navigator.vibrate(Array.isArray(pattern) ? [...pattern] : (pattern as number))
    } catch {
      /* noop */
    }
  }

  /** One tap, in answer to a gesture (Android, and iOS 18+). */
  tap(): void {
    if (!this.enabled) return
    if (canVibrate) this.pulse(HAPTIC.tap)
    else if (isIOS) iosTick()
  }

  stop(): void {
    if (canVibrate) {
      try {
        navigator.vibrate(0)
      } catch {
        /* noop */
      }
    }
  }
}

export const haptics = new Haptics()
