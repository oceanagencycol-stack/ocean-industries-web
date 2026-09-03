/* =========================================================================
   OCEAN LIVE — actividades en vivo
   La familia de piezas que informan de algo que está ocurriendo ahora mismo:
   una descarga, un temporizador, un pedido en camino, una llamada.

   Principio que las une: se leen de reojo. Nadie mira una actividad en vivo,
   la percibe. Por eso todas tienen una lectura primaria de un solo golpe
   (una forma, un color, una altura) y el texto es siempre secundario.
   ========================================================================= */
(function () {
"use strict";

const M = window.OceanMotion;
const S = window.OceanSound || { reproducir() {} };
const { Resorte, agregar, util } = M;

const css = t => { const s = new CSSStyleSheet(); s.replaceSync(t); return s; };
const soportaHojas = "adoptedStyleSheets" in Document.prototype;
function montar(raiz, hoja, texto) {
  if (soportaHojas) raiz.adoptedStyleSheets = [hoja];
  else { const st = document.createElement("style"); st.textContent = texto; raiz.appendChild(st); }
}

/* Base común de todas las cápsulas: negro real, radio continuo, sombra profunda.
   El negro es #000 puro a propósito: en pantallas OLED el píxel se apaga y la
   cápsula parece un recorte en el cristal, no un rectángulo pintado.          */
const BASE = `
  :host{display:inline-block;font-family:var(--o-sans,system-ui);--ol-bg:#000;--ol-tx:#fff;
    --ol-acento:var(--o-acento,#3B82F6);--ol-tenue:rgba(255,255,255,.42)}
  .caja{background:var(--ol-bg);color:var(--ol-tx);border-radius:var(--ol-r,26px);
    box-shadow:0 14px 40px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.07);
    display:flex;align-items:center;gap:14px;padding:var(--ol-pad,14px 20px);
    position:relative;overflow:hidden}
  .tenue{color:var(--ol-tenue)}
  .num{font-variant-numeric:tabular-nums;letter-spacing:-.03em}
`;

/* ==================================================== <ocean-actividad> =====
   La cápsula de actividad en vivo. Tres densidades y contenido por slots.
     densidad = minima | compacta | expandida
   Slots: icono, principal, secundario, accion
   Atributo tono: acento | ok | alerta | error
*/
const ACT_CSS = BASE + `
  :host{--ol-r:28px}
  .caja{min-height:var(--min,58px);transition:min-height var(--o-t-medio,380ms) var(--o-ease-morph,ease)}
  :host([densidad=minima]) .caja{--ol-pad:10px 14px;--min:38px;--ol-r:19px;gap:9px}
  :host([densidad=expandida]) .caja{--ol-pad:18px 22px;--min:86px;align-items:flex-start}
  .ico{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;
    background:color-mix(in srgb, var(--ol-acento) 22%, transparent);color:var(--ol-acento);
    font-size:17px;line-height:1}
  :host([densidad=minima]) .ico{width:22px;height:22px;font-size:13px}
  .cuerpo{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
  .princ{font-size:.95rem;font-weight:600;letter-spacing:-.015em;white-space:nowrap;
    overflow:hidden;text-overflow:ellipsis}
  :host([densidad=minima]) .princ{font-size:.82rem}
  .sec{font-size:.78rem;color:var(--ol-tenue);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  :host([densidad=minima]) .sec{display:none}
  .der{flex:none;display:flex;align-items:center;gap:8px}
  .pulso{width:9px;height:9px;border-radius:50%;background:var(--ol-acento);flex:none}
  .pulso.late{animation:lat 1.7s infinite}
  @keyframes lat{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.68)}}
  .barra{position:absolute;left:0;bottom:0;height:2.5px;background:var(--ol-acento);
    border-radius:0 3px 3px 0;transition:width var(--o-t-lento,620ms) var(--o-ease,ease)}
  ::slotted(*){min-width:0}
  @media(prefers-reduced-motion:reduce){.pulso.late{animation:none}}
`;
const ACT_HOJA = soportaHojas ? css(ACT_CSS) : null;

class OceanActividad extends HTMLElement {
  static get observedAttributes() { return ["densidad", "icono", "principal", "secundario", "tono", "progreso", "vivo"]; }
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    montar(r, ACT_HOJA, ACT_CSS);
    r.innerHTML += `<div class="caja">
      <div class="ico"><slot name="icono"></slot></div>
      <div class="cuerpo">
        <div class="princ"><slot name="principal"></slot></div>
        <div class="sec"><slot name="secundario"></slot></div>
      </div>
      <div class="der"><slot name="accion"></slot><span class="pulso"></span></div>
      <div class="barra"></div></div>`;
  }
  connectedCallback() { this.pintar(); }
  attributeChangedCallback() { if (this.shadowRoot.querySelector(".caja")) this.pintar(); }
  pintar() {
    const r = this.shadowRoot;
    const TONOS = { acento: "var(--o-acento,#3B82F6)", ok: "var(--o-ok,#34D399)",
                    alerta: "var(--o-alerta,#FBBF24)", error: "var(--o-error,#F87171)" };
    this.style.setProperty("--ol-acento", TONOS[this.getAttribute("tono")] || TONOS.acento);
    const ico = this.getAttribute("icono");
    if (ico) r.querySelector(".ico").textContent = ico;
    const p = this.getAttribute("principal");
    if (p) r.querySelector(".princ").textContent = p;
    const s = this.getAttribute("secundario");
    if (s !== null) r.querySelector(".sec").textContent = s;
    const pulso = r.querySelector(".pulso");
    pulso.style.display = this.hasAttribute("vivo") ? "" : "none";
    pulso.classList.toggle("late", this.hasAttribute("vivo"));
    const pr = this.getAttribute("progreso");
    r.querySelector(".barra").style.width = pr != null ? util.limitar(+pr, 0, 100) + "%" : "0";
  }
}
customElements.define("ocean-actividad", OceanActividad);

/* ========================================================= <ocean-onda> =====
   Medidor de barras. Tres modos:
     modo="progreso"  barras que se encienden hasta el valor (el espresso)
     modo="onda"      forma de onda estática a partir de una semilla
     modo="vivo"      ecualizador animado, para reproducción o grabación
   Atributos: barras, valor, color, alto
*/
const ONDA_CSS = BASE + `
  :host{display:block;--ol-alto:34px}
  .env{display:flex;align-items:center;gap:var(--gap,2.5px);height:var(--ol-alto);width:100%}
  .b{flex:1;min-width:1.5px;border-radius:99px;background:var(--apagado,rgba(255,255,255,.16));
    transition:height var(--o-t-rapido,220ms) var(--o-ease,ease),
               background var(--o-t-rapido) var(--o-ease)}
  .b.on{background:var(--ol-acento)}
`;
const ONDA_HOJA = soportaHojas ? css(ONDA_CSS) : null;

class OceanOnda extends HTMLElement {
  static get observedAttributes() { return ["barras", "valor", "modo", "color", "alto"]; }
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    montar(r, ONDA_HOJA, ONDA_CSS);
    r.innerHTML += `<div class="env"></div>`;
    this._t = null;
  }
  get n() { return parseInt(this.getAttribute("barras") || "28", 10); }
  get modo() { return this.getAttribute("modo") || "progreso"; }
  connectedCallback() { this.construir(); this.pintar(); this.animar(); }
  attributeChangedCallback(n) {
    if (!this.shadowRoot.querySelector(".env")) return;
    if (n === "barras") this.construir();
    if (n === "color") this.style.setProperty("--ol-acento", this.getAttribute("color"));
    if (n === "alto") this.style.setProperty("--ol-alto", this.getAttribute("alto"));
    if (n === "modo") this.animar();
    this.pintar();
  }
  construir() {
    this.shadowRoot.querySelector(".env").innerHTML =
      Array.from({ length: this.n }, () => "<i class='b'></i>").join("");
  }
  /* Alturas deterministas: la misma onda se ve igual en cada carga.
     Suma de dos senos desfasados, que es lo que da forma orgánica sin aleatorio. */
  altura(i) {
    const x = i / this.n;
    return 0.3 + 0.45 * Math.abs(Math.sin(x * 11.2)) + 0.25 * Math.abs(Math.sin(x * 4.1 + 1.7));
  }
  pintar(fase = 0) {
    const bs = this.shadowRoot.querySelectorAll(".b");
    const v = util.limitar(parseFloat(this.getAttribute("valor") || 0) / 100, 0, 1);
    bs.forEach((b, i) => {
      let h;
      if (this.modo === "progreso") h = 0.35 + 0.65 * this.altura(i);
      else if (this.modo === "vivo")
        h = 0.18 + 0.82 * Math.abs(Math.sin(i * 0.55 + fase) * Math.sin(i * 0.19 + fase * 0.6));
      else h = this.altura(i);
      b.style.height = (h * 100).toFixed(1) + "%";
      b.classList.toggle("on", this.modo === "vivo" ? true : i / this.n <= v);
    });
  }
  animar() {
    if (this._quitar) { this._quitar(); this._quitar = null; }
    if (this.modo !== "vivo" || M.reducido) return;
    // Va en el bucle compartido, no en un rAF propio: un ecualizador por
    // componente multiplica los bucles. Y se detiene si la pestaña está
    // oculta o el elemento salió de pantalla — animar lo invisible es gastar
    // batería del usuario a cambio de nada.
    let f = 0;
    this._visible = true;
    this._io = this._io || new IntersectionObserver(
      es => { this._visible = es[0].isIntersecting; }, { threshold: 0 });
    this._io.observe(this);
    this._quitar = agregar(dt => {
      if (document.hidden || !this._visible) return;
      f += dt * 7.2;
      this.pintar(f);
    });
  }
  disconnectedCallback() {
    if (this._quitar) { this._quitar(); this._quitar = null; }
    if (this._io) this._io.disconnect();
  }
}
customElements.define("ocean-onda", OceanOnda);

