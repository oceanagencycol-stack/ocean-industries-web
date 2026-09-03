/* =========================================================================
   OCEAN MOTION — motor de movimiento
   Física de resorte real, no curvas bezier fingiendo elasticidad.
   Un único bucle de rAF para todo, y un solo listener de scroll pasivo.
   ========================================================================= */
(function (global) {
"use strict";

const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const hoverFino = matchMedia("(hover: hover) and (pointer: fine)").matches;
// Los estados iniciales de los reveals solo existen con esta clase presente:
// sin JS la página se ve completa. Se añade antes de cualquier otra cosa.
document.documentElement.classList.add("o-js");

/* ------------------------------------------------------------------ resorte
   Integrador semi-implícito de Euler. Es lo que da la sensación de material:
   el valor no interpola de A a B, lo persigue con masa e inercia.
   rigidez  → qué tan fuerte tira hacia el destino
   amortig. → cuánta energía pierde (bajo = rebota, alto = frena seco)
*/
class Resorte {
  constructor({ desde = 0, rigidez = 170, amortiguacion = 22, masa = 1, precision = 0.004 } = {}) {
    this.v = desde; this.destino = desde; this.vel = 0;
    this.k = rigidez; this.c = amortiguacion; this.m = masa; this.p = precision;
    this.quieto = true;
  }
  a(destino) { this.destino = destino; this.quieto = false; return this; }
  saltar(v) { this.v = this.destino = v; this.vel = 0; this.quieto = true; return this; }
  paso(dt) {
    if (this.quieto) return this.v;
    dt = Math.min(dt, 0.032);                       // techo: pestaña en segundo plano
    const f = -this.k * (this.v - this.destino) - this.c * this.vel;
    this.vel += (f / this.m) * dt;
    this.v += this.vel * dt;
    if (Math.abs(this.vel) < this.p && Math.abs(this.v - this.destino) < this.p) {
      this.v = this.destino; this.vel = 0; this.quieto = true;
    }
    return this.v;
  }
}

/* --------------------------------------------------------- bucle compartido */
const tareas = new Set();
let ultimo = 0, corriendo = false;

function bucle(ahora) {
  const dt = ultimo ? (ahora - ultimo) / 1000 : 0.016;
  ultimo = ahora;
  for (const t of tareas) { if (t(dt, ahora) === false) tareas.delete(t); }
  corriendo = tareas.size > 0;
  if (corriendo) requestAnimationFrame(bucle); else ultimo = 0;
}
function agregar(t) {
  tareas.add(t);
  if (!corriendo && !document.hidden) { corriendo = true; requestAnimationFrame(bucle); }
  return () => tareas.delete(t);
}
// Con la pestaña oculta el navegador ya frena rAF, pero al volver el primer dt
// sería enorme y los resortes darían un salto. Se reinicia el reloj.
document.addEventListener("visibilitychange", () => {
  ultimo = 0;
  if (!document.hidden && tareas.size && !corriendo) { corriendo = true; requestAnimationFrame(bucle); }
});

/* ------------------------------------------------------------------ scroll */
const oyentesScroll = new Set();
let scrollPendiente = false;
addEventListener("scroll", () => {
  if (scrollPendiente) return;
  scrollPendiente = true;
  requestAnimationFrame(() => {
    const y = scrollY;
    for (const f of oyentesScroll) f(y);
    scrollPendiente = false;
  });
}, { passive: true });

/* ----------------------------------------------------------------- reveals */
const pendientes = new Set();
let ioReveal = null, barridoPendiente = false;

function revelar(el) {
  if (!pendientes.has(el)) return;
  pendientes.delete(el);
  el.classList.add("o-vis");
  if (ioReveal) ioReveal.unobserve(el);
}
/*  Red de seguridad. Un salto de scroll (ancla, scrollTo, recarga a mitad de
    página) puede cruzar un elemento sin que IntersectionObserver reporte
    cambio: ratio 0 → 0. Ese contenido quedaría invisible para siempre. En
    cada scroll se revela lo que ya quedó por encima del viewport.          */
function barrer() {
  barridoPendiente = false;
  for (const el of pendientes) {
    if (el.getBoundingClientRect().bottom < 0) revelar(el);
  }
}
addEventListener("scroll", () => {
  if (!barridoPendiente && pendientes.size) { barridoPendiente = true; requestAnimationFrame(barrer); }
}, { passive: true });

function reveals(raiz = document) {
  if (!ioReveal) {
    ioReveal = new IntersectionObserver((es) => {
      es.forEach(e => {
        // isIntersecting O ya pasó por encima: cubre el caso de entrar con scroll alto
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) revelar(e.target);
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -10% 0px" });
  }
  const io = ioReveal;
  raiz.querySelectorAll(".o-rv:not(.o-vis)").forEach(el => { pendientes.add(el); io.observe(el); });
  requestAnimationFrame(barrer);

  // escalonado automático: los hijos de un [data-o-esc] heredan su índice
  raiz.querySelectorAll("[data-o-esc]").forEach(cont => {
    [...cont.children].forEach((h, i) => h.style.setProperty("--o-i", i));
    const paso = cont.dataset.oEsc;
    if (paso) cont.style.setProperty("--o-esc", paso + "ms");
  });
  return io;
}

/* --------------------------------------------------------- texto por palabra */
function porPalabras(el, { marca = "*" } = {}) {
  const bruto = el.dataset.oTexto || el.textContent;
  el.dataset.oTexto = bruto;
  // *palabra* marca el énfasis; la puntuación pegada al asterisco se conserva fuera
  const esc = marca.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc + "(.+?)" + esc, "g");
  el.innerHTML = bruto.split(" ").map((p, i) => {
    const cont = p.replace(re, "<em>$1</em>");
    return `<span class="o-pal" style="transition-delay:${(i * 0.055).toFixed(3)}s"><span>${cont}</span></span>`;
  }).join(" ");
  requestAnimationFrame(() => el.classList.add("o-listo"));
  return el;
}

/* --------------------------------------------------------------- parallax */
function parallax(raiz = document) {
  const capas = [];
  function medir() {
    capas.length = 0;
    raiz.querySelectorAll("[data-o-parallax]").forEach(el => {
      const r = el.getBoundingClientRect();
      capas.push({ el, k: parseFloat(el.dataset.oParallax) || 0.1, centro: r.top + scrollY + r.height / 2 });
    });
  }
  function pintar() {
    const mitad = innerHeight / 2;
    for (const c of capas) {
      const d = (scrollY + mitad - c.centro) * c.k;
      c.el.style.transform = `translate3d(0,${d.toFixed(2)}px,0)`;
    }
  }
  medir();
  if (!reducido) { oyentesScroll.add(pintar); pintar(); }
  addEventListener("resize", medir, { passive: true });
  addEventListener("load", () => { medir(); pintar(); });
  return { medir, pintar };
}

/* --------------------------------------------------------------- magnético
   El elemento persigue al puntero con resorte. Al salir vuelve a cero.     */
function magnetico(el, { fuerza = 0.32, radio = 110, rigidez = 190, amortiguacion = 18 } = {}) {
  if (reducido || !hoverFino) return () => {};        // en táctil no hay puntero que perseguir
  const sx = new Resorte({ rigidez, amortiguacion });
  const sy = new Resorte({ rigidez, amortiguacion });
  let activo = false, quitar = null;

  function correr() {
    quitar = agregar((dt) => {
      const x = sx.paso(dt), y = sy.paso(dt);
      el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      if (sx.quieto && sy.quieto && !activo) { quitar = null; return false; }
    });
  }
  function mover(e) {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    const cerca = dist < r.width / 2 + radio;
    sx.a(cerca ? dx * fuerza : 0);
    sy.a(cerca ? dy * fuerza : 0);
    activo = cerca;
    if (!quitar) correr();
  }
  function salir() { activo = false; sx.a(0); sy.a(0); if (!quitar) correr(); }
  addEventListener("pointermove", mover, { passive: true });
  el.addEventListener("pointerleave", salir);
  return () => { removeEventListener("pointermove", mover); el.removeEventListener("pointerleave", salir); };
}

/* -------------------------------------------------------------------- tilt */
function tilt(el, { max = 9, escala = 1.02, rigidez = 210, amortiguacion = 20 } = {}) {
  if (reducido || !hoverFino) return () => {};
  const rx = new Resorte({ rigidez, amortiguacion });
  const ry = new Resorte({ rigidez, amortiguacion });
  const s = new Resorte({ desde: 1, rigidez, amortiguacion });
  let quitar = null;
  function correr() {
    quitar = agregar((dt) => {
      const a = rx.paso(dt), b = ry.paso(dt), e = s.paso(dt);
      el.style.transform = `perspective(900px) rotateX(${a.toFixed(2)}deg) rotateY(${b.toFixed(2)}deg) scale(${e.toFixed(3)})`;
      if (rx.quieto && ry.quieto && s.quieto) { quitar = null; return false; }
    });
  }
  el.addEventListener("pointermove", e => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    rx.a((0.5 - py) * max * 2); ry.a((px - 0.5) * max * 2); s.a(escala);
    el.style.setProperty("--o-mx", (px * 100).toFixed(1) + "%");
    el.style.setProperty("--o-my", (py * 100).toFixed(1) + "%");
    if (!quitar) correr();
  });
  el.addEventListener("pointerleave", () => { rx.a(0); ry.a(0); s.a(1); if (!quitar) correr(); });
  return () => {};
}

/* ------------------------------------------------------ luz que sigue el puntero */
function luzViva(raiz = document) {
  raiz.querySelectorAll(".o-glass--vivo").forEach(el => {
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--o-mx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
      el.style.setProperty("--o-my", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
    }, { passive: true });
  });
}

/* ------------------------------------------------------------------ contador */
function contador(el, { hasta, duracion = 1400, decimales, locale, formato } = {}) {
  const fin = hasta != null ? hasta : parseFloat(el.dataset.oContador || "0");
  const dec = decimales != null ? decimales : parseInt(el.dataset.oDecimales || "0", 10);
  const loc = locale || el.dataset.oLocale || "es-CO";
  const fmt = formato || (n => new Intl.NumberFormat(loc,
    { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n));
  if (reducido || isNaN(fin)) { el.textContent = fmt(fin); return; }
  el.style.fontVariantNumeric = "tabular-nums";       // que las cifras no bailen
  const t0 = performance.now();
  const expo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));   // easeOutExpo
  agregar((_, ahora) => {
    const k = Math.min(1, (ahora - t0) / duracion);
    el.textContent = fmt(fin * expo(k));
    return k < 1;
  });
}
function contadores(raiz = document) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    contador(e.target);
  }), { threshold: 0.5 });
  raiz.querySelectorAll("[data-o-contador]").forEach(el => io.observe(el));
}

