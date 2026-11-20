/**
 * El escenario de la v4: UNA sola cámara para toda la web.
 *
 *   película (video, buscada por scroll) ─┐
 *                                        ├─ shader: encuadre «cover» con foco, desenfoque radial por velocidad,
 *   partículas por medio (estrellas,     │   aberración en los bordes, gradación por capítulo, viñeta, grano,
 *   nieve marina, burbujas, nieve) ──────┘   destello de cruce y fundido a blanco/negro
 *
 * El video no se reproduce: se busca. `want` es el segundo que pide el relato; el escenario encadena búsquedas (una a la
 * vez, la siguiente cuando llega `seeked`) y sube la textura solo cuando cambió el cuadro. Entre cuadros, la velocidad del
 * scroll pinta el movimiento (desenfoque y partículas): es lo que hace que no se sienta una diapositiva.
 * Nada asigna memoria dentro del loop.
 */

export interface Look {
  exposure: number
  contrast: number
  saturation: number
  tint: [number, number, number]
  vignette: number
  grain: number
  /** 0 nada, + hacia blanco, − hacia negro */
  fade: number
}

export interface Medium {
  /** pesos: espacio, aire, agua, nieve (suman ~1) */
  w: [number, number, number, number]
}

export interface StageFrame {
  t: number
  vel: number
  focus: [number, number]
  zoom: number
  look: Look
  medium: Medium
  flash: number
}

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }`

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex, uNext;
uniform float uMix;
uniform vec2 uRes, uVid, uFocus, uShift;
uniform float uZoom, uVel, uTime, uExposure, uContrast, uSat, uVig, uGrain, uFade, uFlash, uReady;
uniform vec3 uTint;

vec2 cover(vec2 uv){
  float sa = uRes.x/uRes.y, va = uVid.x/uVid.y;
  vec2 s = sa > va ? vec2(1., va/sa) : vec2(sa/va, 1.);
  s /= uZoom;
  vec2 c = clamp(uFocus + uShift*s*0.5, s*0.5, 1.-s*0.5);
  return c + (uv-0.5)*s;
}
float hash(vec2 p){ p = fract(p*vec2(443.897,441.423)); p += dot(p,p.yx+19.19); return fract((p.x+p.y)*p.x); }

void main(){
  vec2 uv = cover(vUv);
  vec2 ctr = cover(vec2(0.5, 0.5));
  float v = clamp(abs(uVel), 0., 1.);
  // desenfoque radial: la cámara corre hacia (o se aleja de) el centro
  vec2 dir = (uv - ctr) * (0.027 * v) * sign(uVel + 1e-4);
  vec3 col;
  if (v < 0.012) {
    col = texture(uTex, uv).rgb;
    if (uMix > 0.) col = mix(col, texture(uNext, uv).rgb, uMix);
  } else {
    vec3 acc = vec3(0.); float wsum = 0.;
    for (int i = 0; i < 5; i++){
      float k = float(i)/4.;
      float w = 1. - k*0.65;
      acc += texture(uTex, uv - dir*k).rgb * w;
      wsum += w;
    }
    col = acc / wsum;
  }
  // aberración cromática solo en los bordes y solo cuando hay movimiento
  vec2 e = (vUv - 0.5);
  float ca = dot(e,e) * (0.004*v);
  col.r = mix(col.r, texture(uTex, uv + e*ca).r, 0.85);
  col.b = mix(col.b, texture(uTex, uv - e*ca).b, 0.85);
  // brillo suave: lo que pasa de 0.72 se abre un poco
  vec3 hi = max(col - 0.72, 0.);
  col += hi * (0.55 + 0.9*v);
  // gradación
  col *= uExposure;
  col = (col - 0.5) * uContrast + 0.5;
  float l = dot(col, vec3(0.2126,0.7152,0.0722));
  col = mix(vec3(l), col, uSat);
  col *= uTint;
  // destello de cruce (superficie, atmósfera)
  col += uFlash * vec3(0.92, 0.97, 1.0);
  // viñeta
  float d = length(e*vec2(1.0, 0.82));
  col *= mix(1., smoothstep(0.98, 0.18, d), uVig);
  // fundido
  col = uFade >= 0. ? mix(col, vec3(0.878,0.906,0.929), uFade) : mix(col, vec3(0.012,0.024,0.047), -uFade);
  // grano animado
  float g = hash(vUv*uRes + fract(uTime*7.31)*91.7) - 0.5;
  col += g * uGrain;
  // antes del primer cuadro: la noche
  col = mix(vec3(0.012,0.024,0.047), col, uReady);
  o = vec4(clamp(col, 0., 1.), 1.);
}`

