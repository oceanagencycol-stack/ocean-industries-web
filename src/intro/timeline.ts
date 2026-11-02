/**
 * The intro: the Pacific at night. A drop wakes the water, a swell builds and breaks, and the Ocean wordmark rises out
 * of the breaking wave in glass.
 *
 *   0.0–1.6  dark water; a drop falls and the plankton wakes outward from it, ring after ring
 *   0.7–2.75 a swell comes in from far out, growing; its crest glows blue
 *   2.75     it breaks in front of the camera: a low hit, the crash, the white water glows green (the result)
 *   2.6–4.3  out of the break the glass rises, piece by piece (the O, the "cean" and its wave, INDS., the ®)
 *   3.6–4.8  a light passes over the glass, left to right
 *   4.4–6.0  it settles; "Convertimos marcas en olas." arrives with the three-note motif
 *   6.2–7.6  the glass glides to its place in the hero and the page appears
 *
 * Sound is scheduled against the AudioContext clock (sample-accurate); the picture runs on GSAP in real time. Both
 * are wall-clock time, so they never drift, even when frames drop (lagSmoothing at 0 during the intro).
 * No gate: if the browser didn't let sound play at load, the first tap anywhere calls `syncSound()` and each sound is
 * scheduled against where the picture is; sounds that already began start part-way through.
 */
import gsap from 'gsap'
import type { Stage } from '../three/stage'
import { finalState } from '../three/state'
import type { Splash } from './splash'
import { sound } from '../core/audio'
import { haptics, HAPTIC } from '../core/haptics'
import { MARKS } from '../core/sounds'

export interface IntroHooks {
  revealHero: (fast: boolean) => void
  startAmbience: () => void
  done: () => void
}

const T = {
  drop: 0.35,
  swell: 0.7,
  brk: 2.75,
  rise: 2.6,
  sweep: 3.6,
  word: 4.5,
  handoff: 6.2,
  end: 7.6,
}

export interface IntroController {
  skip: () => void
  tl: gsap.core.Timeline
  /** Schedules the intro's sound from where the picture is (once). */
  syncSound: () => void
  readonly running: boolean
  /** true once the glass is on its way to the hero (from there on, the site's music, not the intro's) */
  readonly handedOff: boolean
}

export function runIntro(stage: Stage, splash: Splash, hooks: IntroHooks): IntroController {
  const s = stage.state
  let finished = false
  let soundOn = false

  // ---------- sound (scheduled once, against the audio clock) ----------
  function syncSound(): void {
    if (soundOn || finished || !sound.audible) return
    const ctx = sound.ctx!
    soundOn = true
    const lat = (ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0
    // audio t = 0 lands where the picture is now (if unlocked late, in the past)
    const t0 = ctx.currentTime - lat + 0.02 - tl.time()
    const at = (t: number) => ({ at: t0 + t })
    sound.loop('surf', { fadeIn: 2.4, xfade: 2 })
    sound.play('drop', at(T.drop))
    sound.play('swell', at(T.brk - MARKS.swellPeak))
    sound.play('break', at(T.brk))
    sound.play('spray', at(T.brk + 0.05))
    sound.play('chime', at(T.brk + 0.35))
    sound.play('sweep', at(T.sweep))
    sound.play('motif', at(T.word))
  }

  // ---------- picture ----------
  const tl = gsap.timeline({ onComplete: () => complete(false) })
  const call = (t: number, fn: () => void) => tl.call(fn, undefined, t)

  // 0–1.6: the water wakes from a drop
  tl.to(s, { env: 0.55, duration: 1.6, ease: 'sine.out' }, 0)
  tl.to(s, { backdrop: 0.3, duration: 1.8, ease: 'sine.out' }, 0)
  tl.to(s, { dolly: 0.35, duration: 2.9, ease: 'sine.inOut' }, 0)
  call(T.drop, () => {
    s.dropAt = stage.now
    haptics.pulse(HAPTIC.appear)
  })
  tl.to(s, { sea: 1, duration: 2.6, ease: 'sine.out' }, T.drop)

  // 0.7–2.75: the swell comes in
  tl.to(s, { swell: 1, duration: T.brk - T.swell, ease: 'power2.in' }, T.swell)
  tl.fromTo(s, { crest: 0 }, { crest: 1, duration: T.brk - T.swell, ease: 'sine.inOut' }, T.swell)
  ;[1.4, 1.8, 2.1, 2.35, 2.55, 2.68].forEach((t) => call(t, () => haptics.pulse(HAPTIC.heartbeat)))

  // 2.75: it breaks; the glass rises out of it
  tl.to(s, { rise: 1, duration: 1.7, ease: 'power3.out' }, T.rise)
  call(T.brk, () => {
    s.sprayAt = stage.now
    haptics.pulse(HAPTIC.lock)
  })
  tl.to(s, { breaking: 1, duration: 0.25, ease: 'power2.out' }, T.brk)
  tl.to(s, { breaking: 0, duration: 2.4, ease: 'sine.inOut' }, T.brk + 0.6)
  tl.to(s, { swell: 0, duration: 1.8, ease: 'sine.out' }, T.brk + 0.1)
  tl.to(s, { flash: 0.85, duration: 0.05, ease: 'none' }, T.brk)
  tl.to(s, { flash: 0, duration: 1.3, ease: 'power2.out' }, T.brk + 0.05)
  tl.to(s, { backdrop: 1, duration: 1.6, ease: 'sine.out' }, T.brk)
  tl.to(s, { env: 1, duration: 1.4, ease: 'sine.out' }, T.brk)
  call(T.brk + 0.4, () => haptics.pulse(HAPTIC.ring))

  // 3.6–4.8: the light passes over the glass
  tl.to(s, { sweep: 1, duration: 1.2, ease: 'sine.inOut' }, T.sweep)

  // 4.4–6: it settles, the line and the motif
  tl.to(s, { settle: 1, duration: 1.9, ease: 'sine.inOut' }, 4.2)
  tl.to(s, { dolly: 1, duration: 2.6, ease: 'sine.inOut' }, 3.6)
  tl.to(s, { wordShift: 1, duration: 0.95, ease: 'power3.inOut' }, T.word - 0.35)
  call(T.word + MARKS.motifNotes[0], () => haptics.pulse(HAPTIC.motif))
  call(T.word + MARKS.motifNotes[0], () => splash.showWordmark())

  // 6.2–7.6: hand-off to the hero
  call(T.handoff, () => splash.hideWordmark())
  tl.to(s, { wordShift: 0, layout: 1, duration: 1.35, ease: 'power3.inOut' }, T.handoff)
  call(T.handoff + 0.1, () => hooks.startAmbience())
  call(T.handoff + 0.6, () => {
    splash.hideSkip()
    splash.release()
    hooks.revealHero(false)
  })
  tl.to(s, { interactive: 1, duration: 0.6, ease: 'sine.out' }, T.handoff + 0.9)
  tl.to({}, { duration: 0.01 }, T.end)

  splash.showSkip(() => complete(true))

  function complete(skipped: boolean): void {
    if (finished) return
    finished = true
    if (skipped) {
      tl.kill()
      sound.stopOneShots(0.2)
      haptics.stop()
      Object.assign(s, finalState())
      splash.hideWordmark(true)
      hooks.startAmbience()
      hooks.revealHero(true)
    }
    splash.finish()
    hooks.done()
  }

  return {
    skip: () => complete(true),
    tl,
    syncSound,
    get running() {
      return !finished
    },
    get handedOff() {
      return finished || tl.time() >= T.handoff
    },
  }
}
