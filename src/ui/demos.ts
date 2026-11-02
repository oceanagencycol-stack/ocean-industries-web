/**
 * Scenes that explain: the site shows Ocean at work instead of describing it, always in the same grammar. The person
 * asks (white), the machine does the work (blue), a person decides where it matters (white), and the result lands
 * (green). Ported from Qora's engine (src/ui/demos.ts there, via CALPRO's), same rules.
 *
 * Markup:
 *   <div class="demo" data-demo data-steps-ms="2400,2600,2600,3200" [data-loop="0"] [data-still="(media query)"]>
 *     <div class="demo__stage" aria-hidden="true"> … elements with data-on="k" [data-off="m"] … </div>
 *     <ol class="demo__steps" data-demo-steps> <li data-who="person|machine|result"> … </li> … </ol>
 *     <!--DEMO_TOGGLE-->
 *   </div>
 *
 *  - An element with data-on="k" shows from step k (class .is-on); with data-off="m", until step m. What carries no
 *    data-on always shows: it is the opening frame, so a scene is never empty.
 *  - The steps list tells the same story in words: it is what a screen reader reads (the stage is aria-hidden) and
 *    the captions. The current step has aria-current="step"; a step's button jumps there and pauses.
 *  - It runs only in view, stops out of view and with the tab hidden, plays up to LOOPS times, then rests on the
 *    final frame and the button offers a replay (WCAG 2.2.2). Back in view after resting, it starts again.
 *  - Reduced motion (html.no-motion), or data-still matching when the scene is armed: the final frame, still.
 *  - Without JavaScript nothing is armed: the CSS shows the final frame complete.
 *  - Armed when it comes near the view (a screen ahead), not at load: arming restyles the whole scene tree.
 * All movement is CSS (opacity/transform); this only changes classes every few seconds.
 */

import { onLang, t } from './i18n'

const LOOPS = 3
const START_MS = 500
const END_MS = 3300
const REWIND_MS = 600

interface Demo {
  el: HTMLElement
  items: { el: HTMLElement; on: number; off: number }[]
  rail: HTMLElement[]
  toggle: HTMLButtonElement | null
  durations: number[]
  n: number
  step: number
  loops: number
  maxLoops: number
  timer: number
  inView: boolean
  /** paused by the visitor (button or a step): it doesn't resume on its own */
  userPaused: boolean
  /** done with its loops: rests on the final frame until it leaves the view or is replayed */
  parked: boolean
  /** still final frame (reduced motion or data-still) */
  still: boolean
  io: IntersectionObserver
}

const demos = new Set<Demo>()
const reduced = () => document.documentElement.classList.contains('no-motion')

function setStep(d: Demo, k: number): void {
  d.step = k
  d.el.dataset.step = String(k)
  for (const it of d.items) it.el.classList.toggle('is-on', k >= it.on && k < it.off)
  d.rail.forEach((li, i) => {
    const n = i + 1
    li.classList.toggle('is-done', n < k)
    li.classList.toggle('is-now', n === k)
    if (n === k) {
      li.setAttribute('aria-current', 'step')
      // the current step's bar fills over the step's duration
      li.style.setProperty('--dur', `${d.durations[i] ?? 2400}ms`)
    } else li.removeAttribute('aria-current')
  })
}

function playing(d: Demo): boolean {
  return d.inView && !d.userPaused && !d.parked && !d.still && !document.hidden && !reduced()
}

function paint(d: Demo): void {
  const on = playing(d)
  d.el.classList.toggle('is-playing', on)
  if (!d.toggle) return
  const label = on
    ? t({ es: 'Pausar el ejemplo', en: 'Pause the example', pt: 'Pausar o exemplo' })
    : d.parked
      ? t({ es: 'Repetir el ejemplo', en: 'Replay the example', pt: 'Repetir o exemplo' })
      : t({ es: 'Reproducir el ejemplo', en: 'Play the example', pt: 'Reproduzir o exemplo' })
  d.toggle.setAttribute('aria-label', label)
  d.toggle.title = label
  d.toggle.dataset.state = on ? 'playing' : d.parked ? 'ended' : 'paused'
}

function stop(d: Demo): void {
  window.clearTimeout(d.timer)
  d.timer = 0
}

function schedule(d: Demo): void {
  stop(d)
  paint(d)
  if (!playing(d)) return
  if (d.step >= d.n) {
    if (d.loops >= d.maxLoops) {
      d.parked = true
      paint(d)
      return
    }
    d.timer = window.setTimeout(() => rewind(d), END_MS)
    return
  }
  const wait = d.step === 0 ? START_MS : d.durations[d.step - 1] ?? 2400
  d.timer = window.setTimeout(() => {
    setStep(d, d.step + 1)
    if (d.step >= d.n) d.loops++
    schedule(d)
  }, wait)
}

/** Back to the opening frame with a short fade, and again. */
function rewind(d: Demo): void {
  stop(d)
  d.el.classList.add('is-rewind')
  setStep(d, 0)
  d.timer = window.setTimeout(() => {
    d.el.classList.remove('is-rewind')
    schedule(d)
  }, REWIND_MS)
}

