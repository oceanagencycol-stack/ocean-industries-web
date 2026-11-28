/**
 * Motor de sonido de la v6 «La nave» (se baja con import dinámico desde `v3/sound-gate.ts`, igual que el de la v3).
 *
 *   tema (lazo) ──────────┐
 *   ambiente del abismo ──┼→ paso bajo «profundidad» → compresor suave → duck (chat / reel) → master (on/off) → salida
 *   efectos de cruce ─────┘
 *
 * Todo sigue a la película: `film.ts` publica en `window.__oceanU` la posición en unidades de toma (u: 0 = órbita,
 * 7 = el fondo; −1 cuando ya pasó la película). Arriba del agua el filtro va abierto; al cruzar la línea de agua suena
 * la entrada y todo queda amortiguado, más cuanto más hondo. Cada efecto suena una vez al cruzar su punto hacia
 * adelante (al volver atrás se rearma). El tema es original (ElevenLabs Music), solo instrumental.
 */
import { ROCA } from '../v4/script'

type Win = Window & { __oceanU?: number }

const DIR = '/v6/audio/'
const LEVEL = { music: 0.62, amb: 0.7, sfx: 0.8 }
const WATER = 4.08 // u en que la nave entra al agua
/** efectos por cruce hacia adelante: [u, pieza, ganancia] */
const CUES: [number, string, number][] = [
  [1.02, 'sfx-reentrada', 1],
  [2.15, 'sfx-trueno', 0.8],
  [WATER, 'sfx-agua', 1],
  [5.6, 'sfx-sonar', 0.7],
  [6.25, 'sfx-sonar', 0.55],
  [ROCA.u0 + 0.04, 'sfx-grabado', 1],
]

export interface EngineDebug {
  ctx: string
  on: boolean
  duck: boolean
  u: number
  filterHz: number
  master: number
  buffers: string[]
  fired: { sfx: string; u: number }[]
  tema: boolean
}

export interface Engine {
  setOn(on: boolean): void
  setDuck(duck: boolean): void
  cue(name: 'star' | 'word'): void
  debug(): EngineDebug
}

/** corte del paso bajo según la profundidad */
function cutoff(u: number): number {
  if (u < 0) return 9000 // después de la película: el epílogo, apenas velado
  if (u < WATER) return 20000
  const d = Math.min(1, (u - WATER) / (6.6 - WATER))
  return 1400 - d * 760 // de 1.400 Hz bajo la superficie a ~640 Hz en el fondo
}

export function createEngine(ctx: AudioContext, opts: { on: boolean }): Engine {
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
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
  depth.Q.value = 0.6
  depth.connect(comp).connect(duckGain).connect(master).connect(ctx.destination)
  const musBus = ctx.createGain()
  const ambBus = ctx.createGain()
  const sfxBus = ctx.createGain()
  musBus.gain.value = LEVEL.music
  ambBus.gain.value = 0
  sfxBus.gain.value = LEVEL.sfx
  musBus.connect(depth)
  ambBus.connect(depth)
  sfxBus.connect(depth)

  const probe = document.createElement('audio')
  const exts = probe.canPlayType('audio/webm; codecs="opus"') ? ['webm', 'm4a'] : ['m4a', 'webm']
  const buffers = new Map<string, AudioBuffer>()
  const loading = new Map<string, Promise<AudioBuffer | null>>()

  function load(name: string): Promise<AudioBuffer | null> {
    const have = buffers.get(name)
    if (have) return Promise.resolve(have)
    let p = loading.get(name)
    if (p) return p
    p = (async () => {
      for (const ext of exts) {
        try {
          const r = await fetch(`${DIR}${name}.${ext}`)
          if (!r.ok) continue
          const b = await ctx.decodeAudioData(await r.arrayBuffer())
          buffers.set(name, b)
          return b
        } catch {
          /* siguiente formato */
        }
      }
      return null
    })()
    loading.set(name, p)
    return p
  }

  let on = opts.on
  let duck = false
  let tema: AudioBufferSourceNode | null = null
  let amb: AudioBufferSourceNode | null = null
  let lastU = -2
  let raf = 0
  const fired: { sfx: string; u: number }[] = []
  const armed = new Set(CUES.map((_, i) => i))

  function loop(name: string, bus: GainNode): Promise<AudioBufferSourceNode | null> {
    return load(name).then((b) => {
      if (!b) return null
      const s = ctx.createBufferSource()
      s.buffer = b
      s.loop = true
      s.connect(bus)
      s.start()
      return s
    })
  }

  function play(name: string, gain: number): void {
    void load(name).then((b) => {
      if (!b || !on || duck) return
      const s = ctx.createBufferSource()
      const g = ctx.createGain()
      g.gain.value = gain
      s.buffer = b
      s.connect(g).connect(sfxBus)
      s.start()
    })
  }

  function step(): void {
    raf = requestAnimationFrame(step)
    const u = (window as Win).__oceanU ?? 0
    if (u === lastU) return
    const now = ctx.currentTime
    depth.frequency.setTargetAtTime(cutoff(u), now, u >= WATER && lastU < WATER ? 0.05 : 0.35)
    // el ambiente del abismo entra bajo el agua y crece con la profundidad
    const a = u < WATER ? 0 : Math.min(1, (u - WATER) / 1.5) * LEVEL.amb
    ambBus.gain.setTargetAtTime(a, now, 0.6)
    // el tema baja un poco en el epílogo
    musBus.gain.setTargetAtTime(u < 0 ? LEVEL.music * 0.6 : LEVEL.music, now, 0.8)
    // cruces hacia adelante
    CUES.forEach(([at, name, gain], i) => {
      if (u >= 0 && lastU >= 0 && lastU < at && u >= at && armed.has(i)) {
        armed.delete(i)
        fired.push({ sfx: name, u })
        if (fired.length > 20) fired.shift()
        play(name, gain)
      } else if (u >= 0 && u < at - 0.15) armed.add(i)
    })
    lastU = u
  }

  async function start(): Promise<void> {
    if (!tema) tema = await loop('tema', musBus)
    if (!amb) amb = await loop('amb-abismo', ambBus)
    // precarga de los efectos (pesan poco)
    for (const [, n] of CUES) void load(n)
  }

  function setOn(v: boolean): void {
    on = v
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(v ? 1 : 0, now + (v ? 2.2 : 0.6))
    if (v) {
      void start()
      if (!raf) step()
    }
  }

  function setDuck(v: boolean): void {
    duck = v
    duckGain.gain.setTargetAtTime(v ? 0 : 1, ctx.currentTime, 0.25)
  }

  setOn(on)

  return {
    setOn,
    setDuck,
    cue() {
      /* la v6 no tiene intro de marca con sonido propio */
    },
    debug: () => ({
      ctx: ctx.state,
      on,
      duck,
      u: lastU,
      filterHz: Math.round(depth.frequency.value),
      master: +master.gain.value.toFixed(3),
      buffers: [...buffers.keys()],
      fired: [...fired],
      tema: !!tema,
    }),
  }
}
