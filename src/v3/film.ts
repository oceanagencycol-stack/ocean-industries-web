import { lang, onLang } from '../ui/i18n'
import { store } from '../core/storage'
import { frameWindow } from './film-frames'

import timing from './film-timing.json'

const times = timing.anchors
const interval = times[2] - times[1]
const end = timing.duration - 1 / timing.fps
const last = times.length - 1
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const instant = 'instant' as ScrollBehavior

/** The film runs on its own media clock in projection. The same timecodes are
 * addresses for native scrolling, chapter navigation and reversing direction. */
export function initFilm(intro: Promise<unknown>, saveData: boolean): void {
  const video = document.querySelector<HTMLVideoElement>('#film')!
  const html = document.documentElement
  const chapters = [...document.querySelectorAll<HTMLElement>('.tramo[data-shot]')]
  const shots = chapters.map((el) => el.querySelector<HTMLElement>('.film-shot')!)
  const copies = shots.map((el) => el.querySelector<HTMLElement>('.film-copy')!)
  const panes = [...document.querySelectorAll<HTMLElement>('[data-dossier]')]
  const transport = document.querySelector<HTMLElement>('.transport')!
  const play = transport.querySelector<HTMLButtonElement>('.transport-play')!
  const stops = [...transport.querySelectorAll<HTMLAnchorElement>('.transport-stop')]
  const heroPlay = document.querySelector<HTMLButtonElement>('.hero-projector')!
  const clock = transport.querySelector<HTMLElement>('.transport-time')!
  const toggles = [...document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]')]
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const portrait = matchMedia('(max-aspect-ratio: 4/5)')
  const disabled = saveData || new URLSearchParams(location.search).has('noworld')
  let paused = store.get('ocean-motion-paused') === '1'
  let available = false,
    ready = false,
    projecting = false,
    opening = false
  let atEnd = false
  let openingTime = timing.opening
  const openingArrival = 6
  let mediaTick = 0
  let tick = 0,
    active = -1,
    desired = 0,
    lastSecond = -1,
    previousCue = -1
  let soundBand = -1
  let tops: number[] = [],
    heights: number[] = []
  const frameCanvas = document.querySelector<HTMLCanvasElement>('.film-frames')!
  let frames: ReturnType<typeof frameWindow> = null
  let visual = 0,
    lastTick = 0,
    lastMove = 0,
    previousTarget = -1
  let activePane: HTMLElement | null = null
  const canMove = () => available && !disabled && !motion.matches && !paused
  const words = {
    es: ['Ver película', 'Pausar película', 'Pausar el movimiento', 'Reanudar el movimiento'],
    en: ['Play film', 'Pause film', 'Pause motion', 'Resume motion'],
    pt: ['Ver filme', 'Pausar filme', 'Pausar o movimento', 'Retomar o movimento'],
  }
  function controls() {
    const w = words[lang()]
    for (const button of [play, heroPlay]) {
      button.querySelector('span')!.textContent = w[Number(projecting)]
      button.setAttribute('aria-pressed', String(projecting))
      button.hidden = !ready
    }
    for (const b of toggles) {
      b.hidden = !available || disabled || motion.matches || !(ready || paused)
      b.setAttribute('aria-pressed', String(paused))
      const label = b.querySelector('[data-motion-label]') ?? b
      label.textContent = w[paused ? 3 : 2]
    }
  }
  function measure() {
    tops = chapters.map((el) => el.getBoundingClientRect().top + scrollY)
    heights = shots.map((el) => el.offsetHeight)
    schedule()
  }
  function stop() {
    if (opening) {
      openingTime = Math.min(openingArrival, video.currentTime)
      desired = openingTime
    }
    projecting = false
    opening = false
    video.pause()
    if (mediaTick) {
      video.cancelVideoFrameCallback(mediaTick)
      mediaTick = 0
    }
    controls()
  }
  function requestFrame(t: number) {
    desired = clamp(t, 0, video.duration || timing.duration)
    if (!ready || video.seeking || projecting || opening) return
    if (Math.abs(video.currentTime - desired) > 0.026) video.currentTime = desired
  }
  function follow(target: number) {
    const now = performance.now()
    if (Math.abs(target - previousTarget) > 0.005) lastMove = now
    previousTarget = target
    const dt = Math.min(0.1, (now - lastTick) / 1000)
    lastTick = now
    const distance = target - visual
    if (Math.abs(distance) > 2.0 || Math.abs(distance) < 0.018) visual = target
    else visual += distance * (1 - Math.exp(-dt / 0.075))
    const moving = now - lastMove < 160 || Math.abs(target - visual) > 0.02
    // Request the sharp native frame when the reader stops. Keep the last
    // composed frame in front until the new native seek actually completes.
    if (!moving || !frames) requestFrame(visual)
    if (moving || video.seeking || Math.abs(video.currentTime - visual) > 0.08) {
      if (frames?.seek(visual)) frameCanvas.hidden = false
      else if (frameCanvas.hidden) requestFrame(visual)
    } else {
      frameCanvas.hidden = true
      frames?.primeAt(visual)
    }
    if (moving) schedule()
  }
  function fromTime(t: number) {
    if (t <= openingTime) return tops[0]
    let j = 0
    while (j < last && t >= times[j + 1]) j++
    if (j === last) return tops[last]
    const start = j === 0 ? openingTime : times[j]
    return tops[j] + (tops[j + 1] - tops[j]) * clamp((t - start) / (times[j + 1] - start), 0, 1)
  }
  function paint() {
    tick = 0
    if (!tops.length) return
    if (projecting && !video.paused) {
      const destination = fromTime(video.currentTime)
      if (Math.abs(scrollY - destination) > 1) window.scrollTo({ top: destination, behavior: instant })
    }
    const y = scrollY
    let i = 0
    while (i < last && y >= tops[i + 1] - 1) i++
    const row = clamp((y - tops[i]) / Math.max(1, heights[i]), 0, 1)
    const inDetails =
      !!activePane &&
      innerHeight * 0.52 > activePane.getBoundingClientRect().top &&
      activePane.getBoundingClientRect().bottom > innerHeight * 0.25
    const onStage = y < tops[last] + heights[last] * 0.54 && !inDetails
    const span =
      i < last && activePane?.parentElement !== chapters[i]
        ? clamp((y - tops[i]) / (tops[i + 1] - tops[i]), 0, 1)
        : 0
    if (i < last) atEnd = false
    const t =
      i < last
        ? (i === 0 ? openingTime : times[i]) + (i === 0 ? times[1] - openingTime : interval) * span
        : atEnd
          ? end
          : Math.min(end, times[last] + row * (end - times[last]) * 2)
    const position = opening || projecting ? video.currentTime : i === 0 && y < 2 ? openingTime : t
    if (ready && onStage && !opening && !projecting) follow(position)
    else {
      frameCanvas.hidden = true
      visual = position
      lastTick = performance.now()
    }
    const filmChapter =
      visual < times[1]
        ? clamp((visual - openingTime) / (times[1] - openingTime), 0, 1)
        : 1 + (visual - times[1]) / interval
    const scene = opening ? 0 : ready && onStage ? clamp(filmChapter, 0, last) : i + span
    const cue = clamp(Math.round(scene), 0, last)
    const fixed = ready && onStage
    // The audio crosses the water with the lens. The threshold is authored in
    // the retimed master rather than inferred from the height of the article.
    const band = fixed ? timing.sound.filter((mark) => visual >= mark).length : -1
    if (band !== soundBand) {
      soundBand = band
      html.dataset.filmSound = band < 0 ? '' : chapters[band].dataset.tramo
      window.dispatchEvent(new Event('ocean:film-sound'))
    }
    html.classList.toggle('film-view', fixed)
    html.classList.toggle('film-first', fixed && cue === 0)
    html.classList.toggle('in-dossier', inDetails)
    html.classList.toggle('film-light', fixed && cue === 5 && Math.abs(scene - 5) < 0.32)
    transport.hidden = !onStage || html.classList.contains('is-menu-open')
    if (previousCue !== cue) {
      stops.forEach((a, j) =>
        j === cue ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'),
      )
      previousCue = cue
    }
    const current = fixed ? cue : -1
    if (current !== active) {
      copies.forEach((el, j) => {
        el.inert = fixed && j !== cue
        el.classList.toggle('on-camera', j === current)
      })
      active = current
    }
    if (fixed) {
      const d = scene - cue
      const opacity = 1 - clamp((Math.abs(d) - 0.24) / 0.21, 0, 1)
      const copy = copies[cue]
      copy.style.setProperty('--cue-opacity', String(opacity))
      copy.style.setProperty('--cue-y', (-d * 85).toFixed(2) + 'px')
    }
    const second = Math.floor(position)
    if (second !== lastSecond) {
      clock.textContent = '00:' + String(second).padStart(2, '0')
      lastSecond = second
    }
    stops.forEach((a, j) => a.style.setProperty('--fill', String(clamp(scene - j + 0.09, 0, 1))))
    if (projecting || opening) {
      if (typeof video.requestVideoFrameCallback !== 'function') schedule()
      else if (!mediaTick)
        mediaTick = video.requestVideoFrameCallback(() => {
          mediaTick = 0
          schedule()
        })
    }
  }
  function schedule() {
    if (!tick) tick = requestAnimationFrame(paint)
  }
  function targetPane(hash: string, align: boolean) {
    const target = document.getElementById(hash.slice(1))
    const pane = target?.closest<HTMLElement>('[data-dossier]') ?? null
    const previous = activePane
    activePane = pane
    panes.forEach((el) => (el.hidden = el !== pane))
    measure()
    if (target && (pane || previous || align)) {
      target.scrollIntoView({ block: 'start', behavior: instant })
      if (pane || previous) {
        if (!target.hasAttribute('tabindex')) target.tabIndex = -1
        target.focus({ preventScroll: true })
      }
    }
    schedule()
  }
  function configure() {
    stop()
    ready = false
    html.classList.remove('has-world', 'film-view')
    html.classList.toggle('motion-paused', paused)
    html.classList.toggle('no-motion', motion.matches)
    frames?.dispose()
    frames = null
    if (canMove()) {
      frames = frameWindow(frameCanvas, portrait.matches ? 'vertical' : 'horizonte', schedule)
      previousTarget = -1
      video.src = '/v3/film/' + (portrait.matches ? 'vertical.mp4' : 'horizonte.mp4')
      video.load()
    } else if (video.hasAttribute('src')) {
      video.removeAttribute('src')
      video.load()
    }
    controls()
    schedule()
  }
  function userInterrupt() {
    if (opening || projecting) {
      stop()
      schedule()
    }
  }
  video.addEventListener('loadeddata', () => {
    if (!canMove()) return
    ready = true
    frames?.warm()
    html.classList.add('has-world')
    controls()
    if (scrollY < 2 && !location.hash && !document.hidden) {
      opening = true
      video.playbackRate = 1
      video.play().catch(() => {
        opening = false
        schedule()
      })
    }
    schedule()
  })
  video.addEventListener('timeupdate', () => {
    if (opening && video.currentTime >= openingArrival) {
      stop()
      requestFrame(openingTime)
    }
    schedule()
  })
  video.addEventListener('seeked', () => {
    requestFrame(desired)
    schedule()
  })
  video.addEventListener('ended', () => {
    atEnd = true
    stop()
    schedule()
  })
  video.addEventListener('error', () => {
    ready = false
    stop()
    html.classList.remove('has-world', 'film-view')
    schedule()
  })
  for (const button of [play, heroPlay])
    button.addEventListener('click', () => {
      if (projecting) {
        stop()
        schedule()
        return
      }
      if (!ready) return
      if (activePane) targetPane('#' + (activePane.parentElement?.id || 'inicio'), true)
      if (opening) openingTime = timing.opening
      opening = false
      video.currentTime = button === heroPlay || visual >= times[last] - 0.05 ? 0 : visual
      frameCanvas.hidden = true
      projecting = true
      video.playbackRate = 1
      controls()
      video.play().catch(() => {
        stop()
        schedule()
      })
      schedule()
    })
  for (const b of toggles)
    b.addEventListener('click', () => {
      paused = !paused
      store.set('ocean-motion-paused', paused ? '1' : '0')
      configure()
      window.dispatchEvent(new Event('ocean:motion-preference'))
    })
  document.addEventListener('click', (e) => {
    const a = (e.target as Element)?.closest<HTMLAnchorElement>('a[href^="#"]')
    if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
    const target = document.getElementById(a.hash.slice(1))
    if (!target) return
    userInterrupt()
    if (target.matches('.tramo') && !activePane) {
      e.preventDefault()
      if (location.hash !== a.hash) history.pushState(null, '', a.hash)
      target.scrollIntoView({ block: 'start', behavior: ready ? 'smooth' : instant })
      return
    }
    if (target.closest('[data-dossier]') || activePane) {
      e.preventDefault()
      if (location.hash !== a.hash) history.pushState(null, '', a.hash)
      targetPane(a.hash, true)
    }
  })
  window.addEventListener('hashchange', () => {
    userInterrupt()
    targetPane(location.hash, true)
  })
  window.addEventListener('popstate', () => {
    userInterrupt()
    targetPane(location.hash, true)
  })
  for (const event of ['wheel', 'touchstart', 'pointerdown'])
    window.addEventListener(
      event,
      (e) => {
        if (event !== 'wheel' && (e.target as Element)?.closest?.('.transport-play, .hero-projector')) return
        userInterrupt()
      },
      { passive: true },
    )
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' && (e.target as Element)?.closest?.('.transport-play, .hero-projector')) return
    if (['ArrowDown', 'ArrowUp', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab', 'Escape'].includes(e.key))
      userInterrupt()
  })
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', measure, { passive: true })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) userInterrupt()
  })
  const observer = new ResizeObserver(measure)
  chapters.forEach((el) => observer.observe(el))
  portrait.addEventListener('change', configure)
  motion.addEventListener('change', configure)
  onLang(controls)
  html.classList.add('film-ui')
  targetPane(location.hash, !!location.hash)
  intro.finally(() => {
    available = true
    configure()
  })
}
