/**
 * The reels: Ocean's own production, from Instagram. The page carries the three latest as served from our own domain
 * (no JavaScript needed to see them); /api/reels may bring newer ones (Instagram Graph API, when its token is set).
 * Each video downloads only when it comes near the view, plays muted in view and pauses out of it; the sound button
 * plays one with sound at a time (and the site's own sound steps back meanwhile).
 */
import { sound } from '../core/audio'
import { t } from './i18n'

interface Reel {
  id: string
  permalink: string
  media_url: string
  media_webm?: string
  thumbnail_url?: string
  caption?: string
}

function card(r: Reel): HTMLElement {
  const fig = document.createElement('figure')
  fig.className = 'reel'
  const phone = document.createElement('div')
  phone.className = 'reel__phone'
  const v = document.createElement('video')
  v.className = 'reel__video'
  v.muted = true
  v.playsInline = true
  v.loop = true
  v.preload = 'none'
  if (r.thumbnail_url) v.poster = r.thumbnail_url
  v.dataset.srcMp4 = r.media_url
  if (r.media_webm) v.dataset.srcWebm = r.media_webm
  const b = document.createElement('button')
  b.className = 'reel__sound'
  b.type = 'button'
  b.setAttribute('aria-pressed', 'false')
  b.setAttribute('aria-label', t({ es: 'Activar el sonido del reel', en: "Turn on the reel's sound", pt: 'Ativar o som do reel' }))
  b.innerHTML = '<svg class="ico i-off" aria-hidden="true"><use href="#i-muted"/></svg><svg class="ico i-on" aria-hidden="true"><use href="#i-loud"/></svg>'
  phone.append(v, b)
  const cap = document.createElement('figcaption')
  const s = document.createElement('span')
  s.className = 'reel__cap'
  s.textContent = (r.caption || '').split('\n')[0].slice(0, 120)
  const a = document.createElement('a')
  a.href = r.permalink
  a.target = '_blank'
  a.rel = 'noopener'
  a.textContent = t({ es: 'Ver en Instagram', en: 'See on Instagram', pt: 'Ver no Instagram' })
  cap.append(s, a)
  fig.append(phone, cap)
  return fig
}

function arm(v: HTMLVideoElement): void {
  if (v.dataset.armed) return
  v.dataset.armed = '1'
  const webm = v.dataset.srcWebm
  const mp4 = v.dataset.srcMp4
  if (webm) {
    const s = document.createElement('source')
    s.src = webm
    s.type = 'video/webm'
    v.appendChild(s)
  }
  if (mp4) {
    const s = document.createElement('source')
    s.src = mp4
    s.type = 'video/mp4'
    v.appendChild(s)
  }
  v.preload = 'metadata'
  v.load()
  // load() cancels a play() that came first (a jump straight into view): play again if it's still wanted
  if (v.dataset.want) void v.play().catch(() => {})
}

export function initReels(): void {
  const grid = document.getElementById('reelsGrid')
  if (!grid) return
  const reduced = document.documentElement.classList.contains('no-motion')
  let loud: HTMLVideoElement | null = null

  const setLoud = (v: HTMLVideoElement | null) => {
    if (loud && loud !== v) {
      loud.muted = true
      loud.closest('.reel')?.querySelector('.reel__sound')?.setAttribute('aria-pressed', 'false')
    }
    loud = v
    sound.duck(!!v)
  }

  const near = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && arm(e.target as HTMLVideoElement)),
    { rootMargin: '60% 0px' },
  )
  const view = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        const v = e.target as HTMLVideoElement
        if (e.isIntersecting && !reduced) {
          v.dataset.want = '1'
          arm(v)
          void v.play().catch(() => {})
        } else if (!e.isIntersecting) {
          delete v.dataset.want
          v.pause()
          if (loud === v) setLoud(null)
        }
      }),
    { threshold: 0.5 },
  )

  const wire = () => {
    grid.querySelectorAll<HTMLVideoElement>('.reel__video').forEach((v) => {
      near.observe(v)
      view.observe(v)
    })
  }

  grid.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.reel__sound')
    const v = (e.target as Element).closest('.reel')?.querySelector<HTMLVideoElement>('.reel__video')
    if (!v) return
    if (b) {
      arm(v)
      const on = v.muted
      v.muted = !on
      b.setAttribute('aria-pressed', String(on))
      b.setAttribute('aria-label', on ? t({ es: 'Silenciar el reel', en: 'Mute the reel', pt: 'Silenciar o reel' }) : t({ es: 'Activar el sonido del reel', en: "Turn on the reel's sound", pt: 'Ativar o som do reel' }))
      setLoud(on ? v : null)
      void v.play().catch(() => {})
    } else if (reduced) {
      arm(v)
      if (v.paused) void v.play().catch(() => {})
      else v.pause()
    }
  })

  wire()

  // newer reels from Instagram, when the function has a token (otherwise it answers the same three)
  fetch('/api/reels')
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { source?: string; reels?: Reel[] } | null) => {
      if (!d || d.source === 'fallback' || !Array.isArray(d.reels) || !d.reels.length) return
      near.disconnect()
      view.disconnect()
      grid.replaceChildren(...d.reels.slice(0, 3).map(card))
      wire()
    })
    .catch(() => {})
}