/* ------------------------------------------------ progreso de scroll por sección
   Expone --o-prog (0→1) en el elemento mientras cruza la ventana.
   Sirve para animaciones dirigidas por scroll sin librerías.            */
function progreso(raiz = document) {
  const items = [...raiz.querySelectorAll("[data-o-prog]")];
  if (!items.length) return;
  function pintar() {
    for (const el of items) {
      const r = el.getBoundingClientRect();
      const p = 1 - (r.top + r.height) / (innerHeight + r.height);
      el.style.setProperty("--o-prog", Math.min(1, Math.max(0, p)).toFixed(4));
    }
  }
  oyentesScroll.add(pintar); pintar();
  addEventListener("resize", pintar, { passive: true });
}

/* --------------------------------------------------------------- utilidades */
const util = {
  limitar: (v, a, b) => Math.min(b, Math.max(a, v)),
  mapear: (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c),
  mezclar: (a, b, t) => a + (b - a) * t,
  vibrar(patron = 8) { if (navigator.vibrate) try { navigator.vibrate(patron); } catch (e) {} },
};

/* ------------------------------------------------------- ids duplicados
   Un id repetido no da error en HTML: querySelector devuelve el primero y el
   código termina hablándole al elemento equivocado. Es silencioso y muy caro
   de rastrear —costó un fallo de seguridad en <ocean-acceso>—, así que el
   sistema lo denuncia en cuanto arranca, solo fuera de producción.        */
