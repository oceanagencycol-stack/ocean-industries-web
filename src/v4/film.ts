/**
 * La línea de tiempo de la v4: UNA secuencia.
 *
 * El scroll mueve la película a velocidad CONSTANTE de principio a fin (cada segundo de película cuesta lo mismo de
 * scroll): no hay capítulos que se detengan ni cruces que corran. Todo lo demás son capas de esa misma toma:
 *
 *   scroll (amortiguado) → t (segundo del máster) → el cuadro (stage.ts: gradación, medio, foco, destellos)
 *                                                 → los rótulos .beat[data-t="entra:sale"] (letras, cifras, servicios)
 *                                                 → telemetría (altímetro, código de tiempo, capítulos) y rótulos anclados
 *
 * Cada .beat ocupa en el documento exactamente su tramo de scroll (para el sonido, los anclajes y la analítica), pero
 * su contenido vive fijo sobre la película: nada sube, nada tapa la imagen, nada cambia de escena.
 * Al final la película se resuelve en blanco y el epílogo (trabajo, agenda, pagos) sigue sobre esa misma luz.
 */
import { lang, onLang } from '../ui/i18n'
import { SCRIPT } from '../ui/live'
import { createStage, type Look, type Stage, type StageFrame } from './stage'
import { ALT, CALLOUTS as CALLOUT_DEFS, FOCUS, MEDIA, WATERLINE, flash, formatAlt, look, num, vec } from './script'
import { preload } from './preload'
import timing from './film.json'

const FPS = timing.fps
const FR = timing.frames
const SHOTS = FR.length - 1
const DUR = (FR[SHOTS] - 1) / FPS
const FADE = 0.55 // s de película para entrar o salir un rótulo
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
const ALT_WORDS = { es: ['Altitud', 'Profundidad'], en: ['Altitude', 'Depth'], pt: ['Altitude', 'Profundidade'] }

/** segundo del máster → unidades de toma (el guion técnico está en tomas) */
function toU(t: number): number {
  const f = clamp(t, 0, DUR) * FPS
  let i = 0
  while (i < SHOTS - 1 && FR[i + 1] <= f) i++
  return i + clamp((f - FR[i]) / (FR[i + 1] - FR[i] - 1))
}

interface Beat {
  el: HTMLElement
  inner: HTMLElement
  t0: number
  t1: number
  ch: number
  lines: { el: HTMLElement; at: number; last: number }[]
  shade: number[]
  a: number
  e: number
  on: boolean
}

function split(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const text = el.textContent ?? ''
    el.setAttribute('aria-label', text)
    el.textContent = ''
    let seed = 7
    for (const word of text.split(/(\s+)/)) {
      if (!word) continue
      if (/^\s+$/.test(word)) {
        el.append(document.createTextNode(' '))
        continue
      }
      const w = document.createElement('span')
      w.className = 'w'
      w.setAttribute('aria-hidden', 'true')
      for (const c of word) {
        const s = document.createElement('span')
        s.className = 'ch'
        seed = (seed * 9301 + 49297 + c.charCodeAt(0) * 7) % 233280
        s.style.setProperty('--r', (0.1 + (seed / 233280) * 0.9).toFixed(3))
        s.textContent = c
        w.append(s)
      }
      el.append(w)
    }
  })
}

