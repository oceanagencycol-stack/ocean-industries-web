/**
 * Ocean Industries' boot.
 *
 *  - First visit, with WebGL2 on a real GPU and without reduced motion: the intro, with no gate. The splash (the
 *    wordmark writes itself, with a real loading count) → a drop wakes the sea, a wave breaks and the glass rises out
 *    of it → the hero. It comes back after 7 days (or with "Replay the intro" in the footer).
 *  - Sound is on: it plays if the browser lets it, otherwise from the first tap, click or key anywhere (in sync, even
 *    halfway through the intro). When it starts, a tip says for a few seconds where to mute it.
 *  - Repeat visits, deep links (#section) and reduced motion go straight in. The sea is built in a quiet moment (after
 *    the first paint, with the main thread free) and arrives faded in: the page answers first.
 *  - Without WebGL2, in software rendering or with reduced motion: the still (the wordmark over lines of light);
 *    nothing breaks and every section reads in order.
 */
import '@fontsource-variable/archivo/wdth.css'
import 'lenis/dist/lenis.css'
import './styles/main.css'
import './styles/demos.css'

import gsap from 'gsap'
import { detectDevice } from './core/device'
import { store } from './core/storage'
import { sound } from './core/audio'
import { haptics, HAPTIC } from './core/haptics'
import { SOUNDS, type SoundName } from './core/sounds'
import { initUI, revealHero, showReplay, showSoundTip } from './ui/page'
import { initMenu } from './ui/menu'
import { seekDemo } from './ui/demos'
import { createSmoothScroll } from './ui/scroll'
import { initLang } from './ui/i18n'
import { initWhatsApp } from './ui/wa'
import { initLive } from './ui/live'
import { initChat } from './ui/chat'
import { initPay } from './ui/pay'
import { initReels } from './ui/reels'
import { initBooking } from './ui/booking'
import { initAnalytics } from './ui/analytics'
import type { IntroController } from './intro/timeline'
import type { Scenes } from './ui/scenes'
import { finalState } from './three/state'
import type { Stage } from './three/stage'

const html = document.documentElement
const dev = detectDevice()
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

const params = new URLSearchParams(location.search)
const qaMode = params.get('qa')
// QA only (?qa=1&noglass): the page without the 3D, for fast captures in a sandbox without a GPU
const noGlass = params.has('qa') && params.has('noglass')
const replay = store.get('ocean-replay', 'session') === '1'
if (replay) store.remove('ocean-replay', 'session')
const INTRO_EVERY_MS = 7 * 24 * 60 * 60 * 1000
const introAt = Number(store.get('ocean-intro-at')) || 0
const seen = store.get('ocean-intro-seen', 'session') === '1' || Date.now() - introAt < INTRO_EVERY_MS
const deepLink = location.hash.length > 1
const introEl = document.getElementById('intro')

if (dev.reducedMotion) html.classList.add('no-motion')
/** the real-time sea: WebGL2 on a real GPU, with motion allowed (otherwise the still). Asking creates a WebGL context
 *  (it costs): it's asked at once only when the intro may play; otherwise after the first paint. */
const glassOK = () => !noGlass && !dev.reducedMotion && dev.webgl2 && !dev.software
const playIntro = !!introEl && !dev.reducedMotion && (!seen || replay) && !deepLink && glassOK()
html.classList.remove('is-booting')

const canvas = document.getElementById('stage') as HTMLCanvasElement | null

if (playIntro) {
  html.classList.remove('no-intro')
  html.classList.add('is-intro', 'is-locked')
  window.scrollTo(0, 0)
} else {
  introEl?.remove()
}

// the wave scene takes its length as soon as we know the sea will come (it is below the first screen: nothing on
// screen moves); without the sea it reads in order
function markSea(): void {
  if (glassOK() && !dev.saveData) {
    document.querySelector('.wave')?.classList.add('is-scene')
    if (introEl || playIntro) showReplay()
  } else html.classList.add('no-webgl')
}
// at once when the question was already asked (a first visit asks it to decide the intro) or when a deep link needs
// the final lengths before it lands; on a plain return visit it waits for the first paint (bootDirect)
if (!seen || replay || deepLink || dev.reducedMotion || noGlass) markSea()

const lenis = createSmoothScroll(!dev.reducedMotion && !dev.coarse)
if (playIntro) lenis?.stop()