function avisarIdsDuplicados(raiz = document) {
  const local = /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname) ||
                location.protocol === "file:";
  if (!local) return [];
  const vistos = new Map(), repes = [];
  raiz.querySelectorAll("[id]").forEach(el => {
    const n = (vistos.get(el.id) || 0) + 1;
    vistos.set(el.id, n);
    if (n === 2) repes.push(el.id);
  });
  if (repes.length) {
    console.warn("[Ocean] ids duplicados en el documento:", repes,
      "\nquerySelector devolverá siempre el primero. Renombre los demás.");
  }
  return repes;
}

/* -------------------------------------------------------------------- init */
function iniciar(raiz = document) {
  avisarIdsDuplicados(raiz);
  reveals(raiz);
  contadores(raiz);
  parallax(raiz);
  luzViva(raiz);
  progreso(raiz);
  raiz.querySelectorAll("[data-o-palabras]").forEach(el => porPalabras(el));
  raiz.querySelectorAll("[data-o-iman]").forEach(el => magnetico(el, { fuerza: parseFloat(el.dataset.oIman) || 0.32 }));
  raiz.querySelectorAll("[data-o-tilt]").forEach(el => tilt(el, { max: parseFloat(el.dataset.oTilt) || 9 }));
}

global.OceanMotion = {
  Resorte, agregar, oyentesScroll, reveals, porPalabras, parallax,
  magnetico, tilt, luzViva, contador, contadores, progreso, util, iniciar, reducido,
  avisarIdsDuplicados, hoverFino, revelar,
};
})(window);
