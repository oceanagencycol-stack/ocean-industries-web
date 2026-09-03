/* =========================================================================
   OCEAN SOUND — diseño sonoro sintetizado
   Cero archivos de audio: todo se genera con osciladores y ruido filtrado.
   Pesa lo que pesa este archivo y suena igual en cualquier conexión.

   Reglas de la casa:
   · El contexto solo arranca tras un gesto real del usuario (política del navegador).
   · Todo pasa por un bus con compresor, para que nada pique.
   · Silencio por defecto si el usuario pidió menos movimiento.
   · El control de sonido siempre es visible y recordado.
   ========================================================================= */
(function (global) {
"use strict";

const LLAVE = "ocean-sonido";
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

let ctx = null, bus = null, comp = null, listo = false;
let encendido = leerPreferencia();

function leerPreferencia() {
  try {
    const v = localStorage.getItem(LLAVE);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch (e) {}
  return !reducido;                     // por defecto: encendido, salvo movimiento reducido
}
function guardarPreferencia(v) { try { localStorage.setItem(LLAVE, v ? "1" : "0"); } catch (e) {} }

function arrancar() {
  if (listo) return true;
  const AC = global.AudioContext || global.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 8;
  comp.attack.value = 0.003; comp.release.value = 0.22;
  bus = ctx.createGain();
  bus.gain.value = 0.55;
  bus.connect(comp).connect(ctx.destination);
  listo = true;
  return true;
}

// el primer gesto del usuario despierta el audio
["pointerdown", "keydown", "touchstart"].forEach(ev =>
  addEventListener(ev, function despertar() {
    arrancar();
    if (ctx && ctx.state === "suspended") ctx.resume();
    ["pointerdown", "keydown", "touchstart"].forEach(e2 => removeEventListener(e2, despertar));
  }, { once: false, passive: true })
);

const ahora = () => ctx.currentTime;

/* ---------------------------------------------------------- bloques básicos */
function env(g, t, { a = 0.004, d = 0.09, pico = 1, sostenido = 0 } = {}) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, pico), t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sostenido || 0.0001), t + a + d);
  return t + a + d;
}

function tono({ f = 440, tipo = "sine", dur = 0.09, vol = 0.3, glide = 0, retardo = 0, pan = 0 } = {}) {
  if (!puedeSonar()) return;
  const t = ahora() + retardo;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * glide), t + dur);
  let nodo = g;
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); nodo = p;
  }
  o.connect(g); nodo.connect(bus);
  env(g, t, { a: 0.003, d: dur, pico: vol });
  o.start(t); o.stop(t + dur + 0.06);
}

function ruido({ dur = 0.12, vol = 0.18, corte = 2400, q = 1.2, tipo = "bandpass", barrido = 0, retardo = 0 } = {}) {
  if (!puedeSonar()) return;
  const t = ahora() + retardo;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.setValueAtTime(corte, t); f.Q.value = q;
  if (barrido) f.frequency.exponentialRampToValueAtTime(Math.max(60, corte * barrido), t + dur);
  const g = ctx.createGain();
  src.connect(f).connect(g).connect(bus);
  env(g, t, { a: 0.002, d: dur, pico: vol });
  src.start(t); src.stop(t + dur + 0.05);
}

function puedeSonar() {
  if (!encendido) return false;
  if (!listo && !arrancar()) return false;
  if (ctx.state === "suspended") ctx.resume();
  return true;
}

/* ------------------------------------------------------------------ paleta
   Cada sonido tiene una intención. No hay dos que se parezcan por accidente. */