function restart(d: Demo): void {
  d.loops = 0
  d.parked = false
  d.userPaused = false
  if (d.step === 0) schedule(d)
  else rewind(d)
}

function setup(el: HTMLElement): Demo {
  // data-on="k": from step k · data-off="m" alone: from the opening frame until step m
  const items = Array.from(el.querySelectorAll<HTMLElement>('[data-on], [data-off]')).map((x) => ({
    el: x,
    on: x.dataset.on ? Number(x.dataset.on) : 0,
    off: x.dataset.off ? Number(x.dataset.off) : Infinity,
  }))
  const rail = Array.from(el.querySelectorAll<HTMLElement>('[data-demo-steps] > li'))
  const durations = (el.dataset.stepsMs || '').split(',').map((s) => Number(s.trim())).filter((v) => v > 0)
  const n = Math.max(rail.length, ...items.map((i) => i.on), 1)
  const d: Demo = {
    el,
    items,
    rail,
    toggle: el.querySelector<HTMLButtonElement>('[data-demo-toggle]'),
    durations,
    n,
    step: 0,
    loops: 0,
    maxLoops: el.dataset.loop === '0' ? 1 : LOOPS,
    timer: 0,
    inView: false,
    userPaused: false,
    parked: false,
    still: reduced() || (!!el.dataset.still && matchMedia(el.dataset.still).matches),
    io: null as unknown as IntersectionObserver,
  }

  el.classList.add('is-armed')
  if (d.still) {
    // the final frame, still; every step reads as done
    el.classList.add('is-still')
    setStep(d, n)
    rail.forEach((li) => li.classList.add('is-done'))
    if (d.toggle) d.toggle.hidden = true
  } else setStep(d, 0)

  // a step's button jumps there and pauses (to read at ease, or see one again)
  rail.forEach((li, i) => {
    li.querySelector<HTMLButtonElement>('button')?.addEventListener('click', () => {
      stop(d)
      d.userPaused = true
      d.parked = false
      setStep(d, i + 1)
      paint(d)
    })
  })

  d.toggle?.addEventListener('click', () => {
    if (playing(d)) {
      d.userPaused = true
      stop(d)
      paint(d)
    } else if (d.step >= d.n) restart(d)
    else {
      d.userPaused = false
      d.parked = false
      schedule(d)
    }
  })

  d.io = new IntersectionObserver(
    (entries) => {
      const e = entries[entries.length - 1]
      const was = d.inView
      d.inView = e.isIntersecting && e.intersectionRatio >= 0.3
      if (d.inView === was || d.still || reduced()) return
      if (!d.inView) {
        stop(d)
        paint(d)
        return
      }
      // back in view: if it had finished (and nobody paused it), start again
      if (d.parked || (d.step >= d.n && !d.userPaused)) restart(d)
      else schedule(d)
    },
    { threshold: [0, 0.3, 0.6] },
  )
  d.io.observe(el)
  paint(d)
  return d
}

function dispose(d: Demo): void {
  stop(d)
  d.io.disconnect()
  demos.delete(d)
}

// a new language: the buttons' names follow
onLang(() => demos.forEach((d) => paint(d)))

document.addEventListener('visibilitychange', () => {
  demos.forEach((d) => {
    if (document.hidden) {
      stop(d)
      paint(d)
    } else schedule(d)
  })
})

/** Scenes waiting to come near the view to be armed. */
const waiting = new Set<HTMLElement>()
let nearIO: IntersectionObserver | null = null

function arm(el: HTMLElement): void {
  if (el.dataset.demoBound === 'armed') return
  el.dataset.demoBound = 'armed'
  waiting.delete(el)
  nearIO?.unobserve(el)
  demos.add(setup(el))
}

/** Prepares the scenes inside root (idempotent): each is armed as it nears the view. Lets go of the ones no longer
 *  on the page (soft navigation swapped <main>). */
export function initDemos(root: ParentNode = document): void {
  demos.forEach((d) => {
    if (!d.el.isConnected) dispose(d)
  })
  waiting.forEach((el) => {
    if (el.isConnected) return
    nearIO?.unobserve(el)
    waiting.delete(el)
  })
  if (!nearIO && 'IntersectionObserver' in window) {
    nearIO = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && arm(e.target as HTMLElement)),
      { rootMargin: '100% 0px 100% 0px' },
    )
  }
  root.querySelectorAll<HTMLElement>('[data-demo]').forEach((el) => {
    if (el.dataset.demoBound) return
    el.dataset.demoBound = 'waiting'
    if (!nearIO) return arm(el)
    waiting.add(el)
    nearIO.observe(el)
  })
}

/** QA: puts a scene on an exact step and freezes it (the storyboards use it). */
export function seekDemo(el: HTMLElement, step: number): void {
  arm(el)
  for (const d of demos) {
    if (d.el !== el) continue
    stop(d)
    d.userPaused = true
    d.parked = false
    d.el.classList.add('is-qa')
    setStep(d, Math.max(0, Math.min(d.n, step)))
    paint(d)
  }
}
