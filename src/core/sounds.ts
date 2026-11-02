/**
 * The sound of Ocean, made in code: every sound below is a recipe that the engine (audio.ts) renders once into a
 * buffer with an OfflineAudioContext, then plays like a sample. No files, no credits, the same result on every visit
 * (the noise is seeded).
 *
 * The palette is the Pacific at night: the surf on a dark beach, a single drop that wakes the water, a swell that
 * builds and breaks, glass rising out of the wave, the sparkle of the plankton, a three-note motif that rises like a
 * wave, soft drops for the conversation and quiet clicks for the interface. Times inside the recipes (the swell's
 * peak, the motif's notes) are exported in MARKS so the intro can land picture and sound on the same frame.
 */
export type SoundName =
  | 'surf'
  | 'drop'
  | 'swell'
  | 'break'
  | 'chime'
  | 'spray'
  | 'sweep'
  | 'motif'
  | 'music'
  | 'clink'
  | 'tick'
  | 'click'
  | 'msgIn'
  | 'msgOut'
  | 'result'

export type Bus = 'sfx' | 'ui' | 'amb' | 'music'

export interface SoundDef {
  /** seconds */
  dur: number
  gain: number
  bus: Bus
  channels: 1 | 2
  rate: number
  /** baked before the intro (it waits for them) */
  critical?: boolean
  render: (ctx: OfflineAudioContext, out: AudioNode) => void
}

/** Marks inside the recipes (seconds from the start of each sound). */
export const MARKS = {
  swellPeak: 2.0,
  motifNotes: [0.1, 0.3, 0.5],
} as const

/* ---------------------------------------------------------------- helpers */

function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number, seed: number, brown = false): AudioBuffer {
  const len = Math.max(1, Math.round(seconds * ctx.sampleRate))
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  const rnd = mulberry(seed)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = rnd() * 2 - 1
    if (brown) {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    } else d[i] = w
  }
  return buf
}

/** A night beach: stereo decaying noise, darker as it fades. */
function hall(ctx: BaseAudioContext, seconds: number, seed: number): AudioBuffer {
  const len = Math.round(seconds * ctx.sampleRate)
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    const rnd = mulberry(seed + ch * 101)
    let lp = 0
    for (let i = 0; i < len; i++) {
      const t = i / len
      const k = 0.35 + 0.6 * t
      lp = lp + (rnd() * 2 - 1 - lp) * (1 - k)
      d[i] = lp * Math.pow(1 - t, 2.4) * (i < 64 ? i / 64 : 1)
    }
  }
  return ir
}

/** out ← dry + reverb */
function withHall(ctx: OfflineAudioContext, out: AudioNode, wet: number, seconds = 2.6, seed = 7): AudioNode {
  const input = ctx.createGain()
  const dry = ctx.createGain()
  dry.gain.value = 1
  const verb = ctx.createConvolver()
  verb.normalize = true
  verb.buffer = hall(ctx, seconds, seed)
  const w = ctx.createGain()
  w.gain.value = wet
  input.connect(dry).connect(out)
  input.connect(verb).connect(w).connect(out)
  return input
}

interface ToneOpts {
  at: number
  freq: number
  attack?: number
  decay: number
  gain: number
  type?: OscillatorType
  pan?: number
  detune?: number
}

/** A struck partial: instant attack, exponential decay. */
function partial(ctx: OfflineAudioContext, dest: AudioNode, o: ToneOpts): void {
  const osc = ctx.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.value = o.freq
  if (o.detune) osc.detune.value = o.detune
  const g = ctx.createGain()
  const a = o.attack ?? 0.002
  g.gain.setValueAtTime(0, o.at)
  g.gain.linearRampToValueAtTime(o.gain, o.at + a)
  g.gain.setTargetAtTime(0, o.at + a, o.decay / 4.6)
  let node: AudioNode = g
  if (o.pan && ctx.destination.channelCount > 1) {
    const p = ctx.createStereoPanner()
    p.pan.value = o.pan
    g.connect(p)
    node = p
  }
  osc.connect(g)
  node.connect(dest)
  osc.start(o.at)
  osc.stop(o.at + a + o.decay * 1.6)
}