// partículas: cada una es (x, y, z0, semilla). La cámara viaja por z (uTravel); el medio decide color, deriva y tamaño.
const PVERT = `#version 300 es
precision highp float;
in vec4 aP;
in float aEnd;
uniform vec2 uRes, uShift;
uniform float uTravel, uVel, uTime, uStreak;
uniform vec4 uW;
out float vA;
out float vEnd;
void main(){
  float z = fract(aP.z - uTravel*(0.35 + aP.w*0.3));
  z = mix(0.06, 1.0, z);
  vec2 p = aP.xy;
  // deriva por medio: el agua sube (la cámara baja), la nieve cae y se va con el viento, el espacio queda
  float t = uTime;
  vec2 drift = uW.z * vec2(sin(t*0.3 + aP.w*20.)*0.03, fract(aP.w*7. + t*0.025)*2.0 - 1.0)
             + uW.w * vec2(fract(aP.w*3. - t*0.04)*2.0-1.0, -(fract(aP.w*11. + t*0.06)*2.0-1.0));
  p = mix(p, drift, clamp(uW.z + uW.w, 0., 1.));
  float zz = z + aEnd * uStreak * (0.02 + abs(uVel)*0.25);
  vec2 s = p / zz;
  s += uShift * (0.08 / zz);
  s.x *= uRes.y / uRes.x;
  gl_Position = vec4(s, 0., 1.);
  float near = 1. - z;
  gl_PointSize = mix(1.0, 3.6, near*near) * (uW.x*0.7 + uW.y*0.6 + uW.z*1.15 + uW.w*1.6) * (uRes.y/900.);
  vA = near * (0.25 + 0.75*fract(aP.w*13.)) * smoothstep(1.0, 0.75, z);
  vEnd = aEnd;
}`