/* ======================================================== <ocean-anillo> ====
   Anillo de progreso compacto. Determinado o indeterminado.
   Atributos: valor, tam, grosor, color, indeterminado, etiqueta
*/
const ANI_CSS = BASE + `
  :host{display:inline-grid;place-items:center;--tam:34px;--gr:3.4px}
  .env{position:relative;width:var(--tam);height:var(--tam);display:grid;place-items:center}
  svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}
  .p{fill:none;stroke:rgba(255,255,255,.16)}
  .a{fill:none;stroke:var(--ol-acento);stroke-linecap:round;
    transition:stroke-dashoffset var(--o-t-lento,620ms) var(--o-ease,ease)}
  :host([indeterminado]) svg{animation:gir 1.05s linear infinite}
  :host([indeterminado]) .a{transition:none}
  @keyframes gir{to{transform:rotate(270deg)}}
  .txt{font-size:calc(var(--tam)*.30);font-weight:600;font-variant-numeric:tabular-nums;
    letter-spacing:-.03em;line-height:1}
  @media(prefers-reduced-motion:reduce){:host([indeterminado]) svg{animation-duration:2.6s}}
`;
const ANI_HOJA = soportaHojas ? css(ANI_CSS) : null;

class OceanAnillo extends HTMLElement {
  static get observedAttributes() { return ["valor", "tam", "grosor", "color", "etiqueta", "indeterminado"]; }
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    montar(r, ANI_HOJA, ANI_CSS);
    r.innerHTML += `<div class="env"><svg viewBox="0 0 40 40">
      <circle class="p" cx="20" cy="20" r="17"/><circle class="a" cx="20" cy="20" r="17"/>
      </svg><span class="txt"></span></div>`;
  }
  connectedCallback() { this.pintar(); }
  attributeChangedCallback() { if (this.shadowRoot.querySelector(".a")) this.pintar(); }
  pintar() {
    const r = this.shadowRoot;
    if (this.getAttribute("tam")) this.style.setProperty("--tam", this.getAttribute("tam"));
    if (this.getAttribute("grosor")) this.style.setProperty("--gr", this.getAttribute("grosor"));
    if (this.getAttribute("color")) this.style.setProperty("--ol-acento", this.getAttribute("color"));
    const g = getComputedStyle(this).getPropertyValue("--gr").trim() || "3.4px";
    r.querySelector(".p").style.strokeWidth = g;
    r.querySelector(".a").style.strokeWidth = g;
    const C = 2 * Math.PI * 17;
    const v = this.hasAttribute("indeterminado")
      ? 0.28 : util.limitar(parseFloat(this.getAttribute("valor") || 0) / 100, 0, 1);
    const a = r.querySelector(".a");
    a.setAttribute("stroke-dasharray", C.toFixed(2));
    a.setAttribute("stroke-dashoffset", (C * (1 - v)).toFixed(2));
    r.querySelector(".txt").textContent = this.getAttribute("etiqueta") || "";
  }
}
customElements.define("ocean-anillo", OceanAnillo);

