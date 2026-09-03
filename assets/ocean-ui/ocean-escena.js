/* =========================================================================
   OCEAN ESCENA — la puesta en escena de Awwwards, sin sus 4 MB

   Las técnicas que aparecen una y otra vez en 23 sitios premiados 2024–2026,
   desarmadas hasta el código y reconstruidas sin dependencias:

   · Split por líneas reales     (8 de 23)  Lando, Floema, Terminal, ERA…
   · Tema que muta por sección   Lando (data-h-color-from/to), Terminal
   · Cortinas de transición      HOBRO, Squarespace
   · Cursor con mezcla           (8 de 23)  Floema, Lando, ERA, Son Daven
   · Preloader con identidad     (15 de 23) Oryzo, Floema, Squarespace
   · Escena por scroll (sticky)  Son Daven, Aardvark (300svh), MindMarket
   · Secuencia de imágenes       Aardvark, Oryzo — más barato que 3D
   · Marquee                     (6 de 23)
   · View Transitions            (6 de 23) con fallback a fundido

   Regla de la casa, tomada de la Forja: UNA firma por producto, el resto
   quieto. Un sitio con preloader + Lenis + split + marquee + cursor + grain +
   magnético + parallax es indistinguible de otros 200. Ocho de los 23 tienen
   cinco o más a la vez. Este módulo ofrece las piezas; el criterio es tuyo.
   ========================================================================= */
(function (global) {
"use strict";

const M = global.OceanMotion;
const S = global.OceanSound || { reproducir() {} };
const reducido = M ? M.reducido : matchMedia("(prefers-reduced-motion: reduce)").matches;
const hoverFino = M ? M.hoverFino : matchMedia("(hover: hover) and (pointer: fine)").matches;
const raiz = document.documentElement;

const varCss = (n, def) => (getComputedStyle(raiz).getPropertyValue(n).trim() || def);
const ms = (n, def) => {
  const v = varCss(n, def);
  return v.endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000;
};

/* ======================================================= split por líneas
   La técnica #1 de Awwwards. No es split por palabras: se envuelve cada
   palabra, se mide su offsetTop después de que carguen las fuentes, se
   agrupan las que comparten línea, y cada línea sube enmascarada con
   overflow:hidden. Se recalcula al redimensionar porque las líneas cambian.
*/
function porLineas(el) {
  const original = el.dataset.oOriginal || el.textContent.trim();
  el.dataset.oOriginal = original;
  el.setAttribute("aria-label", original);
  el.innerHTML = original.split(/\s+/).map(w => `<span class="o-w">${w}</span>`).join(" ");
  const palabras = [...el.querySelectorAll(".o-w")];
  const lineas = [];
  let actual = null, top = null;
  for (const w of palabras) {
    const t = w.offsetTop;
    if (top === null || Math.abs(t - top) > 2) { actual = []; lineas.push(actual); top = t; }
    actual.push(w.textContent);
  }
  const paso = ms("--o-esc-paso", "70ms") * 1.4;
  el.innerHTML = lineas.map((ws, i) =>
    `<span class="o-linea"><span class="o-linea__in" aria-hidden="true" style="--o-retardo:${Math.round(i * paso)}ms">${ws.join(" ")}</span></span>`
  ).join("");
  return lineas.length;
}

function lineas(raizDom = document) {
  const els = [...raizDom.querySelectorAll("[data-o-lineas]")];
  if (!els.length) return;
  const correr = () => els.forEach(el => porLineas(el));
  const listo = () => {
    correr();
    // los que ya están en pantalla se revelan de una; el resto por IO
    els.forEach(el => {
      el.classList.add("o-rv-lineas");
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) requestAnimationFrame(() => el.classList.add("o-vis"));
      else if (M && M.reveals) { el.classList.add("o-rv"); M.reveals(el.parentElement || document); }
    });
  };
  (document.fonts && document.fonts.ready) ? document.fonts.ready.then(listo) : listo();
  let t;
  addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => { correr(); els.forEach(e => e.classList.add("o-vis")); }, 160);
  }, { passive: true });
}

