/**
 * Smooth scroll (Lenis) on desktops, driven by GSAP's ticker so the scroll scenes and the glass read the same clock.
 * Phones and reduced motion keep the native scroll. The scroll scenes (ScrollTrigger) live in scenes.ts, a chunk of
 * their own, so ScrollTrigger is not in the first bundle.
 */
import gsap from 'gsap'
import Lenis from 'lenis'

export interface Scroller {
  lenis: Lenis | null
  /** to a position or an element (under the bar: the anchors carry scroll-margin-top) */
  to(target: number | HTMLElement, opts?: { immediate?: boolean }): void
}

export function createSmoothScroll(enabled: boolean): Lenis | null {
  if (!enabled) return null
  const lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true, syncTouch: false })
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}