const PFRAG = `#version 300 es
precision highp float;
in float vA;
in float vEnd;
uniform vec4 uW;
uniform float uAlpha, uLines;
out vec4 o;
void main(){
  vec3 c = uW.x*vec3(0.85,0.9,1.0) + uW.y*vec3(0.8,0.88,1.0) + uW.z*vec3(0.62,0.82,1.0) + uW.w*vec3(1.0);
  float a = vA * uAlpha;
  if (uLines < 0.5) {
    vec2 q = gl_PointCoord - 0.5;
    a *= smoothstep(0.5, 0.0, length(q));
  } else {
    a *= mix(1.0, 0.0, vEnd);
  }
  o = vec4(c * a, a);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
  return s
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link')
  return p
}

export interface Stage {
  /** el segundo de la película que se quiere ver */
  render(f: StageFrame, mouse: [number, number], dt: number): void
  resize(): void
  readonly video: HTMLVideoElement
  readonly software: boolean
  readonly ready: boolean
  destroy(): void
}

export function createStage(canvas: HTMLCanvasElement, video: HTMLVideoElement, poster: HTMLImageElement | null, lite: boolean): Stage | null {
  const ctx = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false })
  if (!ctx) return null
  const gl: WebGL2RenderingContext = ctx
  let prog: WebGLProgram, pprog: WebGLProgram
  try {
    prog = program(gl, VERT, FRAG)
    pprog = program(gl, PVERT, PFRAG)
  } catch (e) {
    console.warn('[ocean] stage', e)
    return null
  }

  // pantalla completa: un triángulo
  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  // partículas: N puntos, y las mismas como segmentos (2 vértices) para las estelas
  const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info')
  const software = !!rendererInfo && /swiftshader|llvmpipe|software rasterizer/i.test(
    String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)),
  )
  const N = software ? 160 : lite ? 520 : 1400
  const pts = new Float32Array(N * 4)
  for (let i = 0; i < N; i++) {
    pts[i * 4] = (Math.random() * 2 - 1) * 1.6
    pts[i * 4 + 1] = (Math.random() * 2 - 1) * 1.1
    pts[i * 4 + 2] = Math.random()
    pts[i * 4 + 3] = Math.random()
  }
  const seg = new Float32Array(N * 2 * 5)
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 2; k++) {
      const o = (i * 2 + k) * 5
      seg[o] = pts[i * 4]
      seg[o + 1] = pts[i * 4 + 1]
      seg[o + 2] = pts[i * 4 + 2]
      seg[o + 3] = pts[i * 4 + 3]
      seg[o + 4] = k
    }
  }
  const segBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, segBuf)
  gl.bufferData(gl.ARRAY_BUFFER, seg, gl.STATIC_DRAW)
  const pvao = gl.createVertexArray()!
  gl.bindVertexArray(pvao)
  const aP = gl.getAttribLocation(pprog, 'aP')
  const aEnd = gl.getAttribLocation(pprog, 'aEnd')
  gl.enableVertexAttribArray(aP)
  gl.vertexAttribPointer(aP, 4, gl.FLOAT, false, 20, 0)
  gl.enableVertexAttribArray(aEnd)
  gl.vertexAttribPointer(aEnd, 1, gl.FLOAT, false, 20, 16)
  gl.bindVertexArray(null)

  function frameTexture() {
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    return { texture, frame: -1, width: 1, height: 1 }
  }
  const pair = [frameTexture(), frameTexture()]
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n)
  const u = {
    tex: U(prog, 'uTex'), next: U(prog, 'uNext'), mix: U(prog, 'uMix'), res: U(prog, 'uRes'), vid: U(prog, 'uVid'), focus: U(prog, 'uFocus'), shift: U(prog, 'uShift'),
    zoom: U(prog, 'uZoom'), vel: U(prog, 'uVel'), time: U(prog, 'uTime'), exposure: U(prog, 'uExposure'),
    contrast: U(prog, 'uContrast'), sat: U(prog, 'uSat'), vig: U(prog, 'uVig'), grain: U(prog, 'uGrain'),
    fade: U(prog, 'uFade'), flash: U(prog, 'uFlash'), tint: U(prog, 'uTint'), ready: U(prog, 'uReady'),
  }
  const pu = {
    res: U(pprog, 'uRes'), shift: U(pprog, 'uShift'), travel: U(pprog, 'uTravel'), vel: U(pprog, 'uVel'),
    time: U(pprog, 'uTime'), streak: U(pprog, 'uStreak'), w: U(pprog, 'uW'), alpha: U(pprog, 'uAlpha'), lines: U(pprog, 'uLines'),
  }

  let vidW = 16, vidH = 9
  let hasFrame = false
  let uploaded = -1
  let requested = 0
  const floor = software ? 0.32 : 0.55
  let quality = software ? 0.55 : 1
  let slow = 0
  let lastRender = 0
  let seeking = false
  let want = 0
  let ready = 0
  let travel = 0
  let clock = 0
  let shiftX = 0, shiftY = 0

  const upload = (src: TexImageSource, w: number, h: number) => {
    // Preserve the neighbour closest to the sample we are about to upload.
    const slot = pair[0].frame < 0 ? pair[0] : pair[1].frame < 0 ? pair[1]
      : Math.abs(pair[0].frame - requested) >= Math.abs(pair[1].frame - requested) ? pair[0] : pair[1]
    gl.bindTexture(gl.TEXTURE_2D, slot.texture)
    if (slot.width === w && slot.height === h) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    slot.width = w
    slot.height = h
    slot.frame = src === video ? requested : -1
    vidW = w
    vidH = h
    hasFrame = true
  }
  if (poster) {
    const usePoster = () => {
      if (!hasFrame && poster.naturalWidth) upload(poster, poster.naturalWidth, poster.naturalHeight)
    }
    if (poster.complete) usePoster()
    else poster.addEventListener('load', usePoster, { once: true })
  }

  // Consume the completed decode before starting another seek. Setting currentTime
  // first invalidates HAVE_CURRENT_DATA, which can leave the texture on the poster.
  function publish() {
    if (video.readyState < 2 || !video.videoWidth || video.seeking) return
    if (uploaded !== requested) {
      upload(video, video.videoWidth, video.videoHeight)
      uploaded = requested
    }
  }
  function onSeeked() {
    seeking = false
    publish()
    seek()
  }
  video.addEventListener('seeked', onSeeked)
  video.addEventListener('loadeddata', publish)

  function seek() {
    if (!Number.isFinite(video.duration) || video.readyState < 1 || seeking) return
    const last = Math.ceil(video.duration * 24) - 1
    const position = Math.min(want * 24, last)
    let target = Math.round(position)
    if (pair[0].frame === target || pair[1].frame === target) {
      target = target > position ? Math.floor(position) : Math.ceil(position)
      if (pair[0].frame === target || pair[1].frame === target) return
    }
    requested = target
    seeking = true
    video.currentTime = Math.min(video.duration - 0.001, (target + 0.25) / 24)
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.6)
    const w = Math.round(canvas.clientWidth * dpr * quality)
    const h = Math.round(canvas.clientHeight * dpr * quality)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
  }

  function render(f: StageFrame, mouse: [number, number], dt: number) {
    clock += dt
    want = f.t
    seek()
    const now = performance.now()
    if (lastRender && now - lastRender > 37 && now - lastRender < 2500) slow++
    else slow = Math.max(0, slow - 1)
    if (slow >= 5 && quality > floor) {
      quality = Math.max(floor, quality * 0.8)
      resize()
      slow = 0
    }
    lastRender = now
    ready += ((hasFrame ? 1 : 0) - ready) * Math.min(1, dt * 3)

    // la cámara «respira» con el puntero: un desplazamiento chico y amortiguado
    const k = Math.min(1, dt * 2.4)
    shiftX += (mouse[0] * 0.06 - shiftX) * k
    shiftY += (mouse[1] * 0.04 - shiftY) * k

    const W = canvas.width, H = canvas.height
    gl.viewport(0, 0, W, H)
    gl.disable(gl.BLEND)
    gl.useProgram(prog)
    gl.bindVertexArray(vao)
    gl.activeTexture(gl.TEXTURE0)
    const sample = want * 24
    const nearest = pair[1].frame >= 0 && Math.abs(pair[1].frame - sample) < Math.abs(pair[0].frame - sample) ? 1 : 0
    const first = pair[nearest], second = pair[1 - nearest]
    const step = second.frame - first.frame
    const blend = second.frame >= 0 && Math.abs(step) === 1
      ? Math.max(0, Math.min(1, (sample - first.frame) / step)) : 0
    gl.bindTexture(gl.TEXTURE_2D, first.texture)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, second.texture)
    gl.uniform1i(u.tex, 0)
    gl.uniform1i(u.next, 1)
    gl.uniform1f(u.mix, blend)
    gl.uniform2f(u.res, W, H)
    gl.uniform2f(u.vid, vidW, vidH)
    gl.uniform2f(u.focus, f.focus[0], 1 - f.focus[1])
    gl.uniform2f(u.shift, shiftX, -shiftY)
    gl.uniform1f(u.zoom, f.zoom)
    gl.uniform1f(u.vel, f.vel)
    gl.uniform1f(u.time, clock)
    const L = f.look
    gl.uniform1f(u.exposure, L.exposure)
    gl.uniform1f(u.contrast, L.contrast)
    gl.uniform1f(u.sat, L.saturation)
    gl.uniform1f(u.vig, L.vignette)
    gl.uniform1f(u.grain, L.grain)
    gl.uniform1f(u.fade, L.fade)
    gl.uniform1f(u.flash, f.flash)
    gl.uniform3f(u.tint, L.tint[0], L.tint[1], L.tint[2])
    gl.uniform1f(u.ready, ready)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // partículas
    const w = f.medium.w
    const strength = w[0] + w[1] + w[2] + w[3]
    if (strength > 0.01) {
      travel += dt * (0.012 + Math.abs(f.vel) * 0.9) * Math.sign(f.vel || 1)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(pprog)
      gl.bindVertexArray(pvao)
      gl.uniform2f(pu.res, W, H)
      gl.uniform2f(pu.shift, shiftX, -shiftY)
      gl.uniform1f(pu.travel, travel)
      gl.uniform1f(pu.vel, f.vel)
      gl.uniform1f(pu.time, clock)
      gl.uniform4f(pu.w, w[0], w[1], w[2], w[3])
      // puntos
      gl.uniform1f(pu.streak, 0)
      gl.uniform1f(pu.lines, 0)
      gl.uniform1f(pu.alpha, 0.9 * Math.min(1, strength) * (1 - Math.max(0, f.look.fade) * 0.6))
      gl.drawArrays(gl.POINTS, 0, N * 2)
      // estelas: solo cuando hay velocidad
      const v = Math.abs(f.vel)
      if (v > 0.04) {
        gl.uniform1f(pu.streak, 1)
        gl.uniform1f(pu.lines, 1)
        gl.uniform1f(pu.alpha, Math.min(1, v * 2.2) * 0.75 * Math.min(1, strength))
        gl.drawArrays(gl.LINES, 0, N * 2)
      }
      gl.bindVertexArray(null)
    }
  }

  resize()
  return {
    render,
    software,
    resize,
    video,
    get ready() {
      return uploaded >= 0
    },
    destroy() {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('loadeddata', publish)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