/* ========================================================= <ocean-ruta> =====
   Progreso por etapas con nodos e iconos. El del pedido en camino.
   Atributos: etapas="Recogido,En camino,Entregado", iconos="📦,🚚,🏠", actual="1"
*/
const RUTA_CSS = BASE + `
  :host{display:block}
  .env{display:flex;align-items:center;width:100%}
  .nodo{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;
    background:rgba(255,255,255,.12);font-size:14px;line-height:1;z-index:2;
    transition:background var(--o-t-medio,380ms) var(--o-ease,ease),
               transform var(--o-t-medio) var(--o-ease-resorte,ease)}
  .nodo.on{background:var(--ol-acento);transform:scale(1.06)}
  .lin{flex:1;height:5px;background:rgba(255,255,255,.12);position:relative;margin:0 -3px;
    border-radius:99px;overflow:hidden}
  .lin i{position:absolute;inset:0;width:0;background:var(--ol-acento);border-radius:99px;
    transition:width var(--o-t-lento,620ms) var(--o-ease,ease)}
  .eti{display:flex;justify-content:space-between;margin-top:9px;gap:8px}
  .eti span{font-size:.7rem;color:var(--ol-tenue);text-align:center;flex:1;min-width:0}
  .eti span.on{color:var(--ol-tx);font-weight:600}
  .eti span:first-child{text-align:left}.eti span:last-child{text-align:right}
`;
const RUTA_HOJA = soportaHojas ? css(RUTA_CSS) : null;

