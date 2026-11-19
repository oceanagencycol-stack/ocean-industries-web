/**
 * La intro de la v3 (docs/v3/CONCEPTO.md, «La intro»): la luz revela la marca. API para la página: README.md.
 *   1. Negro con grano. Se enciende la estrella del centro del símbolo (núcleo y difracciones finas).
 *   2. Desde la estrella se trazan los contornos de las dos formas en S, se llenan de nieve y un reflejo las cruza.
 *   3. El logotipo monolínea se traza letra por letra sobre sus ejes (marca/v3/logo-trazos.svg): la O se cierra, la C
 *      traza su arco, las tres barras de la E una tras otra de izquierda a derecha, la Λ sube desde los pies hasta el
 *      vértice por las dos piernas a la vez, la N traza su recorrido. Al terminar queda el dibujo definitivo
 *      (marca/v3/logo.svg), con la misma geometría: se asienta encima en ≈ 10 cuadros (solo cambia el suavizado del borde). Un barrido de luz recorre la palabra y aparece la ®.
 *   4. El logotipo vuela a la barra ([data-intro-dock], FLIP exacto) y la estrella se aleja hasta ser un punto.
 *      Termina con `ocean:intro-done` en window ({ detail: { played, skipped } }).
 *
 * Una sola línea de tiempo: cada propiedad animada es UNA animación de la Web Animations API que dura toda la intro,
 * con sus fotogramas en tiempos absolutos; mover el reloj de todas a la vez posa la intro en cualquier instante
 * (`?qa=intro=<0..1>`). Solo transform, opacity y stroke-dashoffset (también dentro de máscaras); nada de filtros.
 *
 * La marca no se redibuja: los trazos salen tal cual de marca/v3/logo-trazos.svg, logo.svg, logo-sin-r.svg y
 * simbolo-simetrico.svg (leídos con ?raw). Mientras se trazan, la Λ y la N van recortadas por su forma definitiva
 * (sus esquinas exteriores son más redondas que la unión del trazo), así el cambio al dibujo final no salta.
 */
import logoRaw from '../../marca/v3/logo.svg?raw'
import logoSinRRaw from '../../marca/v3/logo-sin-r.svg?raw'
import trazosRaw from '../../marca/v3/logo-trazos.svg?raw'
import symbolRaw from '../../marca/v3/simbolo-simetrico.svg?raw'
import { symbolTraces } from './trace'
import './intro.css'

/** Duración total (ms). */
export const INTRO_MS = 4500
/** Clave de localStorage: la intro se ve una vez cada 7 días. */
export const INTRO_KEY = 'ocean-v3-intro-at'
const WEEK = 6048e5

/** La curva de la casa: arranque decidido y asentamiento largo, sin rebote. */
const EASE = 'cubic-bezier(.16,1,.3,1)'
/** Para lo que viaja (subir el símbolo, volar a la barra): entra y sale suave, el mismo asentamiento largo. */
const TRAVEL = 'cubic-bezier(.62,0,.14,1)'
/** El trazo de una letra: la pluma arranca suave y se asienta largo. */
const PEN = 'cubic-bezier(.5,0,.15,1)'
/** Para abrir el negro al mundo: sin arranque brusco. */
const OPEN = 'cubic-bezier(.4,0,.2,1)'
/** Para los barridos de luz: velocidad casi pareja al cruzar. */
const SWEEP = 'cubic-bezier(.45,.05,.25,1)'

const SNOW = '#E0E7ED'
/** Lo que tarda el dibujo definitivo en asentarse sobre los ejes trazados (ms). */
const SETTLE = 90

/** Los tiempos de cada gesto (ms desde el negro). */
const T = {
  star: 150, // la estrella se enciende (onStar)
  trace: 520, // los contornos nacen de la estrella
  fill: 1150, // la nieve llena las S desde el centro
  sheen: 1520, // el reflejo cruza el símbolo
  lift: 1650, // el símbolo sube y deja lugar a la palabra
  O: 1800,
  C: 1920,
  E: 2030, // + 100 por barra
  A: 2300,
  N: 2400,
  word: 3000, // todo trazado: el dibujo definitivo entra en el mismo cuadro (onWordComplete)
  sweep: 2950, // el barrido recorre la palabra
  reg: 3250, // la ®, cuando el barrido la alcanza
  dock: 3700, // la palabra vuela a la barra; la estrella se aleja
  veil: 3850, // el negro se abre al mundo
} as const

