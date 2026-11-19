/**
 * La intro de la v3 (docs/v3/CONCEPTO.md, «La intro»): la luz revela la marca.
 *   1. Negro con grano. Se enciende la estrella del centro del símbolo (núcleo y difracciones finas).
 *   2. Desde la estrella se trazan los contornos de las dos formas en S, se llenan de nieve y un reflejo las cruza.
 *   3. El logotipo se construye letra por letra (O anillo, C gira y abre su corte, las tres barras de la E desde la
 *      izquierda, la Λ sube desde la base, la N traza su diagonal); un barrido de luz recorre la palabra; la ®.
 *   4. El logotipo vuela a la barra ([data-intro-dock], FLIP exacto) y la estrella se aleja hasta ser un punto.
 *      Termina con `ocean:intro-done` en window ({ detail: { played, skipped } }).
 *
 * Una sola línea de tiempo: cada propiedad animada es UNA animación de la Web Animations API que dura toda la intro,
 * con sus fotogramas en tiempos absolutos; mover el reloj de todas a la vez posa la intro en cualquier instante
 * (`?qa=intro=<0..1>`). Solo transform, opacity y stroke-dashoffset (también dentro de máscaras); nada de filtros.
 *
 * La marca no se redibuja: los trazos salen de marca/v3/logo.svg y marca/v3/simbolo-simetrico.svg (leídos con ?raw);
 * letras.json (tools/marca/letras.mjs) solo los agrupa por letra y da los contornos del símbolo empezando en la estrella.
 */
import logoRaw from '../../marca/v3/logo.svg?raw'
import symbolRaw from '../../marca/v3/simbolo-simetrico.svg?raw'
import L from './letras.json'
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
/** Para abrir el negro al mundo: sin arranque brusco. */
const OPEN = 'cubic-bezier(.4,0,.2,1)'
/** Para los barridos de luz: velocidad casi pareja al cruzar. */
const SWEEP = 'cubic-bezier(.45,.05,.25,1)'

const SNOW = '#E0E7ED'

/** Los tiempos de cada gesto (ms desde el negro). */
const T = {
  star: 150, // la estrella se enciende (onStar)
  trace: 520, // los contornos nacen de la estrella
  fill: 1150, // la nieve llena las S desde el centro
  sheen: 1520, // el reflejo cruza el símbolo
  lift: 1650, // el símbolo sube y deja lugar a la palabra
  O: 1850,
  C: 1960,
  E: 2080, // + 80 por barra
  A: 2320,
  N: 2420,
  word: 3120, // la palabra está completa (onWordComplete)
  sweep: 2930, // el barrido recorre la palabra
  reg: 3080, // la ®, cuando el barrido la alcanza
  dock: 3600, // la palabra vuela a la barra; la estrella se aleja
  veil: 3760, // el negro se abre al mundo
} as const