class OceanRuta extends HTMLElement {
  static get observedAttributes() { return ["etapas", "iconos", "actual", "color"]; }
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    montar(r, RUTA_HOJA, RUTA_CSS);
    r.innerHTML += `<div><div class="env"></div><div class="eti"></div></div>`;
  }
  connectedCallback() { this.pintar(); }
  attributeChangedCallback() { if (this.shadowRoot.querySelector(".env")) this.pintar(); }
  pintar() {
    const r = this.shadowRoot;
    if (this.getAttribute("color")) this.style.setProperty("--ol-acento", this.getAttribute("color"));
    const et = (this.getAttribute("etapas") || "").split(",").map(s => s.trim()).filter(Boolean);
    const ic = (this.getAttribute("iconos") || "").split(",").map(s => s.trim());
    const act = parseInt(this.getAttribute("actual") || "0", 10);
    let h = "";
    et.forEach((_, i) => {
      if (i) h += `<div class="lin"><i style="width:${i <= act ? 100 : 0}%"></i></div>`;
      h += `<div class="nodo ${i <= act ? "on" : ""}">${ic[i] || i + 1}</div>`;
    });
    r.querySelector(".env").innerHTML = h;
    r.querySelector(".eti").innerHTML =
      et.map((e, i) => `<span class="${i <= act ? "on" : ""}">${e}</span>`).join("");
  }
  avanzar() {
    const et = (this.getAttribute("etapas") || "").split(",").length;
    const a = Math.min(et - 1, parseInt(this.getAttribute("actual") || "0", 10) + 1);
    this.setAttribute("actual", a);
    S.reproducir(a === et - 1 ? "bien" : "toque");
    return a;
  }
}
customElements.define("ocean-ruta", OceanRuta);

/* ======================================================= <ocean-chispa> =====
   Línea de tendencia o trazo tipo ECG, dibujándose sola.
   Atributos: puntos="3,7,4,9,6,12,8", color, ecg, alto
*/
const CHI_CSS = BASE + `
  :host{display:block;--ol-alto:40px}
  svg{width:100%;height:var(--ol-alto);overflow:visible;display:block}
  path{fill:none;stroke:var(--ol-acento);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  path.rastro{stroke-dasharray:var(--L);stroke-dashoffset:var(--L);
    animation:trazar 1.6s var(--o-ease,ease) forwards}
  :host([ecg]) path.rastro{animation:trazar 2.2s linear infinite}
  @keyframes trazar{to{stroke-dashoffset:0}}
  .punta{fill:var(--ol-acento)}
  @media(prefers-reduced-motion:reduce){path.rastro{animation:none;stroke-dashoffset:0}}
`;
const CHI_HOJA = soportaHojas ? css(CHI_CSS) : null;