let stage: Stage | null = null
let stageP: Promise<Stage | null> | null = null
let intro: IntroController | null = null
let ambienceOn = false
let scenes: Scenes | null = null
/** the canvas's opacity multiplier: the sea fades in when it arrives */
const env = { fade: 0 }

function startScenes(): void {
  if (scenes) return
  void import('./ui/scenes').then((m) => {
    if (scenes) return
    scenes = m.initScenes(() => stage, { mobile: dev.coarse, lenis, env })
  })
}

function fadeStageIn(): void {
  // the still (the first frame) gives way as the sea comes in
  html.classList.add('glass-in')
  gsap.to(env, { fade: 1, duration: 1.1, ease: 'sine.out', overwrite: true })
}

/** The surf, the night's pad and the interface sounds (made after the intro). */
function startAmbience(): void {
  void sound.preload(['surf', 'music', 'tick', 'click', 'clink', 'msgIn', 'msgOut', 'result'] as SoundName[]).then(() => {
    if (!sound.enabled || ambienceOn) return
    ambienceOn = true
    sound.loop('surf', { fadeIn: 3, xfade: 2 })
    sound.loop('music', { fadeIn: 6, xfade: 3 })
  })
}

/* ---------- sound turned on (by itself, with the first tap, or with the button) ---------- */
let revealed = false
let tipPending = false

function onSoundOn(): void {
  if (intro?.running) {
    void sound.whenRunning().then((ok) => {
      if (!ok || !intro) return
      intro.syncSound()
      if (intro.handedOff) startAmbience()
    })
  } else {
    startAmbience()
  }
  if (revealed) showSoundTip()
  else tipPending = true
}
sound.onChange((on) => on && onSoundOn())

function markRevealed(delayMs = 0): void {
  window.setTimeout(() => {
    revealed = true
    if (tipPending) {
      tipPending = false
      if (sound.enabled) showSoundTip()
    }
  }, delayMs)
}

/* ---------- scrolling (Lenis on desktops, native on touch) and the anchors ---------- */
function scrollToEl(el: HTMLElement, immediate = false): void {
  const smooth = !immediate && !dev.reducedMotion
  if (lenis) lenis.scrollTo(el, { immediate: !smooth, force: true, duration: 1.4 })
  else el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
}

document.addEventListener('click', (e) => {
  const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]')
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return
  const id = decodeURIComponent(a.getAttribute('href')!.slice(1))
  const el = id ? document.getElementById(id) : null
  if (!el) return
  e.preventDefault()
  history.replaceState(null, '', `#${id}`)
  // a jump lands right away; the sea's direction catches up on the next tick
  window.requestAnimationFrame(() => scrollToEl(el))
  if (el.tabIndex < 0 && !/^(A|BUTTON|INPUT)$/.test(el.tagName)) el.setAttribute('tabindex', '-1')
  window.setTimeout(() => el.focus({ preventScroll: true }), dev.reducedMotion ? 0 : 900)
})

initLang()
initWhatsApp()
initUI()
initMenu(lenis)
initLive()
initPay({ onApproved: () => resultGlow() })
initReels()
initBooking()
initChat({ onAnswer: () => stage?.pulse() })
initAnalytics()
if (deepLink) {
  const anchor = document.getElementById(decodeURIComponent(location.hash.slice(1)))
  if (anchor) requestAnimationFrame(() => scrollToEl(anchor, true))
}

/** A result landed (a payment approved): the water under the glass glows green for a moment. */
function resultGlow(): void {
  const st = stage
  if (!st) return
  gsap.fromTo(st.state, { result: 0 }, { result: 1, duration: 0.5, ease: 'power2.out', yoyo: true, repeat: 1, repeatDelay: 1.6 })
}

