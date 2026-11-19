/**
 * La maqueta en gris de la toma completa (v3, etapa 1): formas simples con luz de verdad, en la paleta monocromo, para
 * aprobar la coreografía antes de los medios. Nada de texturas de IA.
 *
 * Un solo mundo, una sola cámara (la de camera.ts):
 * - el cielo es una pasada de pantalla completa que marcha la atmósfera de una Tierra de radio 6000 (el borde de luz
 *   visto desde el espacio y el cielo de noche o de amanecer visto desde abajo salen del mismo cálculo);
 * - el mar es un disco curvado sobre esa misma esfera (desde el espacio es la Tierra; abajo, el plano del agua): desde
 *   arriba refleja el cielo y la luna; desde abajo, la ventana de Snell;
 * - un haz de luz, el fondo, la montaña (malla de relieve procedural, continua del fondo del mar a la cumbre), tres
 *   capas de nubes y la luna;
 * - **un solo buffer de partículas** que cambia de significado: estrellas → nieve marina → nieve;
 * - la estrella de OCEAN (el centro del símbolo simétrico, su campo de distancia horneado del SVG) es la única luz con
 *   forma: estrella en el espacio, la luz del buzo en el mar, el primer destello del sol en la cumbre;
 * - pasada final: tone mapping, la línea del agua en el lente, viñeta, grano de película y dither.
 *
 * El bucle duerme: sin scroll ni puntero baja a 30 fps y a los 4 s deja de pedir cuadros (el grano queda congelado
 * con el último cuadro). Nada se aloca en el bucle.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  FogExp2,
  HalfFloatType,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  NormalBlending,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  RedFormat,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
  type Material,
} from 'three'
import symbolSvg from '../../marca/v3/simbolo-simetrico.svg?raw'
import { newPose, pose, Spring, type ScrollTrack } from './camera'

/* ------------------------------------------------------------------ */
/*  Paleta (Color pasa de sRGB a lineal solo)                          */
/* ------------------------------------------------------------------ */
const SPACE = new Color('#03060C')
const ABYSS = new Color('#06141D')
const SLATE = new Color('#2B404F')
const HAZE = new Color('#6E8193')
const MIST = new Color('#B2C0CC')
const SNOW = new Color('#E0E7ED')
const WHITE = new Color('#FFFFFF')

/* ------------------------------------------------------------------ */
/*  El mundo                                                           */
/* ------------------------------------------------------------------ */
const R_EARTH = 6000
const H_ATMO = 90
const SEA_FLOOR = -62
const PEAK = new Vector3(0, 90, 150)
const MOUNT_BASE = -72
const CLOUD_Y = [18, 22.5, 27] as const
/** el sol del amanecer: bajo, a la derecha y un poco detrás de la cumbre vista desde el final de la toma */
const SUN_DIR = new Vector3(-0.95, 0.2, -0.16).normalize()
/** la luz que dibuja la luna creciente (de atrás y de la derecha, vista desde el espacio) */
const MOON_LIGHT = new Vector3(0.9, 0.1, -0.7).normalize()
/** el centro del banco de nubes (alrededor de la montaña; donde baja la cámara, el cielo está abierto) */
const CLOUD_CENTER_Z = 260
/** la luna en el cielo del espacio (dirección desde el origen) */
const MOON_DIR = new Vector3(-0.46, 0.06, -1).normalize()

export type Tier = 'high' | 'mid' | 'low'

interface Quality {
  dpr: number
  msaa: number
  particles: number
}

function qualityFor(tier: Tier, mobile: boolean, cssPx: number): Quality {
  const dev = devicePixelRatio || 1
  const forced = Number(new URLSearchParams(location.search).get('dpr'))
  const base: Quality =
    tier === 'high'
      ? { dpr: Math.min(dev, mobile ? 1.6 : 2), msaa: mobile ? 0 : 4, particles: mobile ? 30000 : 48000 }
      : tier === 'mid'
        ? { dpr: Math.min(dev, mobile ? 1.5 : 1.5), msaa: 0, particles: mobile ? 20000 : 30000 }
        : { dpr: Math.min(dev, 1), msaa: 0, particles: 12000 }
  if (forced > 0) return { ...base, dpr: forced }
  // tope de píxeles del lienzo (megapíxeles): el grano esconde la diferencia; la GPU no
  const budget = mobile ? 2.0e6 : tier === 'high' ? 4.0e6 : 2.6e6
  const cap = Math.sqrt(budget / Math.max(1, cssPx))
  return { ...base, dpr: Math.max(0.75, Math.min(base.dpr, Math.round(cap * 20) / 20)) }
}