type Lang = 'es' | 'en' | 'pt'
export interface IntroOptions {
  /** Ancla de la barra: el logotipo aterriza exactamente sobre su SVG. Por defecto `[data-intro-dock]`. */
  dock?: Element | null
  lang?: Lang
  /** Ganchos para el sonido: la estrella se enciende / la palabra queda completa. */
  onStar?: () => void
  onWordComplete?: () => void
}
export interface IntroHandle {
  /** Posa la intro en p ∈ [0, 1] (pausada). */
  seek(p: number): void
  skip(): void
  readonly done: Promise<{ skipped: boolean }>
}

// ---------- la marca ----------
const parseSvg = (raw: string): SVGSVGElement => {
  const t = document.createElement('template')
  t.innerHTML = raw.trim()
  const svg = t.content.firstElementChild as SVGSVGElement
  svg.querySelector('title')?.remove()
  return svg
}
const vbOf = (raw: string) => raw.match(/viewBox="([^"]+)"/)![1].trim().split(/[\s,]+/).map(Number)
const [SYM_D] = [...symbolRaw.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
const [VX, VY, VW, VH] = vbOf(logoRaw)
const [SX, SY, SW, SH] = vbOf(symbolRaw)
const SINR = vbOf(logoSinRRaw)
/** Las letras sin la ® van de VX a LETTERS_X1 (lo que se centra y lo que aterriza en la barra). */
const LETTERS_X1 = SINR[0] + SINR[2]

// ---------- decidir ----------
const qaParam = (): string | null => {
  const q = new URLSearchParams(location.search).get('qa') || ''
  const m = q.match(/(?:^|[,&])intro(?:=([\w.]+))?/)
  return m ? m[1] ?? 'play' : null
}
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
function seenRecently(): boolean {
  try {
    return Date.now() - (Number(localStorage.getItem(INTRO_KEY)) || 0) < WEEK
  } catch {
    return false
  }
}
function markSeen(): void {
  try {
    localStorage.setItem(INTRO_KEY, String(Date.now()))
  } catch {
    /* sin almacenamiento: se vuelve a ver la próxima vez */
  }
}
/** ¿Toca la intro? No con movimiento reducido, ni si se vio en los últimos 7 días (salvo `?qa=intro`). */
export function shouldRunIntro(): boolean {
  if (qaParam() !== null) return true
  return !reduced() && !seenRecently()
}

function langNow(): Lang {
  const q = new URLSearchParams(location.search).get('lang')
  let s: string | null = null
  try {
    s = localStorage.getItem('ocean-lang')
  } catch {
    /* noop */
  }
  const l = q || s || document.documentElement.lang
  return l === 'en' || l === 'pt' ? l : 'es'
}

const done = (detail: { played: boolean; skipped: boolean }) => window.dispatchEvent(new CustomEvent('ocean:intro-done', { detail }))

/**
 * La intro, para la página: la monta y la reproduce; la promesa se cumple al terminar o al saltarla (con
 * `ocean:intro-done` ya avisado). Con movimiento reducido (o si ya hay una corriendo) no monta nada y se cumple
 * enseguida. Con `?qa=intro=<p>` la deja posada en p (y la promesa queda pendiente). Pregunta antes `shouldRunIntro()`.
 */
export function runIntro(opts: IntroOptions & { dock: Element | null }): Promise<void> {
  const qa = qaParam()
  if (document.querySelector('[data-intro]') || (qa === null && reduced())) {
    document.querySelectorAll('[data-intro-veil]').forEach((v) => v.remove())
    queueMicrotask(() => done({ played: false, skipped: false }))
    return Promise.resolve()
  }
  const pose = qa !== null && qa !== 'play' ? Math.min(1, Math.max(0, Number(qa) || 0)) : null
  return mountIntro(opts, pose).done.then(() => undefined)
}

/** Para dev-intro.html: si toca, `runIntro`; si no, retira el velo de espera y avisa `ocean:intro-done`. */
export function bootIntro(opts: IntroOptions = {}): void {
  if (document.querySelector('[data-intro]')) return
  if (shouldRunIntro()) void runIntro({ dock: document.querySelector('[data-intro-dock]'), ...opts })
  else {
    document.querySelectorAll('[data-intro-veil]').forEach((v) => v.remove())
    queueMicrotask(() => done({ played: false, skipped: false }))
  }
}

// ---------- el marcado ----------
let symCache: ReturnType<typeof symbolTraces> | null = null
const symbol = () => (symCache ??= symbolTraces(SYM_D))

function markSvg(): string {
  const { center, traces } = symbol()
  const [CX, CY] = center
  const pad = 40
  const R = Math.hypot(Math.max(CX - SX, SX + SW - CX), Math.max(CY - SY, SY + SH - CY)) + 30
  const spike = (len: number, w: number, vertical: boolean) =>
    vertical
      ? `M${CX} ${CY - len}L${CX + w} ${CY}L${CX} ${CY + len}L${CX - w} ${CY}Z`
      : `M${CX - len} ${CY}L${CX} ${CY - w}L${CX + len} ${CY}L${CX} ${CY + w}Z`
  const diag = (len: number, w: number) => {
    const a = len / Math.SQRT2, b = w / Math.SQRT2
    return `M${CX - a} ${CY - a}L${CX + b} ${CY - b}L${CX + a} ${CY + a}L${CX - b} ${CY + b}Z M${CX + a} ${CY - a}L${CX + b} ${CY + b}L${CX - a} ${CY + a}L${CX - b} ${CY - b}Z`
  }
  const [tr0, tr1] = traces
  const band = 170
  const slant = (SH + 120) * 0.55
  const sx0 = SX - band - slant - 10 // el reflejo empieza entero a la izquierda del símbolo
  return `
<svg class="oi-sym" viewBox="${SX} ${SY} ${SW} ${SH}" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="oi-halo-g"><stop offset="0" stop-color="#6E8193" stop-opacity=".34"/><stop offset=".22" stop-color="#2B404F" stop-opacity=".22"/><stop offset=".55" stop-color="#06141D" stop-opacity=".12"/><stop offset="1" stop-color="#03060C" stop-opacity="0"/></radialGradient>
    <radialGradient id="oi-fill-g"><stop offset="0" stop-color="#fff"/><stop offset=".74" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
    <linearGradient id="oi-sheen-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="oi-sym-clip"><path d="${SYM_D}"/></clipPath>
    <mask id="oi-fill-m" maskUnits="userSpaceOnUse" x="${SX - pad}" y="${SY - pad}" width="${SW + 2 * pad}" height="${SH + 2 * pad}">
      <circle class="oi-fill-c" cx="${CX}" cy="${CY}" r="${R}" fill="url(#oi-fill-g)"/>
    </mask>
  </defs>
  <circle class="oi-halo" cx="${CX}" cy="${CY}" r="${SW * 0.95}" fill="url(#oi-halo-g)"/>
  <g mask="url(#oi-fill-m)"><path class="oi-fill" d="${SYM_D}" fill="${SNOW}"/></g>
  <g clip-path="url(#oi-sym-clip)"><path class="oi-sheen" d="M${sx0} ${SY + SH + 60}L${sx0 + band} ${SY + SH + 60}L${sx0 + band + slant} ${SY - 60}L${sx0 + slant} ${SY - 60}Z" fill="url(#oi-sheen-g)"/></g>
  <g class="oi-traces" fill="none" stroke="${SNOW}" stroke-linecap="round" stroke-linejoin="round">
    <path class="oi-tr" d="${tr0.fwd}" pathLength="1" stroke-dasharray="0.5 1"/><path class="oi-tr" d="${tr0.rev}" pathLength="1" stroke-dasharray="0.5 1"/>
    <path class="oi-tr" d="${tr1.fwd}" pathLength="1" stroke-dasharray="0.5 1"/><path class="oi-tr" d="${tr1.rev}" pathLength="1" stroke-dasharray="0.5 1"/>
  </g>
</svg>
<svg class="oi-star" viewBox="${SX} ${SY} ${SW} ${SH}" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="oi-core-g"><stop offset="0" stop-color="#fff"/><stop offset=".1" stop-color="#fff"/><stop offset=".26" stop-color="#E0E7ED" stop-opacity=".55"/><stop offset=".55" stop-color="#B2C0CC" stop-opacity=".14"/><stop offset="1" stop-color="#B2C0CC" stop-opacity="0"/></radialGradient>
    <linearGradient id="oi-spk-h" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="oi-spk-v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <g class="oi-star-g">
    <path class="oi-spk-d" d="${diag(150, 1.6)}" fill="#E0E7ED" opacity=".3"/>
    <path class="oi-spk-h" d="${spike(330, 2.6, false)}" fill="url(#oi-spk-h)"/>
    <path class="oi-spk-v" d="${spike(250, 2.6, true)}" fill="url(#oi-spk-v)"/>
    <circle class="oi-core" cx="${CX}" cy="${CY}" r="70" fill="url(#oi-core-g)"/>
  </g>
</svg>`
}

/** El esqueleto de la palabra; las piezas de la marca se insertan después como nodos (`fillWord`). */
function wordSvg(): string {
  const pad = 30
  const sweepW = 120
  const slant = (VH + 20) * 0.42
  const x0 = VX - sweepW - slant - 10 // el barrido empieza entero a la izquierda de la O
  return `
<svg viewBox="${VX} ${VY} ${VW} ${VH}" aria-hidden="true" focusable="false">
  <defs>
    <mask id="oi-an-m" maskUnits="userSpaceOnUse" x="${VX - pad}" y="${VY - pad}" width="${VW + 2 * pad}" height="${VH + 2 * pad}"></mask>
    <mask id="oi-sweep-m" maskUnits="userSpaceOnUse" x="${VX - pad}" y="${VY - pad}" width="${VW + 2 * pad}" height="${VH + 2 * pad}"><g class="oi-sweep-src" color="#fff"></g></mask>
    <linearGradient id="oi-sweep-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <g class="oi-trazos"></g>
  <g class="oi-logo"></g>
  <g mask="url(#oi-sweep-m)"><path class="oi-sweep" d="M${x0} ${VY + VH + 10}L${x0 + sweepW} ${VY + VH + 10}L${x0 + sweepW + slant} ${VY - 10}L${x0 + slant} ${VY - 10}Z" fill="url(#oi-sweep-g)"/></g>
</svg>`
}

const SVGNS = 'http://www.w3.org/2000/svg'
/**
 * Pone la marca en la palabra: el dibujo definitivo (logo.svg) tal cual; su copia sin ® como máscara del barrido; y
 * los ejes (logo-trazos.svg) listos para trazarse, con la Λ partida en sus dos piernas (de cada pie al vértice) y la Λ
 * y la N enmascaradas por su forma definitiva.
 */
function fillWord(word: HTMLElement): void {
  const logo = parseSvg(logoRaw)
  const regOf = (svg: Element) => svg.querySelector('path[fill-rule="evenodd"]')
  const shapes = logo.querySelector<SVGPathElement>('path[fill]:not([fill-rule])')
  if (!shapes || !regOf(logo)) throw new Error('[intro-v3] logo.svg: falta el trazo de la Λ y la N o la ®')
  const put = (sel: string, from: Element) => word.querySelector(sel)!.append(...[...from.childNodes].map((n) => n.cloneNode(true)))
  put('.oi-logo', logo)
  word.querySelector('.oi-logo path[fill-rule="evenodd"]')!.classList.add('oi-reg')
  const noReg = logo.cloneNode(true) as Element
  regOf(noReg)!.remove()
  put('.oi-sweep-src', noReg)
  // máscara (no clip-path): su borde lleva el mismo suavizado que el relleno definitivo
  const clip = document.createElementNS(SVGNS, 'path')
  clip.setAttribute('d', shapes.getAttribute('d')!)
  clip.setAttribute('fill', '#fff')
  word.querySelector('#oi-an-m')!.append(clip)

  const tz = parseSvg(trazosRaw)
  regOf(tz)?.remove()
  const axis = (l: string) => {
    const el = tz.querySelector(`[data-l="${l}"]`)
    if (!el) throw new Error(`[intro-v3] logo-trazos.svg: falta el eje ${l}`)
    return el as SVGGeometryElement
  }
  // la Λ: de cada pie al vértice
  const a = axis('A')
  const n = (a.getAttribute('d')!.match(/-?\d*\.?\d+/g) ?? []).map(Number)
  if (n.length !== 6) throw new Error('[intro-v3] logo-trazos.svg: la Λ debería ser pie, vértice, pie')
  const legs = [`M${n[0]} ${n[1]}L${n[2]} ${n[3]}`, `M${n[4]} ${n[5]}L${n[2]} ${n[3]}`].map((d) => {
    const p = document.createElementNS(SVGNS, 'path')
    p.setAttribute('d', d)
    p.dataset.l = 'A'
    return p
  })
  const clipped = (els: Element[]) => {
    const g = document.createElementNS(SVGNS, 'g')
    g.setAttribute('mask', 'url(#oi-an-m)')
    g.append(...els)
    return g
  }
  a.replaceWith(clipped(legs))
  const nn = axis('N')
  const ng = clipped([])
  nn.replaceWith(ng)
  ng.append(nn)
  tz.querySelectorAll('[data-l]').forEach((el) => {
    el.setAttribute('pathLength', '1')
    el.setAttribute('stroke-dasharray', '1 2')
    el.setAttribute('stroke-dashoffset', '1.05')
  })
  put('.oi-trazos', tz)
}

// ---------- la línea de tiempo ----------
/** Un fotograma en tiempo absoluto: [ms, valor, curva hacia el siguiente]. */
type K = [number, string | number, string?]

function mountIntro(opts: IntroOptions, pose: number | null): IntroHandle {
  const t0 = performance.now()
  const html = document.documentElement
  const lang = opts.lang ?? langNow()
  const root = document.createElement('div')
  root.className = 'oi'
  root.setAttribute('data-intro', '')
  root.innerHTML = `<div class="oi-bg"></div><div class="oi-mark">${markSvg()}</div><div class="oi-word">${wordSvg()}</div><div class="oi-dither"></div><div class="oi-grain"></div>`
  fillWord(root.querySelector<HTMLElement>('.oi-word')!)
  const skipBtn = document.createElement('button')
  skipBtn.type = 'button'
  skipBtn.className = 'oi-skip'
  skipBtn.dataset.es = 'Saltar intro'
  skipBtn.dataset.en = 'Skip intro'
  skipBtn.dataset.pt = 'Pular intro'
  skipBtn.textContent = skipBtn.dataset[lang] ?? 'Saltar intro'
  root.append(skipBtn)
  document.body.append(root)
  // el velo de espera del HTML ya no hace falta: la intro pinta su propio negro en el mismo cuadro
  document.querySelectorAll('[data-intro-veil]').forEach((v) => v.remove())
  html.classList.add('oi-running')
  const inert = [...document.querySelectorAll<HTMLElement>('[data-intro-inert]')]
  inert.forEach((el) => (el.inert = true))

  const $ = <E extends Element>(s: string) => root.querySelector<E>(s)!
  const $$ = <E extends Element>(s: string) => [...root.querySelectorAll<E>(s)]
  const mark = $<HTMLElement>('.oi-mark')
  const word = $<HTMLElement>('.oi-word')
  const grain = $<HTMLElement>('.oi-grain')
  const origin = (el: Element, x: number, y: number, box = 'view-box') => {
    const s = (el as SVGElement).style
    s.transformBox = box
    s.transformOrigin = `${x}px ${y}px`
  }
  // orígenes de las transformaciones en unidades del SVG
  const [CX, CY] = symbol().center
  $$('.oi-star-g, .oi-core, .oi-spk-h, .oi-spk-v, .oi-spk-d, .oi-fill-c').forEach((el) => origin(el, CX, CY))
  // la O empieza arriba, en el sentido del reloj
  const oAxis = $<SVGElement>('.oi-trazos [data-l="O"]')
  oAxis.style.transformBox = 'fill-box'
  oAxis.style.transformOrigin = '50% 50%'
  oAxis.style.transform = 'rotate(-90deg)'
  const reg = $<SVGElement>('.oi-reg')
  reg.style.transformBox = 'fill-box'
  reg.style.transformOrigin = '50% 50%'

  let anims: Animation[] = []
  let cues: Animation[] = []
  let finished = false
  let skipped = false
  let posed = pose !== null
  let resolveDone!: (v: { skipped: boolean }) => void
  const donePromise = new Promise<{ skipped: boolean }>((r) => (resolveDone = r))

  /** Una propiedad de un elemento, de 0 a INTRO_MS, con fotogramas en tiempos absolutos. */
  const track = (el: Element, prop: string, keys: K[]) => {
    const ks = keys.slice()
    for (let i = 1; i < ks.length; i++) if (ks[i][0] < ks[i - 1][0]) throw new Error(`[intro-v3] fotogramas fuera de orden en ${prop}: ${ks[i - 1][0]} > ${ks[i][0]}`)
    if (ks[0][0] > 0) ks.unshift([0, ks[0][1]])
    if (ks[ks.length - 1][0] < INTRO_MS) ks.push([INTRO_MS, ks[ks.length - 1][1]])
    const frames: Keyframe[] = ks.map(([t, v, e]) => ({ offset: t / INTRO_MS, [prop]: v, easing: e ?? 'linear' }))
    const a = el.animate(frames, { duration: INTRO_MS, fill: 'both' })
    a.pause()
    anims.push(a)
  }
  const each = (sel: string, prop: string, keys: K[]) => $$(sel).forEach((el) => track(el, prop, keys))

  function build(): void {
    anims.forEach((a) => a.cancel())
    anims = []
    const W = root.clientWidth || innerWidth
    const H = root.clientHeight || innerHeight
    // ---- medidas ----
    const symW = Math.min(W * 0.5, H * 0.34, 300)
    const k = symW / SW // px por unidad del símbolo
    const symH = SH * k
    const lettersW = Math.min(W * 0.78, 640, H * 1.1)
    const u = lettersW / (LETTERS_X1 - VX) // px por unidad del logotipo
    const wordW = VW * u
    const wordH = VH * u
    const s1 = Math.min(0.75, Math.max(0.4, (wordH * 1.6) / symH))
    const gap = wordH * 0.72
    const total = symH * s1 + gap + wordH
    const top = (H - total) / 2 - H * 0.02
    const y1 = top + (symH * s1) / 2 // centro de la estrella con la palabra
    const lift = y1 - H / 2
    const wordLeft = W / 2 - ((VX + LETTERS_X1) / 2 - VX) * u
    const wordTop = top + symH * s1 + gap
    Object.assign(mark.style, { width: `${symW}px`, height: `${symH}px`, left: `${W / 2 - (CX - SX) * k}px`, top: `${H / 2 - (CY - SY) * k}px`, transformOrigin: `${(CX - SX) * k}px ${(CY - SY) * k}px` })
    Object.assign(word.style, { width: `${wordW}px`, height: `${wordH}px`, left: `${wordLeft}px`, top: `${wordTop}px` })
    $$<SVGPathElement>('.oi-tr').forEach((p) => p.setAttribute('stroke-width', String(1.3 / k)))
    const dpr = Math.min(3, Math.max(1, devicePixelRatio || 1))
    grain.style.backgroundSize = `${256 / dpr}px ${256 / dpr}px`
    $<HTMLElement>('.oi-dither').style.backgroundSize = grain.style.backgroundSize

    // ---- FLIP a la barra: del sistema del logotipo de la intro al del SVG del ancla ----
    const dockEl = opts.dock !== undefined ? opts.dock : document.querySelector('[data-intro-dock]')
    const dockSvg = (dockEl?.querySelector('svg') ?? null) as SVGSVGElement | null
    let flip = `translate(0px, ${-H * 0.6}px) scale(.18)`
    if (dockSvg) {
      const r = dockSvg.getBoundingClientRect()
      const vb = dockSvg.viewBox.baseVal
      const sd = Math.min(r.width / vb.width, r.height / vb.height)
      const ax = r.left + (r.width - vb.width * sd) / 2 - vb.x * sd // x de pantalla de la unidad 0 en la barra
      const ay = r.top + (r.height - vb.height * sd) / 2 - vb.y * sd
      const ix = wordLeft - VX * u // x de pantalla de la unidad 0 en la intro
      const iy = wordTop - VY * u
      const kk = sd / u
      const dx = ax - wordLeft - kk * (ix - wordLeft)
      const dy = ay - wordTop - kk * (iy - wordTop)
      flip = `translate(${dx}px, ${dy}px) scale(${kk})`
    }

    // ---- 0 · el negro y el grano ----
    track($('.oi-bg'), 'opacity', [[T.veil, 1, OPEN], [INTRO_MS, 0]])
    track($('.oi-dither'), 'opacity', [[T.veil, 0.022, OPEN], [INTRO_MS, 0]])
    track(grain, 'opacity', [[T.veil, 0.07, OPEN], [INTRO_MS, 0]])
    track(skipBtn, 'opacity', [[250, 0, EASE], [850, 1], [T.veil, 1, EASE], [INTRO_MS - 200, 0]])

    // ---- 1 · la estrella ----
    const s = T.star
    track($('.oi-star-g'), 'opacity', [[s, 0, EASE], [s + 500, 1], [T.dock + 600, 1, EASE], [INTRO_MS, 0]])
    track($('.oi-core'), 'transform', [[s, 'scale(0)', EASE], [s + 900, 'scale(1)'], [T.lift, 'scale(1)', TRAVEL], [T.lift + 900, 'scale(.62)']])
    track($('.oi-spk-h'), 'transform', [[s + 80, 'scale(0, 1)', EASE], [s + 1300, 'scale(1, 1)'], [T.lift, 'scale(1, 1)', TRAVEL], [T.lift + 900, 'scale(.72, 1)']])
    track($('.oi-spk-v'), 'transform', [[s + 160, 'scale(1, 0)', EASE], [s + 1300, 'scale(1, 1)'], [T.lift, 'scale(1, 1)', TRAVEL], [T.lift + 900, 'scale(1, .72)']])
    track($('.oi-spk-d'), 'transform', [[s + 300, 'scale(0)', EASE], [s + 1400, 'scale(1)']])
    track($('.oi-halo'), 'opacity', [[s, 0, EASE], [s + 1200, 1], [T.dock, 1, EASE], [T.dock + 700, 0]])

    // ---- 2 · el símbolo ----
    each('.oi-tr', 'strokeDashoffset', [[T.trace, 0.5, EASE], [T.trace + 1150, 0]])
    track($('.oi-traces'), 'opacity', [[T.trace - 1, 0], [T.trace, 1], [T.fill + 420, 1, EASE], [T.fill + 1000, 0]])
    track($('.oi-fill-c'), 'transform', [[T.fill, 'scale(0)', EASE], [T.fill + 1000, 'scale(1)']])
    track($('.oi-sheen'), 'transform', [[T.sheen, 'translate(0px, 0px)', SWEEP], [T.sheen + 900, `translate(${SW + 170 + (SH + 120) * 0.55 + 30}px, 0px)`]])
    track($('.oi-sym'), 'opacity', [[T.dock + 150, 1, EASE], [T.dock + 750, 0]])
    track(mark, 'transform', [
      [T.lift, 'translate(0px, 0px) scale(1)', TRAVEL],
      [T.lift + 1000, `translate(0px, ${lift}px) scale(${s1})`],
      [T.dock, `translate(0px, ${lift}px) scale(${s1})`, EASE],
      [INTRO_MS - 100, `translate(0px, ${lift}px) scale(.035)`],
    ])

    // ---- 3 · la palabra, letra por letra, sobre sus ejes ----
    const pen = (sel: string, t0: number, dur: number) => each(`.oi-trazos ${sel}`, 'strokeDashoffset', [[t0, 1.05, PEN], [t0 + dur, 0]])
    pen('[data-l="O"]', T.O, 650)
    pen('[data-l="C"]', T.C, 600)
    ;['E1', 'E2', 'E3'].forEach((l, i) => pen(`[data-l="${l}"]`, T.E + i * 100, 380))
    pen('[data-l="A"]', T.A, 520) // las dos piernas a la vez
    pen('[data-l="N"]', T.N, 600)
    // todo trazado: el dibujo definitivo entra encima, con la misma geometría. Chrome suaviza distinto el borde de un
    // trazo con guiones (pathLength + dasharray) que el de uno liso, así que en vez de cambiar el suavizado de golpe:
    // primero el definitivo se funde encima (el interior ya está lleno: no cambia) y luego los ejes se van por debajo
    // (el definitivo ya lo cubre). Nada se mueve: solo el último medio píxel del borde, en ≈ 10 cuadros.
    track($('.oi-logo'), 'opacity', [[T.word, 0], [T.word + SETTLE, 1]])
    track($('.oi-trazos'), 'opacity', [[T.word + SETTLE, 1], [T.word + 2 * SETTLE, 0]])
    track($('.oi-sweep'), 'transform', [[T.sweep, 'translateX(0px)', SWEEP], [T.sweep + 700, `translateX(${VW + 120 + (VH + 20) * 0.42 + 30}px)`]])
    track(reg, 'opacity', [[T.reg, 0, EASE], [T.reg + 420, 1], [T.dock + 50, 1, EASE], [T.dock + 400, 0]])
    track(reg, 'transform', [[T.reg, 'scale(.6)', EASE], [T.reg + 520, 'scale(1)']])

    // ---- 4 · a la barra ----
    track(word, 'transform', [[T.dock, 'translate(0px, 0px) scale(1)', TRAVEL], [INTRO_MS, flip]])
  }

  /** El grano vive a saltos de cuadro (≈ 24 por segundo) solo mientras corre la intro. */
  let grainAnim: Animation | null = null
  function startGrain(): void {
    let seed = 7
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * -256
    const frames: Keyframe[] = Array.from({ length: 8 }, () => ({ transform: `translate(${r().toFixed(0)}px, ${r().toFixed(0)}px)`, easing: 'steps(1, end)' }))
    grainAnim = grain.animate(frames, { duration: 8 * 42, iterations: Infinity })
    if (posed) grainAnim.pause()
  }

  let clock = 0
  const now = () => (anims[0] ? Number(anims[0].currentTime ?? clock) : clock)
  function setTime(t: number, play: boolean): void {
    clock = t
    for (const a of anims) {
      a.currentTime = t
      if (play) a.play()
      else a.pause()
    }
  }
  function armCues(from: number): void {
    cues.forEach((c) => c.cancel())
    cues = []
    const cue = (at: number, fn: () => void) => {
      if (at < from) return
      const c = root.animate([], { duration: at })
      c.currentTime = from
      c.onfinish = () => !finished && !posed && fn()
      cues.push(c)
    }
    cue(T.star, () => opts.onStar?.())
    cue(T.word, () => opts.onWordComplete?.())
    cue(INTRO_MS, () => finish())
  }

  function finish(): void {
    if (finished) return
    finished = true
    cues.forEach((c) => c.cancel())
    grainAnim?.cancel()
    anims.forEach((a) => a.cancel())
    root.remove()
    html.classList.remove('oi-running')
    inert.forEach((el) => (el.inert = false))
    removeEventListener('resize', onResize)
    removeEventListener('keydown', onKey)
    resolveDone({ skipped })
    done({ played: true, skipped })
  }

  function skip(): void {
    if (finished || skipped) return
    skipped = true
    posed = false
    cues.forEach((c) => c.cancel())
    anims.forEach((a) => a.pause())
    html.classList.remove('oi-running')
    const dockEl = opts.dock !== undefined ? opts.dock : document.querySelector('[data-intro-dock]')
    dockEl?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 520, easing: EASE })
    root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520, easing: EASE, fill: 'forwards' }).onfinish = finish
  }
  skipBtn.addEventListener('click', skip)
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && skip()
  addEventListener('keydown', onKey)

  let raf = 0
  const onResize = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      if (finished || skipped) return
      const t = now()
      build()
      setTime(t, !posed)
    })
  }
  addEventListener('resize', onResize)

  build()
  startGrain()
  const handle: IntroHandle = {
    seek(p: number) {
      if (finished) return
      posed = true
      cues.forEach((c) => c.cancel())
      grainAnim?.pause()
      if (grainAnim) grainAnim.currentTime = 0
      setTime(Math.min(1, Math.max(0, p)) * INTRO_MS, false)
    },
    skip,
    done: donePromise,
  }
  if (pose !== null) handle.seek(pose)
  else {
    markSeen()
    setTime(0, true)
    armCues(0)
  }
  if (qaParam() !== null) (window as unknown as { __oceanIntro: unknown }).__oceanIntro = { ...handle, total: INTRO_MS, startedAt: performance.now(), mountMs: performance.now() - t0 }
  return handle
}
