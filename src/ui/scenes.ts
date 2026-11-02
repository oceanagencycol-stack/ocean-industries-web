/**
 * The page's scroll direction (ported from Qora's director). ScrollTrigger measures; one tick turns each section's
 * progress into the sea's state. No competing tweens.
 *
 *   hero ──► the glass turns a little as the words are read
 *   the wave (#about, sticky) ──► the glass rises out of view and the camera comes down to the water; one step at a
 *            time over the sea: the line, then the swell (low and long), the crest (it rises and glows blue: the
 *            machine), the break (its white water glows green: the result), and the closing line
 *   reading sections ──► the canvas is off (the render pauses: battery)
 *   the invitation (#talk) ──► the glass comes back over a calm sea, behind the last words
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type Lenis from 'lenis'
import type { Stage } from '../three/stage'
import { sound } from '../core/audio'

gsap.registerPlugin(ScrollTrigger)
// on phones the browser's bar changes the window's height on every scroll: without this, ScrollTrigger recalculates
ScrollTrigger.config({ ignoreMobileResize: true })

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const ramp = (a: number, b: number, x: number) => clamp01((x - a) / (b - a))
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** Where each step of the wave scene begins (fractions of the sticky run). */
const STEPS = [0, 0.15, 0.37, 0.59, 0.82]

export interface ScenesOptions {
  mobile: boolean
  lenis: Lenis | null
  /** multiplier of the canvas's opacity (main.ts fades the glass in when it arrives) */
  env: { fade: number }
}

export interface Scenes {
  dispose: () => void
}