type Lang = 'es' | 'en' | 'pt'
export interface IntroOptions {
  /** Ancla de la barra: el logotipo aterriza exactamente sobre su SVG. Por defecto `[data-intro-dock]`. */
  dock?: Element | null
  lang?: Lang
  /** Ganchos para el sonido (vendrá después): la estrella se enciende / la palabra queda completa. */
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
const dOf = (svg: string) => [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
const [WORD_D, REG_D] = dOf(logoRaw)
const [SYM_D] = dOf(symbolRaw)
const [VX, VY, VW, VH] = L.logo.viewBox
const [SX, SY, SW, SH] = L.symbol.viewBox
const [CX, CY] = L.symbol.center
/** Ancho de las letras sin la ® (lo que se centra y lo que aterriza en la barra). */
const LETTERS_W = L.letters[L.letters.length - 1].box[2] - VX

function fnv(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}
let checked = false
function checkBrand(): void {
  if (checked) return
  checked = true
  const word = L.letters.flatMap((l) => l.parts).join('')
  if (fnv(WORD_D + REG_D) !== L.logo.hash || word !== WORD_D || fnv(SYM_D) !== L.symbol.hash)
    console.error('[intro-v3] letras.json no sale de marca/v3: corre `node tools/marca/letras.mjs`')
}

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
export function introDue(): boolean {
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
 * Arranca: si toca, monta y reproduce la intro (o la posa con `?qa=intro=<p>`); si no, retira el velo de espera y
 * avisa `ocean:intro-done` enseguida. Devuelve el control de la intro, o null si no hubo.
 */
export function bootIntro(opts: IntroOptions = {}): IntroHandle | null {
  if (document.querySelector('[data-intro]')) return null
  const qa = qaParam()
  if (!introDue()) {
    document.querySelectorAll('[data-intro-veil]').forEach((v) => v.remove())
    queueMicrotask(() => done({ played: false, skipped: false }))
    return null
  }
  const pose = qa !== null && qa !== 'play' ? Math.min(1, Math.max(0, Number(qa) || 0)) : null
  return mountIntro(opts, pose)
}

// ---------- el marcado ----------
function markSvg(): string {
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
  const [tr0, tr1] = L.symbol.traces
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

function wordSvg(): string {
  const g = L.guides
  const pad = 30
  const region = `maskUnits="userSpaceOnUse" x="${VX - pad}" y="${VY - pad}" width="${VW + 2 * pad}" height="${VH + 2 * pad}"`
  const by = (id: string) => L.letters.find((l) => l.id === id)!
  // O: anillo que se cierra desde arriba, en el sentido del reloj
  const o = g.o
  const orx = o.rx * 0.72, ory = o.ry * 0.72
  const oD = `M${o.cx} ${o.cy - ory}A${orx} ${ory} 0 1 1 ${o.cx} ${o.cy + ory}A${orx} ${ory} 0 1 1 ${o.cx} ${o.cy - ory}`
  // C: desde el corte de arriba, por la izquierda, hasta el corte de abajo (3° de margen en cada punta)
  const c = g.c
  const crx = c.rx * 0.72, cry = c.ry * 0.72
  const a0 = ((c.cutDeg - 3) * Math.PI) / 180
  const cD = `M${c.cx + crx * Math.cos(a0)} ${c.cy - cry * Math.sin(a0)}A${crx} ${cry} 0 1 0 ${c.cx + crx * Math.cos(a0)} ${c.cy + cry * Math.sin(a0)}`
  const ringW = o.rx * 0.66
  const A = by('A').box
  const n = g.n.skel
  const nD = `M${n[0][0]} ${n[0][1] + 4}L${n[1][0]} ${n[1][1]}L${n[2][0]} ${n[2][1]}L${n[3][0]} ${n[3][1] - 4}`
  const E = by('E').parts
  const sweepW = 120
  const wslant = (VH + 20) * 0.42
  const wx0 = VX - sweepW - wslant - 10 // el barrido empieza entero a la izquierda de la O
  const clip = L.letters.map((l) => `<path d="${l.parts.join('')}"/>`).join('') + `<path d="${REG_D}" fill-rule="evenodd" clip-rule="evenodd"/>`
  return `
<svg viewBox="${VX} ${VY} ${VW} ${VH}" aria-hidden="true" focusable="false">
  <defs>
    <mask id="oi-m-o" ${region}><path class="oi-mo" d="${oD}" fill="none" stroke="#fff" stroke-width="${ringW}" pathLength="1" stroke-dasharray="1.001 2"/></mask>
    <mask id="oi-m-c" ${region}><path class="oi-mc" d="${cD}" fill="none" stroke="#fff" stroke-width="${ringW}" pathLength="1" stroke-dasharray="1.001 2"/></mask>
    <mask id="oi-m-a" ${region}><rect class="oi-ma" x="${A[0] - 6}" y="${A[1] - 6}" width="${A[2] - A[0] + 12}" height="${A[3] - A[1] + 12}" fill="#fff"/></mask>
    <mask id="oi-m-n" ${region}><path class="oi-mn" d="${nD}" fill="none" stroke="#fff" stroke-width="${g.n.stem * 1.9}" stroke-linejoin="round" stroke-linecap="square" pathLength="1" stroke-dasharray="1.001 2"/></mask>
    <clipPath id="oi-word-clip">${clip}</clipPath>
    <linearGradient id="oi-sweep-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <g fill="${SNOW}">
    <g class="oi-l-o"><g mask="url(#oi-m-o)"><path d="${by('O').parts.join('')}"/></g></g>
    <g class="oi-l-c"><g mask="url(#oi-m-c)"><path d="${by('C').parts.join('')}"/></g></g>
    <path class="oi-e" d="${E[0]}"/><path class="oi-e" d="${E[1]}"/><path class="oi-e" d="${E[2]}"/>
    <g class="oi-l-a"><g mask="url(#oi-m-a)"><path d="${by('A').parts.join('')}"/></g></g>
    <g class="oi-l-n"><g mask="url(#oi-m-n)"><path d="${by('N').parts.join('')}"/></g></g>
    <path class="oi-reg" d="${REG_D}" fill-rule="evenodd"/>
  </g>
  <g clip-path="url(#oi-word-clip)"><path class="oi-sweep" d="M${wx0} ${VY + VH + 10}L${wx0 + sweepW} ${VY + VH + 10}L${wx0 + sweepW + wslant} ${VY - 10}L${wx0 + wslant} ${VY - 10}Z" fill="url(#oi-sweep-g)"/></g>
</svg>`
}

// ---------- la línea de tiempo ----------
/** Un fotograma en tiempo absoluto: [ms, valor, curva hacia el siguiente]. */
type K = [number, string | number, string?]

function mountIntro(opts: IntroOptions, pose: number | null): IntroHandle {
  checkBrand()
  const html = document.documentElement
  const lang = opts.lang ?? langNow()
  const root = document.createElement('div')
  root.className = 'oi'
  root.setAttribute('data-intro', '')
  root.innerHTML = `<div class="oi-bg"></div><div class="oi-mark">${markSvg()}</div><div class="oi-word">${wordSvg()}</div><div class="oi-dither"></div><div class="oi-grain"></div>`
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
  $$('.oi-star-g, .oi-core, .oi-spk-h, .oi-spk-v, .oi-spk-d, .oi-fill-c').forEach((el) => origin(el, CX, CY))
  origin($('.oi-l-o'), L.guides.o.cx, L.guides.o.cy)
  origin($('.oi-l-c'), L.guides.c.cx, L.guides.c.cy)
  $$<SVGElement>('.oi-e').forEach((el) => {
    el.style.transformBox = 'fill-box'
    el.style.transformOrigin = '0% 50%'
  })
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
    const u = lettersW / LETTERS_W // px por unidad del logotipo
    const wordW = VW * u
    const wordH = VH * u
    const s1 = Math.min(0.75, Math.max(0.4, (wordH * 1.6) / symH))
    const gap = wordH * 0.72
    const total = symH * s1 + gap + wordH
    const top = (H - total) / 2 - H * 0.02
    const y1 = top + (symH * s1) / 2 // centro de la estrella con la palabra
    const lift = y1 - H / 2
    const wordLeft = W / 2 - (LETTERS_W / 2 - VX) * u
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
      [T.dock + 900, `translate(0px, ${lift}px) scale(.035)`],
    ])

    // ---- 3 · la palabra, letra por letra ----
    track($('.oi-mo'), 'strokeDashoffset', [[T.O, 1.05, EASE], [T.O + 760, 0]])
    track($('.oi-l-o'), 'transform', [[T.O, 'scale(.94)', EASE], [T.O + 900, 'scale(1)']])
    track($('.oi-mc'), 'strokeDashoffset', [[T.C, 1.05, EASE], [T.C + 780, 0]])
    track($('.oi-l-c'), 'transform', [[T.C, 'rotate(-70deg)', EASE], [T.C + 900, 'rotate(0deg)']])
    $$('.oi-e').forEach((el, i) => {
      const t = T.E + i * 80
      track(el, 'transform', [[t, 'translateX(-14px) scaleX(0)', EASE], [t + 620, 'translateX(0px) scaleX(1)']])
    })
    track($('.oi-ma'), 'transform', [[T.A, `translateY(${108}px)`, EASE], [T.A + 640, 'translateY(0px)']])
    track($('.oi-l-a'), 'transform', [[T.A, 'translateY(10px)', EASE], [T.A + 760, 'translateY(0px)']])
    track($('.oi-mn'), 'strokeDashoffset', [[T.N, 1.05, EASE], [T.N + 720, 0]])
    track($('.oi-sweep'), 'transform', [[T.sweep, 'translateX(0px)', SWEEP], [T.sweep + 760, `translateX(${VW + 120 + (VH + 20) * 0.42 + 30}px)`]])
    track(reg, 'opacity', [[T.reg, 0, EASE], [T.reg + 420, 1], [T.dock + 50, 1, EASE], [T.dock + 380, 0]])
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
  if (qaParam() !== null) (window as unknown as { __oceanIntro: unknown }).__oceanIntro = { ...handle, total: INTRO_MS, startedAt: performance.now() }
  return handle
}
