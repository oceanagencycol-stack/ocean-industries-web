/**
 * The night sea: a field of plankton (points) on the water that glows where the water moves. Each point sits on the
 * surface and rides the waves; its light comes from how fast it moves (the bioluminescence of the Colombian Pacific
 * at night), from the wake the visitor leaves with the pointer, from a drop, from the agent's answer, from the big
 * wave's crest (blue: the machine) and from its white water when it breaks (green: the result).
 *
 * Points are scattered in rows that grow apart with distance (the screen sees them evenly, with no grid moiré), and
 * each row spans what the camera can see at that depth, plus a margin. They draw in the opaque pass with additive
 * blending, so the glass refracts them (three's transmission pass only sees opaque objects).
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three'

export const TRAIL = 8

const seaVert = /* glsl */ `
uniform float uTime; uniform float uSea; uniform float uAmp; uniform float uCalm;
uniform float uSwell; uniform float uCrestZ; uniform float uBreak;
uniform vec2 uDropXZ; uniform float uDropAge;
uniform vec2 uPulseXZ; uniform float uPulseAge;
uniform vec2 uPoolXZ; uniform float uPool; uniform float uResult;
uniform vec4 uTrail[${TRAIL}];
uniform float uPixelRatio; uniform float uSize;
uniform vec3 uBlue; uniform vec3 uCyan; uniform vec3 uGreen;
attribute vec2 aSeed;
varying vec3 vColor; varying float vAlpha;

float waves(vec2 p, float t){
  float h = 0.0;
  h += 0.11  * sin(dot(p, vec2(0.10, 0.995)) * 0.50 + t * 0.60);
  h += 0.07  * sin(dot(p, vec2(-0.62, 0.78)) * 0.83 + t * 0.78 + 1.3);
  h += 0.04  * sin(dot(p, vec2(0.86, 0.50)) * 1.55 + t * 1.10 + 2.1);
  h += 0.022 * sin(dot(p, vec2(-0.28, -0.96)) * 2.70 + t * 1.55 + 0.7);
  h += 0.012 * sin(dot(p, vec2(0.71, -0.70)) * 4.10 + t * 2.05 + 4.2);
  return h;
}

// a ring that runs out from a point: height and light
vec2 ring(vec2 p, vec2 o, float age, float speed, float strength){
  if (age < 0.0) return vec2(0.0);
  float d = length(p - o);
  float r = d - age * speed;
  float fade = strength * exp(-age * 0.9);
  float h = fade * 0.16 * exp(-r * r * 0.9) * sin(r * 5.5) * exp(-d * 0.08);
  float g = fade * (exp(-r * r * 2.2) * 1.3 + exp(-d * d * 0.8) * exp(-age * 2.5) * 1.6);
  return vec2(h, g);
}

void main(){
  vec2 p = position.xz;
  float t = uTime;
  float amp = uAmp * (1.0 - 0.55 * uCalm);
  float h0 = waves(p, t) * amp;
  float h1 = waves(p, t - 0.12) * amp;
  float speed = abs(h0 - h1) / 0.12;             // how fast the water moves here
  float glow = speed * 4.0 + smoothstep(0.04, 0.2, h0) * 0.35;

  // the big wave: a ridge across the view that comes in toward the camera; steep face in front, long back
  float dz = p.y - uCrestZ;
  float w = dz > 0.0 ? 0.85 : 2.8;
  float ridge = exp(-dz * dz / (2.0 * w * w)) * (0.85 + 0.15 * sin(p.x * 0.35 + t * 0.4));
  float swellH = uSwell * 1.35 * ridge * (1.0 - 0.55 * uBreak);
  float crestGlow = uSwell * (pow(ridge, 5.0) * 4.4 + ridge * 0.5) * (1.0 - uBreak);
  // white water: a band behind the crest that sparkles green once it breaks
  float foamBand = exp(-pow((dz + 0.9) / 1.4, 2.0)) * uBreak;
  float sparkle = 0.55 + 0.45 * sin(t * (4.0 + aSeed.y * 6.0) + aSeed.x * 40.0);
  float foam = foamBand * sparkle * 4.0;

  // rings: the first drop, the agent's answer, the visitor's wake
  vec2 rd = ring(p, uDropXZ, uDropAge, 2.6, 1.0);
  vec2 rp = ring(p, uPulseXZ, uPulseAge, 3.2, 0.8);
  float hWake = 0.0;
  float gWake = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec4 tr = uTrail[i];
    if (tr.w <= 0.0) continue;
    vec2 r = ring(p, tr.xy, tr.z, 2.2, tr.w);
    hWake += r.x;
    gWake += r.y;
  }

  // under the glass the water stays lit (it just came out of it), green when something lands
  float dPool = length((p - uPoolXZ) * vec2(0.55, 1.0));
  float pool = exp(-dPool * dPool * 0.35);
  float gPool = pool * uPool * 0.55;
  float gResult = pool * uResult * 1.8;

  float y = h0 + swellH + rd.x + rp.x + hWake;
  vec3 pos = vec3(position.x, y, position.z);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;

  // the plankton wakes outward from where the first drop fell
  float dWake = length(p - uDropXZ);
  float awake = 1.0 - smoothstep(uSea * 75.0 - 9.0, uSea * 75.0, dWake);
  float calm = 1.0 - 0.6 * uCalm;
  float blue = (0.22 + glow + crestGlow + rd.y + gWake + gPool) * awake * calm + rp.y * 1.4;
  float green = (foam + gResult) * awake;
  // a few grains flicker on their own, as plankton does
  float flick = step(0.9935, fract(aSeed.x * 91.7 + floor(t * (0.6 + aSeed.y)) * 0.137)) * 0.9 * awake;
  blue += flick;

  // where the wave breaks the light turns green (the result), not teal: the blue steps back under the foam
  float gk = clamp(green * 0.7, 0.0, 1.0);
  blue *= 1.0 - 0.7 * gk;
  vColor = uBlue * blue + uCyan * pow(max(blue - 0.35, 0.0), 1.5) * 0.9 + uGreen * green;
  float energy = blue + green;
  // fog toward the horizon, and the points right under the camera fade (they would be huge)
  vAlpha = (1.0 - smoothstep(24.0, 125.0, depth)) * smoothstep(0.9, 3.2, depth);
  float size = uSize * (0.55 + aSeed.y * 0.9) * (1.0 + min(energy, 3.0) * 0.6);
  gl_PointSize = min(size * uPixelRatio * (7.0 / depth), 26.0 * uPixelRatio);
}
`