const SONIDOS = {
  /* toque ligero al pasar por encima: casi subliminal */
  roce()   { ruido({ dur: 0.05, vol: 0.05, corte: 5200, q: 0.9 }); },

  /* clic mecánico: transitorio corto + cuerpo */
  toque()  { ruido({ dur: 0.035, vol: 0.16, corte: 3400, q: 1.6 });
             tono({ f: 640, tipo: "triangle", dur: 0.05, vol: 0.16, glide: 0.6 }); },

  /* muesca del dial: el tic de un potenciómetro con detentes */
  muesca() { ruido({ dur: 0.022, vol: 0.11, corte: 6200, q: 3.2 });
             tono({ f: 1180, tipo: "square", dur: 0.02, vol: 0.05 }); },

  /* apertura: barrido ascendente, el material que se despliega */
  abrir()  { tono({ f: 300, tipo: "sine", dur: 0.20, vol: 0.16, glide: 2.1 });
             ruido({ dur: 0.24, vol: 0.07, corte: 700, q: 0.7, barrido: 4.5 }); },

  /* cierre: el mismo gesto al revés */
  cerrar() { tono({ f: 620, tipo: "sine", dur: 0.17, vol: 0.13, glide: 0.42 });
             ruido({ dur: 0.18, vol: 0.05, corte: 3200, q: 0.7, barrido: 0.22 }); },

  /* confirmación: tercera mayor ascendente, breve */
  bien()   { tono({ f: 587.33, tipo: "sine", dur: 0.11, vol: 0.20 });
             tono({ f: 880.00, tipo: "sine", dur: 0.16, vol: 0.17, retardo: 0.075 });
             tono({ f: 1174.66, tipo: "sine", dur: 0.22, vol: 0.10, retardo: 0.15 }); },

  /* error: segunda menor descendente, sin estridencia */
  mal()    { tono({ f: 320, tipo: "triangle", dur: 0.13, vol: 0.20 });
             tono({ f: 240, tipo: "triangle", dur: 0.20, vol: 0.16, retardo: 0.085 }); },

  /* aviso: dos golpes iguales */
  aviso()  { tono({ f: 784, tipo: "sine", dur: 0.09, vol: 0.16 });
             tono({ f: 784, tipo: "sine", dur: 0.12, vol: 0.13, retardo: 0.13 }); },

  /* transición entre vistas */
  paso()   { ruido({ dur: 0.30, vol: 0.09, corte: 420, q: 0.6, barrido: 7 }); },

  /* el morphing de la isla: cuerpo grave con inflexión */
  morph()  { tono({ f: 180, tipo: "sine", dur: 0.26, vol: 0.15, glide: 2.6 });
             ruido({ dur: 0.20, vol: 0.05, corte: 900, q: 0.8, barrido: 3 }); },

  /* deslizador: pulso corto ligado al valor (lo llama ocean-ui) */
  desliz(v = 0.5) { tono({ f: 420 + v * 620, tipo: "sine", dur: 0.035, vol: 0.07 }); },

  /* tic de temporizador */
  tic()    { tono({ f: 1400, tipo: "square", dur: 0.014, vol: 0.05 }); },

  /* acorde de bienvenida, para cargas de página o cierres de flujo */
  himno()  { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
               tono({ f, tipo: "sine", dur: 0.7, vol: 0.09 - i * 0.012, retardo: i * 0.085, pan: (i - 1.5) * 0.25 })); },
};

/* --------------------------------------------------------------- API pública */
function reproducir(nombre, ...args) {
  const s = SONIDOS[nombre];
  if (s) s(...args);
}
function alternar(v) {
  encendido = v == null ? !encendido : !!v;
  guardarPreferencia(encendido);
  if (encendido) { arrancar(); reproducir("toque"); }
  document.documentElement.setAttribute("data-o-sonido", encendido ? "1" : "0");
  dispatchEvent(new CustomEvent("ocean:sonido", { detail: { encendido } }));
  return encendido;
}
function volumen(v) { if (arrancar()) bus.gain.value = Math.min(1, Math.max(0, v)); }

/* ------------------------------------------------- conexión automática por HTML
   <button data-o-sonido="toque"> suena al hacer clic.
   [data-o-roce] suena al entrar el puntero.                                   */
function conectar(raiz = document) {
  raiz.addEventListener("click", e => {
    const el = e.target.closest("[data-o-sonido]");
    if (el) reproducir(el.dataset.oSonido || "toque");
  }, { passive: true });
  raiz.addEventListener("pointerenter", e => {
    const t = e.target;
    if (t && t.nodeType === 1 && t.hasAttribute && t.hasAttribute("data-o-roce")) reproducir("roce");
  }, { capture: true, passive: true });
  document.documentElement.setAttribute("data-o-sonido", encendido ? "1" : "0");
}

global.OceanSound = {
  reproducir, alternar, volumen, conectar,
  get encendido() { return encendido; },
  get contexto() { return ctx; },
  sonidos: Object.keys(SONIDOS),
};
})(window);