class OceanChispa extends HTMLElement {
  static get observedAttributes() { return ["puntos", "color", "alto", "ecg"]; }
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    montar(r, CHI_HOJA, CHI_CSS);
    r.innerHTML += `<svg viewBox="0 0 200 44" preserveAspectRatio="none">
      <path class="rastro"></path></svg><svg style="display:none"></svg>`;
  }
  connectedCallback() { this.pintar(); }
  attributeChangedCallback() { if (this.shadowRoot.querySelector("path")) this.pintar(); }
  pintar() {
    if (this.getAttribute("color")) this.style.setProperty("--ol-acento", this.getAttribute("color"));
    if (this.getAttribute("alto")) this.style.setProperty("--ol-alto", this.getAttribute("alto"));
    const p = this.hasAttribute("ecg")
      ? [10,10,10,12,10,10,8,30,2,44,4,10,10,14,11,10,10,10,12,10,10,8,30,2,44,4,10,10,14,11,10,10]
      : (this.getAttribute("puntos") || "4,8,5,11,7,14,9,16")
          .split(",").map(Number).filter(n => !isNaN(n));
    if (p.length < 2) return;
    const max = Math.max(...p), min = Math.min(...p), rango = max - min || 1;
    const d = p.map((v, i) => {
      const x = (i / (p.length - 1)) * 196 + 2;
      const y = 40 - ((v - min) / rango) * 34;
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const path = this.shadowRoot.querySelector("path");
    path.setAttribute("d", d);
    // la longitud real del trazo alimenta la animación de dibujo
    requestAnimationFrame(() => {
      try { this.style.setProperty("--L", path.getTotalLength().toFixed(1)); } catch (e) {}
    });
  }
}
customElements.define("ocean-chispa", OceanChispa);

/* ========================================================= <ocean-arco> =====
   Trayectoria en arco con marcador de posición: el paso de un satélite,
   el recorrido del sol, cualquier evento con inicio, cénit y final.
   Atributos: valor (0-100), color, color2, etiqueta, detalle
*/
const ARC_CSS = BASE + `
  :host{display:block}
  .env{position:relative;width:100%}
  svg{width:100%;height:auto;display:block;overflow:visible}
  .p{fill:none;stroke:rgba(255,255,255,.14);stroke-width:7;stroke-linecap:round}
  .a{fill:none;stroke:url(#ga);stroke-width:7;stroke-linecap:round;
    transition:stroke-dashoffset var(--o-t-lento,620ms) var(--o-ease,ease)}
  .cono{fill:url(#gc);opacity:.5}
  .m{fill:#fff;filter:drop-shadow(0 0 7px var(--ol-acento))}
  .fila{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}
  .eti{font-size:.9rem;font-weight:600}
  .det{font-size:.85rem;color:var(--ol-tenue)}
`;
const ARC_HOJA = soportaHojas ? css(ARC_CSS) : null;

class OceanArco extends HTMLElement {
  static get observedAttributes() { return ["valor", "color", "color2", "etiqueta", "detalle"]; }
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    montar(r, ARC_CSS && !soportaHojas ? null : ARC_HOJA, ARC_CSS);
    r.innerHTML += `<div class="env">
      <div class="fila"><span class="eti"></span><span class="det"></span></div>
      <svg viewBox="0 0 240 96">
        <defs>
          <linearGradient id="ga" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="var(--ol-c1,#22D3EE)"/>
            <stop offset="1" stop-color="var(--ol-c2,#3B82F6)"/></linearGradient>
          <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--ol-c1,#22D3EE)" stop-opacity=".55"/>
            <stop offset="1" stop-color="var(--ol-c1,#22D3EE)" stop-opacity="0"/></linearGradient>
        </defs>
        <path class="cono" d=""/>
        <path class="p" d="M12,88 A108,108 0 0 1 228,88"/>
        <path class="a" d="M12,88 A108,108 0 0 1 228,88"/>
        <circle class="m" cx="12" cy="88" r="6"/>
      </svg></div>`;
  }
  connectedCallback() { this.pintar(); }
  attributeChangedCallback() { if (this.shadowRoot.querySelector(".a")) this.pintar(); }
  pintar() {
    const r = this.shadowRoot;
    if (this.getAttribute("color"))  this.style.setProperty("--ol-c1", this.getAttribute("color"));
    if (this.getAttribute("color2")) this.style.setProperty("--ol-c2", this.getAttribute("color2"));
    r.querySelector(".eti").textContent = this.getAttribute("etiqueta") || "";
    r.querySelector(".det").textContent = this.getAttribute("detalle") || "";
    const v = util.limitar(parseFloat(this.getAttribute("valor") || 0) / 100, 0, 1);
    const path = r.querySelector(".a");
    // getTotalLength lanza si el nodo no está en el layout todavía
    let L = 340;
    try { if (path.getTotalLength) L = path.getTotalLength() || 340; } catch (e) {}
    path.setAttribute("stroke-dasharray", L.toFixed(1));
    path.setAttribute("stroke-dashoffset", (L * (1 - v)).toFixed(1));
    // el marcador viaja por la misma curva: nada de trigonometría aproximada
    try {
      if (!path.getPointAtLength) throw 0;
      const pt = path.getPointAtLength(L * v);
      const m = r.querySelector(".m");
      m.setAttribute("cx", pt.x.toFixed(1)); m.setAttribute("cy", pt.y.toFixed(1));
      r.querySelector(".cono").setAttribute("d",
        `M${pt.x.toFixed(1)},${pt.y.toFixed(1)} L${(pt.x - 40).toFixed(1)},96 L${(pt.x + 40).toFixed(1)},96 Z`);
    } catch (e) { /* el marcador se coloca en el siguiente pintado */ }
  }
}
customElements.define("ocean-arco", OceanArco);