const seaFrag = /* glsl */ `
varying vec3 vColor; varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = 1.0 - smoothstep(0.0, 0.5, d);
  a *= a;
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`

const sprayVert = /* glsl */ `
uniform float uTime; uniform float uAge; uniform float uPixelRatio; uniform vec3 uOrigin; uniform float uScale;
attribute vec3 aVel; attribute vec2 aSeed;
varying float vA; varying float vG;
void main(){
  float t = uAge * (0.75 + aSeed.x * 0.5);
  vec3 p = uOrigin + vec3(aSeed.y - 0.5, 0.0, (aSeed.x - 0.5) * 0.4) * vec3(3.6 * uScale, 0.0, 1.0);
  p += aVel * t * uScale + vec3(0.0, -2.8, 0.0) * t * t * uScale;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float life = 1.0 - smoothstep(0.6, 1.9, t);
  vA = life * step(0.0, uAge) * step(-0.02, p.y);
  vG = aSeed.x;
  gl_PointSize = (2.0 + aSeed.y * 4.0) * uPixelRatio * (6.0 / max(-mv.z, 0.5));
}
`
const sprayFrag = /* glsl */ `
uniform vec3 uCyan; uniform vec3 uGreen;
varying float vA; varying float vG;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a = 1.0 - smoothstep(0.0, 0.5, length(c));
  vec3 col = mix(uCyan * 1.6, uGreen * 1.4, step(0.72, vG));
  gl_FragColor = vec4(col, a * a * vA);
}
`

export interface SeaOptions {
  /** total points (by tier) */
  count: number
  pixelRatio: number
  blue: Color
  cyan: Color
  green: Color
}

/**
 * Rows of plankton across the view, from near (z = 6) to far (z = -118): the rows grow apart with distance and each
 * one spans what a 34° camera sees at its depth (with a margin), so every row carries about the same number of points
 * and the screen sees them evenly. The rows read as lines that ride the waves (the wave lines of Ocean's first site,
 * now made of light); a little jitter keeps them organic.
 */
function scatter(count: number): { pos: Float32Array; seed: Float32Array } {
  const rows = Math.max(60, Math.round(Math.sqrt(count / 2.6)))
  const per = Math.floor(count / rows)
  const pos = new Float32Array(rows * per * 3)
  const seed = new Float32Array(rows * per * 2)
  let k = 0
  let rnd = 1234567
  const rand = () => {
    rnd = (rnd * 1103515245 + 12345) & 0x7fffffff
    return rnd / 0x7fffffff
  }
  const zNear = 6
  const zFar = -118
  const camZ = 9.5
  for (let r = 0; r < rows; r++) {
    const u = r / (rows - 1)
    const z = zNear + (zFar - zNear) * Math.pow(u, 1.9)
    const depth = camZ - z
    const width = Math.max(8, depth * 2 * Math.tan((17 * Math.PI) / 180) * 2.2 * 1.25)
    const zJit = r < rows - 1 ? (zNear + (zFar - zNear) * Math.pow((r + 1) / (rows - 1), 1.9) - z) * 0.18 : 0.2
    for (let i = 0; i < per; i++) {
      pos[k * 3] = ((i + 0.5 + (rand() - 0.5) * 0.35) / per - 0.5) * width
      pos[k * 3 + 1] = 0
      pos[k * 3 + 2] = z + (rand() - 0.5) * zJit
      seed[k * 2] = rand()
      seed[k * 2 + 1] = rand()
      k++
    }
  }
  return { pos, seed }
}

