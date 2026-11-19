/**
 * La línea de tiempo de la v4. Un solo reloj para todo lo que se mueve:
 *
 *   scroll (amortiguado) ─→ u (unidades de toma, por los .track[data-film]) ─→ segundo de la película
 *                         ├─→ --a / --e / --p de cada tramo (las letras, lo secundario, la salida)
 *                         ├─→ gradación, medio, destellos, foco (script.ts) ─→ el escenario (stage.ts)
 *                         └─→ telemetría: capítulo, altitud/profundidad, código de tiempo, rótulos anclados
 *
 * Quieto, el cuadro no se congela: la cámara respira (paralaje del puntero, partículas) y, en los capítulos, la
 * película se adelanta unas décimas de segundo («deriva») y vuelve sola al primer movimiento del scroll.
 */
import { lang, onLang } from '../ui/i18n'
import { createStage, type Look, type Stage, type StageFrame } from './stage'
import { ALT, CALLOUTS as CALLOUT_DEFS, FOCUS, MEDIA, WATERLINE, flash, formatAlt, look, num, vec } from './script'
import timing from './film.json'

interface Track {
  el: HTMLElement
  f0: number
  f1: number
  top: number
  height: number
  kind: 'chapter' | 'transit' | 'other'
  ch: number
  lines: { el: HTMLElement; at: number; last: number }[]
  shade: [number, number, number, number]
  a: number
  e: number
  p: number
  cards: HTMLElement | null
  cardsTop: number
}

const CALLOUTS = CALLOUT_DEFS.map((c) => ({ ...c, track: null as Track | null }))
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
const FPS = timing.fps
const FR = timing.frames
const SHOTS = FR.length - 1
const ALT_WORDS = {
  es: ['Altitud', 'Profundidad'],
  en: ['Altitude', 'Depth'],
  pt: ['Altitude', 'Profundidade'],
}

/** u → segundo del máster */
export function seconds(u: number): number {
  const i = Math.min(SHOTS - 1, Math.max(0, Math.floor(u)))
  const f = clamp(u - i, 0, 1)
  const frame = FR[i] + f * (FR[i + 1] - FR[i] - 1)
  return frame / FPS
}

