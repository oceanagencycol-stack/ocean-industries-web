/**
 * The sound engine (Web Audio), ported from Qora's (via CALPRO's): the same buses and rules, with every sound made in
 * code (sounds.ts) instead of files.
 *
 *  buses: sfx · ui · amb (the surf, through its own filter) · music (through a "depth" low-pass)
 *         → master → duck (a conversation) → compressor (glue and ceiling) → out
 *
 * - Sound is on by default: the site opens with sound, no gate, no button. The context is created early (suspended)
 *   so the sounds can be rendered during the splash. `autoplay()` tries to play without a gesture (Chrome allows it
 *   on sites with a history of use, Safari on allowed sites). When the browser says no (the rule on a first visit,
 *   above all on iPhone), sound starts with the first tap, click or key anywhere (`armFirstGesture`), in sync with
 *   whatever is on screen.
 * - Muting lasts the session (sessionStorage): a new visit opens with sound again.
 * - iOS: an implicit unlock (the first tap) respects the silent switch and doesn't stop other apps' music. Only
 *   turning sound on on purpose, with the button, asks for the "playback" audio session.
 * - Loops (the surf and the music) chain with a manual crossfade, so a seam never clicks.
 * - Without a buffer or without permission everything stays silent: it never breaks the page.
 */
import { SOUNDS, type Bus, type SoundName } from './sounds'
import { store } from './storage'

type AnyWindow = Window & { webkitAudioContext?: typeof AudioContext }
type Nav = Navigator & { audioSession?: { type: string } }

const PREF_KEY = 'ocean-sound'

interface LoopHandle {
  out: GainNode
  stop: (fade?: number) => void
}

const nextTask = () => new Promise<void>((r) => setTimeout(r, 0))

class SoundEngine {
  ctx: AudioContext | null = null
  private master!: GainNode
  /** between master and compressor: the whole mix steps back while the visitor chats with the agent */
  private duckGain!: GainNode
  private buses = {} as Record<Bus, GainNode>
  private musicFilter!: BiquadFilterNode
  private surfFilter!: BiquadFilterNode
  private buffers = new Map<SoundName, AudioBuffer>()
  private loading = new Map<SoundName, Promise<void>>()
  private loops = new Map<SoundName, LoopHandle>()
  private active = new Set<AudioBufferSourceNode>()
  private unlocked = false
  private listeners = new Set<(on: boolean) => void>()
  private lastSurf = -1
  /** the first-gesture callback, to arm it again if an unlock didn't take */
  private rearm: (() => void) | null = null
  private armed = false
  /** intent: sound on, unless the visitor muted it this session */
  wanted: boolean

