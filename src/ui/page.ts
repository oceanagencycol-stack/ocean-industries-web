/**
 * The interface that doesn't depend on the 3D: sound toggles, interface sounds and haptics by delegation, the bar's
 * ground once the page moves and the section it is on, replay the intro, vibration, the counted numbers, the scenes.
 */
import gsap from 'gsap'
import { sound } from '../core/audio'
import { haptics } from '../core/haptics'
import { store } from '../core/storage'
import { initDemos } from './demos'
import { onLang, t } from './i18n'

const reduced = () => document.documentElement.classList.contains('no-motion')

export function initUI(): void {
  // ---- sound (what happens when it turns on lives in main.ts: sound.onChange) ----
  const toggles = () => document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]')
  const render = (on: boolean) =>
    toggles().forEach((b) => {
      b.setAttribute('aria-pressed', String(on))
      b.setAttribute('aria-label', on ? t({ es: 'Sonido activado', en: 'Sound on', pt: 'Som ativado' }) : t({ es: 'Sonido apagado', en: 'Sound off', pt: 'Som desligado' }))
    })
  render(sound.enabled)
  sound.onChange(render)
  onLang(() => render(sound.enabled))
  toggles().forEach((b) =>
    b.addEventListener('click', () => {
      hideSoundTip()
      store.set(TIP_KEY, '1', 'session')
      sound.setEnabled(!sound.enabled)
      haptics.tap()
    }),
  )

  // ---- interface sounds and haptics, by delegation ----
  document.addEventListener(
    'pointerover',
    (e) => {
      if (e.pointerType !== 'mouse') return
      const el = (e.target as Element | null)?.closest?.('[data-sfx]')
      if (!el) return
      const from = e.relatedTarget as Node | null
      if (from && el.contains(from)) return
      sound.play('tick')
    },
    { passive: true },
  )
  document.addEventListener('click', (e) => {
    const el = e.target as Element | null
    if (el?.closest?.('[data-sfx]')) sound.play('click')
    if (el?.closest?.('[data-haptic]')) haptics.tap()
  })

  // ---- the bar takes its own ground once the page moves; the link of the section on screen is marked ----
  const nav = document.querySelector<HTMLElement>('.nav')
  if (nav) {
    let scrolled = false
    const paint = () => {
      const s = window.scrollY > 24
      if (s === scrolled) return
      scrolled = s
      nav.classList.toggle('is-scrolled', s)
    }
    window.addEventListener('scroll', paint, { passive: true })
    paint()
    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('.nav__links a'))
    const ids = links.map((a) => a.getAttribute('href')?.slice(1) ?? '')
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const i = ids.indexOf(e.target.id)
            if (i < 0) continue
            if (e.isIntersecting) links.forEach((a, j) => (j === i ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')))
            else links[i].removeAttribute('aria-current')
          }
        },
        { rootMargin: '-45% 0px -50% 0px' },
      )
      ids.forEach((id) => {
        const el = document.getElementById(id)
        if (el) io.observe(el)
      })
    }
  }

  // ---- replay the intro ----
  const replay = document.querySelector<HTMLButtonElement>('[data-replay]')
  if (replay && !reduced()) {
    replay.hidden = false
    replay.addEventListener('click', () => {
      store.set('ocean-replay', '1', 'session')
      history.replaceState(null, '', location.pathname)
      window.scrollTo(0, 0)
      location.reload()
    })
  }

  // ---- vibration (only where the device has it) ----
  const hBtn = document.querySelector<HTMLButtonElement>('[data-haptics-toggle]')
  if (hBtn && haptics.supported) {
    hBtn.hidden = false
    const paint = () => {
      hBtn.setAttribute('aria-pressed', String(haptics.enabled))
      hBtn.textContent = haptics.enabled
        ? t({ es: 'Vibración activada', en: 'Vibration on', pt: 'Vibração ativada' })
        : t({ es: 'Vibración apagada', en: 'Vibration off', pt: 'Vibração desligada' })
    }
    paint()
    onLang(paint)
    hBtn.addEventListener('click', () => {
      haptics.setEnabled(!haptics.enabled)
      paint()
    })
  }

  const year = document.getElementById('year')
  if (year) year.textContent = String(new Date().getFullYear())

  initDemos()
  initCounts()
}

