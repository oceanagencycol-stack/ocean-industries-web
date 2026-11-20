/**
 * El motor de sonido de la v3 (Web Audio). Se importa DINÁMICO desde `sound-gate.ts`, solo después del primer gesto
 * válido o del botón de sonido: antes de eso la página no pide ni un byte de audio (ver SONIDO.md).
 *
 *   ambientes (lazo, uno por tramo, fundido de igual potencia) ─┐
 *   efectos de cruce ───────────────────────────────────────────┼→ paso bajo «profundidad» → compresor suave
 *   tema de la intro ───────────────────────────────────────────┘      → duck (chat / reel) → master (on/off) → salida
 *
 * El paso bajo se cierra bajo el agua (tramos agua y maquina) y se abre al emerger: es lo que hace que el agua se
 * «sienta». Los ambientes se eligen por el tramo que ocupa más pantalla (IntersectionObserver) con una espera de
 * 400 ms (antirrebote); solo se descargan el ambiente actual y el siguiente. Los efectos suenan una vez por cruce hacia
 * adelante, con enfriamiento por efecto y global.
 */

export type TramoName = 'espacio' | 'satelite' | 'mar' | 'agua' | 'maquina' | 'emerge' | 'cumbre'
const ORDER: TramoName[] = ['espacio', 'satelite', 'mar', 'agua', 'maquina', 'emerge', 'cumbre']
type Amb = 'amb-espacio' | 'amb-oceano' | 'amb-cumbre'
const AMB_OF: Record<TramoName, Amb> = {
  espacio: 'amb-espacio',
  satelite: 'amb-espacio',
  mar: 'amb-oceano',
  agua: 'amb-oceano',
  maquina: 'amb-oceano',
  emerge: 'amb-cumbre',
  cumbre: 'amb-cumbre',
}
/** efecto al ENTRAR a cada tramo (hacia adelante); `from` limita de dónde viene */
const SFX_ON_ENTER: Partial<Record<TramoName, { sfx: string; from?: TramoName }>> = {
  satelite: { sfx: 'sfx-satelite' },
  mar: { sfx: 'sfx-atmosfera', from: 'satelite' },
  agua: { sfx: 'sfx-agua-entra' },
  maquina: { sfx: 'sfx-sumergible' },
  emerge: { sfx: 'sfx-agua-sale' },
  cumbre: { sfx: 'sfx-rafaga' },
}
/** corte del paso bajo (Hz) por tramo: el agua cierra, el aire abre */
const CUTOFF: Record<TramoName, number> = { espacio: 20000, satelite: 20000, mar: 16000, agua: 1300, maquina: 900, emerge: 14000, cumbre: 20000 }

const DIR = '/v3/audio/'
const XFADE = 2.6 // s, fundido entre ambientes
const DWELL = 400 // ms que un tramo tiene que ser el dominante para confirmarse
const SFX_COOLDOWN = 8000 // ms por efecto
const GLOBAL_GAP = 500 // ms entre cualquier par de efectos
const LEVEL = { amb: 1, sfx: 0.7, music: 0.6 }

export interface EngineDebug {
  ctx: string
  on: boolean
  duck: boolean
  tramo: TramoName | null
  ambient: Amb | null
  ambGains: Record<string, number>
  filterHz: number
  master: number
  duckGain: number
  buffers: string[]
  fired: { sfx: string; tramo: TramoName; t: number }[]
  tema: boolean
}

export interface Engine {
  setOn(on: boolean): void
  setDuck(duck: boolean): void
  cue(name: 'star' | 'word'): void
  debug(): EngineDebug
}

const curve = (fn: (x: number) => number): Float32Array => {
  const n = 96
  const a = new Float32Array(n)
  for (let i = 0; i < n; i++) a[i] = fn(i / (n - 1))
  return a
}
const FADE_IN = curve((x) => Math.sin((x * Math.PI) / 2))
const FADE_OUT = curve((x) => Math.cos((x * Math.PI) / 2))

