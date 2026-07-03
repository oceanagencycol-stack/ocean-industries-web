/* ============================================================================
   OCÉANO 3D — Ocean Industries
   Campo de olas en WebGL puro (cero dependencias). Miles de puntos desplazados
   por ondas sinusoidales superpuestas, coloreados por altura con el gradiente
   de marca (azul profundo → azul eléctrico → verde neón) y con un ripple que
   sigue al cursor. "We turn brands into waves", literal.

   Rendimiento:
   - Densidad adaptativa (menos puntos en móvil), DPR limitado a 1.5.
   - Se pausa cuando el hero sale del viewport o la pestaña se oculta.
   - prefers-reduced-motion → un solo frame estático (sin animación).
   - Si WebGL no está disponible, no hace nada (quedan las auroras CSS).
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("oceanCanvas");
  var hero = document.getElementById("hero");
  if (!canvas || !hero) return;

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  if (!gl) return;

  /* ---------- Shaders ---------- */
  var VS = [
    "precision mediump float;",
    "attribute vec2 aGrid;", // x ∈ [-1,1], z ∈ [0,1]
    "uniform float uTime;",
    "uniform float uAspect;",
    "uniform float uSpan;", // semiancho del campo en X
    "uniform float uDepth;", // profundidad del campo en Z
    "uniform float uDpr;",
    "uniform vec2  uMouse;", // posición del cursor en el plano (mundo XZ)
    "uniform float uMAmp;", // intensidad del ripple (0..1)
    "varying float vH;", // altura normalizada para color
    "varying float vFog;",
    "varying float vGlow;", // energía extra cerca del cursor
    "",
    "float waves(vec2 p, float t){",
    "  float h = 0.0;",
    "  h += 0.30 * sin(dot(p, vec2( 0.32, 0.18)) + t * 0.9);", // marejada larga
    "  h += 0.18 * sin(dot(p, vec2(-0.24, 0.42)) + t * 1.3);",
    "  h += 0.10 * sin(dot(p, vec2( 0.75,-0.55)) + t * 1.9);",
    "  h += 0.05 * sin(dot(p, vec2(-1.60, 1.10)) + t * 2.6);", // chop fino
    "  return h;",
    "}",
    "",
    "void main(){",
    "  vec2 p = vec2(aGrid.x * uSpan, -aGrid.y * uDepth);", // mundo XZ (z hacia -∞)
    "  float t = uTime;",
    "  float h = waves(p.xy, t);",
    "",
    "  float md = distance(p, uMouse);",
    "  float rip = exp(-md * md * 0.30) * sin(md * 5.5 - t * 5.0) * 0.42;",
    "  float lift = exp(-md * md * 0.18) * 0.22;",
    "  h += (rip + lift) * uMAmp;",
    "  vGlow = exp(-md * md * 0.22) * uMAmp;",
    "",
    "  vH = clamp((h + 0.55) / 1.25, 0.0, 1.0);",
    "",
    "  // Cámara: baja, mirando hacia el horizonte con leve picada",
    "  vec3 world = vec3(p.x, h, p.y);",
    "  vec3 cam = vec3(0.0, 2.55, 2.0);",
    "  vec3 v = world - cam;",
    "  float cp = 0.976, sp = -0.218;", // pitch ≈ -12.6°
    "  float vy = v.y * cp - v.z * sp;",
    "  float vz = v.y * sp + v.z * cp;",
    "  v = vec3(v.x, vy, vz);",
    "  if (v.z > -0.1) v.z = -0.1;",
    "",
    "  float f = 1.9626;", // 1/tan(fov/2), fov ≈ 54°
    "  gl_Position = vec4(v.x * f / uAspect, v.y * f, 0.0, -v.z);",
    "",
    "  float dist = -v.z;",
    "  vFog = smoothstep(6.0, 26.0, dist);",
    "  // desvanecer también en los bordes laterales",
    "  vFog = max(vFog, smoothstep(0.72, 1.0, abs(aGrid.x)));",
    "",
    "  float sz = (4.5 + vH * 2.4 + vGlow * 3.0) * uDpr * f / dist;",
    "  gl_PointSize = clamp(sz, 2.0, 16.0 * uDpr);",
    "}",
  ].join("\n");

  var FS = [
    "precision mediump float;",
    "varying float vH;",
    "varying float vFog;",
    "varying float vGlow;",
    "",
    "void main(){",
    "  vec2 c = gl_PointCoord - 0.5;",
    "  float d = dot(c, c);",
    "  if (d > 0.25) discard;",
    "  float soft = smoothstep(0.25, 0.05, d);",
    "",
    "  vec3 deep    = vec3(0.043, 0.122, 0.549);", // #0B1F8C
    "  vec3 electric= vec3(0.0,   0.0,   1.0  );", // #0000FF
    "  vec3 crest   = vec3(0.0,   1.0,   0.498);", // #00FF7F
    "  vec3 col = mix(deep, electric, smoothstep(0.05, 0.55, vH));",
    "  col = mix(col, crest, smoothstep(0.62, 0.97, vH));",
    "  col = mix(col, crest, vGlow * 0.85);", // energía bajo el cursor
    "",
    "  float a = soft * (1.0 - vFog) * (0.55 + vH * 0.55 + vGlow * 0.4);",
    "  gl_FragColor = vec4(col * a, a);", // premultiplicado para blending aditivo suave
    "}",
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VS);
  var fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  /* ---------- Malla de puntos ---------- */
  var isSmall = Math.min(screen.width, innerWidth) < 768;
  var COLS = isSmall ? 130 : 240;
  var ROWS = isSmall ? 80 : 150;
  var N = COLS * ROWS;
  var data = new Float32Array(N * 2);
  var i = 0;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      data[i++] = (c / (COLS - 1)) * 2.0 - 1.0; // x: -1..1
      data[i++] = r / (ROWS - 1); //              z:  0..1
    }
  }
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  var locGrid = gl.getAttribLocation(prog, "aGrid");
  gl.enableVertexAttribArray(locGrid);
  gl.vertexAttribPointer(locGrid, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ["uTime", "uAspect", "uSpan", "uDepth", "uDpr", "uMouse", "uMAmp"].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // aditivo premultiplicado
  gl.clearColor(0, 0, 0, 0);

  /* ---------- Cámara / proyección inversa para el cursor ---------- */
  var CAM = { x: 0, y: 2.55, z: 2.0 };
  var PITCH_C = 0.976, PITCH_S = -0.218, F = 1.9626;
  var DEPTH = 26.0;
  var dpr = 1, aspect = 1, span = 16;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    var w = hero.clientWidth, h = hero.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    aspect = w / Math.max(h, 1);
    span = Math.max(15, 12.5 * aspect);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(U.uAspect, aspect);
    gl.uniform1f(U.uSpan, span);
    gl.uniform1f(U.uDepth, DEPTH);
    gl.uniform1f(U.uDpr, dpr);
  }

  // Proyecta el cursor de pantalla al plano y=0 del océano (rayo exacto)
  function screenToSea(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    var ny = 1 - ((clientY - rect.top) / rect.height) * 2;
    var dx = (nx * aspect) / F, dy = ny / F, dz = -1;
    // des-rotar el pitch (inversa: cp, -sp)
    var wy = dy * PITCH_C + dz * PITCH_S;
    var wz = -dy * PITCH_S + dz * PITCH_C;
    var t = -CAM.y / wy;
    if (!(t > 0)) t = 1e4;
    t = Math.min(t, 60);
    return [CAM.x + dx * t, CAM.z + wz * t];
  }

  /* ---------- Estado de interacción ---------- */
  var mouse = [0, -9.5], mouseT = [0, -9.5];
  var mAmp = 0, mAmpT = 0;

  function onMove(e) {
    var p = e.touches ? e.touches[0] : e;
    mouseT = screenToSea(p.clientX, p.clientY);
    mAmpT = 1;
  }
  function onLeave() { mAmpT = 0; }

  if (!reduced) {
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave, { passive: true });
    hero.addEventListener("touchmove", onMove, { passive: true });
    hero.addEventListener("touchend", onLeave, { passive: true });
  }

  /* ---------- Loop ---------- */
  var t0 = performance.now();
  var raf = null;
  var visible = true;

  function frame(now) {
    raf = null;
    var t = ((now - t0) / 1000) * 0.85;
    mouse[0] += (mouseT[0] - mouse[0]) * 0.08;
    mouse[1] += (mouseT[1] - mouse[1]) * 0.08;
    mAmp += (mAmpT - mAmp) * 0.05;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.uTime, t);
    gl.uniform2f(U.uMouse, mouse[0], mouse[1]);
    gl.uniform1f(U.uMAmp, mAmp);
    gl.drawArrays(gl.POINTS, 0, N);

    if (visible && !document.hidden && !reduced) raf = requestAnimationFrame(frame);
  }

  function play() { if (!raf && !reduced) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  var io = new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible) play(); else stop();
  }, { threshold: 0.02 });
  io.observe(hero);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else if (visible) play();
  });

  var rT;
  addEventListener("resize", function () {
    clearTimeout(rT);
    rT = setTimeout(function () { resize(); if (reduced) frame(t0 + 9000); }, 120);
  }, { passive: true });

  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); stop(); }, false);

  /* ---------- Arranque ---------- */
  resize();
  if (reduced) {
    frame(t0 + 9000); // un solo frame estático, sin movimiento
  } else {
    play();
  }
  canvas.classList.add("on");
})();
