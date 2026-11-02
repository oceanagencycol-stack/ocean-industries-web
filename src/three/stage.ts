/**
 * The night sea of the Colombian Pacific with the Ocean wordmark in glass (the site's one signature), built on Qora's
 * stage (same pipeline and rules, via CALPRO's).
 *
 * The sea is plankton that glows where the water moves (sea.ts): with the waves, under the visitor's pointer, around
 * the glass. The wordmark is physical glass (MeshPhysicalMaterial with transmission, dispersion and IOR), one mesh
 * per piece, that rises out of the water in the intro (a clipping plane at the waterline hides what is still under).
 * Behind it, the night sky with a blue haze on the horizon that the glass refracts; a studio of our own for its
 * reflections (PMREM of emissive panels: no HDR file, no network); one post pass (bloom → chromatic aberration, tone
 * mapping, vignette and grain).
 *
 * Colour has a job here as on the page: glass = the person (who writes, who decides), Klein blue = the machine (the
 * plankton's light, the agent's answer, the crest of the wave), green = the result (the white water when the wave
 * breaks, the water under the glass when something lands). Nothing else is green.
 *
 * Everything animatable lives in `state` (plain numbers): GSAP moves them, the loop applies them. Building and
 * warming up run in short tasks (`nextTask` in between), and shaders compile off the main thread where the browser
 * has KHR_parallel_shader_compile.
 */
