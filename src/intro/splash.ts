/**
 * The splash (Qora's pattern, rewritten for Ocean):
 *  1. Night. The wordmark writes itself in white hairlines, piece by piece (the O, the "cean" and its wave, INDS.),
 *     while the loading count rises.
 *  2. The count blends real progress (the sounds being made, the shaders compiling, a performance check) with a
 *     time-based fill that never stands still, and stops at 99 until everything is ready.
 *  3. No gate: when all is ready and the writing is done, the sea opens by itself. Sound plays if the browser allows
 *     it; otherwise from the first tap anywhere (core/audio.ts). Bottom left, a sound button; right, "Skip".
 *  4. Opening: the drawing fades and the night dissolves over the 3D sea.
 *  5. While the cinematic runs, the veil takes the touches (they wake the sound) and the page below is inert: a tap
 *     can't press a button nobody can see yet.
 */
import gsap from 'gsap'

const FAKE_FILL_MS = 3000

interface Part {
  w: number
  p: number
}

export class Splash {
  readonly root: HTMLElement
  private num: HTMLElement
  private count: HTMLElement
  private skipBtn: HTMLButtonElement
  private soundBtn: HTMLElement | null
  private word: HTMLElement
  private parts = new Map<string, Part>()
  private target = 0
  private shown = 0
  private t0 = performance.now()
  private raf = 0
  private minHold: number
  private resolveReady!: () => void
  private isReady = false
  private released = false
  readonly ready: Promise<void>
  private veiled: HTMLElement[]

  constructor(root: HTMLElement, opts: { quick?: boolean; minHold?: number } = {}) {
    this.root = root
    // the writing ends at ~2.2 s: the sea doesn't open before
    this.minHold = opts.quick ? 0 : (opts.minHold ?? 2200)
    this.num = root.querySelector('.intro__num') as HTMLElement
    this.count = root.querySelector('.intro__count') as HTMLElement
    this.skipBtn = root.querySelector('.intro__skip') as HTMLButtonElement
    this.soundBtn = root.querySelector<HTMLElement>('.intro__sound')
    this.word = root.querySelector('.intro__word') as HTMLElement
    this.ready = new Promise((r) => (this.resolveReady = r))
    this.veiled = Array.from(document.querySelectorAll<HTMLElement>('main, .nav, .footer, .fab'))
    this.veiled.forEach((el) => el.setAttribute('inert', ''))
    // each hairline knows its own length: the writing runs at the same speed on every piece
    root.querySelectorAll<SVGPathElement>('.intro__wm path').forEach((p, i) => {
      const len = p.getTotalLength?.() ?? 2000
      p.style.setProperty('--len', String(Math.ceil(len)))
      p.style.setProperty('--i', String(i))
    })
    root.classList.add('is-drawing')
    if (opts.quick) root.classList.add('is-quick')
    this.raf = requestAnimationFrame(this.tick)
  }

  /** Registers a part of the loading with its weight; returns a 0..1 setter. */
  part(name: string, weight: number): (p: number) => void {
    const part: Part = { w: weight, p: 0 }
    this.parts.set(name, part)
    this.recalc()
    return (p: number) => {
      part.p = Math.max(part.p, Math.min(1, Math.max(0, p)))
      this.recalc()
    }
  }

  private recalc(): void {
    let w = 0
    let v = 0
    this.parts.forEach((p) => {
      w += p.w
      v += p.w * p.p
    })
    this.target = w ? v / w : 0
  }

  private tick = (): void => {
    const el = performance.now() - this.t0
    const real = this.target
    const fake = Math.min(0.9, (el / FAKE_FILL_MS) * 0.9)
    const goal = real >= 1 ? 1 : Math.min(0.99, Math.max(real, Math.min(fake, real + 0.3)))
    this.shown += (goal - this.shown) * 0.1
    if (goal === 1 && this.shown > 0.995) this.shown = 1
    this.num.textContent = String(Math.floor(this.shown * 100))
    if (this.shown >= 1 && el >= this.minHold && !this.isReady) {
      this.isReady = true
      this.root.classList.add('is-ready')
      this.resolveReady()
      return
    }
    this.raf = requestAnimationFrame(this.tick)
  }

  /** The drawing gives way and the night dissolves over the 3D sea (CSS). */
  open(): void {
    cancelAnimationFrame(this.raf)
    this.root.classList.add('is-open')
    gsap.to(this.count, { opacity: 0, duration: 0.3, ease: 'power2.out' })
    if (this.soundBtn) {
      this.soundBtn.hidden = false
      gsap.fromTo(this.soundBtn, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.9 })
    }
  }

  /** From the hand-off to the hero, touches and focus return to the page. */
  release(): void {
    if (this.released) return
    this.released = true
    this.root.classList.add('is-released')
    this.veiled.forEach((el) => el.removeAttribute('inert'))
    if (this.soundBtn) gsap.to(this.soundBtn, { opacity: 0, duration: 0.3, onComplete: () => this.soundBtn && (this.soundBtn.hidden = true) })
  }

  /** "Skip" for whoever doesn't want the film; returns how to take this handler back (the next stage brings its own). */
  showSkip(onSkip: () => void): () => void {
    if (this.skipBtn.hidden) {
      this.skipBtn.hidden = false
      this.skipBtn.removeAttribute('aria-hidden')
      gsap.fromTo(this.skipBtn, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.4 })
    }
    const onClick = () => {
      off()
      onSkip()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || this.released) return
      off()
      onSkip()
    }
    const off = () => {
      this.skipBtn.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
    }
    this.skipBtn.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    return off
  }

  /** The line arrives word by word under the glass, with the motif. */
  showWordmark(): void {
    this.word.classList.add('is-on')
    const words = this.word.querySelectorAll('.iw')
    gsap.fromTo(words, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.09 })
  }

  /** When the hero arrives, "Skip" has no job (and on a phone it would cover the button). */
  hideSkip(): void {
    gsap.to(this.skipBtn, { opacity: 0, duration: 0.3, onComplete: () => { this.skipBtn.hidden = true } })
  }

  hideWordmark(fast = false): void {
    gsap.to(this.word, { opacity: 0, y: -10, duration: fast ? 0.01 : 0.5, ease: 'power2.in' })
  }

  finish(): void {
    this.release()
    this.skipBtn.hidden = true
    this.root.classList.add('is-done')
    gsap.to(this.root, { opacity: 0, duration: 0.5, ease: 'power1.out', onComplete: () => this.root.remove() })
  }
}