/** parte cada [data-split] en palabras y letras; cada letra con su azar */
function split(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const text = el.textContent ?? ''
    el.setAttribute('aria-label', text)
    el.textContent = ''
    let seed = 0
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
        s.style.setProperty('--r', (0.15 + (seed / 233280) * 0.85).toFixed(3))
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
  const shadeEl = document.querySelector<HTMLElement>('.stage__shade')
  const railLinks = [...document.querySelectorAll<HTMLAnchorElement>('.rail a[data-ch]')]
  const altiVal = document.querySelector<HTMLElement>('[data-alti]')
  const altiLabel = document.querySelector<HTMLElement>('[data-alti-label]')
  const altiBox = document.querySelector<HTMLElement>('.alti')
  const tcTime = document.querySelector<HTMLElement>('[data-tc]')
  const tcBox = document.querySelector<HTMLElement>('.tc')
  const berg = document.querySelector<HTMLElement>('.berg')
  if (!canvas || !video) return

  // ---- los tramos ----
  split(document)
  onLang(() => {
    split(document)
    lastAlt = ''
  })
  document.querySelectorAll<HTMLElement>('[data-k]').forEach((el) => el.style.setProperty('--k', el.dataset.k ?? '0'))

  const tracks: Track[] = [...document.querySelectorAll<HTMLElement>('.track[data-film]')].map((el) => {
    const [f0, f1] = (el.dataset.film ?? '0:0').split(':').map(Number)
    el.style.setProperty('--h', el.dataset.vh ?? '100')
    const kind = el.classList.contains('chapter') ? 'chapter' : el.classList.contains('transit') ? 'transit' : 'other'
    const lines = [...el.querySelectorAll<HTMLElement>('.ln[data-at]')].map((l) => ({ el: l, at: Number(l.dataset.at), last: -1 }))
    const sh = SHADES[el.id] ?? (kind === 'transit' ? [0, 0.35, 0.75, 0] : [0, 0, 0, 0])
    return { el, f0, f1, top: 0, height: 0, kind, ch: Number(el.dataset.ch ?? -1), lines, shade: sh as Track['shade'], a: -1, e: -1, p: -1, cards: el.querySelector<HTMLElement>('.cards'), cardsTop: 0 }
  })
  const chapters = tracks.filter((t) => t.kind === 'chapter')

  let V = innerHeight
  let W = innerWidth
  function measure() {
    V = innerHeight
    W = innerWidth
    html.style.setProperty('--vh', `${V / 100}px`)
    for (const t of tracks) {
      const r = t.el.getBoundingClientRect()
      t.top = r.top + scrollY
      t.height = t.el.offsetHeight
      t.cardsTop = t.cards ? t.cards.offsetTop : 0
    }
    stage?.resize()
  }

  // ---- el escenario ----
  const sd = opts.lite || W < 900
  let stage: Stage | null = null
  try {
    stage = createStage(canvas, video, poster, sd)
  } catch {
    stage = null
  }
  if (!stage) {
    html.classList.add('no-stage')
    return // sin WebGL2: la portada quieta y el texto; todo se lee
  }
  const startVideo = () => {
    video.src = sd ? timing.src.sd : timing.src.hd
    video.preload = 'auto'
    video.load()
  }
  if (document.readyState === 'complete') setTimeout(startVideo, 200)
  else addEventListener('load', () => setTimeout(startVideo, 200), { once: true })

  // ---- el puntero ----
  const mouse: [number, number] = [0, 0]
  if (!opts.reduced && matchMedia('(hover: hover)').matches) {
    addEventListener(
      'pointermove',
      (e) => {
        mouse[0] = (e.clientX / W) * 2 - 1
        mouse[1] = (e.clientY / V) * 2 - 1
      },
      { passive: true },
    )
  }

  // ---- el reloj ----
  const L: Look = { exposure: 1, contrast: 1, saturation: 1, tint: [1, 1, 1], vignette: 0, grain: 0, fade: 0 }
  const frame: StageFrame = { t: 0, vel: 0, focus: [0.5, 0.5], zoom: 1.04, look: L, medium: { w: [0, 0, 0, 0] }, flash: 0 }
  const fpos: [number, number] = [0, 0]
  const mtmp: [number, number, number, number] = [0, 0, 0, 0]
  let yS = scrollY
  let uS = 0
  let drift = 0
  let lastY = scrollY
  let still = 0
  let prev = performance.now()
  let clock = 0
  let lastAlt = ''
  let lastCh = -2
  let lastTc = ''
  let lastHud = ''
  let started = false

  function uAt(y: number): { u: number; transit: boolean } {
    let u = tracks[0].f0
    let transit = false
    for (const t of tracks) {
      const y0 = t.top
      const span = Math.max(1, t.height - V)
      if (y < y0) break
      const x = clamp((y - y0) / span)
      const k = t.kind === 'transit' ? 0.5 - 0.5 * Math.cos(Math.PI * x) : x
      u = t.f0 + (t.f1 - t.f0) * k
      transit = t.kind === 'transit' && x > 0 && x < 1
    }
    return { u, transit }
  }

  // la cubierta del shader, en JS: del video a la pantalla
  function toScreen(vx: number, vy: number, out: [number, number]) {
    const vidA = 1928 / 1072
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

  const coEls = new Map<string, HTMLElement>()
  document.querySelectorAll<HTMLElement>('.co[data-co]').forEach((el) => coEls.set(el.dataset.co!, el))
  /** la geometría del rótulo; en el teléfono, hacia el lado con más aire (la etiqueta no se sale de la pantalla) */
  const coSide = new Map<string, number>()
  function geometry(el: HTMLElement, ang: number, len: number) {
    const rad = (ang * Math.PI) / 180
    el.style.setProperty('--ang', `${ang}deg`)
    el.style.setProperty('--len', `${len}px`)
    const ex = Math.cos(rad) * len
    const ey = Math.sin(rad) * len
    el.style.setProperty('--lx', `${ex + (ex < 0 ? -8 : 8)}px`)
    el.style.setProperty('--ly', `${ey}px`)
    el.style.setProperty('--tx', ex < 0 ? '-100%' : '0%')
  }
  for (const c of CALLOUTS) {
    const el = coEls.get(c.id)
    if (el) geometry(el, c.ang ?? -32, c.len ?? 90)
  }
  const coPos: [number, number] = [0, 0]

  function setVar(el: HTMLElement, name: string, v: number, prevV: number): number {
    if (Math.abs(v - prevV) > 0.0015 || (v === 0 && prevV !== 0) || (v === 1 && prevV !== 1)) {
      el.style.setProperty(name, v.toFixed(4))
      return v
    }
    return prevV
  }

  function tick(now: number) {
    const dt = Math.min(0.05, (now - prev) / 1000)
    prev = now
    clock += dt

    // scroll amortiguado
    const y = scrollY
    yS += (y - yS) * (1 - Math.exp(-dt * 9))
    if (Math.abs(y - yS) < 0.3) yS = y
    still = Math.abs(y - lastY) > 0.5 ? 0 : still + dt
    lastY = y

    // u: el relato; la deriva en los capítulos cuando nadie se mueve
    const { u: uT, transit } = uAt(yS)
    const wantDrift = !opts.reduced && still > 0.9 && !transit && uT < 6.6 ? 0.045 : 0
    drift += (wantDrift - drift) * (1 - Math.exp(-dt * (wantDrift > drift ? 0.35 : 6)))
    const target = uT + drift
    const uPrev = uS
    uS += (target - uS) * (1 - Math.exp(-dt * 7))
    const vel = opts.reduced ? 0 : clamp(((uS - uPrev) / Math.max(dt, 1e-3)) / 1.1, -1, 1)
    frame.vel += (vel - frame.vel) * (1 - Math.exp(-dt * 10))

    // los tramos: entrada, salida y recorrido
    let shL = 0, shR = 0, shB = 0, shC = 0
    for (const t of tracks) {
      const yy = yS - t.top
      const span = Math.max(1, t.height - V)
      const p = clamp(yy / span)
      const a = t.ch === 0 ? clamp(1 - Math.max(0, -yy) / V) : clamp((yy + V * (t.kind === 'transit' ? 0.5 : 0.14)) / (V * 0.62))
      let e: number
      if (t.cards) e = clamp((yy - (t.cardsTop - V * 0.85)) / (V * 0.45))
      else e = t.kind === 'transit' ? clamp((p - 0.86) / 0.14) : clamp((yy - span + V * 0.05) / (V * 0.5))
      t.a = setVar(t.el, '--a', a, t.a)
      t.e = setVar(t.el, '--e', e, t.e)
      t.p = setVar(t.el, '--p', p, t.p)
      for (const ln of t.lines) ln.last = setVar(ln.el, '--l', clamp((p - ln.at) / 0.16), ln.last)
      const vis = a * (1 - e)
      if (vis > 0) {
        shL += t.shade[0] * vis
        shB += t.shade[1] * vis
        shC += t.shade[2] * vis
        shR += t.shade[3] * vis
      }
    }
    if (shadeEl) {
      shadeEl.style.setProperty('--shade-l', Math.min(1, shL).toFixed(3))
      shadeEl.style.setProperty('--shade-b', Math.min(1, shB).toFixed(3))
      shadeEl.style.setProperty('--shade-c', Math.min(1, shC).toFixed(3))
      shadeEl.style.setProperty('--shade-r', Math.min(1, shR).toFixed(3))
    }

    // el cuadro
    frame.t = seconds(uS)
    look(uS, L)
    vec(FOCUS, uS, fpos)
    // en pantallas anchas el encuadre es casi el del video; el foco pesa en el teléfono
    const portrait = W / V < 1
    frame.focus[0] = portrait ? fpos[0] : 0.5 + (fpos[0] - 0.5) * 0.35
    frame.focus[1] = portrait ? fpos[1] : 0.5 + (fpos[1] - 0.5) * 0.35
    frame.zoom = 1.045 + (opts.reduced ? 0 : Math.sin(clock * 0.21) * 0.006) + Math.abs(frame.vel) * 0.03
    vec(MEDIA, uS, mtmp)
    const m = frame.medium.w
    const on = opts.reduced ? 0 : 1
    m[0] = mtmp[0] * on
    m[1] = mtmp[1] * on
    m[2] = mtmp[2] * on
    m[3] = mtmp[3] * on
    frame.flash = opts.reduced ? 0 : flash(uS) * Math.min(1, Math.abs(frame.vel) * 3 + 0.25)
    stage!.render(frame, mouse, dt)
    const hud = (1 - clamp(L.fade * 2.2)).toFixed(3)
    if (hud !== lastHud) {
      html.style.setProperty('--hud', hud)
      lastHud = hud
    }
    if (!started && stage!.ready) {
      started = true
      html.classList.add('has-stage')
    }

    // telemetría
    const altM = num(ALT, uS)
    const l = lang()
    const altTxt = formatAlt(altM, l)
    if (altTxt !== lastAlt && altiVal) {
      altiVal.textContent = altTxt
      if (altiLabel) altiLabel.textContent = ALT_WORDS[l][altM < 0 ? 1 : 0]
      lastAlt = altTxt
    }
    altiBox?.style.setProperty('--tape', `${(-40 - ((uS * 61) % 25)).toFixed(2)}%`)
    const s = frame.t
    const tc = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}:${String(Math.floor((s % 1) * FPS)).padStart(2, '0')}`
    if (tc !== lastTc && tcTime) {
      tcTime.textContent = tc
      lastTc = tc
    }
    tcBox?.style.setProperty('--prog', (uS / SHOTS).toFixed(4))

    // capítulo actual y su avance en el índice
    let ch = 0
    for (const c of chapters) if (uS >= c.f0 - 0.02) ch = c.ch
    if (ch !== lastCh) {
      railLinks.forEach((a) => (Number(a.dataset.ch) === ch ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')))
      lastCh = ch
    }
    for (let i = 0; i < railLinks.length; i++) {
      const c0 = chapters[i]?.f0 ?? 0
      const c1 = chapters[i + 1]?.f0 ?? SHOTS
      railLinks[i].style.setProperty('--fill', clamp((uS - c0) / (c1 - c0)).toFixed(3))
    }

    // rótulos anclados
    const wide = W >= 900
    for (const c of CALLOUTS) {
      const el = coEls.get(c.id)
      if (!el) continue
      const owner = c.track ?? (c.track = chapters.find((t) => c.from >= t.f0 - 0.05 && c.from <= t.f1) ?? null)
      const o = (c.wide && !wide ? 0 : clamp((uS - c.from) / 0.025) * clamp((c.to - uS) / 0.025)) * (owner ? 1 - clamp(owner.e * 1.6) : 1)
      if (o <= 0.001) {
        if (el.style.getPropertyValue('--o') !== '0') el.style.setProperty('--o', '0')
        continue
      }
      vec(c.path, uS, coPos)
      toScreen(coPos[0], coPos[1], coPos)
      if (W < 700) {
        const side = coPos[0] > W * 0.5 ? -1 : 1
        if (coSide.get(c.id) !== side) {
          coSide.set(c.id, side)
          geometry(el, side < 0 ? 205 : -25, 44)
        }
      } else if (coSide.has(c.id)) {
        coSide.delete(c.id)
        geometry(el, c.ang ?? -32, c.len ?? 90)
      }
      el.style.setProperty('--o', o.toFixed(3))
      el.style.setProperty('--x', `${coPos[0].toFixed(1)}px`)
      el.style.setProperty('--y', `${coPos[1].toFixed(1)}px`)
    }
    if (berg) {
      toScreen(0.5, num(WATERLINE, uS), coPos)
      berg.style.setProperty('--wl', `${((coPos[1] / V) * 100).toFixed(2)}%`)
    }

    requestAnimationFrame(tick)
  }

  measure()
  addEventListener('resize', () => requestAnimationFrame(measure))
  new ResizeObserver(() => measure()).observe(document.querySelector('main')!)
  document.fonts?.ready.then(measure)
  const { u } = uAt(scrollY)
  uS = u
  requestAnimationFrame(tick)

  // cifras que cuentan con la entrada de su tramo
  const counters = [...document.querySelectorAll<HTMLElement>('[data-count]')].map((el) => ({ el, to: Number(el.dataset.count), track: el.closest<HTMLElement>('.track'), shown: -1 }))
  if (!opts.reduced) {
    const countLoop = () => {
      for (const c of counters) {
        const a = Number(c.track?.style.getPropertyValue('--a') || 1)
        const v = Math.round(c.to * clamp(a * 1.4 - 0.2))
        if (v !== c.shown) {
          c.el.textContent = String(v)
          c.shown = v
        }
      }
      requestAnimationFrame(countLoop)
    }
    requestAnimationFrame(countLoop)
  }

  if (new URLSearchParams(location.search).has('qa')) {
    ;(window as Window & { __film?: unknown }).__film = {
      get u() {
        return uS
      },
      get t() {
        return frame.t
      },
      get ready() {
        return stage!.ready
      },
      get video() {
        return { rs: video.readyState, ct: video.currentTime, src: video.currentSrc }
      },
      measure,
    }
  }
}

/** sombra de lectura por capítulo: [izquierda, abajo, centro, derecha] */
const SHADES: Record<string, [number, number, number, number]> = {
  inicio: [0.95, 0.75, 0, 0],
  senal: [0.9, 0.3, 0, 0],
  superficie: [0, 0.2, 0.75, 0],
  agentes: [0.9, 0.3, 0, 0],
  maquina: [0, 0.65, 0, 0.9],
  trabajo: [0.55, 0.35, 0, 0],
  hablemos: [1, 0.5, 0, 0],
}