/** Struck glass: inharmonic partials, each a slowly beating pair. */
function glass(ctx: OfflineAudioContext, dest: AudioNode, at: number, f0: number, gain: number, length: number, spread = 0.25): void {
  const ratios = [1, 2.0, 2.76, 4.07, 5.4]
  const amps = [1, 0.3, 0.42, 0.18, 0.12]
  const decays = [1, 0.62, 0.52, 0.34, 0.24]
  ratios.forEach((r, i) => {
    const f = f0 * r
    const d = length * decays[i]
    partial(ctx, dest, { at, freq: f, decay: d, gain: gain * amps[i] * 0.55, pan: -spread, detune: -2.2 })
    partial(ctx, dest, { at, freq: f, decay: d * 0.92, gain: gain * amps[i] * 0.55, pan: spread, detune: 2.2 })
  })
  const n = ctx.createBufferSource()
  n.buffer = noiseBuffer(ctx, 0.03, Math.round(f0))
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 3200
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain * 0.22, at)
  g.gain.setTargetAtTime(0, at, 0.004)
  n.connect(hp).connect(g).connect(dest)
  n.start(at)
}

/** A soft mallet on a tuned bar (the motif's voice). */
function mallet(ctx: OfflineAudioContext, dest: AudioNode, at: number, f: number, gain: number, decay: number, pan = 0): void {
  partial(ctx, dest, { at, freq: f, decay, gain, pan })
  partial(ctx, dest, { at, freq: f * 3.93, decay: decay * 0.18, gain: gain * 0.22, pan })
  partial(ctx, dest, { at, freq: f * 2, decay: decay * 0.5, gain: gain * 0.12, pan })
  partial(ctx, dest, { at: at + 0.002, freq: f * 0.5, decay: decay * 0.6, gain: gain * 0.08, pan })
}

/** A water drop: a short sine that jumps up in pitch (the "bloop"), then a quiet ring. */
function waterDrop(ctx: OfflineAudioContext, dest: AudioNode, at: number, f0: number, gain: number, pan = 0): void {
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(f0, at)
  o.frequency.exponentialRampToValueAtTime(f0 * 2.35, at + 0.045)
  o.frequency.exponentialRampToValueAtTime(f0 * 2.1, at + 0.16)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(gain, at + 0.004)
  g.gain.setTargetAtTime(0, at + 0.01, 0.045)
  let node: AudioNode = g
  if (pan && ctx.destination.channelCount > 1) {
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    g.connect(p)
    node = p
  }
  o.connect(g)
  node.connect(dest)
  o.start(at)
  o.stop(at + 0.4)
}

/* ---------------------------------------------------------------- the recipes */

/**
 * The surf on a dark beach, twelve seconds that loop: a low rumble of the sea and three waves that arrive, wash in
 * bright and pull back. Each side of the stereo field breathes on its own.
 */
const surf: SoundDef['render'] = (ctx, out) => {
  const D = 12
  const merger = ctx.createChannelMerger(2)
  merger.connect(out)
  for (let ch = 0; ch < 2; ch++) {
    const side = ctx.createGain()
    side.connect(merger, 0, ch)
    // the rumble: brown noise, low
    const r = ctx.createBufferSource()
    r.buffer = noiseBuffer(ctx, D, 71 + ch * 13, true)
    const rl = ctx.createBiquadFilter()
    rl.type = 'lowpass'
    rl.frequency.value = 340
    const rg = ctx.createGain()
    rg.gain.value = 0.55
    r.connect(rl).connect(rg).connect(side)
    r.start(0)
    // the waves: white noise through a band that opens as each wave washes in
    const w = ctx.createBufferSource()
    w.buffer = noiseBuffer(ctx, D, 83 + ch * 17)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.55
    const wg = ctx.createGain()
    wg.gain.setValueAtTime(0.02, 0)
    bp.frequency.setValueAtTime(600, 0)
    const waves = ch === 0 ? [0.4, 4.3, 8.1] : [0.9, 4.8, 8.4]
    for (const t0 of waves) {
      wg.gain.setTargetAtTime(0.32, t0, 0.55) // it builds
      bp.frequency.setTargetAtTime(2600, t0, 0.6)
      wg.gain.setTargetAtTime(0.42, t0 + 1.5, 0.08) // it washes in
      bp.frequency.setTargetAtTime(4200, t0 + 1.5, 0.12)
      wg.gain.setTargetAtTime(0.03, t0 + 1.9, 0.75) // it pulls back
      bp.frequency.setTargetAtTime(700, t0 + 1.9, 0.9)
    }
    w.connect(bp).connect(wg).connect(side)
    w.start(0)
  }
}