/* ------------------------------------------------------------------ */
/*  Shaders                                                            */
/* ------------------------------------------------------------------ */
const HASH = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y); }
`

/** Niebla propia (las ShaderMaterial): se comparten los objetos de uniform con la de la escena. */
const FOG = /* glsl */ `
uniform vec3 uFogColor; uniform float uFogDensity;
float fogF(float d){ float x = d * uFogDensity; return 1.0 - exp(-x * x); }
`

/** El cielo: un triángulo de pantalla completa. Marcha la atmósfera (8 pasos) de la Tierra desde la cámara. */
const skyVert = /* glsl */ `
uniform mat4 uInvProj; uniform mat4 uCamWorld;
varying vec3 vRay;
void main(){
  vec4 v = uInvProj * vec4(position.xy, 1.0, 1.0);
  vRay = mat3(uCamWorld) * (v.xyz / v.w);
  gl_Position = vec4(position.xy, 1.0, 1.0);
}`
const skyFrag = /* glsl */ `
uniform float uR; uniform float uHa; uniform float uHs;
uniform vec3 uSpace; uniform vec3 uGlow; uniform vec3 uGlowOuter; uniform float uAtmo;
uniform vec3 uSunDir; uniform float uSun;
uniform vec3 uZenith; uniform vec3 uHorizon; uniform float uDay;
uniform vec3 uDeepTop; uniform vec3 uDeepBottom; uniform float uUnder;
varying vec3 vRay;
vec2 raySphere(vec3 ro, vec3 rd, float r){
  float b = dot(ro, rd); float c = dot(ro, ro) - r * r; float h = b * b - c;
  if (h < 0.0) return vec2(-1.0); h = sqrt(h); return vec2(-b - h, -b + h);
}
void main(){
  vec3 rd = normalize(vRay);
  vec3 ro = cameraPosition + vec3(0.0, uR, 0.0); // centro de la Tierra en el origen
  vec2 ta = raySphere(ro, rd, uR + uHa);
  float optical = 0.0;
  if (ta.y > 0.0) {
    float t0 = max(ta.x, 0.0);
    float t1 = ta.y;
    vec2 tp = raySphere(ro, rd, uR);
    if (tp.x > 0.0) t1 = min(t1, tp.x);
    float dt = (t1 - t0) / 8.0;
    for (int i = 0; i < 8; i++) {
      vec3 p = ro + rd * (t0 + (float(i) + 0.5) * dt);
      optical += exp(-max(length(p) - uR, 0.0) / uHs) * dt;
    }
  }
  // la línea de luz: satura solo pegada al borde y cae rápido (el exponencial de la atmósfera)
  float glow = 1.0 - exp(-optical / 320.0);
  float mu = max(dot(rd, uSunDir), 0.0);
  vec3 col = uSpace;
  col += mix(uGlowOuter, uGlow, glow * glow) * glow * uAtmo * (1.0 + 0.5 * pow(mu, 3.0));
  // el día (amanecer): un cielo claro de verdad, que se aclara hacia el horizonte y hacia el sol
  vec3 up = normalize(ro);
  float el = dot(rd, up);
  vec3 day = mix(uHorizon, uZenith, smoothstep(-0.02, 0.55, el));
  day += uHorizon * 0.5 * pow(mu, 6.0) + vec3(1.0) * 0.6 * pow(mu, 180.0) * uSun;
  col = mix(col, day, uDay * smoothstep(-0.25, 0.05, el + 0.1));
  // bajo el agua: el azul abisal, un poco más claro hacia arriba
  vec3 deep = mix(uDeepBottom, uDeepTop, smoothstep(-0.6, 0.9, rd.y));
  col = mix(col, deep, uUnder);
  gl_FragColor = vec4(col, 1.0);
}`

/** El mar: un disco que se curva sobre la Tierra (desde el espacio es el planeta). */
const seaVert = /* glsl */ `
uniform float uR;
varying vec3 vWorld; varying vec3 vUp;
void main(){
  vec2 p = position.xz; float rho = length(p);
  float th = rho / uR;
  vec2 d = rho > 1e-6 ? p / rho : vec2(0.0);
  float s = sin(th) * uR;
  float h = sin(th * 0.5);
  vec3 w = vec3(d.x * s, -2.0 * uR * h * h, d.y * s);
  vWorld = w;
  vUp = normalize(w + vec3(0.0, uR, 0.0));
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`
const seaFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep; uniform vec3 uBody; uniform float uBodyK; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uGlow; uniform float uAtmo;
uniform vec3 uMoonDir; uniform float uMoon; uniform vec3 uSunDir; uniform float uSun;
uniform vec3 uWindow; uniform vec3 uTir;
varying vec3 vWorld; varying vec3 vUp;
${FOG}
vec2 waveGrad(vec2 p, float t){
  vec2 g = vec2(0.0);
  vec2 d1 = vec2(0.10, 0.995); g += d1 * 0.50 * 0.11 * cos(dot(p, d1) * 0.50 + t * 0.60);
  vec2 d2 = vec2(-0.62, 0.78); g += d2 * 0.83 * 0.07 * cos(dot(p, d2) * 0.83 + t * 0.78 + 1.3);
  vec2 d3 = vec2(0.86, 0.50);  g += d3 * 1.55 * 0.04 * cos(dot(p, d3) * 1.55 + t * 1.10 + 2.1);
  vec2 d4 = vec2(-0.28, -0.96); g += d4 * 2.70 * 0.022 * cos(dot(p, d4) * 2.70 + t * 1.55 + 0.7);
  vec2 d5 = vec2(0.71, -0.70); g += d5 * 4.10 * 0.012 * cos(dot(p, d5) * 4.10 + t * 2.05 + 4.2);
  return g;
}
void main(){
  vec3 toFrag = vWorld - cameraPosition;
  float dist = length(toFrag);
  vec3 V = toFrag / dist;
  // las olas solo cerca: lejos, el agua es un espejo liso (y no hace moiré)
  bool above = dot(cameraPosition - vWorld, vUp) > 0.0;
  // las olas se apagan donde un píxel ya cubre media ola (sin moiré), y bajo el agua se ven más quietas
  float foot = length(fwidth(vWorld.xz));
  vec2 g = waveGrad(vWorld.xz, uTime) * smoothstep(1.6, 0.4, foot) * exp(-dist * (above ? 0.003 : 0.03)) * (above ? 1.4 : 0.22);
  vec3 n = normalize(vUp + vec3(-g.x, 0.0, -g.y));
  vec3 col;
  if (above) {
    float cosI = max(dot(-V, n), 0.0);
    float F = 0.02 + 0.98 * pow(1.0 - cosI, 5.0);
    vec3 R = reflect(V, n);
    float re = dot(R, vUp);
    vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.5, re));
    col = uBody * uBodyK * (0.75 + 0.5 * cosI) + sky * F;
    // el camino de la luna: las olas lo rompen en destellos; de lejos es un brillo suave, no una mancha
    float far = smoothstep(40.0, 500.0, dist);
    col += vec3(1.0) * pow(max(dot(R, uMoonDir), 0.0), mix(2600.0, 1400.0, far)) * mix(9.0, 0.12, far) * uMoon;
    col += vec3(1.0) * pow(max(dot(R, uSunDir), 0.0), 600.0) * 6.0 * uSun;
    // el borde del planeta visto desde arriba: la atmósfera sobre el agua, que se enciende al rasante
    float graze = 1.0 - max(dot(-V, vUp), 0.0);
    col += uGlow * pow(graze, 5.0) * uAtmo * 0.55;
  } else {
    // desde abajo: la ventana de Snell (todo el cielo cabe en un cono de 48,6°) y fuera de ella el reflejo total
    float c = dot(V, n);
    float crit = 0.6613;
    float win = smoothstep(crit - 0.006, crit + 0.02, c);
    float rim = exp(-pow((c - crit) / 0.008, 2.0));
    float zen = smoothstep(crit, 1.0, c);
    float caustic = clamp(length(g) * 9.0, 0.0, 1.0);
    vec3 inside = uWindow * (0.5 + 0.7 * zen) * (0.88 + 0.2 * caustic);
    col = mix(uTir * (0.8 + 0.4 * caustic), inside, win) + uWindow * rim * 0.35;
  }
  col = mix(col, uFogColor, fogF(dist));
  gl_FragColor = vec4(col, 1.0);
}`

/** Las nubes: planos con ruido; claras por arriba, grises por abajo; se abren alrededor de donde baja la cámara. */
const cloudVert = /* glsl */ `
varying vec3 vWorld;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const cloudFrag = /* glsl */ `
uniform float uTime; uniform float uSeed; uniform float uY; uniform vec3 uCenter;
uniform vec3 uLit; uniform vec3 uShade; uniform float uOpacity;
varying vec3 vWorld;
${HASH}
${FOG}
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
void main(){
  vec2 q = vWorld.xz * 0.013 + vec2(uSeed * 7.1, uSeed * 3.3) + vec2(uTime * 0.004, 0.0);
  float n = fbm(q);
  float a = smoothstep(0.42, 0.72, n);
  float r = length(vWorld.xz - uCenter.xz);
  a *= 1.0 - smoothstep(120.0, 270.0, r);
  float dist = length(vWorld - cameraPosition);
  a *= smoothstep(1.5, 12.0, dist);
  float fromAbove = smoothstep(-2.0, 2.0, cameraPosition.y - uY);
  vec3 col = mix(uShade, uLit, mix(0.35, 1.0, fromAbove) * (0.55 + 0.45 * n));
  col = mix(col, uFogColor, fogF(dist));
  gl_FragColor = vec4(col, a * uOpacity);
}`

/** El haz de luz: un cono abierto, aditivo, que se apaga con la profundidad; rayas que se mueven despacio. */
const beamVert = /* glsl */ `
varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w; }`
const beamFrag = /* glsl */ `
uniform float uTime; uniform float uIntensity; uniform vec3 uColor;
varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
${FOG}
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  float facing = abs(dot(V, vN));
  float soft = pow(facing, 2.2);
  float depth = max(-vWorld.y, 0.0);
  float fall = exp(-depth * 0.045) * smoothstep(0.0, 3.0, depth);
  float rays = 0.55 + 0.45 * sin(vUv.x * 62.0 + uTime * 0.15) * sin(vUv.x * 23.0 - uTime * 0.11 + 1.3);
  float d = length(vWorld - cameraPosition);
  float a = soft * fall * rays * uIntensity * (1.0 - fogF(d) * 0.85) * smoothstep(0.5, 6.0, d);
  gl_FragColor = vec4(uColor * a, 1.0);
}`

/**
 * Las partículas: un solo buffer. uKind 0 = estrellas (en una esfera alrededor de la cámara, en el infinito);
 * 1 = nieve marina (una caja que envuelve a la cámara, cae despacio, solo bajo el agua); 2 = nieve (cae y la empuja
 * el viento, solo sobre el agua). El cambio de significado se hace cuando su intensidad es 0.
 */
const pointsVert = /* glsl */ `
uniform float uKind; uniform float uTime; uniform float uIntensity; uniform float uDpr; uniform float uProj;
attribute float aRand;
varying float vA;
${FOG}
void main(){
  vec3 world;
  float sizePx;
  float bright;
  if (uKind < 0.5) {
    float z = position.x * 2.0 - 1.0;
    float ph = position.y * 6.2831853;
    float rr = sqrt(max(1.0 - z * z, 0.0));
    world = cameraPosition + vec3(rr * cos(ph), z, rr * sin(ph)) * 9000.0;
    sizePx = (1.25 + pow(position.z, 12.0) * 2.2) * uDpr;
    bright = 0.18 + pow(aRand, 7.0) * 1.7;
  } else if (uKind < 1.5) {
    float B = 34.0;
    vec3 p = position * B;
    p.y -= uTime * 0.22;
    p.x += sin(uTime * 0.21 + aRand * 6.2831) * 0.7;
    vec3 rel = mod(p - cameraPosition + B * 0.5, B) - B * 0.5;
    world = cameraPosition + rel;
    float dd = max(length(rel), 0.3);
    sizePx = clamp((0.035 + aRand * 0.05) * uProj / dd, 0.8 * uDpr, 5.0 * uDpr);
    bright = (0.25 + aRand * 0.6) * (1.0 - smoothstep(B * 0.3, B * 0.5, length(rel)))
      * step(world.y, -0.25) * step(${SEA_FLOOR.toFixed(1)}, world.y);
  } else {
    float B = 30.0;
    vec3 p = position * B;
    p.y -= uTime * 1.5;
    p.x += uTime * 0.8 + sin(uTime * 0.6 + aRand * 6.2831) * 0.9;
    p.z += cos(uTime * 0.5 + aRand * 4.0) * 0.6;
    vec3 rel = mod(p - cameraPosition + B * 0.5, B) - B * 0.5;
    world = cameraPosition + rel;
    float dd = max(length(rel), 0.3);
    sizePx = clamp((0.022 + aRand * 0.028) * uProj / dd, 0.8 * uDpr, 4.0 * uDpr);
    bright = (0.55 + aRand * 0.45) * (1.0 - smoothstep(B * 0.3, B * 0.5, length(rel))) * step(0.4, world.y);
  }
  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = sizePx;
  vA = bright * uIntensity * (1.0 - fogF(-mv.z) * (uKind < 0.5 ? 1.0 : 0.9));
}`
const pointsFrag = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vA;
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor, a);
}`