/* ---------- pointer, gyroscope and touch on the sea ---------- */
type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
const DOE = (window as Window & { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent
let tiltOn = false

function listenTilt(st: Stage): void {
  if (tiltOn) return
  tiltOn = true
  window.addEventListener(
    'deviceorientation',
    (e) => {
      if (e.gamma == null || e.beta == null) return
      st.setPointer(e.gamma / 35, -(e.beta - 45) / 45)
    },
    { passive: true },
  )
}

function enableTilt(st: Stage | null): void {
  if (!st || !DOE || !dev.mobile || typeof DOE.requestPermission === 'function') return
  listenTilt(st)
}

function wireInteraction(st: Stage): void {
  const ndc = (x: number, y: number) => [(x / window.innerWidth) * 2 - 1, -((y / window.innerHeight) * 2 - 1)] as const
  // the pointer leaves a glowing wake on the water (the hero and the invitation: where the sea is on screen)
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || st.currentOpacity < 0.05) return
      const [x, y] = ndc(e.clientX, e.clientY)
      st.setPointer(x, y)
      st.wakeAt(x, y, 0.85)
    },
    { passive: true },
  )
  // a finger on the water draws a wake too
  window.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0]
      if (!t || st.currentOpacity < 0.05) return
      if (!(e.target as Element | null)?.closest?.('[data-glass-zone]')) return
      const [x, y] = ndc(t.clientX, t.clientY)
      st.wakeAt(x, y, 0.9)
    },
    { passive: true },
  )
  let lastHit = -1e9
  window.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement | null
    if (!t || t.closest('a,button,input,textarea,select,label,[role="button"],video')) return
    if (!t.closest('[data-glass-zone]') || st.currentOpacity < 0.05) return
    const [x, y] = ndc(e.clientX, e.clientY)
    const hit = st.ping(x, y)
    if (hit === 'glass') {
      lastHit = performance.now()
      sound.play('clink', { gain: 0.6, rate: 0.94 + Math.random() * 0.12 })
      if (e.pointerType === 'touch') haptics.tap()
      else haptics.pulse(HAPTIC.ping)
    } else if (hit === 'water') {
      sound.play('msgIn', { gain: 0.35, rate: 0.85 + Math.random() * 0.3 })
      if (e.pointerType === 'touch') haptics.tap()
    }
  })
  if (DOE && typeof DOE.requestPermission === 'function' && dev.mobile) {
    let asked = false
    window.addEventListener('click', () => {
      if (asked || performance.now() - lastHit > 900) return
      asked = true
      DOE.requestPermission?.()
        .then((r) => r === 'granted' && listenTilt(st))
        .catch(() => {})
    })
  }
  // the canvas measures 100lvh: it doesn't change when the phone's browser bar comes and goes
  let raf = 0
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => st.resize())
  })
  ro.observe(st.canvas)
  document.addEventListener('visibilitychange', () => st.setVisible(!document.hidden))
}

function unlockPage(): void {
  html.classList.remove('is-locked')
  lenis?.start()
}

async function createStageSafe(): Promise<Stage | null> {
  if (!canvas) return null
  try {
    const m = await import('./three/stage')
    return await m.createStage(canvas, dev.tier, { mobile: dev.mobile }, (t) => console.info('[ocean] quality →', t, 'dpr', stage?.currentDpr))
  } catch (err) {
    console.warn('[ocean] WebGL not available, the still stays', err)
    html.classList.add('no-webgl')
    document.querySelector('.wave')?.classList.remove('is-scene')
    canvas.remove()
    return null
  }
}

/** A quiet moment for heavy work (building the sea): after the paint and, where it exists, when the thread is free. */
function whenCalm(minMs = 0, maxMs = 1500): Promise<void> {
  type Ric = (cb: () => void, opts?: { timeout: number }) => number
  const ric = (window as Window & { requestIdleCallback?: Ric }).requestIdleCallback
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      window.setTimeout(() => (ric ? ric(() => resolve(), { timeout: maxMs }) : window.setTimeout(resolve, 60)), minMs)
    })
  })
}

/** The sea, once per visit, built when the page is calm. */
function ensureStage(): Promise<Stage | null> {
  if (!glassOK() || dev.saveData) return Promise.resolve(null)
  stageP ??= (async () => {
    const st = await createStageSafe()
    if (!st) return null
    await st.warmup()
    Object.assign(st.state, finalState())
    st.setOpacity(0)
    stage = st
    html.classList.add('has-glass')
    st.start()
    wireInteraction(st)
    enableTilt(st)
    return st
  })()
  return stageP
}

