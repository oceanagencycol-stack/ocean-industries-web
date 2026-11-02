/**
 * The night sea's animatable state. It lives apart from stage.ts so the intro and the scroll scenes can import it
 * without pulling three.js into the first bundle. GSAP moves these numbers; the stage's loop applies them.
 */
export interface StageState {
  // ---- the intro (0–7.6 s): a drop wakes the water, a swell builds and breaks, the glass rises out of it
  sea: number // 0→1 the plankton wakes: the sea's glow fades in from the horizon
  dropAt: number // seconds of scene time when the first drop fell (-1: none)
  swell: number // 0..1 the big wave's height
  crest: number // 0..1 where the big wave is: 0 = far out, 1 = at the glass
  breaking: number // 0..1 the wave breaks: its white water glows green (the result)
  rise: number // 0→1 the glass rises out of the water
  sprayAt: number // seconds of scene time when the spray burst (-1: none)
  flash: number // a peak of light (bloom and the glass's own glow)
  sweep: number // 0→1 a light passing over the glass, left to right
  env: number // the studio's strength (reflections in the glass)
  backdrop: number // the blue haze behind the glass
  settle: number // the last small turn into rest
  dolly: number // 0 = camera far, 1 = final framing
  // ---- composition
  wordShift: number // lifts the glass so the line under it (intro) has room
  layout: number // 0 = centred (intro), 1 = the hero's place
  away: number // 0..1 the glass leaves upward (the wave scene)
  dive: number // 0..1 the camera comes down to the water (the wave scene)
  calm: number // 0..1 a quieter, dimmer sea (reading)
  spin: number // extra turn from the scroll
  lift: number // vertical offset from the scroll (a fraction of the visible height)
  interactive: number // 0..1 answer to the pointer and the gyroscope
  // ---- live
  pulse: number // the agent answered: a ring of blue light runs out from under the glass (set to 1, decays)
  result: number // 0..1 something landed (a payment, a booking): green light on the water
  dock: number // 0..1 the glass steps aside for the conversation panel
}

export function initialState(): StageState {
  return {
    sea: 0,
    dropAt: -1,
    swell: 0,
    crest: 0,
    breaking: 0,
    rise: 0,
    sprayAt: -1,
    flash: 0,
    sweep: 0,
    env: 0,
    backdrop: 0,
    settle: 0,
    dolly: 0,
    wordShift: 0,
    layout: 0,
    away: 0,
    dive: 0,
    calm: 0,
    spin: 0,
    lift: 0,
    interactive: 0,
    pulse: 0,
    result: 0,
    dock: 0,
  }
}

/** The final pose (the glass over a calm, awake sea, in the hero) for visits without the intro, or when skipped. */
export function finalState(): StageState {
  return {
    ...initialState(),
    sea: 1,
    rise: 1,
    sweep: 1,
    env: 1,
    backdrop: 1,
    settle: 1,
    dolly: 1,
    layout: 1,
    interactive: 1,
  }
}