export class Sea {
  readonly points: Points<BufferGeometry, ShaderMaterial>
  readonly spray: Points<BufferGeometry, ShaderMaterial>
  private trail: Vector4[] = Array.from({ length: TRAIL }, () => new Vector4(0, 0, 0, 0))
  private trailHead = 0
  private lastWake = new Vector2(1e9, 1e9)

  constructor(o: SeaOptions) {
    const { pos, seed } = scatter(o.count)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 2))
    const m = new ShaderMaterial({
      vertexShader: seaVert,
      fragmentShader: seaFrag,
      uniforms: {
        uTime: { value: 0 },
        uSea: { value: 0 },
        uAmp: { value: 1 },
        uCalm: { value: 0 },
        uSwell: { value: 0 },
        uCrestZ: { value: -40 },
        uBreak: { value: 0 },
        uDropXZ: { value: new Vector2(0, 0) },
        uDropAge: { value: -1 },
        uPulseXZ: { value: new Vector2(0, 0) },
        uPulseAge: { value: -1 },
        uPoolXZ: { value: new Vector2(0, 0) },
        uPool: { value: 0 },
        uResult: { value: 0 },
        uTrail: { value: this.trail },
        uPixelRatio: { value: o.pixelRatio },
        uSize: { value: 3.6 },
        uBlue: { value: o.blue.clone() },
        uCyan: { value: o.cyan.clone() },
        uGreen: { value: o.green.clone() },
      },
      // opaque pass + additive light: the glass's transmission pass sees the sea
      transparent: false,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    this.points = new Points(g, m)
    this.points.frustumCulled = false
    this.points.renderOrder = -5

    // the spray: droplets thrown up when the glass breaks the surface
    const n = 420
    const vel = new Float32Array(n * 3)
    const sd = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const up = 1.4 + Math.pow(Math.random(), 0.7) * 2.6
      const out = 0.3 + Math.random() * 1.1
      vel[i * 3] = Math.cos(a) * out
      vel[i * 3 + 1] = up
      vel[i * 3 + 2] = Math.sin(a) * out * 0.6
      sd[i * 2] = Math.random()
      sd[i * 2 + 1] = Math.random()
    }
    const sg = new BufferGeometry()
    sg.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3))
    sg.setAttribute('aVel', new BufferAttribute(vel, 3))
    sg.setAttribute('aSeed', new BufferAttribute(sd, 2))
    const sm = new ShaderMaterial({
      vertexShader: sprayVert,
      fragmentShader: sprayFrag,
      uniforms: {
        uTime: { value: 0 },
        uAge: { value: -1 },
        uPixelRatio: { value: o.pixelRatio },
        uOrigin: { value: new Vector3() },
        uScale: { value: 1 },
        uCyan: { value: o.cyan.clone() },
        uGreen: { value: o.green.clone() },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    this.spray = new Points(sg, sm)
    this.spray.frustumCulled = false
    this.spray.visible = false
  }

  get uniforms() {
    return this.points.material.uniforms
  }

  setPixelRatio(pr: number): void {
    this.points.material.uniforms.uPixelRatio.value = pr
    this.spray.material.uniforms.uPixelRatio.value = pr
  }

  /** The visitor's wake: a new ring where the pointer meets the water (only after it moved a little). */
  wake(x: number, z: number, strength: number): void {
    if (Math.hypot(x - this.lastWake.x, z - this.lastWake.y) < 0.9) return
    this.lastWake.set(x, z)
    const tr = this.trail[this.trailHead]
    tr.set(x, z, 0, Math.min(1, strength))
    this.trailHead = (this.trailHead + 1) % TRAIL
  }

  /** Ages the wake's rings; a ring dies after a few seconds. */
  tick(dt: number): void {
    for (const tr of this.trail) {
      if (tr.w <= 0) continue
      tr.z += dt
      if (tr.z > 4.5) tr.w = 0
    }
  }

  /** The spray's origin and size (world), and its age (seconds; < 0 hides it). */
  setSpray(x: number, y: number, z: number, scale: number, age: number): void {
    const u = this.spray.material.uniforms
    ;(u.uOrigin.value as Vector3).set(x, y, z)
    u.uScale.value = scale
    u.uAge.value = age
    this.spray.visible = age >= 0 && age < 2.6
  }

  dispose(): void {
    this.points.geometry.dispose()
    this.points.material.dispose()
    this.spray.geometry.dispose()
    this.spray.material.dispose()
  }
}