/** Sound with no gate: only if the browser allows it; otherwise with the first tap anywhere. */
function armSound(): void {
  if (qaMode && qaMode !== 'sound') return // QA captures run silent (?qa=sound tests the sound)
  sound.armFirstGesture()
  // a phone never lets a page sound before a tap: outside the intro the AudioContext waits for that tap
  if (dev.mobile && !playIntro) return
  requestAnimationFrame(() => window.setTimeout(() => void sound.autoplay(), 0))
}

/** Direct entry: no intro (repeat visit, anchor, reduced motion, no WebGL). */
async function bootDirect(): Promise<void> {
  markRevealed(600)
  armSound()
  // after the first paint: the WebGL question (it creates a context) and the wave scene's length
  await new Promise<void>((r) => requestAnimationFrame(() => window.setTimeout(r, 0)))
  markSea()
  if (!glassOK() || dev.saveData) return
  startScenes()
  void import('./three/stage').catch(() => {})
  await whenCalm()
  const st = await ensureStage()
  if (st) fadeStageIn()
}

async function bootIntro(): Promise<void> {
  // under the intro's veil the still has no job: the sea opens the film
  html.classList.add('glass-in')
  void import('./three/stage').catch(() => {})
  const [{ Splash }, { runIntro }] = await Promise.all([import('./intro/splash'), import('./intro/timeline')])
  const splash = new Splash(introEl as HTMLElement, { quick: replay })
  // "Skip" from the first second: whoever skips while the sea is still loading gets the page now; the sea fades in
  // behind it when it's built
  let skipped = false
  const dropEarlySkip = splash.showSkip(() => {
    skipped = true
    splash.finish()
    revealHero(true)
    markRevealed(300)
    unlockPage()
    startScenes()
    armSound()
  })
  const pStage = splash.part('stage', 0.55)
  const pAudio = splash.part('audio', 0.3)
  const pFonts = splash.part('fonts', 0.15)

  const critical = (Object.keys(SOUNDS) as SoundName[]).filter((n) => SOUNDS[n].critical)
  void sound.preload(critical, (d, t) => pAudio(d / t))
  void document.fonts.ready.then(() => pFonts(1))

  stageP = (async () => {
    const st = await createStageSafe()
    pStage(0.2)
    if (st) {
      await st.warmup((p) => pStage(0.2 + p * 0.8))
      wireInteraction(st)
    }
    pStage(1)
    return st
  })()

  stage = await stageP
  if (stage) html.classList.add('has-glass')
  /** skipped before the film began: the sea simply fades in behind the page, at rest */
  const seaAfterSkip = () => {
    if (!stage) return html.classList.remove('glass-in')
    Object.assign(stage.state, finalState())
    stage.setOpacity(0)
    stage.start()
    enableTilt(stage)
    fadeStageIn()
  }
  if (skipped) return seaAfterSkip()
  await splash.ready
  if (skipped) return seaAfterSkip()
  dropEarlySkip()

  store.set('ocean-intro-seen', '1', 'session')
  store.set('ocean-intro-at', String(Date.now()))
  if (qaMode === 'slow') gsap.globalTimeline.timeScale(0.1)
  if (qaMode === 'slow' || qaMode === 'seek') (window as Window & { __gsap?: unknown }).__gsap = gsap
  gsap.ticker.lagSmoothing(0)
  splash.open()
  enableTilt(stage)
  const done = () => {
    unlockPage()
    startScenes()
  }
  if (!stage) {
    html.classList.remove('glass-in')
    revealHero(false)
    splash.finish()
    done()
    markRevealed(1500)
    armSound()
    return
  }
  env.fade = 1
  stage.setOpacity(1)
  stage.start()
  intro = runIntro(stage, splash, {
    revealHero: (fast) => {
      revealHero(fast)
      markRevealed(fast ? 300 : 1500)
    },
    startAmbience,
    done,
  })
  if (qaMode === 'seek') intro.tl.pause(0)
  if (qaMode === 'seek' || qaMode === 'slow' || qaMode === 'sound') (window as Window & { __oceanTl?: unknown }).__oceanTl = intro.tl
  armSound()
}

// QA hook (only with ?qa in the URL): Playwright can pose the sea and jump without smooth scrolling.
if (params.has('qa')) {
  ;(window as Window & { __ocean?: unknown }).__ocean = {
    get stage() {
      return stage
    },
    finalState,
    sound,
    seekDemo,
    to: (y: number) => (lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)),
  }
}

void (playIntro ? bootIntro() : bootDirect())