export function initScenes(getStage: () => Stage | null, opts: ScenesOptions): Scenes {
  const triggers: ScrollTrigger[] = []
  const add = (vars: ScrollTrigger.StaticVars) => {
    const t = ScrollTrigger.create(vars)
    triggers.push(t)
    return t
  }
  let disposed = false
  const offLenis = opts.lenis?.on('scroll', ScrollTrigger.update)
  const P = { hero: 0, wave: 0, waveOut: 0, cta: 0, foot: 0 }

  // ---- the wave scene: one step at a time ----
  const wave = document.querySelector<HTMLElement>('.wave')
  const steps = Array.from(document.querySelectorAll<HTMLElement>('.wave__step'))
  const ticks = Array.from(document.querySelectorAll<HTMLElement>('.wave__meter i'))
  let shown = -1
  // every step stays in the reading order (a screen reader reads them all); only the one on screen takes the
  // keyboard, so the focus never lands on a link nobody can see
  const showStep = (k: number) => {
    if (k === shown) return
    shown = k
    steps.forEach((el) => {
      const on = Number(el.dataset.step) === k
      el.classList.toggle('is-on', on)
      el.querySelectorAll<HTMLAnchorElement>('a').forEach((a) => (on ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')))
    })
  }
  if (wave) {
    wave.classList.add('is-scene', 'is-live')
    showStep(0)
  }

  add({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: (s) => (P.hero = s.progress) })
  if (wave) {
    add({ trigger: wave, start: 'top top', end: 'bottom bottom', onUpdate: (s) => (P.wave = s.progress) })
    add({ trigger: wave, start: 'bottom bottom', end: 'bottom top', onUpdate: (s) => (P.waveOut = s.progress) })
  }
  add({ trigger: '.talk', start: 'top bottom', end: 'center center', onUpdate: (s) => (P.cta = s.progress) })
  add({ trigger: '.footer', start: 'top bottom', end: 'bottom bottom', onUpdate: (s) => (P.foot = s.progress) })

  // ---- the music's depth by zone; the surf comes up over the water ----
  const zone = (sel: string, cutoff: number, vol: number) => {
    if (!document.querySelector(sel)) return
    add({ trigger: sel, start: 'top 55%', end: 'bottom 45%', onToggle: (st) => st.isActive && sound.setDepth(cutoff, vol) })
  }
  zone('.hero', 18000, 1)
  zone('.wave', 2400, 0.75)
  ;['.svc', '.live', '.work', '.book', '.pay'].forEach((sel) => zone(sel, 1300, 0.5))
  zone('.talk', 16000, 0.95)

  // ---- one tick: progress → the sea's state ----
  let lastY = window.scrollY
  let surfV = 0
  const tick = (_t: number, deltaMs: number) => {
    const dt = Math.max(0.001, deltaMs / 1000)
    const y = window.scrollY
    const v = Math.abs(y - lastY) / dt
    lastY = y
    surfV += (Math.min(1, v / 2400) - surfV) * 0.1
    sound.setSurf(surfV)

    const w = P.wave
    // the step on screen and the meter
    let k = 0
    for (let i = 0; i < STEPS.length; i++) if (w >= STEPS[i]) k = i
    showStep(k)
    ticks.forEach((el, i) => el.style.setProperty('--p', String(ramp(STEPS[i + 1], STEPS[i + 2] ?? 1, w).toFixed(3))))

    const stage = getStage()
    if (!stage) return
    const s = stage.state
    let opacity = 1
    if (P.cta > 0) {
      // the invitation: the glass back over a calm sea
      opacity = P.cta * (stage.portrait ? 1 - P.foot : 1)
      // on a phone the words fill the screen: only the sea comes back, the glass stays above
      s.away = stage.portrait ? 1 : 0
      s.dive = 0
      s.swell = 0
      s.breaking = 0
      s.calm = 0.25
      s.spin = 0.2 * (1 - P.cta)
      // the glass waits a little higher than in the hero: the invitation's words take the left and the middle
      s.lift = stage.portrait ? 0 : 0.07
    } else if (P.waveOut > 0) {
      opacity = 1 - ramp(0, 0.55, P.waveOut)
      s.away = 1
      s.dive = 1
      s.lift = 0
    } else {
      s.lift = 0
      const lede = ramp(0.0, 0.1, w)
      s.away = lede
      s.dive = ramp(0.02, 0.15, w)
      s.spin = P.hero * 0.45
      s.calm = 0
      // 1 · the swell: low and long; 2 · the crest: it rises and comes in, glowing blue; 3 · the break: green
      const p1 = ramp(STEPS[1] - 0.04, STEPS[2], w)
      const p2 = ramp(STEPS[2], STEPS[3], w)
      const p3 = ramp(STEPS[3], STEPS[4], w)
      const end = ramp(STEPS[4], 1, w)
      s.swell = mix(mix(mix(0, 0.32, p1), 1, p2), 0.7, p3) * (1 - end)
      s.crest = mix(mix(0, 0.3, p1), 0.86, p2) + (1 - 0.86) * p3
      s.breaking = ramp(0.15, 0.6, p3) * (1 - end * 0.75)
    }
    stage.setOpacity(opacity * opts.env.fade)
  }
  gsap.ticker.add(tick)

  ScrollTrigger.refresh()
  void document.fonts?.ready.then(() => !disposed && ScrollTrigger.refresh())

  // the page changes height without the window changing (the calendar, the reels): measure again
  const main = document.querySelector('main')
  let ro: ResizeObserver | null = null
  let roTimer = 0
  if (main && 'ResizeObserver' in window) {
    let lastH = main.offsetHeight
    ro = new ResizeObserver(() => {
      const h = main.offsetHeight
      if (Math.abs(h - lastH) < 2) return
      lastH = h
      window.clearTimeout(roTimer)
      roTimer = window.setTimeout(() => !disposed && ScrollTrigger.refresh(), 180)
    })
    ro.observe(main)
  }

  return {
    dispose() {
      if (disposed) return
      disposed = true
      gsap.ticker.remove(tick)
      triggers.forEach((t) => t.kill())
      triggers.length = 0
      offLenis?.()
      ro?.disconnect()
      window.clearTimeout(roTimer)
      sound.setSurf(0)
      wave?.classList.remove('is-scene', 'is-live')
      steps.forEach((el) => el.querySelectorAll('a').forEach((a) => a.removeAttribute('tabindex')))
    },
  }
}