/** La estrella de OCEAN: un cuadro que mira a la cámara, del tamaño pedido en píxeles; su forma, el SDF del SVG. */
const starVert = /* glsl */ `
uniform vec3 uPos; uniform float uSizePx; uniform vec2 uRes;
varying vec2 vUv;
void main(){
  vec4 c = projectionMatrix * viewMatrix * vec4(uPos, 1.0);
  c.xy += position.xy * uSizePx * 2.0 / uRes * c.w;
  vUv = position.xy;
  gl_Position = c;
}`
const starFrag = /* glsl */ `
uniform sampler2D uSdf; uniform float uSpan; uniform float uRange; uniform float uIntensity; uniform vec3 uColor;
uniform float uFlare;
varying vec2 vUv;
void main(){
  vec2 t = vUv * 0.5 * uSpan;
  vec2 tuv = vec2(0.5 + t.x, 0.5 + t.y);
  float sd = (texture2D(uSdf, tuv).r - 0.5) * uRange;
  // fuera de la textura: crece con la distancia al borde (la textura se estira con clamp)
  vec2 out2 = max(abs(t) - 0.5, 0.0);
  sd += length(out2);
  float aa = max(fwidth(sd), 1e-4);
  float shape = 1.0 - smoothstep(-aa, aa, sd);
  float glow = exp(-max(sd, 0.0) * 26.0) * 0.55;
  float r = length(vUv);
  float halo = exp(-r * r * 9.0) * 0.28 + exp(-r * 3.2) * 0.07;
  float flare = (exp(-abs(vUv.y) * 90.0) * exp(-abs(vUv.x) * 2.4) + exp(-abs(vUv.x) * 140.0) * exp(-abs(vUv.y) * 4.0) * 0.35) * uFlare;
  float edge = 1.0 - smoothstep(0.82, 1.0, max(abs(vUv.x), abs(vUv.y)));
  float k = (shape * 1.8 + glow + halo + flare) * edge * uIntensity;
  gl_FragColor = vec4(uColor * k, 1.0);
}`

/** La luna: una esfera con la terminal del sol (creciente) y un poco de luz de Tierra. */
const moonVert = /* glsl */ `
varying vec3 vN;
void main(){ vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`
const moonFrag = /* glsl */ `
uniform vec3 uLight; uniform vec3 uColor; uniform float uIntensity;
varying vec3 vN;
void main(){
  float lit = smoothstep(-0.02, 0.12, dot(normalize(vN), uLight));
  gl_FragColor = vec4(uColor * (lit * 1.6 + 0.012) * uIntensity, 1.0);
}`

/**
 * La pasada final, a pantalla: la línea del agua en el lente (cuando la cámara cruza la superficie), tone mapping y
 * sRGB, viñeta, grano de película (por píxel de pantalla, semilla por cuadro, más visible en los medios tonos) y
 * dither triangular (sin bandas en los degradados).
 */
const finalVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
const finalFrag = /* glsl */ `
uniform sampler2D tScene; uniform float uSeed; uniform float uGrain; uniform float uVignette;
uniform float uCamY; uniform vec4 uLens; uniform vec3 uWaterTint; uniform vec3 uAirTint;
varying vec2 vUv;
${HASH}
void main(){
  vec3 col = texture2D(tScene, vUv).rgb;
  // el lente a 0,6 m de la cámara: la altura de cada píxel sobre el agua (lineal en la pantalla)
  float ry = mix(mix(uLens.x, uLens.y, vUv.x), mix(uLens.z, uLens.w, vUv.x), vUv.y);
  float ly = uCamY + ry;
  if (uCamY >= 0.0) col = mix(col, uWaterTint, step(ly, 0.0) * 0.8);
  else col = mix(col, uAirTint, step(0.0, ly) * 0.55);
  col += vec3(0.5) * exp(-pow(ly / 0.012, 2.0)) * step(abs(uCamY), 1.2);
  vec2 c = vUv - 0.5;
  col *= mix(1.0, 1.0 - smoothstep(0.3, 0.95, length(c * vec2(1.0, 1.15)) * 1.15), uVignette);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  vec3 o = gl_FragColor.rgb;
  float l = dot(o, vec3(0.2126, 0.7152, 0.0722));
  vec2 fc = gl_FragCoord.xy;
  float g = hash12(fc + uSeed * 317.0) + hash12(fc * 1.37 + uSeed * 191.0 + 13.7) - 1.0;
  o += g * uGrain * (0.12 + 3.2 * l * (1.0 - l));
  o += (hash12(fc + uSeed * 71.0 + 5.1) + hash12(fc + uSeed * 53.0 + 91.7) - 1.0) / 255.0;
  gl_FragColor = vec4(o, 1.0);
}`

/* ------------------------------------------------------------------ */
/*  Ayudas                                                             */
/* ------------------------------------------------------------------ */
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** sube de 0 a 1 entre a y b, y baja de 1 a 0 entre c y d */
const window4 = (x: number, a: number, b: number, c: number, d: number) => smoothstep(a, b, x) * (1 - smoothstep(c, d, x))

function nextTask(): Promise<void> {
  const sch = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  return sch?.yield ? sch.yield() : new Promise((r) => setTimeout(r, 0))
}

/** PRNG determinista (la maqueta se ve igual en cada corrida). */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** ruido de valor 3D (para el relieve), suave y sin costura alrededor del eje */
function hash3(x: number, y: number, z: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}
function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = x - xi, yf = y - yi, zf = z - zi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf)
  const l = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz)
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}
function fbm3(x: number, y: number, z: number, oct: number): number {
  let a = 0.5, s = 0, f = 1
  for (let i = 0; i < oct; i++) {
    s += a * noise3(x * f, y * f, z * f)
    f *= 2.03
    a *= 0.5
  }
  return s
}