export function initFilm(opts: { reduced: boolean; lite: boolean }): void {
  const html = document.documentElement
  const canvas = document.querySelector<HTMLCanvasElement>('.stage__gl')
  const video = document.querySelector<HTMLVideoElement>('.stage__src')
  const poster = document.querySelector<HTMLImageElement>('.stage__poster img')
  const reel = document.querySelector<HTMLElement>('.film-track')
  const altiVal = document.querySelector<HTMLElement>('[data-alti]')
  const altiLabel = document.querySelector<HTMLElement>('[data-alti-label]')
  const altiBox = document.querySelector<HTMLElement>('.alti')
  const tcEl = document.querySelector<HTMLElement>('[data-tc]')
  const nowEl = document.querySelector<HTMLElement>('[data-now]')
  const scrub = document.querySelector<HTMLElement>('.scrub')
  const ticks = [...document.querySelectorAll<HTMLAnchorElement>('.scrub a[data-ch]')]
  const berg = document.querySelector<HTMLElement>('.berg')
  const chatBox = document.querySelector<HTMLElement>('[data-chat]')
  if (!canvas || !video || !reel) return

  split(document)
  document.querySelectorAll<HTMLElement>('[data-k]').forEach((el) => el.style.setProperty('--k', el.dataset.k ?? '0'))

  const beats: Beat[] = [...document.querySelectorAll<HTMLElement>('.beat[data-t]')].map((el) => {
    const [t0, t1] = (el.dataset.t ?? '0:0').split(':').map(Number)
    el.style.setProperty('--t0', String(t0))
    el.style.setProperty('--t1', String(t1))
    const lines = [...el.querySelectorAll<HTMLElement>('.ln')].map((l) => ({ el: l, at: Number(l.dataset.at ?? 0), last: -1 }))
    return {
      el,
      inner: el.querySelector<HTMLElement>('.beat__in') ?? el,
      t0,
      t1,
      ch: Number(el.dataset.ch ?? -1),
      lines,
      shade: (el.dataset.shade ?? '0,0,0,0').split(',').map(Number),
      a: -1,
      e: -1,
      on: true,
    }
  })
  const chapters = beats.filter((b) => b.ch >= 0)
  const agentes = beats.find((b) => b.el.id === 'agentes')
  ticks.forEach((a) => {
    const c = chapters.find((b) => b.ch === Number(a.dataset.ch))
    if (c) a.style.setProperty('--at', (c.t0 / DUR).toFixed(4))
  })

  const messages = SCRIPT.es.map(([who, text]) => {
    const node = document.createElement('p')
    node.className = who === 'cli' ? 'msg msg--in' : 'msg msg--out'
    node.textContent = text
    return node
  })
  chatBox?.replaceChildren(...messages)
  function translateChat() {
    const script = SCRIPT[lang()]
    messages.forEach((node, i) => { node.textContent = script[i][1] })
  }
  const transcript = document.querySelector('[data-transcript]')
  if (transcript) {
    const rows = SCRIPT.es.map((line, i) => {
      const node = messages[i].cloneNode(false) as HTMLElement
      node.dataset.es = line[1]
      node.dataset.en = SCRIPT.en[i][1]
      node.dataset.pt = SCRIPT.pt[i][1]
      node.textContent = SCRIPT[lang()][i][1]
      return node
    })
    transcript.replaceChildren(...rows)
  }
  translateChat()
  let lastAlt = ''
  let lastTc = ''
  let lastNow = -2
  let lastHud = ''
  let lastChat = -1
  onLang(() => {
    split(document)
    translateChat()
    if (!html.classList.contains('no-stage')) requestAnimationFrame(refresh)
    for (const b of beats) for (const l of b.lines) l.last = -1
    lastAlt = ''
    lastNow = -2
    lastChat = -1
  })

  // ---- el largo del recorrido: cada segundo de película cuesta lo mismo ----
  let V = innerHeight
  let W = innerWidth
  let sps = 1 // px de scroll por segundo de película
  let reelTop = 0
  let stage: Stage | null = null
  function measure() {
    V = innerHeight
    W = innerWidth
    sps = Math.round(V * (W < 700 ? 0.5 : 0.62))
    html.style.setProperty('--sps', `${sps}px`)
    html.style.setProperty('--vh', `${V / 100}px`)
    reelTop = reel!.getBoundingClientRect().top + scrollY
    stage?.resize()
  }

  // ---- el escenario ----
  let sd = opts.lite || W < 900
  try {
    stage = createStage(canvas, video, poster, sd)
  } catch {
    stage = null
  }
  if (!stage) {
    html.classList.add('no-stage')
    document.querySelector('.pre')?.remove()
    return
  }

  sd ||= stage.software
  const L: Look = { exposure: 1, contrast: 1, saturation: 1, tint: [1, 1, 1], vignette: 0, grain: 0, fade: 0 }
  const frame: StageFrame = { t: 0, vel: 0, focus: [0.5, 0.5], zoom: 1.045, look: L, medium: { w: [0, 0, 0, 0] }, flash: 0, shade: [0, 0, 0, 0], hud: 0 }
  const fpos: [number, number] = [0.5, 0.5]

  /** del video a la pantalla con el encuadre actual (el mismo cálculo del shader) */
  function project(vx: number, vy: number, out: [number, number]): [number, number] {
    const vidA = video!.videoWidth ? video!.videoWidth / video!.videoHeight : sd ? 1024 / 570 : 1600 / 890
    const sa = W / V
    let sx = 1, sy = 1
    if (sa > vidA) sy = vidA / sa
    else sx = sa / vidA
    sx /= frame.zoom
    sy /= frame.zoom
    const cx = clamp(frame.focus[0], sx / 2, 1 - sx / 2)
    const cy = clamp(1 - frame.focus[1], sy / 2, 1 - sy / 2)
    out[0] = ((vx - cx) / sx + 0.5) * W
    out[1] = (1 - ((1 - vy - cy) / sy + 0.5)) * V
    return out
  }
  function focusAt(u: number) {
    vec(FOCUS, u, fpos)
    const portrait = W / V < 1
    frame.focus[0] = portrait ? fpos[0] : 0.5 + (fpos[0] - 0.5) * 0.35
    frame.focus[1] = portrait ? fpos[1] : 0.5 + (fpos[1] - 0.5) * 0.35
  }
  measure()
  focusAt(0)
  // Update the projection before the SVG rebuilds its path on rotation.
  addEventListener('resize', () => {
    measure()
    if (html.classList.contains('pre-on')) focusAt(0)
  })

  // ---- el preloader: la película entera en memoria y el borde de la Tierra dibujado ----
  const src = sd ? timing.src.sd : timing.src.hd
  let quick = false
  try {
    quick = sessionStorage.getItem('ocean-v4-film') === '1'
  } catch {
    /* noop */
  }
  // el preloader dibuja el borde con el encuadre del primer cuadro tal como lo verá el hero (zoom de llegada incluido)
  const projectHero = (vx: number, vy: number, out: [number, number]) => {
    const z = frame.zoom
    frame.zoom = 1.045
    project(vx, vy, out)
    frame.zoom = z
    return out
  }
  let failed = false
  let release!: () => void
  const decoded = new Promise<void>(resolve => { release = resolve })
  let timeout = 0
  let objectUrl: string | null = null
  function fallback() {
    if (failed) return
    failed = true
    clearTimeout(timeout)
    html.classList.remove('has-stage', 'pre-on')
    html.classList.add('no-stage')
    document.querySelector('.pre')?.remove()
    for (const beat of beats) beat.inner.inert = false
    release()
    stage?.destroy()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
  const pre = preload(src, projectHero, { reduced: opts.reduced, quick, decoded })
  video.addEventListener('error', fallback, { once: true })
  canvas.addEventListener('webglcontextlost', fallback, { once: true })
  video.addEventListener('loadeddata', () => {
    clearTimeout(timeout)
    release()
    try { sessionStorage.setItem('ocean-v4-film', '1') } catch { /* private mode */ }
  }, { once: true })
  pre.url.then(blob => {
    if (failed) { if (blob) URL.revokeObjectURL(blob); return }
    objectUrl = blob
    timeout = window.setTimeout(fallback, 10000)
    video.src = blob ?? src
    video.preload = 'auto'
    video.load()
  })
  let intro = 0 // 0 → 1 cuando el negro se abre
  let introStart = -1
  pre.opened.then(() => {
    introStart = performance.now()
  })

  // ---- el puntero ----
  const mouse: [number, number] = [0, 0]
  if (!opts.reduced && matchMedia('(hover: hover)').matches) {
    addEventListener(
      'pointermove',
      (e) => {
        if (html.classList.contains('pre-on')) return
        mouse[0] = (e.clientX / W) * 2 - 1
        mouse[1] = (e.clientY / V) * 2 - 1
      },
      { passive: true },
    )
  }

  const CALLOUTS = CALLOUT_DEFS.map((c) => ({ ...c, el: document.querySelector<HTMLElement>(`.co[data-co="${c.id}"]`), side: 0 }))
  function geometry(el: HTMLElement, ang: number, len: number) {
    const rad = (ang * Math.PI) / 180
    const ex = Math.cos(rad) * len
    const ey = Math.sin(rad) * len
    el.style.setProperty('--ang', `${ang}deg`)
    el.style.setProperty('--len', `${len}px`)
    el.style.setProperty('--lx', `${ex + (ex < 0 ? -8 : 8)}px`)
    el.style.setProperty('--ly', `${ey}px`)
    el.style.setProperty('--tx', ex < 0 ? '-100%' : '0%')
  }
  for (const c of CALLOUTS) if (c.el) geometry(c.el, c.ang ?? -32, c.len ?? 90)
  const pos: [number, number] = [0, 0]
  const mtmp: [number, number, number, number] = [0, 0, 0, 0]

  // Measure type after layout or translation. During scroll only compare numbers.
  const obstacles: { t0: number; t1: number; box: DOMRect }[] = []
  const labelSizes = CALLOUTS.map(c => ({ label: c.el?.querySelector<HTMLElement>('.co__label'), w: 0, h: 0, x: 0, y: 0, shown: false }))
  function refreshBounds() {
    obstacles.length = 0
    for (const b of beats) {
      for (const node of b.inner.querySelectorAll('.w,.lt,.figs,.stat,.actions,.phone-ov,.deck,.kicker,.where,.berg p')) {
        const box = node.getBoundingClientRect()
        if (box.width && box.height) obstacles.push({ t0: b.t0 - .22, t1: b.t1 + .22, box })
      }
    }
    for (const el of [altiBox, scrub, document.querySelector('.nav')]) {
      if (el) obstacles.push({ t0: -1, t1: DUR + 1, box: el.getBoundingClientRect() })
    }
    for (const size of labelSizes) {
      size.w = size.label?.offsetWidth ?? 0
      size.h = size.label?.offsetHeight ?? 0
    }
  }
  function refresh() { refreshBounds(); dirty = true; wake() }
  addEventListener('resize', () => requestAnimationFrame(refresh))
  document.fonts?.ready.then(refresh)
  // El decorado conserva su movimiento ambiental. La tipografía solo cambia con el guion.
  let dirty = true
  let scheduled = false
  let lastIntro = -1
  function wake() {
    if (!scheduled && !failed && !document.hidden) {
      scheduled = true
      requestAnimationFrame(tick)
    }
  }
  addEventListener('scroll', wake, { passive: true })
  document.addEventListener('visibilitychange', wake)
  const counters = [...document.querySelectorAll<HTMLElement>('[data-count]')].map(el => ({
    el, to: Number(el.dataset.count), beat: beats.find(b => b.el.contains(el)), shown: -1,
  }))
  // ---- el reloj ----

  let tS = 0



  let prev = performance.now()
  let clock = 0
  let started = false
  let pastFilm = false
  const setv = (el: HTMLElement, k: string, v: number, p: number) => {
    if (Math.abs(v - p) > 0.002 || ((v === 0 || v === 1) && v !== p)) {
      el.style.setProperty(k, v.toFixed(4))
      return v
    }
    return p
  }

  function tick(now: number) {
    scheduled = false
    if (failed || document.hidden) return
    const past = scrollY > reelTop + DUR * sps + V
    if (past && pastFilm && intro === 1 && !dirty) return
    if (!past || intro < 1) wake()
    const elapsed = (now - prev) / 1000
    const dt = Math.min(0.05, elapsed)
    prev = now
    clock += dt

    // el negro se abre: la exposición sube como un amanecer
    if (introStart >= 0) intro = clamp((now - introStart) / (quick || opts.reduced ? 420 : 1200))
    const introE = intro * intro * (3 - 2 * intro)

    const y = scrollY
    const tPrev = tS
    tS = clamp((y - reelTop) / sps, 0, DUR)
    const rate = Math.abs(tS - tPrev) / Math.max(elapsed, 0.001)
    const speed = opts.reduced || Math.abs(tS - tPrev) > 1.5 ? 0 : clamp((rate - 3) / 12) * Math.sign(tS - tPrev)
    frame.vel += (speed - frame.vel) * (1 - Math.exp(-elapsed * 8))

    const u = toU(tS)
    frame.t = tS
    look(u, L)
    L.exposure *= 0.05 + 0.95 * introE
    focusAt(u)
    frame.zoom = 1.045 + (opts.reduced ? 0 : Math.sin(clock * 0.21) * 0.003 * clamp(tS / 2)) + Math.abs(frame.vel) * 0.025
    vec(MEDIA, u, mtmp)
    const on = opts.reduced ? 0 : introE
    const m = frame.medium.w
    for (let k = 0; k < 4; k++) m[k] = mtmp[k] * on
    frame.flash = opts.reduced ? 0 : flash(u) * 0.8
    const render = stage!.ready && (!past || !pastFilm || !started)
    pastFilm = past
    if (!started && stage!.ready) {
      started = true
      html.classList.add('has-stage')
    }
    if (!dirty && tS === tPrev && intro === lastIntro) {
      if (render) stage!.render(frame, mouse, dt)
      return
    }
    dirty = false
    lastIntro = intro
    frame.hud = introE * (1 - clamp(L.fade * 2.2))
    const hud = frame.hud.toFixed(3)
    if (hud !== lastHud) {
      html.style.setProperty('--hud', hud)
      lastHud = hud
    }

    // los rótulos de la película
    let sl = 0, sb = 0, sc = 0, sr = 0
    for (const b of beats) {
      if (!b.on && (tS < b.t0 - .28 || tS > b.t1 + .28)) continue
      const first = b.t0 <= 0
      // el primero entra con el amanecer; los demás con su tiempo
      const a = first ? clamp(intro * 1.6 - 0.35) : clamp((tS - b.t0 + .28) / FADE)
      const e = clamp((tS - (b.t1 + .28 - FADE)) / FADE)
      b.a = setv(b.inner, '--a', a, b.a)
      b.e = setv(b.inner, '--e', e, b.e)
      const span = b.t1 - b.t0
      for (const l of b.lines) {
        const lt = first ? clamp(intro * 1.7 - 0.45 - l.at * 4) : clamp((tS - b.t0 + .28 - l.at * span) / 0.63)
        l.last = setv(l.el, '--l', lt, l.last)
        l.el.classList.toggle('is-set', lt === 1 && e === 0)
      }
      const vis = a * (1 - e)
      const visible = vis > 0.001
      if (visible !== b.on) {
        b.on = visible
        b.inner.classList.toggle('is-on', visible)
        if (visible) b.inner.removeAttribute('inert')
        else b.inner.setAttribute('inert', '')
      }
      if (visible) {
        sl += b.shade[0] * vis
        sb += b.shade[1] * vis
        sc += b.shade[2] * vis
        sr += b.shade[3] * vis
      }
    }
    frame.shade[0] = Math.min(1, sl)
    frame.shade[1] = Math.min(1, sb)
    frame.shade[2] = Math.min(1, sc)
    frame.shade[3] = Math.min(1, sr)
    if (render) stage!.render(frame, mouse, dt)

    // Valeria: la conversación avanza con su tramo
    if (chatBox && agentes) {
      const lines = messages
      const p = clamp((tS - agentes.t0 - 0.4) / (agentes.t1 - agentes.t0 - 1.6))
      const n = opts.reduced ? lines.length : Math.max(1, Math.min(lines.length, 1 + Math.floor(p * lines.length)))
      if (n !== lastChat) {
        lastChat = n
        for (let i = 0; i < messages.length; i++) messages[i].hidden = i >= n
      }
    }

    // telemetría
    const altM = num(ALT, u)
    const l = lang()
    const altTxt = formatAlt(altM, l)
    if (altTxt !== lastAlt && altiVal) {
      altiVal.textContent = altTxt
      if (altiLabel) altiLabel.textContent = ALT_WORDS[l][altM < 0 ? 1 : 0]
      lastAlt = altTxt
    }
    altiBox?.style.setProperty('--tape', `${(-40 - ((tS * 6.1) % 25)).toFixed(2)}%`)
    const tc = `${String(Math.floor(tS / 60)).padStart(2, '0')}:${String(Math.floor(tS % 60)).padStart(2, '0')}:${String(Math.floor((tS % 1) * FPS)).padStart(2, '0')}`
    if (tc !== lastTc && tcEl) {
      tcEl.textContent = tc
      lastTc = tc
    }
    scrub?.style.setProperty('--prog', (tS / DUR).toFixed(4))
    let ch = 0
    for (const c of chapters) if (tS >= c.t0 - 0.3) ch = c.ch
    if (ch !== lastNow) {
      lastNow = ch
      for (const link of ticks) {
        if (Number(link.dataset.ch) === ch) {
          link.setAttribute('aria-current', 'true')
          if (nowEl) nowEl.textContent = link.textContent
        } else link.removeAttribute('aria-current')
      }
    }

    // rótulos anclados a los sujetos
    for (let ci = 0; ci < CALLOUTS.length; ci++) {
      const c = CALLOUTS[ci], size = labelSizes[ci]
      size.shown = false
      const el = c.el
      if (!el) continue
      const o = (c.wide && W < 900 ? 0 : clamp((u - c.from) / 0.03) * clamp((c.to - u) / 0.03)) * introE
      if (o <= 0.001) {
        if (el.style.getPropertyValue('--o') !== '0') el.style.setProperty('--o', '0')
        continue
      }
      vec(c.path, u, pos)
      project(pos[0], pos[1], pos)
      if (W < 700) {
        const side = pos[0] > W * 0.5 ? -1 : 1
        if (c.side !== side) {
          c.side = side
          geometry(el, side < 0 ? 205 : -25, 44)
        }
      } else if (c.side !== 0) {
        c.side = 0
        geometry(el, c.ang ?? -32, c.len ?? 90)
      }
      const angle = (W < 700 ? (c.side < 0 ? 205 : -25) : c.ang ?? -32) * Math.PI / 180
      const dx = Math.cos(angle) * (W < 700 ? 44 : c.len ?? 90)
      const x = pos[0] + dx + (dx < 0 ? -8 - size.w : 8)
      const y = pos[1] + Math.sin(angle) * (W < 700 ? 44 : c.len ?? 90) - size.h / 2
      let blocked = x < 8 || y < 8 || x + size.w > W - 8 || y + size.h > V - 8
      for (let j = 0; !blocked && j < obstacles.length; j++) {
        const r = obstacles[j], box = r.box
        blocked = tS >= r.t0 && tS <= r.t1 && x < box.right + 5 && x + size.w > box.left - 5 && y < box.bottom + 5 && y + size.h > box.top - 5
      }
      for (let j = 0; !blocked && j < ci; j++) {
        const r = labelSizes[j]
        blocked = r.shown && x < r.x + r.w + 5 && x + size.w > r.x - 5 && y < r.y + r.h + 5 && y + size.h > r.y - 5
      }
      if (blocked) { el.style.setProperty('--o', '0'); continue }
      size.shown = true
      size.x = x
      size.y = y
      el.style.setProperty('--o', o.toFixed(3))
      el.style.setProperty('--x', `${pos[0].toFixed(1)}px`)
      el.style.setProperty('--y', `${pos[1].toFixed(1)}px`)
    }
    if (berg) {
      project(0.5, num(WATERLINE, u), pos)
      berg.style.setProperty('--wl', `${((pos[1] / V) * 100).toFixed(2)}%`)
    }

    if (!opts.reduced) {
      for (const c of counters) {
        const value = Math.round(c.to * clamp((c.beat?.a ?? 1) * 1.25))
        if (value !== c.shown) {
          c.el.textContent = String(value)
          c.shown = value
        }
      }
    }
  }

  new ResizeObserver(() => { measure(); dirty = true; wake() }).observe(document.querySelector('main')!)
  document.fonts?.ready.then(measure)
  refresh()
  tS = clamp((scrollY - reelTop) / sps, 0, DUR)
  wake()

  if (new URLSearchParams(location.search).has('qa')) {
    ;(window as Window & { __film?: unknown }).__film = {
      get t() {
        return tS
      },
      get u() {
        return toU(tS)
      },
      get ready() {
        return stage!.ready
      },
      get intro() {
        return intro
      },
      get sps() {
        return sps
      },
      get reelTop() {
        return reelTop
      },
      get video() {
        return { rs: video.readyState, ct: video.currentTime, src: video.currentSrc, seeking: video.seeking }
      },
      measure,
    }
  }
}
