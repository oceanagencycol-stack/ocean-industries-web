/**
 * Una toma ambiental a la vez. El scroll encuadra la imagen y decide qué toma
 * se ve. El video corre a su velocidad original, sin pedir fotogramas al decodificador.
 */
const portrait = '(max-aspect-ratio: 4/5)'
const directory = '/v3/cine'

type Scene = { frame: HTMLElement; name: string }

export function mountCinema(): { dispose: () => void } | null {
  if (!('IntersectionObserver' in window) || !document.createElement('video').canPlayType('video/mp4')) return null

  const scenes = new Map<HTMLElement, Scene>()
  for (const section of document.querySelectorAll<HTMLElement>('[data-tramo]')) {
    const heading = section.querySelector<HTMLElement>(':scope > :is(.hero, .head, .pause)')
    const frame = section.querySelector<HTMLElement>('.plate__frame')
    const name = section.dataset.tramo
    if (heading && frame && name) scenes.set(heading, { frame, name })
  }
  if (!scenes.size) return null

  const tall = matchMedia(portrait)
  const visible = new Map<HTMLElement, number>()
  let active: HTMLElement | null = null
  let video: HTMLVideoElement | null = null
  let raf = 0
  const failed = new Set<string>()

  function release() {
    const frame = active && scenes.get(active)?.frame
    frame?.classList.remove('is-playing', 'is-moving')
    frame?.style.removeProperty('--scene-offset')
    frame?.style.removeProperty('--scene-scale')
    if (!video) return
    const previous = video
    video = null
    previous.pause()
    previous.removeAttribute('src')
    previous.load()
    previous.remove()
  }

  function scheduleFrame() {
    if (raf || !active || document.hidden) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const frame = active && scenes.get(active)?.frame
      if (!active || !frame || !video) return
      const rect = active.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)))
      const travel = Math.min(tall.matches ? 12 : 32, rect.height * 0.028)
      frame.style.setProperty('--scene-offset', `${((progress * 2 - 1) * travel).toFixed(2)}px`)
      frame.style.setProperty('--scene-scale', (1.045 + progress * 0.065).toFixed(3))
    })
  }

  function play() {
    if (!video || document.hidden) return
    void video.play().catch(() => {
      // Safari puede rechazar el autoplay con ahorro de batería. Queda la placa.
    })
  }

  function show(next: HTMLElement | null, force = false) {
    if (active === next && !force) return
    release()
    active = next
    const scene = active && scenes.get(active)
    if (!scene || document.hidden) return

    const src = `${directory}/${scene.name}${tall.matches ? '-v' : ''}.mp4`
    if (failed.has(src)) return

    const player = document.createElement('video')
    player.className = 'plate__motion'
    player.muted = true
    player.defaultMuted = true
    player.playsInline = true
    player.loop = true
    player.disablePictureInPicture = true
    player.addEventListener('playing', () => {
      if (video !== player) return
      scene.frame.classList.add('is-playing', 'is-moving')
      scheduleFrame()
    })
    player.addEventListener('error', () => {
      if (video !== player) return
      failed.add(src)
      release()
    })
    video = player
    scene.frame.append(player)
    player.src = src
    play()
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const heading = entry.target as HTMLElement
      if (entry.intersectionRatio >= 0.18) visible.set(heading, entry.intersectionRatio)
      else visible.delete(heading)
    }

    let next: HTMLElement | null = null
    let best = 0
    for (const [heading, ratio] of visible) {
      if (ratio <= best) continue
      next = heading
      best = ratio
    }
    show(next)
  }, { threshold: [0, 0.18, 0.35, 0.55, 0.75, 1] })

  function onVisibility() {
    if (document.hidden) video?.pause()
    else if (video) {
      play()
      scheduleFrame()
    } else show(active, true)
  }

  const onAspect = () => show(active, true)
  for (const heading of scenes.keys()) observer.observe(heading)
  tall.addEventListener('change', onAspect)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('scroll', scheduleFrame, { passive: true })

  return {
    dispose() {
      observer.disconnect()
      tall.removeEventListener('change', onAspect)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('scroll', scheduleFrame)
      cancelAnimationFrame(raf)
      release()
    },
  }
}