/** Un triángulo de pantalla completa (posición y uv, como las pasadas de three). */
const FS_GEO = new BufferGeometry()
FS_GEO.setAttribute('position', new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3))
FS_GEO.setAttribute('uv', new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2))
const FS_CAM = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

/* ------------------------------------------------------------------ */
/*  Geometrías                                                         */
/* ------------------------------------------------------------------ */
/** El disco del mar: anillos que se abren con la distancia (densos cerca, hasta más allá del horizonte). */
function seaDisc(rings: number, segs: number, radius: number): BufferGeometry {
  const pos = new Float32Array((1 + rings * segs) * 3)
  pos[0] = 0
  pos[1] = 0
  pos[2] = 0
  for (let k = 1; k <= rings; k++) {
    const rho = radius * Math.pow(k / rings, 3)
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2
      const o = (1 + (k - 1) * segs + i) * 3
      pos[o] = Math.cos(a) * rho
      pos[o + 1] = 0
      pos[o + 2] = Math.sin(a) * rho
    }
  }
  const idx: number[] = []
  for (let i = 0; i < segs; i++) idx.push(0, 1 + ((i + 1) % segs), 1 + i)
  for (let k = 1; k < rings; k++) {
    const a0 = 1 + (k - 1) * segs
    const b0 = 1 + k * segs
    for (let i = 0; i < segs; i++) {
      const i1 = (i + 1) % segs
      idx.push(a0 + i, a0 + i1, b0 + i, a0 + i1, b0 + i1, b0 + i)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setIndex(idx)
  return g
}

/** Una cumbre: su eje, su altura, su perfil (radio a cada altura), su costura y sus aristas. */
interface PeakSpec {
  x: number
  z: number
  top: number
  radius: (y: number) => number
  /** rumbo de la costura del torno (rad): hacia donde la cámara nunca mira */
  seam: number
  /** rumbo de una de las cuatro aristas (rad) */
  ridge: number
  seed: number
}

/**
 * La montaña principal: bajo el agua una pared empinada (de r = 100 en el fondo a 62 en y = 10, ~65°), arriba una
 * pirámide (de 62 a 0 en la cumbre). La cámara sube pegada a la cara de −z.
 */
export function mountainRadius(y: number): number {
  if (y <= 10) return 100 - 38 * clamp01((y - MOUNT_BASE) / (10 - MOUNT_BASE))
  return 62 * Math.pow(1 - clamp01((y - 10) / (PEAK.y - 10)), 1.5)
}

const DEG = Math.PI / 180
const PEAKS: PeakSpec[] = [
  { x: PEAK.x, z: PEAK.z, top: PEAK.y, radius: mountainRadius, seam: 90 * DEG, ridge: -65 * DEG, seed: 10 },
  // dos cumbres más bajas detrás: el macizo (desde el final de la toma, una a cada lado de la principal)
  { x: -85, z: 200, top: 70, radius: (y) => 110 * Math.pow(1 - clamp01((y - MOUNT_BASE) / (70 - MOUNT_BASE)), 1.6), seam: 90 * DEG, ridge: -20 * DEG, seed: 27 },
  { x: -10, z: 290, top: 66, radius: (y) => 120 * Math.pow(1 - clamp01((y - MOUNT_BASE) / (66 - MOUNT_BASE)), 1.7), seam: 90 * DEG, ridge: -50 * DEG, seed: 41 },
]

/**
 * La montaña: un torno con cuatro aristas, ruido de roca y estrías de nieve arriba. Continua del fondo del mar a la
 * cumbre (la costura del torno queda detrás, hacia +z, donde la cámara nunca mira). Colores por vértice: roca abajo y
 * bajo el agua más oscura, nieve donde la pendiente la sostiene.
 */
async function mountainGeometry(spec: PeakSpec, ny: number, ns: number): Promise<BufferGeometry> {
  const verts = (ny + 1) * (ns + 1)
  const pos = new Float32Array(verts * 3)
  for (let j = 0; j <= ny; j++) {
    const v = j / ny
    // más anillos arriba, donde la cámara mira de cerca la pirámide
    const y = MOUNT_BASE + (spec.top - MOUNT_BASE) * (1 - Math.pow(1 - v, 1.25))
    const r0 = spec.radius(y)
    const top = smoothstep(15, 75, y) * smoothstep(0, 30, spec.top - 30)
    const k0 = spec.seed
    for (let i = 0; i <= ns; i++) {
      // la costura queda donde la cámara nunca mira (la principal: hacia +z; la cámara sube por la cara de −z)
      const th = spec.seam + (i / ns) * Math.PI * 2
      const cx = Math.cos(th), sz = Math.sin(th)
      // cuatro aristas; en la principal, la de la derecha de la cara que sube la cámara es la que se ve desde arriba
      const ridge = Math.pow(Math.abs(Math.cos(2 * (th - spec.ridge))), 4)
      const n = fbm3(cx * 2.2 + k0, y * 0.045, sz * 2.2 + k0, 5) - 0.5
      // roca quebrada: ruido con crestas (1 − |2n − 1|)
      const fine = 0.5 - Math.abs(fbm3(cx * 7 + 3 + k0, y * 0.12, sz * 7 + 3, 4) * 2 - 1)
      const flutes = Math.sin(th * 110 + n * 14) * 0.025 * top
      const r = r0 * (1 + 0.2 * ridge * (0.4 + 0.6 * top) + 0.2 * n + 0.12 * fine + flutes)
      const o = (j * (ns + 1) + i) * 3
      pos[o] = spec.x + cx * r
      pos[o + 1] = y + n * 6 * (1 - top * 0.5)
      pos[o + 2] = spec.z + sz * r
    }
    if (j % 24 === 0) await nextTask()
  }
  const idx = new Uint32Array(ny * ns * 6)
  let k = 0
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < ns; i++) {
      const a = j * (ns + 1) + i
      const b = a + ns + 1
      idx[k++] = a
      idx[k++] = b
      idx[k++] = a + 1
      idx[k++] = a + 1
      idx[k++] = b
      idx[k++] = b + 1
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setIndex(new BufferAttribute(idx, 1))
  g.computeVertexNormals()
  await nextTask()
  // colores: roca, nieve, y la parte bajo el agua más oscura
  const nrm = g.getAttribute('normal') as BufferAttribute
  const col = new Float32Array(verts * 3)
  const rock = SLATE.clone().multiplyScalar(0.55)
  const rockHi = HAZE.clone().multiplyScalar(0.42)
  const snow = SNOW.clone()
  const tmp = new Color()
  for (let q = 0; q < verts; q++) {
    const x = pos[q * 3], y = pos[q * 3 + 1], z = pos[q * 3 + 2]
    const ny_ = nrm.getY(q)
    const n = fbm3(x * 0.08, y * 0.08, z * 0.08, 3)
    const cover = smoothstep(4, 30, y + (n - 0.5) * 22) * smoothstep(-0.05, 0.35, ny_ + 0.3 * smoothstep(40, 85, y) + (n - 0.5) * 0.4)
    tmp.copy(rock).lerp(rockHi, n)
    tmp.lerp(snow, cover)
    const under = lerp(0.45, 1, smoothstep(SEA_FLOOR, -1, y))
    col[q * 3] = tmp.r * under
    col[q * 3 + 1] = tmp.g * under
    col[q * 3 + 2] = tmp.b * under
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  return g
}

/* ------------------------------------------------------------------ */
/*  La estrella: SDF horneado del símbolo simétrico                    */
/* ------------------------------------------------------------------ */
/**
 * El centro del símbolo (la estrella de cuatro puntas que dejan las dos S) en coordenadas del SVG: sus cuatro puntas
 * y su centro de giro (el símbolo es simétrico por giro de 180° alrededor del centro del viewBox).
 */
const STAR = { cx: 343.7, cy: 294.4, left: [116.75, 285.0], top: [351.6, 158.4], right: [570.65, 303.8], bottom: [335.8, 430.4] } as const
/** lado del cuadro del SVG que cubre la textura (1,15 × el ancho de la estrella) */
const STAR_SPAN = (STAR.right[0] - STAR.left[0]) * 1.15
const SDF_N = 256
const SDF_RANGE_PX = 24

/** Dibuja el símbolo con su propio trazo (Path2D del SVG) y saca la estrella: lo que no es tinta dentro del rombo de
 *  sus cuatro puntas. Luego, el campo de distancia con signo (chamfer 3-4, dos pasadas por lado). */
function bakeStarSDF(): DataTexture {
  const n = SDF_N
  const cv = document.createElement('canvas')
  cv.width = cv.height = n
  const cx = cv.getContext('2d', { willReadFrequently: true })!
  const k = n / STAR_SPAN
  const ox = STAR.cx - STAR_SPAN / 2
  const oy = STAR.cy - STAR_SPAN / 2
  cx.fillStyle = '#000'
  cx.fillRect(0, 0, n, n)
  cx.setTransform(k, 0, 0, k, -ox * k, -oy * k)
  cx.fillStyle = '#fff'
  const d = symbolSvg.match(/\sd="([^"]+)"/)?.[1] ?? ''
  cx.fill(new Path2D(d))
  const ink = cx.getImageData(0, 0, n, n).data
  const P = (p: readonly number[]) => [(p[0] - ox) * k, (p[1] - oy) * k]
  const quad = [P(STAR.left), P(STAR.top), P(STAR.right), P(STAR.bottom)]
  const inQuad = (x: number, y: number) => {
    // las puntas van en el orden de las agujas del reloj en pantalla (y hacia abajo)
    for (let i = 0; i < 4; i++) {
      const a = quad[i], b = quad[(i + 1) % 4]
      if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false
    }
    return true
  }
  const inside = new Uint8Array(n * n)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) inside[y * n + x] = ink[(y * n + x) * 4] < 128 && inQuad(x + 0.5, y + 0.5) ? 1 : 0
  const BIG = 1e6
  const dist = (target: number) => {
    const D = new Float32Array(n * n)
    for (let i = 0; i < n * n; i++) D[i] = inside[i] === target ? 0 : BIG
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= n || y >= n ? BIG : D[y * n + x])
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const i = y * n + x
        D[i] = Math.min(D[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4)
      }
    for (let y = n - 1; y >= 0; y--)
      for (let x = n - 1; x >= 0; x--) {
        const i = y * n + x
        D[i] = Math.min(D[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4)
      }
    for (let i = 0; i < n * n; i++) D[i] /= 3
    return D
  }
  const toIn = dist(1) // fuera: distancia a la estrella
  const toOut = dist(0) // dentro: distancia al borde
  const out = new Uint8Array(n * n)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x
      const sd = inside[i] ? -(toOut[i] - 0.5) : toIn[i] - 0.5
      // la textura va con y hacia arriba (v = 0 abajo)
      out[(n - 1 - y) * n + x] = Math.round(255 * clamp01(0.5 + sd / (2 * SDF_RANGE_PX)))
    }
  const tex = new DataTexture(out, n, n, RedFormat, UnsignedByteType)
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