/** The live section's numbers count up once, when they come into view (the HTML already says the real number). */
function initCounts(): void {
  const nums = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'))
  if (!nums.length || reduced() || !('IntersectionObserver' in window)) return
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      nums.forEach((el, i) => {
        const to = Number(el.dataset.count) || 0
        if (!to) return
        const o = { v: 0 }
        gsap.to(o, {
          v: to,
          duration: 1.4,
          delay: i * 0.08,
          ease: 'power3.out',
          onUpdate: () => (el.textContent = String(Math.round(o.v))),
        })
      })
    },
    { threshold: 0.5 },
  )
  io.observe(nums[0])
}

/* ---------- the sound tip ---------- */
const TIP_KEY = 'ocean-sound-tip'
let tipTimer = 0

function hideSoundTip(): void {
  window.clearTimeout(tipTimer)
  document.querySelector('[data-sound-tip]')?.classList.remove('is-on')
  document.querySelector('.nav [data-sound-toggle]')?.classList.remove('is-calling')
}

/** Sound just started: the bar's button pulses twice and a tip says how to mute. Gone in ~4.6 s; once a session. */
export function showSoundTip(): void {
  if (store.get(TIP_KEY, 'session') === '1') return
  const tip = document.querySelector<HTMLElement>('[data-sound-tip]')
  const btn = document.querySelector<HTMLElement>('.nav [data-sound-toggle]')
  if (!tip || !btn || !btn.offsetParent) return
  store.set(TIP_KEY, '1', 'session')
  const touch = matchMedia('(hover: none)').matches
  tip.textContent = touch
    ? t({ es: 'El sonido está activo. Tócalo para silenciar.', en: 'Sound is on. Tap to mute.', pt: 'O som está ativo. Toque para silenciar.' })
    : t({ es: 'El sonido está activo. Haz clic para silenciar.', en: 'Sound is on. Click to mute.', pt: 'O som está ativo. Clique para silenciar.' })
  tip.classList.add('is-on')
  btn.classList.remove('is-calling')
  void btn.offsetWidth
  btn.classList.add('is-calling')
  window.clearTimeout(tipTimer)
  tipTimer = window.setTimeout(hideSoundTip, 4600)
}

/** The page's one orchestrated entrance: the hero arrives when the glass lands in its place. */
export function revealHero(fast: boolean): void {
  const html = document.documentElement
  const lines = gsap.utils.toArray<HTMLElement>('.hero [data-line]')
  const fades = gsap.utils.toArray<HTMLElement>('[data-hero-fade]')
  const nav = document.querySelector<HTMLElement>('.nav')
  if (fast || reduced()) {
    html.classList.remove('is-intro')
    gsap.set([...lines, ...fades, nav], { clearProps: 'all' })
    return
  }
  // drop the class BEFORE reading transforms: GSAP would read the CSS translateY(110%) as px and add yPercent
  html.classList.remove('is-intro')
  gsap.set(lines, { y: 0, yPercent: 110 })
  gsap.set(fades, { opacity: 0, y: 16 })
  if (nav) gsap.set(nav, { opacity: 0 })
  gsap.to(lines, { yPercent: 0, duration: 1.15, ease: 'power4.out', stagger: 0.1, clearProps: 'transform' })
  gsap.to(fades, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.4, clearProps: 'opacity,transform' })
  if (nav) gsap.to(nav, { opacity: 1, duration: 0.9, ease: 'sine.out', delay: 0.55, clearProps: 'opacity' })
}