/** One drop: the water wakes. */
const drop: SoundDef['render'] = (ctx, out) => {
  const bus = withHall(ctx, out, 0.55, 2.4, 11)
  waterDrop(ctx, bus, 0.02, 520, 0.9)
  glass(ctx, bus, 0.03, 1760, 0.12, 1.2, 0.35)
}

/** The swell builds toward the break (peak at MARKS.swellPeak). */
const swell: SoundDef['render'] = (ctx, out) => {
  const peak = MARKS.swellPeak
  const n = ctx.createBufferSource()
  n.buffer = noiseBuffer(ctx, 2.6, 41, true)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 0.9
  lp.frequency.setValueAtTime(160, 0)
  lp.frequency.exponentialRampToValueAtTime(2400, peak)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, 0)
  g.gain.exponentialRampToValueAtTime(0.85, peak)
  g.gain.linearRampToValueAtTime(0, peak + 0.12)
  n.connect(lp).connect(g).connect(out)
  n.start(0)
  const w = ctx.createBufferSource()
  w.buffer = noiseBuffer(ctx, 2.6, 43)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.2
  bp.frequency.setValueAtTime(500, 0)
  bp.frequency.exponentialRampToValueAtTime(5200, peak)
  const wg = ctx.createGain()
  wg.gain.setValueAtTime(0.0001, 0)
  wg.gain.exponentialRampToValueAtTime(0.3, peak)
  wg.gain.linearRampToValueAtTime(0, peak + 0.1)
  w.connect(bp).connect(wg).connect(out)
  w.start(0)
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(55, 0)
  o.frequency.exponentialRampToValueAtTime(110, peak)
  const og = ctx.createGain()
  og.gain.setValueAtTime(0.0001, 0)
  og.gain.exponentialRampToValueAtTime(0.22, peak)
  og.gain.linearRampToValueAtTime(0, peak + 0.08)
  o.connect(og).connect(out)
  o.start(0)
  o.stop(peak + 0.2)
}

/** The wave breaks: a low hit and the long crash of white water. */
const breakWave: SoundDef['render'] = (ctx, out) => {
  const bus = withHall(ctx, out, 0.28, 2.6, 19)
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(82, 0)
  o.frequency.exponentialRampToValueAtTime(36, 0.4)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, 0)
  g.gain.linearRampToValueAtTime(0.9, 0.005)
  g.gain.setTargetAtTime(0, 0.005, 0.38)
  o.connect(g).connect(bus)
  o.start(0)
  o.stop(2.2)
  const n = ctx.createBufferSource()
  n.buffer = noiseBuffer(ctx, 3.2, 23)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 0.3
  lp.frequency.setValueAtTime(7000, 0)
  lp.frequency.exponentialRampToValueAtTime(900, 2.6)
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0, 0)
  ng.gain.linearRampToValueAtTime(0.5, 0.02)
  ng.gain.setTargetAtTime(0.18, 0.05, 0.25)
  ng.gain.setTargetAtTime(0, 0.8, 0.7)
  n.connect(lp).connect(ng).connect(bus)
  n.start(0)
}

/** Glass rising out of the wave. */
const chime: SoundDef['render'] = (ctx, out) => {
  const bus = withHall(ctx, out, 0.45, 2.8, 31)
  glass(ctx, bus, 0, 1318.51, 0.85, 2.4) // E6
  glass(ctx, bus, 0.014, 1975.53, 0.32, 1.6, 0.4) // B6 above it
}

/** The plankton's sparkle: many tiny high glints, scattered across the field. */
const spray: SoundDef['render'] = (ctx, out) => {
  const bus = withHall(ctx, out, 0.6, 2.2, 13)
  const rnd = mulberry(29)
  for (let i = 0; i < 42; i++) {
    const at = Math.pow(rnd(), 1.6) * 1.8
    const f = 2600 + rnd() * 5400
    partial(ctx, bus, { at, freq: f, decay: 0.18 + rnd() * 0.5, gain: 0.03 + rnd() * 0.06, pan: rnd() * 1.8 - 0.9 })
  }
  for (let i = 0; i < 6; i++) waterDrop(ctx, bus, 0.05 + rnd() * 1.2, 700 + rnd() * 600, 0.12, rnd() * 1.4 - 0.7)
}