/* ======================================================== <ocean-franjas> ===
   Tres momentos con gradiente y marcador: ahora, siguiente, final.
   Atributos: momentos JSON [{eti,hora,de,a,activo}]
*/
const FRA_CSS = BASE + `
  :host{display:block}
  .env{display:flex;gap:10px}
  .col{flex:1;min-width:0}
  .top{font-size:.78rem;color:var(--ol-tenue);margin-bottom:8px;white-space:nowrap;
    overflow:hidden;text-overflow:ellipsis}
  .col.on .top{color:var(--ol-tx);font-weight:600}
  .fr{height:30px;border-radius:99px;position:relative;overflow:hidden}
  .fr .mk{position:absolute;top:50%;width:16px;height:16px;border-radius:50%;background:#fff;
    transform:translate(-50%,-50%);box-shadow:0 1px 5px rgba(0,0,0,.4)}
  .bot{font-size:.76rem;color:var(--ol-tenue);margin-top:8px;white-space:nowrap;
    overflow:hidden;text-overflow:ellipsis}
`;
const FRA_HOJA = soportaHojas ? css(FRA_CSS) : null;

class OceanFranjas extends HTMLElement {
  static get observedAttributes() { return ["momentos"]; }
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    montar(r, FRA_HOJA, FRA_CSS);
    r.innerHTML += `<div class="env"></div>`;
  }
  connectedCallback() { this.pintar(); }
  attributeChangedCallback() { if (this.shadowRoot.querySelector(".env")) this.pintar(); }
  pintar() {
    let ms = [];
    try { ms = JSON.parse(this.getAttribute("momentos") || "[]"); } catch (e) { return; }
    this.shadowRoot.querySelector(".env").innerHTML = ms.map(m => `
      <div class="col ${m.activo ? "on" : ""}">
        <div class="top">${m.eti || ""}</div>
        <div class="fr" style="background:linear-gradient(90deg,${m.de},${m.a})">
          ${m.activo ? `<span class="mk" style="left:${m.pos ?? 30}%"></span>` : ""}
        </div>
        <div class="bot">${m.hora || ""}</div>
      </div>`).join("");
  }
}
customElements.define("ocean-franjas", OceanFranjas);