/* ================================================== tema que muta por sección
   Lando Norris: cada sección lleva data-h-color-from/to y al entrar, el fondo
   y el texto de TODA la página interpolan hacia ese par. Aquí:
     <section data-o-tema-bg="#1b2226" data-o-tema-fg="#f5f3ec" data-o-tema="oscuro">
   y una sección con data-o-tema-base devuelve al origen.
   El cambio es una transición CSS sobre --o-pagina-bg/--o-pagina-fg en :root.
*/
function temaPorSeccion(raizDom = document) {
  const secs = [...raizDom.querySelectorAll("[data-o-tema-bg]")];
  if (!secs.length) return;
  /*  Toda sección que NO declara tema devuelve al origen. Marcar a mano cada
      una con data-o-tema-base es una trampa: basta olvidar una para que el
      tema se quede pegado, y el fallo solo se ve al hacer scroll hacia abajo
      pasando la sección temática. Aquí el retorno es el comportamiento por
      defecto y data-o-tema-base solo sirve para forzarlo en un contenedor
      que no sea <section>.                                                */
  const bases = [...raizDom.querySelectorAll("section, [data-o-tema-base]")]
    .filter(s => !s.hasAttribute("data-o-tema-bg"));
  /*  El origen se toma del color computado del <body>, no de la variable:
      la variable puede no estar declarada todavía y devolver cadena vacía,
      con lo que el retorno a base dejaría el fondo en `undefined`.        */
  const cs = getComputedStyle(document.body);
  const origen = {
    bg: varCss("--o-pagina-bg", "") || cs.backgroundColor || "#fff",
    fg: varCss("--o-pagina-fg", "") || cs.color || "#000",
  };
  raiz.style.setProperty("--o-pagina-bg", origen.bg);
  raiz.style.setProperty("--o-pagina-fg", origen.fg);
  const aplicar = (bg, fg, modo) => {
    if (!bg) return;
    raiz.style.setProperty("--o-pagina-bg", bg);
    raiz.style.setProperty("--o-pagina-fg", fg);
    if (modo) raiz.setAttribute("data-o-tema", modo); else raiz.removeAttribute("data-o-tema");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bg);       // la barra del navegador acompaña
  };
  /*  Se dispara cuando la sección cruza la LÍNEA CENTRAL del viewport, no
      cuando ocupa la mitad de él: una escena de 280 svh nunca alcanzaría un
      umbral del 50 % y el tema se quedaría pegado. rootMargin -50% arriba y
      abajo reduce la zona de observación a una línea de 1 px en el centro. */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const s = e.target;
    if (s.hasAttribute("data-o-tema-base")) aplicar(origen.bg, origen.fg, null);
    else aplicar(s.dataset.oTemaBg, s.dataset.oTemaFg || origen.fg, s.dataset.oTema || null);
  }), { threshold: 0, rootMargin: "-50% 0px -50% 0px" });
  secs.forEach(s => io.observe(s));
  bases.forEach(s => io.observe(s));
}

/* ============================================================= cortinas
   HOBRO / Squarespace: dos paneles que cierran con scaleY y abren al llegar.
   Aquí es una sola capa fija que se cierra, se navega y se abre.
   Uso: OceanEscena.cortina.cerrar().then(() => location.href = url)
   o data-o-cortina en cualquier enlace interno.
*/
const cortina = {
  el: null,
  asegurar() {
    if (this.el) return this.el;
    const c = document.createElement("div");
    c.className = "o-cortina"; c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    this.el = c; return c;
  },
  cerrar() {
    const c = this.asegurar();
    S.reproducir("paso");
    return new Promise(ok => {
      if (reducido) { c.classList.add("o-cortina--cerrada"); return ok(); }
      c.classList.remove("o-cortina--abriendo");
      c.classList.add("o-cortina--cerrando");
      setTimeout(() => { c.classList.add("o-cortina--cerrada"); ok(); }, ms("--o-t-cine", "1200ms") * 0.55);
    });
  },
  abrir() {
    const c = this.asegurar();
    c.classList.remove("o-cortina--cerrando", "o-cortina--cerrada");
    c.classList.add("o-cortina--abriendo");
    setTimeout(() => c.classList.remove("o-cortina--abriendo"), ms("--o-t-cine", "1200ms") * 0.55);
  },
  conectar(raizDom = document) {
    raizDom.querySelectorAll("a[data-o-cortina]").forEach(a => a.addEventListener("click", e => {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      this.cerrar().then(() => { location.href = href; });
    }));
    // al volver con bfcache la cortina debe abrirse
    addEventListener("pageshow", () => this.abrir());
  },
};