/** A light passing over the glass, left to right. */
const sweep: SoundDef['render'] = (ctx, out) => {
  const bus = withHall(ctx, out, 0.45, 2.0, 37)
  const n = ctx.createBufferSource()
  n.buffer = noiseBuffer(ctx, 1.4, 47)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 3
  bp.frequency.setValueAtTime(1500, 0)
  bp.frequency.exponentialRampToValueAtTime(7200, 1.1)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, 0)
  g.gain.linearRampToValueAtTime(0.18, 0.5)
  g.gain.linearRampToValueAtTime(0, 1.3)
  const p = ctx.createStereoPanner()
  p.pan.setValueAtTime(-0.7, 0)
  p.pan.linearRampToValueAtTime(0.7, 1.2)
  n.connect(bp).connect(g).connect(p).connect(bus)
  n.start(0)
  ;[0.18, 0.34, 0.5, 0.64, 0.8, 0.95].forEach((at, i) =>
    partial(ctx, bus, { at, freq: 2200 + i * 650, decay: 0.5, gain: 0.045, pan: -0.6 + i * 0.24 }),
  )
}

/** Ocean's three notes: A, E, C♯ — an open interval that rises like a wave, the last one held. */
const motif: SoundDef['render'] = (ctx, out) => {
  const bus = withHall(ctx, out, 0.42, 2.8, 53)
  const [a, b, c] = MARKS.motifNotes
  mallet(ctx, bus, a, 440, 0.5, 1.0, -0.25) // A4
  mallet(ctx, bus, b, 659.25, 0.46, 1.0, 0.2) // E5
  mallet(ctx, bus, c, 1108.73, 0.52, 2.0, 0) // C♯6, held
  glass(ctx, bus, c + 0.004, 2217.46, 0.07, 1.4, 0.5) // a glint over the last note
}

/**
 * The night's pad: four chords of nine seconds (A major 9, F♯ minor 11, D major 7♯11, E sus4), two detuned saws per
 * note through a soft low-pass, long attacks and releases, a high glass layer and the beach's reverb. Mono at 22 kHz:
 * it lives under the surf and the depth filter darkens it while the visitor reads.
 */
const music: SoundDef['render'] = (ctx, out) => {
  const bus = withHall(ctx, out, 0.5, 3.6, 67)
  const CH = 9
  const chords = [
    [110.0, 164.81, 207.65, 246.94, 277.18],
    [92.5, 138.59, 164.81, 220.0, 246.94],
    [146.83, 220.0, 277.18, 329.63, 415.3],
    [82.41, 123.47, 164.81, 220.0, 246.94],
  ]
  const total = CH * chords.length
  chords.forEach((notes, i) => {
    const start = i * CH - 1.6
    const end = start + CH + 4.2
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 0.4
    lp.frequency.setValueAtTime(640, Math.max(0, start))
    lp.frequency.linearRampToValueAtTime(1050, Math.max(0, start) + CH * 0.6)
    lp.frequency.linearRampToValueAtTime(700, Math.min(total, end))
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, Math.max(0, start))
    g.gain.linearRampToValueAtTime(0.15, Math.max(0, start) + 3.4)
    g.gain.setValueAtTime(0.15, end - 4)
    g.gain.linearRampToValueAtTime(0, end)
    lp.connect(g).connect(bus)
    notes.forEach((f, k) => {
      for (const cents of [-7, 6]) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = f
        o.detune.value = cents
        const v = ctx.createGain()
        v.gain.value = (k === 0 ? 0.32 : 0.2) / 2
        o.connect(v).connect(lp)
        o.start(Math.max(0, start))
        o.stop(Math.min(total + 4, end + 0.1))
      }
    })
    const top = notes[notes.length - 1] * 4
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = top
    const trem = ctx.createOscillator()
    trem.frequency.value = 0.19 + i * 0.03
    const td = ctx.createGain()
    td.gain.value = 0.012
    const v = ctx.createGain()
    v.gain.setValueAtTime(0, Math.max(0, start))
    v.gain.linearRampToValueAtTime(0.016, Math.max(0, start) + 4)
    v.gain.linearRampToValueAtTime(0, end)
    trem.connect(td).connect(v.gain)
    o.connect(v).connect(bus)
    o.start(Math.max(0, start))
    trem.start(Math.max(0, start))
    o.stop(Math.min(total + 4, end + 0.1))
    trem.stop(Math.min(total + 4, end + 0.1))
  })
}