/* ========================================================= <ocean-borde> ====
   La isla del borde: un panel vertical anclado al canto de la ventana.
   Aparece con un empujón lateral, no con un fundido.
   Atributos: lado (izq|der), abierto
   Método: .abrir() .cerrar() .destello(ms)
*/
const BOR_CSS = BASE + `
  :host{position:fixed;top:50%;z-index:400;pointer-events:none}
  :host([lado=izq]){left:0}
  :host([lado=der]){right:0}
  .caja{--ol-r:0;pointer-events:auto;flex-direction:column;align-items:center;
    gap:12px;padding:16px 11px;transform:translateY(-50%);
    box-shadow:0 18px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08);
    will-change:transform}
  :host([lado=izq]) .caja{border-radius:0 24px 24px 0}
  :host([lado=der]) .caja{border-radius:24px 0 0 24px}
  ::slotted(*){display:grid;place-items:center}
`;
const BOR_HOJA = soportaHojas ? css(BOR_CSS) : null;

class OceanBorde extends HTMLElement {
  static get observedAttributes() { return ["abierto", "lado"]; }
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    montar(r, BOR_HOJA, BOR_CSS);
    r.innerHTML += `<div class="caja"><slot></slot></div>`;
    this._s = new Resorte({ desde: 0, rigidez: 260, amortiguacion: 26 });
    this._corriendo = false; this._t = null;
  }
  connectedCallback() {
    if (!this.hasAttribute("lado")) this.setAttribute("lado", "izq");
    this._s.saltar(this.hasAttribute("abierto") ? 1 : 0);
    this.pintar();
  }
  attributeChangedCallback(n) {
    if (!this.shadowRoot.querySelector(".caja")) return;
    if (n === "abierto") { this._s.a(this.hasAttribute("abierto") ? 1 : 0); this.correr(); }
  }
  pintar() {
    const izq = this.getAttribute("lado") !== "der";
    const p = this._s.v;
    const caja = this.shadowRoot.querySelector(".caja");
    const fuera = izq ? -100 : 100;
    caja.style.transform = `translate(${(fuera * (1 - p)).toFixed(2)}%,-50%)`;
    caja.style.opacity = util.limitar(p * 1.6, 0, 1).toFixed(3);
  }
  correr() {
    if (this._corriendo) return;
    this._corriendo = true;
    agregar(dt => { this._s.paso(dt); this.pintar();
      if (this._s.quieto) { this._corriendo = false; return false; } });
  }
  disconnectedCallback() { clearTimeout(this._t); }
  abrir()  { this.setAttribute("abierto", ""); S.reproducir("abrir");  return this; }
  cerrar() { this.removeAttribute("abierto");  S.reproducir("cerrar"); return this; }
  /** Aparece, se queda un momento y se retira sola. */
  destello(ms = 1800) {
    clearTimeout(this._t); this.abrir();
    this._t = setTimeout(() => this.cerrar(), ms);
    return this;
  }
}
customElements.define("ocean-borde", OceanBorde);

/* ======================================================== <ocean-rostro> ====
   El rostro de autenticación. Cinco estados, cada uno con su geometría:
     reposo | mirando | verificando | ok | error
   Los ojos siguen al puntero en 'mirando'. La boca cambia de curva por estado.
*/
const ROS_CSS = BASE + `
  :host{display:inline-block;--tam:112px;--ol-acento:var(--o-ok,#34D399)}
  .env{width:var(--tam);height:var(--tam);border-radius:26%;background:#000;
    display:grid;place-items:center;position:relative;overflow:hidden;
    box-shadow:0 16px 44px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08);
    transition:box-shadow var(--o-t-medio,380ms) var(--o-ease,ease)}
  :host([estado=ok]) .env{box-shadow:0 0 0 2px var(--o-ok,#34D399),0 16px 50px rgba(52,211,153,.4)}
  :host([estado=error]) .env{box-shadow:0 0 0 2px var(--o-error,#F87171),0 16px 50px rgba(248,113,113,.4);
    animation:sacudir .42s var(--o-ease-io,ease)}
  @keyframes sacudir{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}
    45%{transform:translateX(6px)}70%{transform:translateX(-4px)}}
  svg{width:64%;height:64%;overflow:visible}
  .ojo{fill:var(--ol-acento);transition:fill var(--o-t-medio,380ms) var(--o-ease,ease)}
  .boca{fill:none;stroke:var(--ol-acento);stroke-width:6;stroke-linecap:round;
    transition:d var(--o-t-medio,380ms) var(--o-ease,ease), stroke var(--o-t-medio) var(--o-ease)}
  .barrido{position:absolute;left:0;right:0;height:34%;pointer-events:none;opacity:0;
    background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--ol-acento) 34%,transparent),transparent)}
  :host([estado=verificando]) .barrido{opacity:1;animation:barrer 1.15s ease-in-out infinite}
  @keyframes barrer{0%{transform:translateY(-120%)}100%{transform:translateY(320%)}}
  :host([estado=ok]),:host([estado=verificando]){--ol-acento:var(--o-ok,#34D399)}
  :host([estado=error]){--ol-acento:var(--o-error,#F87171)}
  @media(prefers-reduced-motion:reduce){
    :host([estado=verificando]) .barrido{animation:none;opacity:.5}
    :host([estado=error]) .env{animation:none}}
`;
const ROS_HOJA = soportaHojas ? css(ROS_CSS) : null;