import {
  BackSide,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  Group,
  HalfFloatType,
  MathUtils,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Timer,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import type { Tier } from '../core/device'
import { buildWordmark, WORD_W, type Piece, type PieceId } from './wordmark'
import { Sea } from './sea'
import { finalState, initialState, type StageState } from './state'
export type { StageState } from './state'
export { initialState, finalState } from './state'

/* ------------------------------------------------------------------ */
/*  Palette (Color converts from sRGB to linear on its own)            */
/* ------------------------------------------------------------------ */
const KLEIN = new Color('#0000FF')
const PLANKTON = new Color('#3D63FF')
const CYAN = new Color('#8FE3FF')
const GREEN = new Color('#00FF7F')
const FOAM = new Color('#F4F5F0')
const WHITE = new Color('#ffffff')
/** the page's night (styles: --night); the canvas paints it where nothing else is */
export const NIGHT_HEX = '#050A14'
const NIGHT = new Color(NIGHT_HEX)
/** the same night as the screen shows it (sRGB, 0–1): the last pass lands the ground exactly on it */
const NIGHT_OUT = new Vector3(0x05 / 255, 0x0a / 255, 0x14 / 255)
const SKY_TOP = new Color('#03060D')
const HORIZON = new Color('#081236')

/* ------------------------------------------------------------------ */
/*  Quality by tier                                                    */
/* ------------------------------------------------------------------ */
interface Quality {
  dpr: number
  msaa: number
  bloomScale: number
  transmissionScale: number
  curve: number
  bevel: number
  points: number
  dispersion: number
  doubleSided: boolean
}

/** ?dpr=0.5 in the URL: QA on machines without a GPU (lowers the render cost without changing the choreography). */
const forcedDpr = (): number => (typeof location !== 'undefined' ? Number(new URLSearchParams(location.search).get('dpr')) : NaN)

/** A cap on the canvas's pixels (megapixels): grain, bloom and aberration hide the difference, the GPU doesn't. */
function pixelBudget(tier: Tier, mobile: boolean): number {
  if (mobile) return 2.0e6
  return tier === 'high' ? 4.0e6 : tier === 'mid' ? 2.8e6 : 1.8e6
}

function qualityFor(tier: Tier, mobile: boolean, cssPixels: number): Quality {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const q = qualityBase(tier, dpr, mobile)
  const forced = forcedDpr()
  if (forced > 0) return { ...q, dpr: forced }
  const cap = Math.sqrt(pixelBudget(tier, mobile) / Math.max(1, cssPixels))
  return { ...q, dpr: Math.min(q.dpr, Math.max(mobile ? 0.8 : 0.9, Math.round(cap * 20) / 20)) }
}

/** No MSAA on phones: at a DPR of 1.5 the edge is clean, and multisampling half-float buffers is costly there. */
function qualityBase(tier: Tier, dpr: number, mobile: boolean): Quality {
  switch (tier) {
    case 'high':
      return { dpr: Math.min(dpr, mobile ? 1.6 : 2), msaa: mobile ? 0 : 4, bloomScale: 0.5, transmissionScale: mobile ? 0.75 : 1, curve: 14, bevel: 4, points: mobile ? 30000 : 64000, dispersion: 0.45, doubleSided: !mobile }
    case 'mid':
      return { dpr: Math.min(dpr, mobile ? 1.5 : 1.6), msaa: mobile ? 0 : 2, bloomScale: 0.5, transmissionScale: mobile ? 0.6 : 0.75, curve: 10, bevel: 3, points: mobile ? 24000 : 44000, dispersion: 0.25, doubleSided: false }
    default:
      return { dpr: Math.min(dpr, 1.25), msaa: 0, bloomScale: 0.4, transmissionScale: 0.5, curve: 7, bevel: 2, points: 18000, dispersion: 0, doubleSided: false }
  }
}

/* ------------------------------------------------------------------ */
/*  Shaders                                                            */
/* ------------------------------------------------------------------ */
const skyVert = /* glsl */ `
varying vec2 vUv; varying vec3 vWorld;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

/**
 * The night sky. The horizon is found from each pixel's direction (not from the plane's uv), so it stays where the
 * sea meets the sky whatever the camera does. A thin line of far plankton on it, and behind the glass a blue haze
 * with a small spot of green: what the glass refracts (glass in front of plain black reads as nothing).
 */
const skyFrag = /* glsl */ `
uniform float uTime; uniform float uIntensity; uniform float uFlash; uniform float uAspect;
uniform vec2 uCenter; uniform float uBlobScale; uniform float uResult;
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBlue; uniform vec3 uGreen; uniform vec3 uNight;
varying vec2 vUv; varying vec3 vWorld;
float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
float blob(vec2 uv, vec2 c, float r){ vec2 d = uv - c; d.x *= uAspect; r *= uBlobScale; return exp(-dot(d, d) / (r * r)); }
void main(){
  vec3 dir = normalize(vWorld - cameraPosition);
  float h = dir.y;
  vec3 col = mix(uHorizon, uTop, smoothstep(-0.01, 0.34, h));
  // below the horizon: the far sea, darker than the sky
  col = mix(col, uNight * 0.9, 1.0 - smoothstep(-0.04, 0.0, h));
  // the far plankton: a thin luminous line where sea meets sky
  col += uBlue * exp(-abs(h + 0.004) * 160.0) * 0.07 * uIntensity;
  // the haze behind the glass, slowly drifting
  float t = uTime;
  vec2 q = uCenter;
  vec2 c1 = q + vec2(-0.06 + 0.03 * sin(t * 0.11), 0.02 + 0.02 * cos(t * 0.13));
  vec2 c2 = q + vec2(0.08 + 0.02 * cos(t * 0.15), -0.04 + 0.02 * sin(t * 0.17));
  vec2 c3 = q + vec2(0.11 + 0.02 * sin(t * 0.09 + 1.7), -0.09 + 0.012 * cos(t * 0.21));
  col += uBlue * blob(vUv, q, 0.24) * 0.03 * uIntensity;
  col += uBlue * blob(vUv, c1, 0.11) * 0.22 * uIntensity;
  col += uBlue * blob(vUv, c2, 0.075) * 0.16 * uIntensity;
  col += uGreen * blob(vUv, c3, 0.04) * uResult * 0.5 * uIntensity;
  col *= 1.0 + uFlash * 0.4;
  col = max(col, uNight * 0.6);
  col += (hash(gl_FragCoord.xy + t) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * The last pass, straight to the screen: chromatic aberration on linear HDR, then tone mapping (Neutral: it keeps the
 * Klein blue blue) and sRGB with three's chunks, then vignette and grain. The ground is the page's own: a pixel of
 * pure night comes out as the CSS --night, so the canvas and the page meet without a seam.
 */
const finalFxShader = {
  uniforms: {
    tDiffuse: { value: null as Texture | null },
    uTime: { value: 0 },
    uGrain: { value: 0.035 },
    uCA: { value: 0.0012 },
    uVignette: { value: 0.55 },
    uRes: { value: new Vector2(1, 1) },
    uNight: { value: NIGHT.clone() },
    uNightOut: { value: NIGHT_OUT.clone() },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; uniform float uCA; uniform float uVignette; uniform vec2 uRes;
uniform vec3 uNight; uniform vec3 uNightOut;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = vUv;
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  vec2 off = c * uCA * (0.35 + r2 * 2.4);
  vec3 col;
  col.r = texture2D(tDiffuse, uv + off).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - off).b;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  vec4 ground = vec4(uNight, 1.0);
  #if defined( TONE_MAPPING )
  ground.rgb = toneMapping(ground.rgb);
  #endif
  ground = linearToOutputTexel(ground);
  vec3 o = gl_FragColor.rgb - ground.rgb + uNightOut;
  float vig = 1.0 - smoothstep(0.25, 0.95, length(c * vec2(1.0, 1.1)) * 1.2);
  o = mix(uNightOut, o, mix(1.0, vig, uVignette));
  float g = hash(uv * uRes + fract(uTime * 7.31) * vec2(113.0, 271.0)) - 0.5;
  gl_FragColor = vec4(o + g * uGrain, 1.0);
}
`,
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const lerp = MathUtils.lerp
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)
const smooth = (x: number) => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

function nextTask(): Promise<void> {
  const sch = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  return sch?.yield ? sch.yield() : new Promise((r) => setTimeout(r, 0))
}

/** A full-screen triangle exactly like three's passes (position and uv only): to compile the post passes ahead. */
const FS_CAM = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
const FS_GEO = new BufferGeometry()
FS_GEO.setAttribute('position', new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3))
FS_GEO.setAttribute('uv', new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2))

function glass(q: Quality, clip: Plane, o: { tint?: Color; attenuation?: number; thickness?: number; roughness?: number; ior?: number } = {}): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: o.tint ? o.tint.clone() : WHITE.clone(),
    metalness: 0,
    roughness: o.roughness ?? 0.04,
    transmission: 1,
    thickness: o.thickness ?? 0.55,
    ior: o.ior ?? 1.5,
    dispersion: q.dispersion,
    attenuationColor: o.tint ? o.tint.clone() : WHITE.clone(),
    attenuationDistance: o.attenuation ?? 4,
    clearcoat: 0.6,
    clearcoatRoughness: 0.05,
    specularIntensity: 1,
    envMapIntensity: 1.5,
    side: q.doubleSided ? DoubleSide : FrontSide,
    clippingPlanes: [clip],
    transparent: false,
  })
}

/** The studio: emissive HDR panels captured in a PMREM. No files, no network. */
function studioEnvironment(renderer: WebGLRenderer): Texture {
  const env = new Scene()
  env.background = new Color(0x010103)
  const plane = new PlaneGeometry(1, 1)
  const mats: MeshBasicMaterial[] = []
  const panel = (color: Color, k: number, pos: [number, number, number], rot: [number, number, number], scale: [number, number]) => {
    const m = new MeshBasicMaterial({ color: color.clone().multiplyScalar(k), side: DoubleSide, toneMapped: false })
    mats.push(m)
    const mesh = new Mesh(plane, m)
    mesh.position.set(...pos)
    mesh.rotation.set(...rot)
    mesh.scale.set(scale[0], scale[1], 1)
    env.add(mesh)
  }
  panel(FOAM, 3.2, [0, 6, 0.5], [Math.PI / 2, 0, 0], [6, 6]) // the moonlight, from above
  panel(WHITE, 7, [-5.2, 0.4, 1.2], [0, Math.PI / 2, 0], [0.3, 8]) // left strip
  panel(WHITE, 6, [5.2, 0.6, -1.4], [0, -Math.PI / 2, 0], [0.3, 8]) // right strip
  panel(WHITE, 1.6, [0, 1.2, -6.5], [0, 0, 0], [11, 1.0]) // back
  panel(KLEIN, 5, [3.6, -1.4, 3.2], [0, -Math.PI / 4, 0], [2.8, 2.8]) // the sea's blue, from below right
  panel(PLANKTON, 4, [0, -4.5, 0], [-Math.PI / 2, 0, 0], [9, 9]) // the lit water under the glass
  panel(GREEN, 2.2, [-3.8, -2.2, 2.6], [0, Math.PI / 4, 0], [1.2, 0.45]) // a strip of green
  panel(WHITE, 0.9, [0, -0.2, 7.5], [0, Math.PI, 0], [7, 3]) // front fill
  panel(WHITE, 4, [0, 2.6, 6.5], [-0.35, Math.PI, 0], [7, 0.55]) // a window of light, front and high: the faces catch it
  const pmrem = new PMREMGenerator(renderer)
  const rt = pmrem.fromScene(env, 0.025)
  pmrem.dispose()
  plane.dispose()
  mats.forEach((m) => m.dispose())
  return rt.texture
}

/* ------------------------------------------------------------------ */
/*  Stage                                                              */
/* ------------------------------------------------------------------ */
export class Stage {
  readonly state: StageState = initialState()
  readonly canvas: HTMLCanvasElement
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(34, 1, 0.1, 200)
  private composer!: EffectComposer
  private bloom!: UnrealBloomPass
  private fx!: ShaderPass
  private timer = new Timer()
  private time = 0
  private raf = 0
  private running = false
  private visible = true
  /** the canvas's CSS opacity as last written; -1 until the first setOpacity() (the CSS starts it at 0) */
  private opacity = -1
  private q: Quality
  private tier: Tier
  private onTierChange?: (t: Tier) => void

  private word = new Group()
  private wordH = 1.58
  private pieces = new Map<PieceId, { mesh: Mesh; piece: Piece }>()
  private matBig!: MeshPhysicalMaterial
  private matSmall!: MeshPhysicalMaterial
  private clip = new Plane(new Vector3(0, 1, 0), 0)
  private sky!: Mesh<PlaneGeometry, ShaderMaterial>
  private sea!: Sea

  private pointer = new Vector2()
  private pointerTarget = new Vector2()
  private impulse = 0
  private aspect = 1
  private frameTimes: number[] = []
  private ray = new Raycaster()
  private mobile: boolean
  private maxDpr: number
  private minDpr: number
  private lastSize = ''
  private warm = 0
  private liteGlass = false
  private lastSig = 0
  private lastActive = 0
  private idleAcc = 0
  private oddFrame = false
  private lastNow = 0
  private vsync = 16.7
  private lastRender = -1e9
  private compiling = false
  private pulseAge = -1
  private tmpV = new Vector3()
  private tmpV2 = new Vector3()
  private waterPlane = new Plane(new Vector3(0, 1, 0), 0)
  private zPlane = new Plane(new Vector3(0, 0, 1), 0)

  constructor(canvas: HTMLCanvasElement, tier: Tier, opts: { mobile?: boolean } = {}, onTierChange?: (t: Tier) => void) {
    this.canvas = canvas
    this.tier = tier
    this.mobile = !!opts.mobile
    const cssPx = (canvas.clientWidth || window.innerWidth) * (canvas.clientHeight || window.innerHeight)
    this.q = qualityFor(tier, this.mobile, cssPx)
    this.maxDpr = this.q.dpr
    this.minDpr = forcedDpr() > 0 ? this.q.dpr : Math.min(this.q.dpr, this.mobile ? 0.8 : 0.9)
    this.onTierChange = onTierChange
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true })
    this.renderer.setClearColor(NIGHT, 1)
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = NeutralToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.transmissionResolutionScale = this.q.transmissionScale
    this.renderer.localClippingEnabled = true
    this.scene.background = NIGHT.clone()
  }

  /* ---------------- building ---------------- */
  async init(): Promise<void> {
    const q = this.q
    // the glass glows a little from inside, as if the plankton lit it: script letters in clear glass over a dark sea
    // read as nothing; this way the word reads first and the glass shows in its edges and refractions
    this.matBig = glass(q, this.clip, { tint: new Color('#D3E0FF'), attenuation: 1.4, thickness: 0.9, roughness: 0.1 })
    this.matBig.emissive = new Color('#8FA8FF')
    this.matSmall = glass(q, this.clip, { tint: FOAM, attenuation: 5, thickness: 0.3, roughness: 0.12 })
    this.matSmall.emissive = FOAM.clone()

    const { pieces, height } = await buildWordmark({ bevelSegments: q.bevel, curveSegments: q.curve })
    this.wordH = height
    for (const piece of pieces) {
      const mesh = new Mesh(piece.geometry, piece.id === 'o' || piece.id === 'cean' ? this.matBig : this.matSmall)
      mesh.name = `ocean-${piece.id}`
      mesh.position.copy(piece.center)
      this.word.add(mesh)
      this.pieces.set(piece.id, { mesh, piece })
    }
    this.scene.add(this.word)
    await nextTask()

    // the night sky, fixed to the camera so it always fills the view
    const skyMat = new ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uFlash: { value: 0 },
        uAspect: { value: 1 },
        uCenter: { value: new Vector2(0.5, 0.5) },
        uBlobScale: { value: 1 },
        uResult: { value: 0 },
        uTop: { value: SKY_TOP.clone() },
        uHorizon: { value: HORIZON.clone() },
        uBlue: { value: KLEIN.clone() },
        uGreen: { value: GREEN.clone() },
        uNight: { value: NIGHT.clone() },
      },
      depthWrite: false,
    })
    this.sky = new Mesh(new PlaneGeometry(1, 1), skyMat)
    this.sky.position.z = -150
    this.sky.renderOrder = -10
    this.sky.frustumCulled = false
    this.camera.add(this.sky)
    this.scene.add(this.camera)
    await nextTask()

    // the sea of plankton and the spray
    this.sea = new Sea({ count: q.points, pixelRatio: q.dpr, blue: PLANKTON, cyan: CYAN, green: GREEN })
    this.scene.add(this.sea.points)
    this.scene.add(this.sea.spray)

    this.buildComposer()
    this.resize()
  }

  private buildComposer(): void {
    const q = this.q
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: q.msaa })
    this.composer = new EffectComposer(this.renderer, target)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new Vector2(256, 256), 0.8, 0.55, 0.62)
    // bloom is blurry by nature: run it at CSS resolution × bloomScale, not at the DPR's
    const bloomSetSize = this.bloom.setSize.bind(this.bloom)
    this.bloom.setSize = (w: number, h: number) => {
      const k = (this.q.bloomScale * 2) / this.q.dpr
      bloomSetSize(Math.max(64, Math.round(w * k)), Math.max(64, Math.round(h * k)))
    }
    this.composer.addPass(this.bloom)
    // no OutputPass: tone mapping and sRGB live in finalFxShader, which must stay the last pass
    this.fx = new ShaderPass(finalFxShader)
    this.composer.addPass(this.fx)
  }

  /** Environment, shaders and a performance check before the glass shows, in short tasks. */
  async warmup(onProgress?: (p: number) => void): Promise<void> {
    this.scene.environment = studioEnvironment(this.renderer)
    this.scene.environmentIntensity = this.state.env
    onProgress?.(0.3)
    await nextTask()
    await this.precompile()
    onProgress?.(0.75)
    await nextTask()
    this.apply(0)
    this.composer.render(0)
    onProgress?.(0.85)
    await nextTask()
    await this.benchmark()
    onProgress?.(1)
  }

  /**
   * Compiles every program as it will be used: the scene and the bloom draw into intermediate buffers (linear, no
   * tone mapping), only the last pass draws on screen, so each group compiles with its real target set.
   */
  private async precompile(): Promise<void> {
    const r = this.renderer
    const prev = r.getRenderTarget()
    const quads = (mats: Material[]) => {
      const sc = new Scene()
      for (const m of mats) sc.add(new Mesh(FS_GEO, m))
      return sc
    }
    const sprayWas = this.sea.spray.visible
    this.sea.spray.visible = true
    try {
      r.setRenderTarget(this.composer.readBuffer)
      r.compile(this.scene, this.camera)
      const twoSided = [this.matBig, this.matSmall].filter((m) => m.side === DoubleSide)
      if (twoSided.length && !r.extensions.has('WEBGL_multisampled_render_to_texture')) {
        twoSided.forEach((m) => ((m.side = BackSide), (m.needsUpdate = true)))
        r.compile(this.word, this.camera, this.scene)
        twoSided.forEach((m) => ((m.side = DoubleSide), (m.needsUpdate = true)))
      }
      const b = this.bloom
      r.compile(quads([b.materialHighPassFilter, ...b.separableBlurMaterials, b.compositeMaterial, b.blendMaterial]), FS_CAM)
      r.setRenderTarget(null)
      r.compile(quads([this.fx.material]), FS_CAM)
    } finally {
      r.setRenderTarget(prev)
      this.sea.spray.visible = sprayWas
    }
    type Program = { isReady(): boolean; getUniforms(): unknown }
    const programs = (r.info.programs ?? []) as unknown as Program[]
    if (r.extensions.has('KHR_parallel_shader_compile')) {
      const t0 = performance.now()
      while (!programs.every((p) => p.isReady()) && performance.now() - t0 < 10000) {
        await new Promise((res) => setTimeout(res, 16))
      }
    }
    for (const p of programs.slice()) {
      p.getUniforms()
      await nextTask()
    }
  }

  /** A few frames of the final picture (the costliest) to pick the starting DPR. */
  private async benchmark(): Promise<void> {
    if (forcedDpr() > 0) return
    const gl = this.renderer.getContext()
    const saved = { ...this.state }
    Object.assign(this.state, finalState())
    const times: number[] = []
    try {
      this.apply(0)
      this.composer.render(0)
      gl.finish()
      for (let i = 0; i < 4; i++) {
        await nextTask()
        const t0 = performance.now()
        this.apply(1 / 60)
        this.composer.render(1 / 60)
        gl.finish()
        times.push(performance.now() - t0)
      }
    } catch {
      /* no measurement: keep the tier's DPR */
    }
    Object.assign(this.state, saved)
    this.apply(0)
    if (times.length < 4) return
    times.sort((a, b) => a - b)
    const ms = (times[1] + times[2]) / 2
    const budget = 10
    if (ms <= budget) return
    const dpr = MathUtils.clamp(this.q.dpr * Math.sqrt(budget / ms), this.minDpr, this.maxDpr)
    const next = Math.round(dpr * 20) / 20
    if (next < this.q.dpr - 0.01) {
      this.q = { ...this.q, dpr: next }
      this.resize(true)
    }
    if (ms * (this.minDpr / this.maxDpr) ** 2 > budget * 1.6) {
      this.lightenGlass()
      await this.precompile()
      this.composer.render(0)
    }
  }

  private lightenGlass(): void {
    if (this.liteGlass) return
    this.liteGlass = true
    for (const m of [this.matBig, this.matSmall]) {
      m.dispersion = 0
      m.side = FrontSide
      m.needsUpdate = true
    }
    this.renderer.transmissionResolutionScale = Math.min(this.q.transmissionScale, 0.5)
  }

  /* ---------------- the loop ---------------- */
  start(): void {
    if (this.running) return
    this.running = true
    this.warm = 0
    this.frameTimes.length = 0
    this.timer.update()
    this.raf = requestAnimationFrame(this.loop)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private loop = (now: number): void => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.loop)
    this.timer.update(now)
    const gap = now - this.lastNow
    this.lastNow = now
    if (gap > 2 && gap < 50) this.vsync += (gap - this.vsync) * 0.05
    if (!this.visible || this.opacity < 0.01 || this.compiling) return
    // rAF's timestamp can be earlier than start()'s performance.now(): a floor at 0, or the first delta loads the
    // impulse (a flash and a turn nobody asked for)
    const dt = MathUtils.clamp(this.timer.getDelta(), 0, 0.05)
    this.time += dt
    // the sea always moves: "at rest" means nobody touching and no tween running; then one frame in two
    const sig = this.signature()
    if (Math.abs(sig - this.lastSig) > 1e-4) this.lastActive = now
    this.lastSig = sig
    const idle = now - this.lastActive > 6000
    this.idleAcc += dt
    // 120 Hz screens and up: one refresh in two (~60 even frames, half the GPU work)
    if (this.vsync < 10.5 && now - this.lastRender < 13) return
    if (idle && (this.oddFrame = !this.oddFrame)) return
    this.lastRender = now
    const step = this.idleAcc
    this.idleAcc = 0
    this.apply(step)
    this.composer.render(step)
    if (!idle) this.govern(step)
  }

  private signature(): number {
    const s = this.state as unknown as Record<string, unknown>
    let v = this.pointerTarget.x * 3.1 + this.pointerTarget.y * 5.3 + this.impulse * 7.7 + this.opacity * 11.3 + (this.pulseAge >= 0 ? 1 : 0)
    // only the numbers: GSAP leaves its cache (`_gsap`, an object) on every object it tweens
    for (const k in s) {
      const x = s[k]
      if (typeof x === 'number') v += x * (k.length + 1)
    }
    return v + Math.abs(this.pointer.x - this.pointerTarget.x) + Math.abs(this.pointer.y - this.pointerTarget.y)
  }

  setVisible(v: boolean): void {
    this.visible = v
    this.frameTimes.length = 0
    this.warm = 0
  }

  get currentOpacity(): number {
    return this.opacity
  }

  /** The canvas's CSS opacity; under 0.01 the render pauses. Writes only when it changes. */
  setOpacity(o: number): void {
    const v = Math.round(MathUtils.clamp(o, 0, 1) * 500) / 500
    if (v === this.opacity) return
    if (this.opacity < 0.01 && v >= 0.01) {
      this.frameTimes.length = 0
      this.warm = 0
    }
    this.opacity = v
    this.canvas.style.opacity = String(v)
  }

  /** Scene time (seconds): the intro stamps the drop and the spray with it. */
  get now(): number {
    return this.time
  }

  setPointer(x: number, y: number): void {
    this.pointerTarget.set(MathUtils.clamp(x, -1, 1), MathUtils.clamp(y, -1, 1))
  }

  /** Where a screen point (NDC) meets the water; false if it looks at the sky. */
  private toWater(ndcX: number, ndcY: number, out: Vector3): boolean {
    this.ray.setFromCamera(new Vector2(ndcX, ndcY), this.camera)
    const hit = this.ray.ray.intersectPlane(this.waterPlane, out)
    return !!hit && out.z < 6 && out.z > -60
  }

  /** The visitor's pointer over the water: it leaves a glowing wake. */
  wakeAt(ndcX: number, ndcY: number, strength = 1): void {
    if (this.toWater(ndcX, ndcY, this.tmpV)) this.sea.wake(this.tmpV.x, this.tmpV.z, strength)
  }

  /** A touch: on the glass, a flash and a short turn (true); on the water, a strong ring. */
  ping(ndcX: number, ndcY: number): 'glass' | 'water' | null {
    this.ray.setFromCamera(new Vector2(ndcX, ndcY), this.camera)
    const hit = this.ray.intersectObjects([...this.pieces.values()].map((p) => p.mesh), false)
    if (hit.length) {
      this.impulse = 1
      return 'glass'
    }
    if (this.toWater(ndcX, ndcY, this.tmpV)) {
      this.sea.wake(this.tmpV.x + 1e-3, this.tmpV.z, 1)
      return 'water'
    }
    return null
  }

  /** The agent answered: a ring of blue light runs out from under the glass. */
  pulse(): void {
    this.pulseAge = 0
  }

  /* ---------------- size ---------------- */
  /** The canvas's CSS box (100vw × 100lvh), never the window: the phone's URL bar moves innerHeight on every scroll. */
  resize(force = false): void {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    const key = `${w}x${h}@${this.q.dpr}`
    if (!force && key === this.lastSize) return
    this.lastSize = key
    this.aspect = w / h
    this.camera.aspect = this.aspect
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(this.q.dpr)
    this.renderer.setSize(w, h, false)
    this.composer.setPixelRatio(this.q.dpr)
    this.composer.setSize(w, h)
    ;(this.fx.uniforms.uRes.value as Vector2).set(w * this.q.dpr, h * this.q.dpr)
    this.sea.setPixelRatio(this.q.dpr)
    // the sky fills the view at its distance, with room for the camera's moves
    const tanHalf = Math.tan(MathUtils.degToRad(this.camera.fov / 2))
    const dist = -this.sky.position.z
    const hh = 2 * tanHalf * dist * 1.3
    this.sky.scale.set(hh * this.aspect, hh, 1)
    const su = this.sky.material.uniforms
    ;(su.uAspect as { value: number }).value = this.aspect
    ;(su.uBlobScale as { value: number }).value = this.aspect < 0.9 ? 0.7 : 1
  }

  get portrait(): boolean {
    return this.aspect < 0.9
  }

  /** The world point at a screen position (NDC) on the plane z = 0, and the view's width there. */
  private placeAt(ndcX: number, ndcY: number, out: Vector3): number {
    this.ray.setFromCamera(new Vector2(ndcX, ndcY), this.camera)
    this.ray.ray.intersectPlane(this.zPlane, out)
    const d = out.distanceTo(this.camera.position)
    return 2 * Math.tan(MathUtils.degToRad(this.camera.fov / 2)) * d * this.aspect
  }

  /* ---------------- applying the state ---------------- */
  private apply(dt: number): void {
    const s = this.state
    const t = this.time
    const k = 1 - Math.exp(-dt * 4)
    this.pointer.lerp(this.pointerTarget, k)
    this.impulse = MathUtils.clamp(this.impulse - dt * 1.6, 0, 1)
    this.sea.tick(dt)
    if (this.pulseAge >= 0) {
      this.pulseAge += dt
      if (this.pulseAge > 5) this.pulseAge = -1
    }
    const portrait = this.portrait

    // --- camera: a little above the water, looking at the glass; the wave scene brings it down to the water
    const dive = smooth(s.dive)
    const pitch = portrait ? 0.104 : 0.042 // tan of the look-down: where the horizon lands on screen
    const camY = lerp(portrait ? 1.6 : 1.35, 1.05, dive)
    const camZ = 9.5 + (1 - clamp01(s.dolly)) * 2.4
    const lookZ = lerp(0, -16, dive)
    const lookY = lerp(camY - camZ * pitch, -0.35, dive)
    this.camera.position.set(this.pointer.x * 0.12 * clamp01(s.interactive), camY, camZ)
    this.camera.lookAt(0, lookY, lookZ)
    this.camera.updateMatrixWorld()

    // --- the glass's place: centred on the water (intro) → the hero's place → up and away (wave scene)
    const introFrac = portrait ? 0.86 : 0.5
    const heroFrac = portrait ? 0.84 : 0.36
    const visAtZero = 2 * Math.tan(MathUtils.degToRad(this.camera.fov / 2)) * camZ * this.aspect
    const introS = (introFrac * visAtZero) / WORD_W
    const introY = 0.12 + (introS * this.wordH) / 2 + s.wordShift * (portrait ? 0.35 : 0.42)
    const heroP = this.tmpV2
    const heroW = this.placeAt(portrait ? 0 : 0.46, portrait ? 0.47 : 0.02, heroP)
    const heroS = (heroFrac * heroW) / WORD_W
    const layout = smooth(s.layout)
    let gx = lerp(0, heroP.x, layout)
    let gy = lerp(introY, heroP.y, layout)
    let gs = lerp(introS, heroS, layout)
    const away = smooth(s.away)
    gy += away * (portrait ? 5.5 : 6.5) + s.lift * 5.8
    gs *= 1 - 0.25 * away
    const dock = portrait ? 0 : clamp01(s.dock)
    gx -= heroW * 0.22 * dock
    gs *= 1 - 0.1 * dock
    this.word.position.set(gx, gy, 0)
    this.word.scale.setScalar(gs)

    // the pieces rise out of the water one after another (the waterline clips what is still under)
    const rise = clamp01(s.rise)
    const depthUnder = this.wordH + 0.6 // in the group's units: the wordmark's height and a little more
    for (const { mesh, piece } of this.pieces.values()) {
      const p = clamp01(rise * 1.7 - piece.order * 0.23)
      const e = easeOut(p)
      mesh.position.set(piece.center.x, piece.center.y - (1 - e) * depthUnder, piece.center.z)
      mesh.rotation.set((1 - e) * 0.35, 0, (1 - e) * (piece.order % 2 ? -0.08 : 0.08))
    }
    // the waterline only while the glass comes up; afterwards nothing is clipped
    this.clip.constant = rise >= 1 ? 1e4 : 0.0

    const inter = clamp01(s.interactive)
    const settleRot = lerp(-0.3, 0.04, s.settle)
    const lk = rise
    // off-centre the camera sees the glass from the side: it turns to face the viewer, then rests a little turned
    const face = -Math.atan2(gx - this.camera.position.x, camZ) * 0.9
    this.word.rotation.y = face + settleRot * lk + this.pointer.x * 0.22 * inter + s.spin + Math.sin(this.impulse * Math.PI) * 0.45 + Math.sin(t * 0.27) * 0.05 * lk + away * 0.6
    this.word.rotation.x = -this.pointer.y * 0.14 * inter + Math.sin(t * 0.33) * 0.025 * lk - 0.03 - away * 0.25
    this.word.rotation.z = Math.sin(t * 0.41) * 0.012 * lk

    // --- glass: the flash, the agent's answer (blue), the result
    const flash = s.flash + this.impulse * 0.3
    const pulseGlow = this.pulseAge >= 0 ? Math.exp(-this.pulseAge * 2.2) : 0
    const lit = 0.16 * rise
    this.matBig.emissiveIntensity = lit + flash * 0.4 + pulseGlow * 0.45
    this.matSmall.emissiveIntensity = 0.3 * rise + flash * 0.1

    // --- the sea
    const u = this.sea.uniforms
    u.uTime.value = t
    u.uSea.value = clamp01(s.sea)
    u.uCalm.value = clamp01(s.calm)
    u.uAmp.value = 1 + clamp01(s.swell) * 0.3 * (1 - dive) + dive * 0.25
    u.uSwell.value = clamp01(s.swell)
    // the big wave comes in from far out to just in front of the glass (or of the camera, in the wave scene)
    u.uCrestZ.value = lerp(-46, lerp(1.2, 5.2, dive), clamp01(s.crest))
    u.uBreak.value = clamp01(s.breaking)
    ;(u.uDropAge as { value: number }).value = s.dropAt >= 0 ? t - s.dropAt : -1
    ;(u.uDropXZ.value as Vector2).set(gx, 0.6)
    ;(u.uPulseXZ.value as Vector2).set(gx, 0.2)
    ;(u.uPulseAge as { value: number }).value = this.pulseAge
    ;(u.uPoolXZ.value as Vector2).set(gx, 0)
    u.uPool.value = rise * (1 - away) * (portrait ? 0.6 : 1)
    u.uResult.value = clamp01(s.result)
    const sprayAge = s.sprayAt >= 0 ? t - s.sprayAt : -1
    this.sea.setSpray(gx, 0, 0, gs, sprayAge)

    // --- the light passing over the glass: the studio turns under it, left to right
    const sw = clamp01(s.sweep)
    this.scene.environmentRotation.set(0, lerp(-1.4, 0, sw) + this.pointer.x * 0.15 * inter, 0)
    this.scene.environmentIntensity = s.env * (1 + flash * 0.8 + Math.sin(sw * Math.PI) * 0.6)

    // --- the sky: the haze sits behind the glass
    const su = this.sky.material.uniforms
    this.word.getWorldPosition(this.tmpV).project(this.camera)
    ;(su.uCenter.value as Vector2).set(this.tmpV.x * 0.5 + 0.5, this.tmpV.y * 0.5 + 0.5)
    ;(su.uTime as { value: number }).value = t
    ;(su.uIntensity as { value: number }).value = s.backdrop * (1 - 0.6 * away)
    ;(su.uFlash as { value: number }).value = flash
    ;(su.uResult as { value: number }).value = clamp01(s.result)

    this.bloom.strength = 0.78 + flash * 0.4 + clamp01(s.result) * 0.15 + clamp01(s.breaking) * 0.2
    this.fx.uniforms.uTime.value = t
    this.fx.uniforms.uCA.value = 0.0011 + flash * 0.004
  }

  /* ---------------- governor: dynamic resolution ---------------- */
  private govern(dt: number): void {
    if (this.warm < 45) {
      this.warm++
      return
    }
    this.frameTimes.push(dt)
    if (this.frameTimes.length < 90) return
    const sorted = this.frameTimes.slice().sort((a, b) => a - b)
    this.frameTimes.length = 0
    const med = sorted[sorted.length >> 1]
    if (med <= 0.021) return
    if (this.q.dpr > this.minDpr + 0.01) {
      this.q = { ...this.q, dpr: Math.max(this.minDpr, Math.round(this.q.dpr * 0.85 * 20) / 20) }
      this.resize(true)
      this.warm = 0
      this.onTierChange?.(this.tier)
    } else if (!this.liteGlass) {
      this.lightenGlass()
      this.tier = 'low'
      this.onTierChange?.(this.tier)
      this.compiling = true
      void this.precompile()
        .catch(() => {})
        .finally(() => {
          this.compiling = false
          this.frameTimes.length = 0
          this.warm = 0
        })
    }
  }

  get currentTier(): Tier {
    return this.tier
  }

  get currentDpr(): number {
    return this.q.dpr
  }

  /** Screen anchor (px) of the glass's centre, for DOM labels. */
  anchor(): { x: number; y: number } {
    const v = this.word.getWorldPosition(new Vector3()).project(this.camera)
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight }
  }

  dispose(): void {
    this.stop()
    this.sea.dispose()
    this.renderer.dispose()
  }
}

export async function createStage(canvas: HTMLCanvasElement, tier: Tier, opts: { mobile?: boolean } = {}, onTierChange?: (t: Tier) => void): Promise<Stage> {
  const st = new Stage(canvas, tier, opts, onTierChange)
  await st.init()
  return st
}