const clink: SoundDef['render'] = (ctx, out) => {
  const bus = withHall(ctx, out, 0.38, 2.0, 59)
  glass(ctx, bus, 0, 1567.98, 0.7, 1.4, 0.3) // G6
}

const tick: SoundDef['render'] = (ctx, out) => {
  partial(ctx, out, { at: 0, freq: 2350, attack: 0.001, decay: 0.07, gain: 0.5 })
  partial(ctx, out, { at: 0, freq: 4700, attack: 0.001, decay: 0.03, gain: 0.12 })
}

const click: SoundDef['render'] = (ctx, out) => {
  partial(ctx, out, { at: 0, freq: 1760, attack: 0.001, decay: 0.16, gain: 0.5 })
  partial(ctx, out, { at: 0, freq: 4186, attack: 0.001, decay: 0.07, gain: 0.18 })
  const n = ctx.createBufferSource()
  n.buffer = noiseBuffer(ctx, 0.01, 61)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2400
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.2, 0)
  g.gain.setTargetAtTime(0, 0, 0.002)
  n.connect(hp).connect(g).connect(out)
  n.start(0)
}

/** The agent answers: a low, round drop (the machine's voice is the water's). */
const msgIn: SoundDef['render'] = (ctx, out) => {
  const bus = withHall(ctx, out, 0.3, 1.2, 67)
  waterDrop(ctx, bus, 0.01, 380, 0.8)
}

/** The visitor sends: a lighter, higher tap. */
const msgOut: SoundDef['render'] = (ctx, out) => {
  partial(ctx, out, { at: 0, freq: 1320, attack: 0.002, decay: 0.12, gain: 0.45 })
  partial(ctx, out, { at: 0.035, freq: 1760, attack: 0.002, decay: 0.14, gain: 0.32 })
}

/** A result lands (a payment approved, a booking made): two bright glass notes, up. */
const result: SoundDef['render'] = (ctx, out) => {
  const bus = withHall(ctx, out, 0.4, 2.0, 71)
  glass(ctx, bus, 0, 1318.51, 0.55, 1.4, 0.2)
  glass(ctx, bus, 0.11, 1975.53, 0.5, 1.8, 0.3)
}

export const SOUNDS: Record<SoundName, SoundDef> = {
  surf: { dur: 12, gain: 0.34, bus: 'amb', channels: 2, rate: 22050, critical: true, render: surf },
  drop: { dur: 2.0, gain: 0.6, bus: 'sfx', channels: 2, rate: 44100, critical: true, render: drop },
  swell: { dur: 2.6, gain: 0.5, bus: 'sfx', channels: 1, rate: 32000, critical: true, render: swell },
  break: { dur: 3.4, gain: 0.62, bus: 'sfx', channels: 2, rate: 32000, critical: true, render: breakWave },
  chime: { dur: 2.8, gain: 0.78, bus: 'sfx', channels: 2, rate: 44100, critical: true, render: chime },
  spray: { dur: 2.4, gain: 0.5, bus: 'sfx', channels: 2, rate: 44100, critical: true, render: spray },
  sweep: { dur: 1.6, gain: 0.45, bus: 'sfx', channels: 2, rate: 44100, critical: true, render: sweep },
  motif: { dur: 3.2, gain: 0.7, bus: 'sfx', channels: 2, rate: 44100, critical: true, render: motif },
  music: { dur: 36, gain: 0.3, bus: 'music', channels: 1, rate: 22050, render: music },
  clink: { dur: 2.0, gain: 0.8, bus: 'sfx', channels: 2, rate: 44100, render: clink },
  tick: { dur: 0.12, gain: 0.14, bus: 'ui', channels: 1, rate: 44100, render: tick },
  click: { dur: 0.3, gain: 0.24, bus: 'ui', channels: 1, rate: 44100, render: click },
  msgIn: { dur: 1.2, gain: 0.5, bus: 'ui', channels: 2, rate: 44100, render: msgIn },
  msgOut: { dur: 0.4, gain: 0.3, bus: 'ui', channels: 1, rate: 44100, render: msgOut },
  result: { dur: 2.2, gain: 0.6, bus: 'sfx', channels: 2, rate: 44100, render: result },
}