const BOCAS = {
  reposo:      "M22,58 Q40,58 58,58",
  mirando:     "M22,56 Q40,64 58,56",
  verificando: "M22,58 Q40,58 58,58",
  ok:          "M20,52 Q40,72 60,52",
  error:       "M20,64 Q40,50 60,64",
};

class OceanRostro extends HTMLElement {
  static get observedAttributes() { return ["estado", "tam"]; }
  constructor() {
    super();
    const r = this.attachShadow({ mode: "open" });
    montar(r, ROS_HOJA, ROS_CSS);
    r.innerHTML += `<div class="env"><div class="barrido"></div>
      <svg viewBox="0 0 80 80">
        <rect class="ojo oi" x="22" y="24" width="8" height="17" rx="4"/>
        <rect class="ojo od" x="50" y="24" width="8" height="17" rx="4"/>
        <path class="boca"></path></svg></div>`;
    this._oi = new Resorte({ rigidez: 200, amortiguacion: 20 });
    this._od = new Resorte({ rigidez: 200, amortiguacion: 20 });
    this._corriendo = false;
  }
  connectedCallback() {
    if (!this.hasAttribute("estado")) this.setAttribute("estado", "reposo");
    this.pintar();
    this._mover = e => {
      if (this.getAttribute("estado") !== "mirando") return;
      const r = this.getBoundingClientRect();
      const dx = util.limitar((e.clientX - (r.left + r.width / 2)) / (r.width * 1.6), -1, 1);
      this._oi.a(dx * 4); this._od.a(dx * 4); this.correr();
    };
    addEventListener("pointermove", this._mover, { passive: true });
  }
  disconnectedCallback() { removeEventListener("pointermove", this._mover); }
  attributeChangedCallback() {
    if (!this.shadowRoot.querySelector(".boca")) return;
    if (this.getAttribute("tam")) this.style.setProperty("--tam", this.getAttribute("tam"));
    this.pintar();
  }
  pintar() {
    const e = this.getAttribute("estado") || "reposo";
    this.shadowRoot.querySelector(".boca").setAttribute("d", BOCAS[e] || BOCAS.reposo);
    const oi = this.shadowRoot.querySelector(".oi"), od = this.shadowRoot.querySelector(".od");
    // en 'ok' los ojos se entrecierran; en 'error' se abren
    const alto = e === "ok" ? 9 : e === "error" ? 20 : 17;
    const y = e === "ok" ? 28 : e === "error" ? 23 : 24;
    [oi, od].forEach(o => { o.setAttribute("height", alto); o.setAttribute("y", y); });
    oi.setAttribute("x", (22 + this._oi.v).toFixed(1));
    od.setAttribute("x", (50 + this._od.v).toFixed(1));
  }
  correr() {
    if (this._corriendo) return;
    this._corriendo = true;
    agregar(dt => { this._oi.paso(dt); this._od.paso(dt); this.pintar();
      if (this._oi.quieto && this._od.quieto) { this._corriendo = false; return false; } });
  }
}
customElements.define("ocean-rostro", OceanRostro);

window.OceanLive = {
  OceanActividad, OceanOnda, OceanAnillo, OceanRuta,
  OceanChispa, OceanArco, OceanFranjas, OceanBorde, OceanRostro,
};
})();