export function createEngine(ctx: AudioContext, opts: { on: boolean }): Engine {
  // ---- grafo ----
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.knee.value = 24
  comp.ratio.value = 2.5
  comp.attack.value = 0.01
  comp.release.value = 0.3
  const duckGain = ctx.createGain()
  const master = ctx.createGain()
  master.gain.value = 0
  const depth = ctx.createBiquadFilter()
  depth.type = 'lowpass'
  depth.frequency.value = 20000
  depth.Q.value = 0.5
  depth.connect(comp).connect(duckGain).connect(master).connect(ctx.destination)
  const ambBus = ctx.createGain()
  const sfxBus = ctx.createGain()
  const musBus = ctx.createGain()
  ambBus.gain.value = LEVEL.amb
  sfxBus.gain.value = LEVEL.sfx
  musBus.gain.value = LEVEL.music
  ambBus.connect(depth)
  sfxBus.connect(depth)
  musBus.connect(depth)

  // ---- formato: Opus/WebM donde se pueda, AAC/M4A de respaldo (Safari) ----
  const probe = document.createElement('audio')
  const opus = !!probe.canPlayType('audio/webm; codecs="opus"')
  const exts = opus ? ['webm', 'm4a'] : ['m4a', 'webm']

  // ---- buffers ----
  const buffers = new Map<string, AudioBuffer>()
  const loading = new Map<string, Promise<AudioBuffer | null>>()
  function load(name: string): Promise<AudioBuffer | null> {
    const have = buffers.get(name)
    if (have) return Promise.resolve(have)
    const pending = loading.get(name)
    if (pending) return pending
    const p = (async () => {
      for (const ext of exts) {
        try {
          const res = await fetch(`${DIR}${name}.${ext}`)
          if (!res.ok) continue
          const buf = await ctx.decodeAudioData(await res.arrayBuffer())
          buffers.set(name, buf)
          return buf
        } catch {
          /* prueba el otro formato */
        }
      }
      return null
    })()
    loading.set(name, p)
    void p.finally(() => loading.delete(name))
    return p
  }

  // ---- ambientes ----
  interface Live {
    name: Amb
    gain: GainNode
    src: AudioBufferSourceNode
  }
  let current: Live | null = null
  let wantAmb: Amb | null = null
  const dying = new Set<Live>()
  let on = opts.on

  async function goAmbient(name: Amb): Promise<void> {
    wantAmb = name
    if (current?.name === name) return
    const buf = await load(name)
    if (!buf || wantAmb !== name || (current?.name === name)) return
    const t0 = ctx.currentTime + 0.05
    const gain = ctx.createGain()
    gain.gain.value = 0
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.connect(gain).connect(ambBus)
    gain.gain.setValueCurveAtTime(FADE_IN, t0, XFADE)
    src.start(t0)
    const old = current
    current = { name, gain, src }
    if (old) {
      old.gain.gain.cancelScheduledValues(t0)
      old.gain.gain.setValueCurveAtTime(FADE_OUT, t0, XFADE)
      old.src.stop(t0 + XFADE + 0.1)
      dying.add(old)
      old.src.onended = () => {
        dying.delete(old)
        old.gain.disconnect()
      }
    }
    evict()
  }

  /** deja en memoria solo el ambiente actual y el siguiente */
  function evict(): void {
    const keep = new Set<string>()
    if (current) keep.add(current.name)
    if (wantAmb) keep.add(wantAmb)
    const nx = nextAmbient()
    if (nx) keep.add(nx)
    for (const k of Array.from(buffers.keys())) if (k.startsWith('amb-') && !keep.has(k) && ![...dying].some((d) => d.name === k)) buffers.delete(k)
  }
  function nextAmbient(): Amb | null {
    if (!tramo) return null
    const i = ORDER.indexOf(tramo)
    for (let j = i + 1; j < ORDER.length; j++) if (AMB_OF[ORDER[j]] !== AMB_OF[tramo]) return AMB_OF[ORDER[j]]
    return null
  }
  function prefetch(): void {
    const nx = nextAmbient()
    if (nx) void load(nx)
    if (!tramo) return
    const nt = ORDER[ORDER.indexOf(tramo) + 1]
    const e = nt && SFX_ON_ENTER[nt]
    if (e) void load(e.sfx)
  }

  // ---- efectos ----
  const fired: EngineDebug['fired'] = []
  const lastBy = new Map<string, number>()
  let lastAny = 0
  function playSfx(name: string, why: TramoName | 'intro'): void {
    const now = performance.now()
    if (!on) return
    if (now - lastAny < GLOBAL_GAP || now - (lastBy.get(name) ?? -1e9) < SFX_COOLDOWN) return
    lastAny = now
    lastBy.set(name, now)
    if (why !== 'intro') fired.push({ sfx: name, tramo: why, t: Math.round(now) })
    void load(name).then((buf) => {
      if (!buf || !on) return
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(sfxBus)
      src.start()
    })
  }

  // ---- el tema de la intro: empieza bajo, solo en la portada ----
  let temaGain: GainNode | null = null
  let temaSrc: AudioBufferSourceNode | null = null
  async function playTema(): Promise<void> {
    if (temaSrc) return
    const buf = await load('tema')
    if (!buf || !on || temaSrc) return
    const t0 = ctx.currentTime + 0.05
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(0.55, t0 + 3) // bajo: no tapa nada
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.connect(g).connect(musBus)
    s.start(t0)
    temaGain = g
    temaSrc = s
    s.onended = () => {
      temaSrc = null
      temaGain = null
      buffers.delete('tema')
    }
  }
  function fadeTema(): void {
    if (!temaGain || !temaSrc) return
    const t = ctx.currentTime
    temaGain.gain.cancelScheduledValues(t)
    temaGain.gain.setValueAtTime(temaGain.gain.value, t)
    temaGain.gain.linearRampToValueAtTime(0, t + 1.6)
    temaSrc.stop(t + 1.7)
  }

  // ---- el tramo dominante ----
  let tramo: TramoName | null = null
  let candidate: TramoName | null = null
  let timer = 0
  const area = new Map<Element, number>()
  const els = new Map<Element, TramoName>()

  function commit(next: TramoName): void {
    const prev = tramo
    tramo = next
    // paso bajo: se cierra bajo el agua
    const f = CUTOFF[next]
    depth.frequency.cancelScheduledValues(ctx.currentTime)
    depth.frequency.setTargetAtTime(f, ctx.currentTime, f < 3000 ? 0.6 : 0.45)
    void goAmbient(AMB_OF[next])
    if (next !== 'espacio') fadeTema()
    // efecto del cruce: solo hacia adelante
    if (prev && ORDER.indexOf(next) > ORDER.indexOf(prev)) {
      const e = SFX_ON_ENTER[next]
      if (e && (!e.from || e.from === prev)) playSfx(e.sfx, next)
    }
    prefetch()
  }
  function pick(): void {
    const filmChapter = document.documentElement.dataset.filmSound as TramoName | undefined
    if (filmChapter && ORDER.includes(filmChapter)) {
      window.clearTimeout(timer)
      candidate = filmChapter
      if (tramo !== filmChapter) commit(filmChapter)
      return
    }
    let best: TramoName | null = null
    let max = 0
    area.forEach((h, el) => {
      if (h > max) {
        max = h
        best = els.get(el) ?? null
      }
    })
    if (!best || best === candidate) return
    candidate = best
    window.clearTimeout(timer)
    if (best === tramo) return
    timer = window.setTimeout(() => {
      if (candidate && candidate !== tramo) commit(candidate)
    }, DWELL)
  }
  window.addEventListener('ocean:film-sound', pick)
  const thresholds = Array.from({ length: 51 }, (_, i) => i / 50)
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) area.set(e.target, e.isIntersecting ? e.intersectionRect.height : 0)
      pick()
    },
    { threshold: thresholds },
  )
  document.querySelectorAll<HTMLElement>('[data-tramo]').forEach((el) => {
    const n = el.dataset.tramo as TramoName
    if (ORDER.includes(n)) {
      els.set(el, n)
      io.observe(el)
    }
  })
  // el tramo con que se abre: sin efecto
  window.setTimeout(() => {
    if (!tramo && candidate) commit(candidate)
  }, 60)

  // ---- encendido, silencio por chat/reel y pestaña oculta ----
  let suspendTimer = 0
  let duck = false
  function setOn(v: boolean): void {
    on = v
    window.clearTimeout(suspendTimer)
    const t = ctx.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.setValueAtTime(master.gain.value, t)
    if (v) {
      if (!document.hidden) void ctx.resume().catch(() => {})
      master.gain.linearRampToValueAtTime(1, t + 1.2)
      if (!current && tramo) void goAmbient(AMB_OF[tramo])
    } else {
      master.gain.linearRampToValueAtTime(0, t + 0.4)
      suspendTimer = window.setTimeout(() => void ctx.suspend().catch(() => {}), 600)
      fadeTema()
    }
  }
  function setDuck(v: boolean): void {
    duck = v
    const t = ctx.currentTime
    duckGain.gain.cancelScheduledValues(t)
    duckGain.gain.setValueAtTime(duckGain.gain.value, t)
    duckGain.gain.linearRampToValueAtTime(v ? 0 : 1, t + (v ? 0.35 : 0.9))
  }
  duckGain.gain.value = 1
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void ctx.suspend().catch(() => {})
    else if (on) void ctx.resume().catch(() => {})
  })
  setOn(on)

  return {
    setOn,
    setDuck,
    cue(name) {
      if (!on) return
      if (name === 'star') {
        playSfx('sfx-estrella', 'intro')
        void playTema()
      } else playSfx('sfx-logo', 'intro')
    },
    debug() {
      const g: Record<string, number> = {}
      if (current) g[current.name] = current.gain.gain.value
      dying.forEach((d) => (g[d.name] = d.gain.gain.value))
      return {
        ctx: ctx.state,
        on,
        duck,
        tramo,
        ambient: current?.name ?? null,
        ambGains: g,
        filterHz: depth.frequency.value,
        master: master.gain.value,
        duckGain: duckGain.gain.value,
        buffers: Array.from(buffers.keys()),
        fired: fired.slice(),
        tema: !!temaSrc,
      }
    },
  }
}