/* ============================================================== cursor
   Un círculo fijo con mix-blend-mode: difference que sigue al puntero con
   resorte, crece sobre [data-o-cursor] y desaparece al salir de la ventana.
   Solo con puntero fino: en táctil no existe.
*/
function cursor({ tam = 14, crecer = 4.2 } = {}) {
  if (!hoverFino || reducido) return null;
  const c = document.createElement("div");
  c.className = "o-cursor"; c.setAttribute("aria-hidden", "true");
  c.style.setProperty("--o-cursor-tam", tam + "px");
  c.style.setProperty("--o-cursor-crecer", crecer);
  document.body.appendChild(c);
  raiz.classList.add("o-con-cursor");

  const sx = new M.Resorte({ rigidez: 320, amortiguacion: 30 });
  const sy = new M.Resorte({ rigidez: 320, amortiguacion: 30 });
  let corriendo = false, primero = true;
  const correr = () => {
    if (corriendo) return;
    corriendo = true;
    M.agregar(dt => {
      const x = sx.paso(dt), y = sy.paso(dt);
      c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%)`;
      if (sx.quieto && sy.quieto) { corriendo = false; return false; }
    });
  };
  addEventListener("pointermove", e => {
    if (primero) { sx.saltar(e.clientX); sy.saltar(e.clientY); primero = false; c.classList.add("o-cursor--vivo"); }
    sx.a(e.clientX); sy.a(e.clientY); correr();
  }, { passive: true });
  document.addEventListener("mouseleave", () => c.classList.remove("o-cursor--vivo"));
  document.addEventListener("mouseenter", () => c.classList.add("o-cursor--vivo"));
  document.addEventListener("pointerover", e => {
    const t = e.target.closest("[data-o-cursor], a, button");
    c.classList.toggle("o-cursor--sobre", !!t);
    if (t && t.dataset.oCursor) c.dataset.texto = t.dataset.oCursor; else delete c.dataset.texto;
  });
  return c;
}

/* ============================================================ preloader
   Con identidad: un contador 0→100 y una barra, y al terminar el héroe entra
   en secuencia. NUNCA bloquea más de lo que tarda la página en estar lista,
   y nunca más de `maximo` ms. Con reduced-motion se salta.
   Uso: OceanEscena.preloader({ marca: "OCEAN", alFinal: () => … })
*/
function preloader({ marca = "", minimo = 900, maximo = 2600, alFinal } = {}) {
  if (reducido) { alFinal && alFinal(); return; }
  const p = document.createElement("div");
  p.className = "o-preloader"; p.setAttribute("aria-hidden", "true");
  p.innerHTML = `<div class="o-preloader__marca">${marca}</div>
    <div class="o-preloader__num o-num">0</div>
    <div class="o-preloader__barra"><i></i></div>`;
  document.body.appendChild(p);
  document.body.classList.add("o-cargando");
  const num = p.querySelector(".o-preloader__num"), barra = p.querySelector("i");
  const t0 = performance.now();
  let listo = document.readyState === "complete";
  addEventListener("load", () => { listo = true; }, { once: true });
  let quitar = M.agregar((_, ahora) => {
    const t = ahora - t0;
    // avanza rápido al principio y espera al final hasta que la página esté lista
    const objetivo = listo ? 1 : Math.min(0.92, t / maximo);
    const v = Math.min(objetivo, t / minimo);
    num.textContent = Math.round(v * 100);
    barra.style.transform = `scaleX(${v.toFixed(3)})`;
    if (v >= 1 || t > maximo) {
      num.textContent = "100"; barra.style.transform = "scaleX(1)";
      setTimeout(() => {
        p.classList.add("o-preloader--fuera");
        document.body.classList.remove("o-cargando");
        S.reproducir("abrir");
        setTimeout(() => { p.remove(); alFinal && alFinal(); }, ms("--o-t-cine", "1200ms") * 0.7);
      }, 120);
      return false;
    }
  });
  return p;
}

/* ===================================================== escena por scroll
   Son Daven, Aardvark, MindMarket: una sección de 200–300 svh con contenido
   sticky. El progreso 0→1 se expone como --o-esc-prog y como evento, para
   que el CSS o el JS del producto dibujen lo que toque.
   Uso: <section class="o-escena" data-o-escena="300"> … <div class="o-escena__fijo">…</div>
*/
function escenas(raizDom = document) {
  const secs = [...raizDom.querySelectorAll("[data-o-escena]")];
  if (!secs.length) return;
  secs.forEach(s => { s.style.minHeight = (parseFloat(s.dataset.oEscena) || 250) + "svh"; });
  const pintar = () => {
    for (const s of secs) {
      const r = s.getBoundingClientRect();
      const recorrido = r.height - innerHeight;
      const p = recorrido > 0 ? Math.min(1, Math.max(0, -r.top / recorrido)) : 0;
      if (Math.abs((s._prog || 0) - p) > 0.0005) {
        s._prog = p;
        s.style.setProperty("--o-esc-prog", p.toFixed(4));
        s.dispatchEvent(new CustomEvent("ocean:escena", { detail: { progreso: p } }));
      }
    }
  };
  if (M && M.oyentesScroll) M.oyentesScroll.add(pintar);
  else addEventListener("scroll", pintar, { passive: true });
  addEventListener("resize", pintar, { passive: true });
  pintar();
}

/* ================================================= secuencia de imágenes
   Aardvark (data-box-sequence) y Oryzo: 60–120 fotogramas WebP dibujados en
   un <canvas> según el progreso de scroll. Mucho más barato que 3D y con el
   mismo efecto de "producto que gira". Se precargan en orden y se dibuja el
   más cercano ya cargado, así nunca hay un fotograma en blanco.
   Uso: <canvas data-o-secuencia="ruta/frame-{n}.webp" data-o-frames="90"
                data-o-desde="1" data-o-pad="3"></canvas>  dentro de una escena.
*/
function secuencia(canvas) {
  const patron = canvas.dataset.oSecuencia;
  const n = parseInt(canvas.dataset.oFrames || "60", 10);
  const desde = parseInt(canvas.dataset.oDesde || "1", 10);
  const pad = parseInt(canvas.dataset.oPad || "0", 10);
  const ctx = canvas.getContext("2d");
  const frames = new Array(n);
  let ultimo = -1;
  const ruta = i => patron.replace("{n}", String(desde + i).padStart(pad, "0"));
  const dibujar = i => {
    // el más cercano ya cargado, hacia atrás
    let k = i;
    while (k >= 0 && !(frames[k] && frames[k].complete && frames[k].naturalWidth)) k--;
    if (k < 0 || k === ultimo) return;
    ultimo = k;
    const im = frames[k];
    if (canvas.width !== im.naturalWidth) { canvas.width = im.naturalWidth; canvas.height = im.naturalHeight; }
    ctx.drawImage(im, 0, 0);
  };
  // precarga progresiva: primero el 1, luego cada 8, luego el resto
  const orden = [0, ...Array.from({ length: n }, (_, i) => i).filter(i => i % 8 === 0 && i),
                 ...Array.from({ length: n }, (_, i) => i).filter(i => i % 8)];
  let idx = 0;
  const siguiente = () => {
    if (idx >= orden.length) return;
    const i = orden[idx++];
    const im = new Image(); im.decoding = "async";
    im.onload = () => { if (i === 0) dibujar(0); siguiente(); };
    im.onerror = siguiente;
    im.src = ruta(i);
    frames[i] = im;
  };
  siguiente(); siguiente();                            // dos en paralelo
  const escena = canvas.closest("[data-o-escena]");
  const alProgreso = p => dibujar(Math.round(p * (n - 1)));
  if (escena) escena.addEventListener("ocean:escena", e => alProgreso(e.detail.progreso));
  else {
    const pintar = () => {
      const r = canvas.getBoundingClientRect();
      alProgreso(Math.min(1, Math.max(0, 1 - (r.top + r.height) / (innerHeight + r.height))));
    };
    (M && M.oyentesScroll ? M.oyentesScroll.add(pintar) : addEventListener("scroll", pintar, { passive: true }));
    pintar();
  }
  return { dibujar, frames };
}

/* ============================================================== marquee
   Duplica la pista una sola vez para el bucle infinito. El movimiento es CSS.
*/
function marquee(raizDom = document) {
  raizDom.querySelectorAll("[data-o-marquee]").forEach(m => {
    const pista = m.querySelector(".o-marquee__pista");
    if (!pista || pista.dataset.dup) return;
    const copia = pista.cloneNode(true);
    copia.setAttribute("aria-hidden", "true");
    m.appendChild(copia);
    pista.dataset.dup = "1";
    if (m.dataset.oMarquee) m.style.setProperty("--o-marquee-dur", m.dataset.oMarquee);
  });
}

/* ===================================================== View Transitions
   6 de 23 premiados las usan. Aquí: navegación con transición nativa cuando
   existe, y fundido por cortina cuando no.
*/
function transiciones(raizDom = document) {
  raizDom.querySelectorAll("a[data-o-transicion]").forEach(a => a.addEventListener("click", e => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (document.startViewTransition && !reducido) {
      document.startViewTransition(() => { location.href = href; });
    } else {
      cortina.cerrar().then(() => { location.href = href; });
    }
  }));
}

/* ------------------------------------------------------------------- init */
function iniciar(raizDom = document) {
  lineas(raizDom);
  temaPorSeccion(raizDom);
  marquee(raizDom);
  escenas(raizDom);
  raizDom.querySelectorAll("canvas[data-o-secuencia]").forEach(secuencia);
  cortina.conectar(raizDom);
  transiciones(raizDom);
  if (raizDom.querySelector("[data-o-cursor-activo]") || raiz.hasAttribute("data-o-cursor")) cursor();
}

global.OceanEscena = { porLineas, lineas, temaPorSeccion, cortina, cursor, preloader,
                       escenas, secuencia, marquee, transiciones, iniciar };
})(window);