/* ------------------------------------------------------------------ */
/*  El mundo                                                           */
/* ------------------------------------------------------------------ */
export interface WorldOptions {
  tier: Tier
  mobile: boolean
  /** la pista del scroll (anclas reales de las secciones) */
  track: ScrollTrack
  /** Lenis en escritorio (autoRaf: false: el bucle lo mueve) */
  lenis?: { raf(t: number): void; isScrolling: unknown } | null
  /** `?qa=seek=x`: la toma posada en un punto, sin resorte ni tiempo */
  seek: number | null
  /** `?qa=trace`: guarda cada cuadro (s, objetivo, scroll, cámara) para el QA */
  trace: boolean
}

interface TraceSample {
  t: number
  s: number
  target: number
  y: number
  cx: number
  cy: number
  cz: number
}

export class World {
  readonly canvas: HTMLCanvasElement
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(45, 1, 0.1, 16000)
  private rt: WebGLRenderTarget
  private fxScene = new Scene()
  private fx!: ShaderMaterial
  private q: Quality
  private opts: WorldOptions
  private spring = new Spring()
  private p = newPose()
  private fog = new FogExp2(0x000000, 0.0001)
  private fogU = { uFogColor: { value: this.fog.color }, uFogDensity: { value: 0.0001 } }

  private sky!: ShaderMaterial
  private sea!: ShaderMaterial
  private clouds: ShaderMaterial[] = []
  private beam!: ShaderMaterial
  private points!: Points<BufferGeometry, ShaderMaterial>
  private star!: ShaderMaterial
  private moon!: Mesh<SphereGeometry, ShaderMaterial>
  private sun = new DirectionalLight(0xffffff, 1)
  private hemi = new HemisphereLight(0xffffff, 0x000000, 0.3)
  /** la luz del buzo / de la máquina: en el fondo, alumbra la pared que la cámara encuentra */
  private lamp = new PointLight(0xffffff, 0, 70, 1.4)
  private mountainMat!: MeshStandardMaterial
  private floorMat!: MeshStandardMaterial

  // bucle
  private raf = 0
  private sleeping = true
  private last = 0
  private lastActive = 0
  private odd = false
  private acc = 0
  private time = 12
  private seed = 0.37
  private frame = 0
  private seekValue: number | null
  private needsResize = true
  private ro: ResizeObserver
  private width = 1
  private height = 1
  private lastFov = -1
  private lastNear = -1
  private lastAspect = -1
  private kind = -1
  private pointer = new Vector2()
  private pointerTarget = new Vector2()
  private disposed = false
  /** hasta que init() termina, nada despierta al bucle (el ResizeObserver avisa antes) */
  private built = false

  // QA
  rafs = 0
  renders = 0
  readonly samples: TraceSample[] = []
  private seekWaiters: (() => void)[] = []

  // tmp
  private tmpV = new Vector3()
  private starPos = new Vector3()
  private cA = new Color()
  private cB = new Color()

  // colores precalculados (lineales)
  private C = {
    glowNight: MIST.clone().lerp(SNOW, 0.5).multiplyScalar(1.5),
    glowOuterNight: SLATE.clone().lerp(HAZE, 0.4).multiplyScalar(0.9),
    glowDay: SNOW.clone().multiplyScalar(1.2),
    glowOuterDay: MIST.clone(),
    bodyNight: SLATE.clone().multiplyScalar(0.42),
    bodyDay: HAZE.clone().multiplyScalar(0.5),
    zenithNight: SLATE.clone().multiplyScalar(0.18),
    horizonNight: HAZE.clone().multiplyScalar(0.32),
    zenithDay: HAZE.clone().multiplyScalar(0.95),
    horizonDay: SNOW.clone().multiplyScalar(1.05),
    deepTop: SLATE.clone().multiplyScalar(0.55),
    deepBottom: ABYSS.clone().multiplyScalar(0.25),
    deepTopDawn: HAZE.clone().multiplyScalar(0.45),
    fogAirNight: SLATE.clone().multiplyScalar(0.3),
    fogAirDay: MIST.clone().multiplyScalar(0.95),
    fogWater: ABYSS.clone().lerp(SLATE, 0.35),
    fogDeep: ABYSS.clone().multiplyScalar(0.35),
    fogCloud: MIST.clone(),
    fogCloudNight: HAZE.clone().multiplyScalar(0.5),
    windowNight: HAZE.clone().multiplyScalar(0.55),
    windowDay: SNOW.clone().multiplyScalar(1.4),
    tir: ABYSS.clone().multiplyScalar(0.6),
    starSpace: WHITE.clone(),
    marine: MIST.clone(),
    snow: SNOW.clone(),
  }

