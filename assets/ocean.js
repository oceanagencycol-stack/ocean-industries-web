/* ============================================================================
   OCÉANO — Ocean Industries
   Olas fluidas dibujadas en canvas 2D (cero dependencias, cero WebGL).
   Líneas horizontales que ondulan como la superficie del mar, con un
   gradiente de marca (azul profundo → azul eléctrico → verde neón) y un
   halo de luz que sigue al cursor. "We turn brands into waves", literal.

   Por qué canvas 2D y no WebGL:
   - Se ve orgánico y suave (olas reales, no una rejilla de puntos).
   - Funciona en absolutamente todos los navegadores y GPUs (sin depender
     de que el driver de WebGL colabore).
   - Ligero: se dibuja solo la mitad inferior del hero.

   Rendimiento:
   - Se pausa fuera del viewport y con la pestaña oculta.
   - prefers-reduced-motion → dibuja un fotograma estático (sin animación).
   - DPR limitado a 2 para no reventar pantallas retina.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("oceanCanvas");
  var hero = document.getElementById("hero");
  if (!canvas || !hero) return;

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Paleta de marca
  var COLORS = [
    { p: 0.0, c: [11, 31, 140] },   // #0B1F8C azul profundo
    { p: 0.55, c: [0, 80, 255] },   // azul eléctrico
    { p: 1.0, c: [0, 255, 127] },   // #00FF7F verde neón
  ];
  function lerpColor(t) {
    t = Math.max(0, Math.min(1, t));
    for (var i = 0; i < COLORS.length - 1; i++) {
      var a = COLORS[i], b = COLORS[i + 1];
      if (t >= a.p && t <= b.p) {
        var k = (t - a.p) / (b.p - a.p);
        return [
          Math.round(a.c[0] + (b.c[0] - a.c[0]) * k),
          Math.round(a.c[1] + (b.c[1] - a.c[1]) * k),
          Math.round(a.c[2] + (b.c[2] - a.c[2]) * k),
        ];
      }
    }
    return b.c;
  }

  var dpr = 1, W = 0, H = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Cursor (halo de luz)
  var mx = -9999, my = -9999, tmx = -9999, tmy = -9999;
  function onMove(e) {
    var p = e.touches ? e.touches[0] : e;
    var r = canvas.getBoundingClientRect();
    tmx = p.clientX - r.left;
    tmy = p.clientY - r.top;
  }
  function onLeave() { tmx = -9999; tmy = -9999; }
  if (!reduced) {
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave, { passive: true });
    hero.addEventListener("touchmove", onMove, { passive: true });
    hero.addEventListener("touchend", onLeave, { passive: true });
  }

  // Parámetros de las olas
  var LINES = 22;          // número de crestas
  var POINTS = 90;         // resolución horizontal de cada cresta

  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    // suavizar el seguimiento del cursor
    if (tmx > -9000) { mx += (tmx - mx) * 0.09; my += (tmy - my) * 0.09; }
    else { mx += (-9999 - mx) * 0.05; my += (-9999 - my) * 0.05; }

    var t = time * 0.00035;
    // Las olas ocupan la mitad inferior del hero (donde no está el texto)
    var top = H * 0.42;
    var bandH = H - top;

    ctx.globalCompositeOperation = "lighter"; // acumula luz (efecto glow)

    for (var i = 0; i < LINES; i++) {
      var li = i / (LINES - 1);              // 0 arriba → 1 abajo
      var baseY = top + bandH * li;
      // Amplitud crece hacia el frente (abajo), como olas que se agrandan
      var amp = (6 + li * li * 30);
      var col = lerpColor(li * 0.85 + 0.05);

      // Opacidad: tenue atrás, más viva adelante
      var alpha = 0.06 + li * 0.20;

      ctx.beginPath();
      for (var j = 0; j <= POINTS; j++) {
        var x = (j / POINTS) * W;
        var nx = j / POINTS;
        // Suma de ondas con distintas frecuencias/velocidades = superficie orgánica
        var y = baseY
          + Math.sin(nx * 6.0 + t * 1.7 + i * 0.5) * amp
          + Math.sin(nx * 11.0 - t * 2.3 + i * 0.9) * amp * 0.4
          + Math.sin(nx * 3.0 + t * 1.1) * amp * 0.5;

        // Empuje del cursor: las olas se elevan cerca del puntero
        if (mx > -9000) {
          var dx = x - mx;
          var dy = baseY - my;
          var d2 = dx * dx + dy * dy;
          var infl = Math.exp(-d2 / (2 * 120 * 120));
          y -= infl * 42 * (0.4 + li);
        }

        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + alpha + ")";
      ctx.lineWidth = 1 + li * 1.4;
      ctx.stroke();
    }

    // Halo suave bajo el cursor
    if (mx > -9000) {
      var g = ctx.createRadialGradient(mx, my, 0, mx, my, 160);
      g.addColorStop(0, "rgba(0,255,127,0.10)");
      g.addColorStop(1, "rgba(0,255,127,0)");
      ctx.fillStyle = g;
      ctx.fillRect(mx - 160, my - 160, 320, 320);
    }

    ctx.globalCompositeOperation = "source-over";
  }

  // Loop
  var raf = null, visible = true;
  function frame(now) {
    raf = null;
    draw(now);
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
  window.addEventListener("resize", function () {
    clearTimeout(rT);
    rT = setTimeout(function () { resize(); if (reduced) draw(9000); }, 120);
  }, { passive: true });

  // Arranque
  resize();
  if (reduced) draw(9000);
  else play();
  canvas.classList.add("on");
})();