  constructor() {
    this.wanted = store.get(PREF_KEY, 'session') !== '0'
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return
      if (document.hidden) void this.ctx.suspend().catch(() => {})
      else if (this.enabled) void this.ctx.resume().catch(() => {})
    })
  }

  get enabled(): boolean {
    return !!this.wanted && this.unlocked
  }

  onChange(fn: (on: boolean) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn(this.enabled))
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    const AC = window.AudioContext || (window as AnyWindow).webkitAudioContext
    if (!AC) return null
    try {
      const ctx = new AC({ latencyHint: 'interactive' })
      this.ctx = ctx
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -10
      comp.knee.value = 6
      comp.ratio.value = 4
      comp.attack.value = 0.004
      comp.release.value = 0.2
      comp.connect(ctx.destination)
      this.master = ctx.createGain()
      this.master.gain.value = 0
      this.duckGain = ctx.createGain()
      this.master.connect(this.duckGain).connect(comp)
      for (const b of ['sfx', 'ui', 'amb', 'music'] as Bus[]) this.buses[b] = ctx.createGain()
      this.buses.sfx.connect(this.master)
      this.buses.ui.connect(this.master)
      this.surfFilter = ctx.createBiquadFilter()
      this.surfFilter.type = 'lowpass'
      this.surfFilter.frequency.value = 700
      this.surfFilter.Q.value = 0.4
      this.buses.amb.connect(this.master)
      this.musicFilter = ctx.createBiquadFilter()
      this.musicFilter.type = 'lowpass'
      this.musicFilter.frequency.value = 18000
      this.musicFilter.Q.value = 0.5
      this.buses.music.connect(this.musicFilter).connect(this.master)
      return ctx
    } catch {
      return null
    }
  }

  /** Renders the sounds once (OfflineAudioContext). Needs no gesture: the live context may still be suspended. */
  preload(names: SoundName[], onProgress?: (done: number, total: number) => void): Promise<void> {
    const ctx = this.ensure()
    const OAC = (window as Window & { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext
    if (!ctx || !OAC) {
      onProgress?.(names.length, names.length)
      return Promise.resolve()
    }
    let done = 0
    const total = names.length
    let chain = Promise.resolve()
    const tasks = names.map((n) => {
      const p =
        this.loading.get(n) ??
        (chain = chain.then(async () => {
          try {
            await nextTask() // one recipe per task: the splash keeps drawing
            const def = SOUNDS[n]
            const off = new OAC(def.channels, Math.ceil(def.dur * def.rate), def.rate)
            def.render(off, off.destination)
            const buf = await off.startRendering()
            normalize(buf)
            this.buffers.set(n, buf)
          } catch (err) {
            console.warn(`[ocean] sound "${n}" unavailable`, err)
          }
        }))
      this.loading.set(n, p)
      return p.then(() => onProgress?.(++done, total))
    })
    return Promise.all(tasks).then(() => undefined)
  }

  /**
   * Call ALWAYS synchronously inside a click, tap or key (user activation). `explicit`: the visitor turned sound on
   * on purpose (the button), so on iOS it plays even with the silent switch on.
   */
  unlock(want: boolean, explicit = false): void {
    this.wanted = want
    store.set(PREF_KEY, want ? '1' : '0', 'session')
    const ctx = this.ensure()
    if (!ctx) return
    if (explicit) {
      try {
        const nav = navigator as Nav
        if (nav.audioSession) nav.audioSession.type = 'playback'
      } catch {
        /* noop */
      }
    }
    if (want) {
      void ctx.resume().catch(() => {})
      // a silent buffer: the classic iOS unlock
      const b = ctx.createBuffer(1, 1, 22050)
      const s = ctx.createBufferSource()
      s.buffer = b
      s.connect(ctx.destination)
      s.start(0)
      this.unlocked = true
      this.master.gain.cancelScheduledValues(ctx.currentTime)
      this.master.gain.setTargetAtTime(1, ctx.currentTime, 0.05)
      this.verifyRunning()
    }
    this.emit()
  }

  /** A gesture that doesn't count as activation leaves the context suspended: don't pretend "Sound on". */
  private verifyRunning(): void {
    const ctx = this.ctx
    if (!ctx) return
    window.setTimeout(() => {
      if (!this.unlocked || ctx.state === 'running' || document.hidden) return
      this.unlocked = false
      this.emit()
      if (this.rearm) this.armFirstGesture(this.rearm)
    }, 1500)
  }

  /** Tries to play without a gesture. True if the browser allowed it. Never throws. */
  async autoplay(timeoutMs = 450): Promise<boolean> {
    if (!this.wanted) return false
    if (this.unlocked) return this.enabled
    const ctx = this.ensure()
    if (!ctx) return false
    if (ctx.state !== 'running') {
      const policy = (navigator as Navigator & { getAutoplayPolicy?: (t: string) => string }).getAutoplayPolicy?.('audiocontext')
      if (policy === 'disallowed') return false
      try {
        await Promise.race([ctx.resume(), new Promise((r) => window.setTimeout(r, timeoutMs))])
      } catch {
        /* blocked */
      }
    }
    if (ctx.state !== 'running' || this.unlocked || !this.wanted) return this.enabled
    this.unlocked = true
    this.master.gain.cancelScheduledValues(ctx.currentTime)
    this.master.gain.setTargetAtTime(1, ctx.currentTime, 0.05)
    this.emit()
    return true
  }

  /** Is sound really playing (context running, not muted)? */
  get audible(): boolean {
    return this.enabled && this.ctx?.state === 'running'
  }

  /** `resume()` is async: anything scheduled against the audio clock waits for this. */
  whenRunning(timeoutMs = 3000): Promise<boolean> {
    const ctx = this.ctx
    if (!ctx) return Promise.resolve(false)
    if (ctx.state === 'running') return Promise.resolve(true)
    return new Promise((resolve) => {
      const done = (ok: boolean) => {
        ctx.removeEventListener('statechange', on)
        window.clearTimeout(timer)
        resolve(ok)
      }
      const on = () => ctx.state === 'running' && done(true)
      const timer = window.setTimeout(() => done(ctx.state === 'running'), timeoutMs)
      ctx.addEventListener('statechange', on)
    })
  }

  /** The toggle in the interface (also a gesture). */
  setEnabled(on: boolean): void {
    if (on && !this.unlocked) {
      this.unlock(true, true)
      return
    }
    if (on) {
      try {
        const nav = navigator as Nav
        if (nav.audioSession) nav.audioSession.type = 'playback'
      } catch {
        /* noop */
      }
    }
    this.wanted = on
    store.set(PREF_KEY, on ? '1' : '0', 'session')
    const ctx = this.ctx
    if (ctx) {
      if (on) void ctx.resume().catch(() => {})
      this.master.gain.cancelScheduledValues(ctx.currentTime)
      this.master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.12)
    }
    this.emit()
  }

  private canPlay(): boolean {
    return !!this.ctx && this.enabled && this.ctx.state === 'running'
  }

  /** One shot. `at` is absolute audio-clock time; if it has passed, playback starts inside the buffer (sync). */
  play(name: SoundName, opts: { at?: number; delay?: number; gain?: number; rate?: number } = {}): void {
    if (!this.canPlay()) return
    const ctx = this.ctx!
    const buf = this.buffers.get(name)
    if (!buf) return
    const def = SOUNDS[name]
    const src = ctx.createBufferSource()
    src.buffer = buf
    if (opts.rate) src.playbackRate.value = opts.rate
    const g = ctx.createGain()
    g.gain.value = def.gain * (opts.gain ?? 1)
    src.connect(g).connect(this.buses[def.bus])
    const now = ctx.currentTime
    const t = opts.at ?? now + (opts.delay ?? 0)
    const rate = opts.rate ?? 1
    if (t < now && (now - t) * rate >= buf.duration - 0.05) return
    const offset = t < now ? (now - t) * rate : 0
    src.start(Math.max(now, t), offset)
    this.active.add(src)
    src.onended = () => this.active.delete(src)
  }

  now(): number | null {
    return this.ctx ? this.ctx.currentTime : null
  }

  /** A loop with a manual crossfade. */
  loop(name: SoundName, opts: { volume?: number; fadeIn?: number; xfade?: number } = {}): void {
    const ctx = this.ctx
    if (!ctx || this.loops.has(name)) return
    const buf = this.buffers.get(name)
    if (!buf) return
    const def = SOUNDS[name]
    const xfade = Math.min(opts.xfade ?? 1.5, buf.duration / 3)
    const out = ctx.createGain()
    out.gain.value = 0
    if (name === 'surf') out.connect(this.surfFilter).connect(this.buses.amb)
    else out.connect(this.buses[def.bus])
    out.gain.setTargetAtTime(def.gain * (opts.volume ?? 1), ctx.currentTime, (opts.fadeIn ?? 1) / 3)
    let stopped = false
    let timer = 0
    const sources = new Set<AudioBufferSourceNode>()
    const spawn = (startAt: number, first: boolean) => {
      if (stopped) return
      const src = ctx.createBufferSource()
      src.buffer = buf
      const g = ctx.createGain()
      src.connect(g).connect(out)
      const d = buf.duration
      if (first) g.gain.setValueAtTime(1, startAt)
      else {
        g.gain.setValueAtTime(0, startAt)
        g.gain.linearRampToValueAtTime(1, startAt + xfade)
      }
      g.gain.setValueAtTime(1, startAt + d - xfade)
      g.gain.linearRampToValueAtTime(0, startAt + d)
      src.start(Math.max(ctx.currentTime, startAt))
      src.stop(startAt + d + 0.05)
      sources.add(src)
      src.onended = () => sources.delete(src)
      const nextAt = startAt + d - xfade
      timer = window.setTimeout(() => spawn(Math.max(nextAt, ctx.currentTime + 0.02), false), Math.max(0, (nextAt - ctx.currentTime - 0.6) * 1000))
    }
    spawn(ctx.currentTime + 0.03, true)
    this.loops.set(name, {
      out,
      stop: (fade = 1) => {
        stopped = true
        clearTimeout(timer)
        const t = ctx.currentTime
        out.gain.cancelScheduledValues(t)
        out.gain.setTargetAtTime(0, t, fade / 3)
        sources.forEach((s) => {
          try {
            s.stop(t + fade + 0.1)
          } catch {
            /* already stopped */
          }
        })
        this.loops.delete(name)
      },
    })
  }

  stopLoop(name: SoundName, fade = 1): void {
    this.loops.get(name)?.stop(fade)
  }

  isLooping(name: SoundName): boolean {
    return this.loops.has(name)
  }

  /** Cuts the one-shots in flight (when the intro is skipped). */
  stopOneShots(fade = 0.15): void {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    const bus = this.buses.sfx.gain
    bus.cancelScheduledValues(t)
    bus.setTargetAtTime(0, t, fade / 3)
    this.active.forEach((s) => {
      try {
        s.stop(t + fade + 0.05)
      } catch {
        /* noop */
      }
    })
    this.active.clear()
    bus.setTargetAtTime(1, t + fade + 0.1, 0.05)
  }

  /** Depth: the music's filter and level by section (reading vs. scene). */
  setDepth(cutoff: number, musicVolume = 1, time = 0.8): void {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    this.musicFilter.frequency.cancelScheduledValues(t)
    this.musicFilter.frequency.setTargetAtTime(cutoff, t, time / 3)
    this.buses.music.gain.cancelScheduledValues(t)
    this.buses.music.gain.setTargetAtTime(musicVolume, t, time / 3)
  }

  /** The site's mix steps back while a conversation is open (the visitor reads and types in peace). */
  duck(on: boolean, time = 0.6): void {
    const ctx = this.ctx
    if (!ctx || !this.duckGain) return
    const t = ctx.currentTime
    this.duckGain.gain.cancelScheduledValues(t)
    this.duckGain.gain.setTargetAtTime(on ? 0 : 1, t, time / 3)
  }

  /** The surf opens with the scroll speed (0..1): the sea answers when the page moves. Called every frame; it only
   *  schedules when the value really moves. */
  setSurf(v: number): void {
    const ctx = this.ctx
    const h = this.loops.get('surf')
    if (!ctx || !h || !this.enabled) return
    const k = Math.min(1, Math.max(0, v))
    if (Math.abs(k - this.lastSurf) < 0.01 && !(k === 0 && this.lastSurf !== 0)) return
    this.lastSurf = k
    const t = ctx.currentTime
    h.out.gain.setTargetAtTime(SOUNDS.surf.gain * (0.55 + k * 0.45), t, 0.2)
    this.surfFilter.frequency.setTargetAtTime(700 + k * 2600, t, 0.25)
  }

  /**
   * When the browser didn't let the page play at load, sound starts with the first click or tap on the page. Listens
   * to `click`, not `pointerdown`: a touch pointerdown is not an activation (iOS and Chrome won't resume audio there)
   * and a scroll makes no click. Never a key: a keyboard or screen-reader visitor's first Tab must not start music
   * over their speech. Never a form, the language switch or "skip intro": those taps mean something else. The sound
   * button handles itself.
   */
  armFirstGesture(onUnlocked: () => void = () => {}): void {
    this.rearm = onUnlocked
    if (!this.wanted || this.unlocked || this.armed) return
    this.armed = true
    const off = () => {
      this.armed = false
      window.removeEventListener('click', handler, true)
    }
    const handler = (e: Event) => {
      if (this.unlocked || !this.wanted) return off()
      const t = e.target as Element | null
      if (t?.closest?.('[data-sound-toggle], .intro__skip, .lang, form, input, textarea, select, label, .chat')) return
      // a click the keyboard made (Enter on a link) is not a tap on the page
      if (e instanceof MouseEvent && e.detail === 0) return
      off()
      this.unlock(true)
      onUnlocked()
    }
    window.addEventListener('click', handler, true)
  }
}

/** Peak to −1 dBFS, like a mastered file. */
function normalize(buf: AudioBuffer): void {
  let peak = 0
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i])
      if (v > peak) peak = v
    }
  }
  if (peak < 1e-6) return
  const k = 0.891 / peak
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < d.length; i++) d[i] *= k
  }
}

export const sound = new SoundEngine()