  constructor(canvas: HTMLCanvasElement, opts: WorldOptions) {
    this.canvas = canvas
    this.opts = opts
    this.seekValue = opts.seek
    const cssPx = (canvas.clientWidth || innerWidth) * (canvas.clientHeight || innerHeight)
    this.q = qualityFor(opts.tier, opts.mobile, cssPx)
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true })
    this.renderer.setClearColor(SPACE, 1)
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = NeutralToneMapping
    this.renderer.toneMappingExposure = 1
    this.rt = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: this.q.msaa, depthBuffer: true })
    this.scene.fog = this.fog
    this.camera.rotation.order = 'YXZ'
    this.ro = new ResizeObserver(() => {
      this.needsResize = true
      this.wake()
    })
    this.ro.observe(canvas)
    canvas.addEventListener('webglcontextlost', this.onLost, false)
    if (opts.seek !== null) this.spring.reset(opts.seek)
  }

  private onLost = (e: Event): void => {
    e.preventDefault()
    this.stop()
  }

  /* ---------------- construir (en tareas cortas) ---------------- */
  async init(): Promise<void> {
    const fogU = this.fogU
    const cam = this.camera
    const C = this.C

    // el cielo
    this.sky = new ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uInvProj: { value: cam.projectionMatrixInverse },
        uCamWorld: { value: cam.matrixWorld },
        uR: { value: R_EARTH },
        uHa: { value: H_ATMO },
        uHs: { value: 20 },
        uSpace: { value: SPACE.clone() },
        uGlow: { value: new Color() },
        uGlowOuter: { value: new Color() },
        uAtmo: { value: 1 },
        uSunDir: { value: SUN_DIR },
        uSun: { value: 0 },
        uZenith: { value: new Color() },
        uHorizon: { value: new Color() },
        uDay: { value: 0 },
        uDeepTop: { value: new Color() },
        uDeepBottom: { value: C.deepBottom },
        uUnder: { value: 0 },
      },
    })
    const sky = new Mesh(FS_GEO, this.sky)
    sky.frustumCulled = false
    sky.renderOrder = -100
    this.scene.add(sky)
    await nextTask()

    // el mar (la Tierra)
    this.sea = new ShaderMaterial({
      vertexShader: seaVert,
      fragmentShader: seaFrag,
      side: DoubleSide,
      uniforms: {
        ...fogU,
        uR: { value: R_EARTH },
        uTime: { value: 0 },
        uDeep: { value: ABYSS.clone() },
        uBody: { value: new Color() },
        uBodyK: { value: 1 },
        uZenith: this.sky.uniforms.uZenith,
        uHorizon: this.sky.uniforms.uHorizon,
        uGlow: this.sky.uniforms.uGlow,
        uAtmo: this.sky.uniforms.uAtmo,
        uMoonDir: { value: MOON_DIR },
        uMoon: { value: 1 },
        uSunDir: { value: SUN_DIR },
        uSun: this.sky.uniforms.uSun,
        uWindow: { value: new Color() },
        uTir: { value: C.tir },
      },
    })
    const sea = new Mesh(seaDisc(this.opts.mobile ? 96 : 120, this.opts.mobile ? 144 : 192, 4500), this.sea)
    sea.frustumCulled = false
    this.scene.add(sea)
    await nextTask()

    // el fondo
    this.floorMat = new MeshStandardMaterial({ color: ABYSS.clone().lerp(SLATE, 0.3), roughness: 1, metalness: 0 })
    // el fondo no pasa de 600: más allá la Tierra curva baja el mar por debajo de −62 y el fondo lo atravesaría
    const floor = new Mesh(new CircleGeometry(600, 48), this.floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = SEA_FLOOR
    this.scene.add(floor)

    // la montaña
    this.mountainMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 })
    for (let i = 0; i < PEAKS.length; i++) {
      const main = i === 0
      const g = await mountainGeometry(PEAKS[i], this.opts.mobile ? (main ? 150 : 70) : main ? 190 : 90, this.opts.mobile ? (main ? 180 : 96) : main ? 240 : 128)
      this.scene.add(new Mesh(g, this.mountainMat))
    }
    await nextTask()

    // luces
    this.sun.position.copy(SUN_DIR).multiplyScalar(400)
    this.sun.target.position.set(0, 0, 0)
    this.scene.add(this.sun, this.sun.target, this.hemi, this.lamp)
    this.lamp.color.copy(MIST).lerp(SNOW, 0.5)
    this.hemi.color.copy(HAZE)
    this.hemi.groundColor.copy(ABYSS)

    // el haz de luz
    this.beam = new ShaderMaterial({
      vertexShader: beamVert,
      fragmentShader: beamFrag,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      uniforms: { ...fogU, uTime: { value: 0 }, uIntensity: { value: 0 }, uColor: { value: MIST.clone().lerp(SNOW, 0.5) } },
    })
    const beamGeo = new CylinderGeometry(2.6, 13, 64, 48, 1, true)
    const beam = new Mesh(beamGeo, this.beam)
    beam.position.set(1.5, -32, 3)
    beam.rotation.set(-0.15, 0, -0.05)
    beam.renderOrder = 4
    this.scene.add(beam)

    // las nubes
    for (let i = 0; i < CLOUD_Y.length; i++) {
      const m = new ShaderMaterial({
        vertexShader: cloudVert,
        fragmentShader: cloudFrag,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: {
          ...fogU,
          uTime: { value: 0 },
          uSeed: { value: i * 1.37 + 0.2 },
          uY: { value: CLOUD_Y[i] },
          uCenter: { value: new Vector3(0, CLOUD_Y[i], CLOUD_CENTER_Z) },
          uLit: { value: new Color() },
          uShade: { value: new Color() },
          uOpacity: { value: 0.92 - i * 0.1 },
        },
      })
      this.clouds.push(m)
      const pl = new Mesh(new PlaneGeometry(900, 900, 1, 1), m)
      pl.rotation.x = -Math.PI / 2
      pl.position.set(0, CLOUD_Y[i], CLOUD_CENTER_Z)
      pl.renderOrder = 1 + i
      this.scene.add(pl)
    }
    await nextTask()

    // las partículas: un solo buffer
    const N = this.q.particles
    const rnd = rng(20261118)
    const pp = new Float32Array(N * 3)
    const pr = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      pp[i * 3] = rnd()
      pp[i * 3 + 1] = rnd()
      pp[i * 3 + 2] = rnd()
      pr[i] = rnd()
    }
    const pg = new BufferGeometry()
    pg.setAttribute('position', new BufferAttribute(pp, 3))
    pg.setAttribute('aRand', new BufferAttribute(pr, 1))
    const pm = new ShaderMaterial({
      vertexShader: pointsVert,
      fragmentShader: pointsFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        ...fogU,
        uKind: { value: 0 },
        uTime: { value: 0 },
        uIntensity: { value: 1 },
        uDpr: { value: this.q.dpr },
        uProj: { value: 500 },
        uColor: { value: new Color() },
      },
    })
    this.points = new Points(pg, pm)
    this.points.frustumCulled = false
    this.points.renderOrder = 5
    this.scene.add(this.points)

    // la luna
    this.moon = new Mesh(
      new SphereGeometry(55, 48, 24),
      new ShaderMaterial({
        vertexShader: moonVert,
        fragmentShader: moonFrag,
        uniforms: { uLight: { value: MOON_LIGHT }, uColor: { value: MIST.clone() }, uIntensity: { value: 1 } },
      }),
    )
    this.moon.position.copy(MOON_DIR).multiplyScalar(4300)
    this.scene.add(this.moon)
    await nextTask()

    // la estrella de OCEAN
    this.star = new ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uPos: { value: this.starPos },
        uSizePx: { value: 40 },
        uRes: { value: new Vector2(1, 1) },
        uSdf: { value: bakeStarSDF() },
        // el cuadro mide 3× la media estrella; la textura, 1,15× la estrella entera
        uSpan: { value: 3 / 1.15 },
        uRange: { value: (2 * SDF_RANGE_PX) / SDF_N },
        uIntensity: { value: 0 },
        uColor: { value: WHITE.clone() },
        uFlare: { value: 1 },
      },
    })
    const starMesh = new Mesh(new PlaneGeometry(2, 2), this.star)
    starMesh.frustumCulled = false
    starMesh.renderOrder = 10
    this.scene.add(starMesh)
    await nextTask()

    // la pasada final
    this.fx = new ShaderMaterial({
      vertexShader: finalVert,
      fragmentShader: finalFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: this.rt.texture },
        uSeed: { value: this.seed },
        uGrain: { value: 0.042 },
        uVignette: { value: 0.35 },
        uCamY: { value: 10 },
        uLens: { value: new Vector4() },
        uWaterTint: { value: ABYSS.clone().lerp(SLATE, 0.25) },
        uAirTint: { value: MIST.clone().multiplyScalar(0.5) },
      },
    })
    const fsq = new Mesh(FS_GEO, this.fx)
    fsq.frustumCulled = false
    this.fxScene.add(fsq)

    this.built = true
    this.resize()
    this.apply(0)
  }

  /** Compila cada programa con su destino real (la escena en el buffer intermedio, la pasada final en pantalla). */
  async precompile(): Promise<void> {
    const r = this.renderer
    // las tres clases de partículas usan el mismo programa; la luna y el haz se compilan aunque no estén a la vista
    r.setRenderTarget(this.rt)
    r.compile(this.scene, this.camera)
    r.setRenderTarget(null)
    r.compile(this.fxScene, FS_CAM)
    type Program = { isReady(): boolean }
    const programs = (r.info.programs ?? []) as unknown as Program[]
    if (r.extensions.has('KHR_parallel_shader_compile')) {
      const t0 = performance.now()
      while (!programs.every((p) => p.isReady()) && performance.now() - t0 < 20000) await new Promise((res) => setTimeout(res, 16))
    }
    await nextTask()
  }

  /* ---------------- tamaño ---------------- */
  /** La caja CSS del lienzo (100vw × 100lvh), nunca la ventana: la barra del teléfono mueve innerHeight. */
  private resize(): void {
    this.needsResize = false
    const w = this.canvas.clientWidth || innerWidth
    const h = this.canvas.clientHeight || innerHeight
    if (w === this.width && h === this.height && this.renderer.getPixelRatio() === this.q.dpr) return
    this.width = w
    this.height = h
    this.renderer.setPixelRatio(this.q.dpr)
    this.renderer.setSize(w, h, false)
    const bw = Math.max(1, Math.round(w * this.q.dpr))
    const bh = Math.max(1, Math.round(h * this.q.dpr))
    this.rt.setSize(bw, bh)
    ;(this.star.uniforms.uRes.value as Vector2).set(bw, bh)
    this.lastAspect = -1
  }

  /* ---------------- aplicar la toma ---------------- */
  private apply(dt: number): void {
    const s = this.spring.s
    const P = pose(s, this.p)
    const cam = this.camera
    const C = this.C

    // cámara
    const aspect = this.width / this.height
    const k = 1 - Math.exp(-dt * 3)
    this.pointer.lerp(this.pointerTarget, k)
    cam.position.set(P.x, P.y, P.z)
    cam.rotation.set(P.pitch + this.pointer.y * 0.012, P.yaw - this.pointer.x * 0.02, P.roll * (aspect < 1 ? 0.6 : 1))
    // en vertical se abre el campo para que el horizontal no baje de 40°
    const minH = 40
    const vForH = (2 * Math.atan(Math.tan((minH * Math.PI) / 360) / aspect) * 180) / Math.PI
    const fov = Math.min(80, Math.max(P.fov, vForH))
    const alt = Math.abs(P.y)
    const near = Math.min(1.5, Math.max(0.05, alt * 0.004))
    if (fov !== this.lastFov || near !== this.lastNear || aspect !== this.lastAspect) {
      this.lastFov = fov
      this.lastNear = near
      this.lastAspect = aspect
      cam.fov = fov
      cam.near = near
      cam.aspect = aspect
      cam.updateProjectionMatrix()
      const bh = Math.max(1, Math.round(this.height * this.q.dpr))
      this.points.material.uniforms.uProj.value = bh / (2 * Math.tan((fov * Math.PI) / 360))
    }
    cam.updateMatrixWorld()

    // momentos de la toma
    const camY = P.y
    const under = smoothstep(0.35, -0.35, camY)
    const dawn = smoothstep(0.6, 0.93, s)
    const space = 1 - smoothstep(40, 260, camY)
    const atmo = lerp(0.6, 1.5, dawn)
    const t = this.time

    // cielo
    const su = this.sky.uniforms
    ;(su.uGlow.value as Color).lerpColors(C.glowNight, C.glowDay, dawn)
    ;(su.uGlowOuter.value as Color).lerpColors(C.glowOuterNight, C.glowOuterDay, dawn)
    su.uAtmo.value = atmo
    su.uSun.value = dawn
    ;(su.uZenith.value as Color).lerpColors(C.zenithNight, C.zenithDay, dawn)
    ;(su.uHorizon.value as Color).lerpColors(C.horizonNight, C.horizonDay, dawn)
    su.uDay.value = dawn * (1 - smoothstep(120, 260, camY))
    ;(su.uDeepTop.value as Color).lerpColors(C.deepTop, C.deepTopDawn, smoothstep(0.62, 0.7, s))
    su.uDeepTop.value.multiplyScalar(lerp(1, 0.35, smoothstep(-5, -55, camY)))
    su.uUnder.value = under

    // niebla: aire (de noche o de día), nubes, agua
    const fogAir = lerp(0.00004, lerp(0.0016, 0.0032, dawn), space)
    this.cA.lerpColors(C.fogAirNight, C.fogAirDay, dawn)
    const inCloud = window4(camY, 15.5, 18.5, 26.5, 29.5)
    this.cB.lerpColors(C.fogCloudNight, C.fogCloud, dawn)
    this.cA.lerp(this.cB, inCloud)
    let density = lerp(fogAir, 0.055, inCloud)
    const deep = smoothstep(-3, -55, camY)
    this.cB.lerpColors(C.fogWater, C.fogDeep, deep)
    this.fog.color.lerpColors(this.cA, this.cB, under)
    density = lerp(density, lerp(0.022, 0.034, deep), under)
    this.fog.density = density
    this.fogU.uFogDensity.value = density

    // mar
    const sea = this.sea.uniforms
    sea.uTime.value = t
    sea.uMoon.value = 1 - dawn
    ;(sea.uBody.value as Color).lerpColors(C.bodyNight, C.bodyDay, dawn)
    // desde lo alto el planeta es oscuro: solo su borde se enciende
    sea.uBodyK.value = lerp(1, 0.25, smoothstep(40, 240, camY))
    ;(sea.uWindow.value as Color).lerpColors(C.windowNight, C.windowDay, smoothstep(0.6, 0.7, s))

    // luces: la luna de noche, el sol bajo al amanecer
    this.sun.intensity = lerp(0.35, 3.4, dawn)
    this.hemi.intensity = lerp(0.18, 1.25, dawn)
    // la lámpara va con la cámara, un poco arriba y adelante: la pared aparece en su luz
    const lampOn = under * window4(s, 0.49, 0.55, 0.67, 0.7)
    this.lamp.intensity = lampOn * 260
    this.lamp.visible = true
    this.tmpV.set(0, 4, -2).applyEuler(cam.rotation)
    this.lamp.position.copy(cam.position).add(this.tmpV)

    // la luna, solo en el cielo del espacio y la caída
    this.moon.visible = s < 0.3
    ;(this.moon.material.uniforms.uIntensity as { value: number }).value = 1 - smoothstep(0.16, 0.26, s)

    // haz
    this.beam.uniforms.uTime.value = t
    this.beam.uniforms.uIntensity.value = under * 0.55 * (1 - smoothstep(0.52, 0.6, s))

    // nubes
    for (const m of this.clouds) {
      m.uniforms.uTime.value = t
      ;(m.uniforms.uLit.value as Color).lerpColors(C.fogCloudNight, C.snow, dawn)
      ;(m.uniforms.uShade.value as Color).lerpColors(C.zenithNight, C.fogAirDay, dawn * 0.6)
    }

    // partículas: estrellas → nieve marina → nieve (el cambio, cuando la intensidad es 0)
    const pu = this.points.material.uniforms
    pu.uTime.value = t
    let kind: number
    let inten: number
    if (s < 0.25) {
      kind = 0
      inten = 1 - smoothstep(0.12, 0.2, s)
    } else if (s < 0.695) {
      kind = 1
      inten = window4(s, 0.275, 0.31, 0.66, 0.69)
    } else {
      kind = 2
      inten = smoothstep(0.73, 0.79, s) * 0.45 + smoothstep(0.86, 0.95, s) * 0.25
    }
    pu.uIntensity.value = inten
    if (kind !== this.kind) {
      this.kind = kind
      pu.uKind.value = kind
      ;(pu.uColor.value as Color).copy(kind === 0 ? C.starSpace : kind === 1 ? C.marine : C.snow)
      this.points.material.blending = kind === 2 ? NormalBlending : AdditiveBlending
      // el mismo buffer: las estrellas lo usan entero; la nieve marina y la nieve, una parte
      this.points.geometry.setDrawRange(0, Math.round(this.q.particles * (kind === 0 ? 1 : kind === 1 ? 0.6 : 0.45)))
    }

    // la estrella de OCEAN: en el cielo → la luz del buzo → el destello en la cumbre
    const st = this.star.uniforms
    const dpr = this.q.dpr
    let si = 0
    let size = 30
    if (s < 0.3) {
      // en el infinito, arriba a la derecha del borde de la Tierra
      this.starPos.set(0.42, 0.34, -1).normalize().multiplyScalar(8000).add(cam.position)
      si = 1 - smoothstep(0.12, 0.2, s)
      size = 34
    } else if (s < 0.8) {
      // la luz del buzo: baja delante de la cámara, por el haz
      const u = clamp01((s - 0.36) / 0.19)
      this.starPos.set(lerp(0.5, 3, u), lerp(-23, -52, u), lerp(-2, 6, u))
      si = window4(s, 0.355, 0.4, 0.52, 0.56) * 0.85
      size = 26
    } else {
      // el primer destello del sol sobre el hielo, en la cumbre, un poco hacia la cámara
      this.tmpV.copy(cam.position).sub(PEAK).normalize().multiplyScalar(2.5)
      this.starPos.copy(PEAK).add(this.tmpV)
      this.starPos.y += 0.6
      si = smoothstep(0.88, 0.96, s)
      size = lerp(18, 46, smoothstep(0.88, 1, s))
    }
    st.uIntensity.value = si
    st.uSizePx.value = size * dpr * (this.width < 600 ? 0.8 : 1)

    // la línea del agua en el lente (0,6 m delante de la cámara): la altura de los rayos de las cuatro esquinas
    const e = cam.matrixWorld.elements
    const th = Math.tan((cam.fov * Math.PI) / 360)
    const L = 0.6
    const ry = (nx: number, ny: number) => L * (e[1] * nx * th * aspect + e[5] * ny * th - e[9])
    ;(this.fx.uniforms.uLens.value as Vector4).set(ry(-1, -1), ry(1, -1), ry(-1, 1), ry(1, 1))
    this.fx.uniforms.uCamY.value = camY
  }

  /* ---------------- el bucle ---------------- */
  /** Arranca el bucle (si ya corre, solo cuenta como actividad: nunca hay dos bucles). */
  start(): void {
    this.wake()
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.sleeping = true
  }

  /** Algo pasó (scroll, rueda, puntero, toque, tamaño): el bucle despierta si dormía. */
  wake = (): void => {
    if (this.disposed || !this.built) return
    this.lastActive = performance.now()
    if (this.sleeping && !document.hidden && this.raf === 0) {
      this.sleeping = false
      this.last = this.lastActive
      this.raf = requestAnimationFrame(this.loop)
    }
  }

  setPointer(x: number, y: number): void {
    if (this.seekValue !== null) return
    this.pointerTarget.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)))
    this.wake()
  }

  private loop = (now: number): void => {
    this.rafs++
    this.raf = 0
    if (document.hidden) {
      this.sleeping = true
      return
    }
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.opts.lenis?.raf(now)
    if (this.needsResize) this.resize()
    const target = this.seekValue ?? this.opts.track.shotAt(scrollY)
    const moving = this.seekValue === null && this.spring.step(target, dt)
    const pointerMoving = Math.abs(this.pointer.x - this.pointerTarget.x) + Math.abs(this.pointer.y - this.pointerTarget.y) > 1e-3
    if (moving || pointerMoving || this.opts.lenis?.isScrolling) this.lastActive = now
    const idle = now - this.lastActive
    this.acc += dt
    if (idle > 4000 && this.renders > 0) {
      // duerme: el último cuadro queda en pantalla, con su grano
      this.sleeping = true
      return
    }
    this.raf = requestAnimationFrame(this.loop)
    // en reposo, un cuadro de cada dos (30 fps)
    if (idle > 400 && (this.odd = !this.odd)) return
    const step = this.acc
    this.acc = 0
    if (this.seekValue === null) {
      this.time += step
      this.frame++
      this.seed = (this.frame * 0.6180339) % 1
    }
    this.apply(step)
    this.render()
    if (this.opts.trace) this.samples.push({ t: now, s: this.spring.s, target, y: scrollY, cx: this.camera.position.x, cy: this.camera.position.y, cz: this.camera.position.z })
    if (this.seekWaiters.length) {
      const w = this.seekWaiters
      this.seekWaiters = []
      requestAnimationFrame(() => w.forEach((f) => f()))
    }
  }

  private render(): void {
    this.fx.uniforms.uSeed.value = this.seed
    const r = this.renderer
    r.setRenderTarget(this.rt)
    r.render(this.scene, this.camera)
    r.setRenderTarget(null)
    r.render(this.fxScene, FS_CAM)
    this.renders++
  }

  /* ---------------- QA ---------------- */
  get shot(): number {
    return this.spring.s
  }
  get isSleeping(): boolean {
    return this.sleeping
  }
  get dpr(): number {
    return this.q.dpr
  }
  get particleCount(): number {
    return this.q.particles
  }

  /** Posa la toma en `s` sin resorte (y lleva el scroll a su lugar); se resuelve cuando ese cuadro ya se pintó.
   *  `time` (opcional, QA de película) fija el reloj de las partículas, el agua y el grano para ese cuadro. */
  seek(s: number, time?: number): Promise<void> {
    if (time !== undefined) {
      this.time = time
      this.seed = (time * 7.31) % 1
    }
    this.seekValue = Math.min(1, Math.max(0, s))
    this.spring.reset(this.seekValue)
    scrollTo(0, this.opts.track.scrollFor(this.seekValue))
    return new Promise((res) => {
      this.seekWaiters.push(res)
      this.wake()
    })
  }

  /** Mide n cuadros completos (escena + pasada final), cada uno esperado con la lectura de un píxel (gl.finish() no
   *  espera en todos los navegadores): ms por cuadro (mediana). Solo QA. */
  bench(n = 6): number {
    const gl = this.renderer.getContext()
    const px = new Uint8Array(4)
    const ts: number[] = []
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    for (let i = 0; i < n; i++) {
      const t0 = performance.now()
      this.apply(1 / 60)
      this.render()
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
      ts.push(performance.now() - t0)
    }
    ts.sort((a, b) => a - b)
    return ts[ts.length >> 1]
  }

  dispose(): void {
    this.disposed = true
    this.stop()
    this.ro.disconnect()
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    this.scene.traverse((o) => {
      const m = o as Mesh
      if (m.geometry && m.geometry !== FS_GEO) m.geometry.dispose()
      const mat = m.material as Material | Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose()
    })
    ;(this.star.uniforms.uSdf.value as DataTexture).dispose()
    this.fx.dispose()
    this.rt.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}

export async function createWorld(canvas: HTMLCanvasElement, opts: WorldOptions): Promise<World> {
  const w = new World(canvas, opts)
  await w.init()
  await w.precompile()
  return w
}
