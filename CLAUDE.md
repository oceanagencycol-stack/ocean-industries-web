# CLAUDE.md — ocean-industries-web (v3)

Web oficial de OCEAN (nombre legal: Ocean Industries; oceanindustries.com.co). Comunicación con Juan: **español**.
Contenido: **ES por defecto, EN y PT** (cada elemento lleva `data-es` / `data-en` / `data-pt`, y `data-*-aria` /
`data-*-ph` para nombres accesibles y placeholders).

## Antes de tocar nada
1. Lee `DESIGN.md` (el sistema v3), `docs/v3/CONCEPTO.md`, `docs/v3/ARQUITECTURA.md`, `docs/plan-v3.md` («Decisiones
   de Juan») y el brain (`brain/proyectos/ocean-industries-web.md`).
2. `npm install && npm run typecheck && npm run build` debe pasar limpio.
3. Producción manda: `curl -sI https://www.oceanindustries.com.co/` antes de afirmar qué está publicado.

## Reglas
- **Producción solo con visto bueno de Juan**: `main` es lo publicado. La v3 vive en `v3`; cada paquete en su rama
  `v3-<paquete>` (página: `v3-pagina`; mundo: `v3-maqueta`; intro: `v3-intro`), con commit y push al avanzar.
- **La marca sale de `marca/v3/` y no se redibuja** (Juan, 18-nov): `logo-sin-r.svg` en la barra, `logo.svg` (OCEAN®,
  registrada) en el pie, `simbolo-simetrico.svg` el símbolo. El build los pone en línea con `<!--LOGO:clase-->`,
  `<!--LOGO_R:clase-->` y `<!--SIMBOLO:clase-->` (`vite.config.ts`). Favicon, íconos y `og.jpg` salen de
  `tools/medios_pagina.py` (el símbolo simétrico en el lienzo de `simbolo-cuadrado.svg`; el og sobre M1a).
- **Nombre**: OCEAN en títulos, barra, textos, agente y redes; «Ocean Industries» solo como nombre legal (pie,
  `/privacidad`, JSON-LD `legalName`).
- **Monocromo tipo Tesla**: tokens `--space #03060C`, `--abyss #06141D`, `--slate #2B404F`, `--haze #6E8193`,
  `--mist #B2C0CC`, `--snow #E0E7ED`, `--white #FFFFFF`. Sin verde ni azul. La acción principal es el único blanco puro
  (botón blanco con texto abisal; sobre la nieve se invierte a abisal con texto blanco); la secundaria, contorno fino.
  `--haze` nunca sobre `--slate` ni sobre `--snow`. Pares medidos en `DESIGN.md`.
- **Gramática de las escenas por tono y forma**: persona = nieve sólida; IA = línea fina `--mist` de 1 px sin relleno;
  resultado = blanco pleno que se enciende (`.chip--ok`, destello `lit`). Los datos de las escenas son de ejemplo y lo dicen.
- **Geist** variable servida propia (`src/styles/fonts.css`, solo latin + latin-ext; el latín se precarga). Titulares
  600 a −0,035 em; etiquetas en mayúsculas a 0,24 em; texto 400 a 17–18 px, interlineado 1,6. Una sola familia.
- **Grano de película** sobre todo: `.grain` con `public/v3/grano.png` (la tesela de la intro, `tools/grano.mjs`),
  `soft-light` al 0,06. Sin `backdrop-filter`.
- **Una sola gramática de entrada** (`src/v3/reveal.ts`): titulares `[data-reveal]` por líneas (`.ln > span`) que suben
  desde su máscara mientras la interletra se asienta; lo secundario `[data-rv]` 120 ms después con un barrido de luz
  (`.rv-sweep`); cifras `[data-count]` que cuentan. Web Animations + IntersectionObserver. Nada de fade-up genérico.
  El estado oculto solo existe con `html.js` y movimiento; si el JS no llega, `rv-safety` lo muestra a los 3,6 s.
  Botones: reflejo al pasar el puntero (solo dentro de `@media (hover: hover)`) y hundimiento de 1 px al presionar.
- **El mundo y la intro se consumen solo por API** (`src/v3/bridge.ts`, con `import.meta.glob` + stubs en
  `src/v3/stubs.ts`): `mountWorld({ canvas, sections })` → `{ dispose }` y `shouldRunIntro()` / `runIntro({ dock })`.
  La página no toca `src/world/` ni `src/intro-v3/`. Mientras `src/world/plates.ts` no exista, el stub deja la versión
  quieta; al integrarlo entra solo, sin tocar la página. El mundo se pide en `whenCalm()` (después del primer pintado),
  nunca con movimiento reducido, ahorro de datos o 2G, ni precargado.
- **Placas de respaldo**: cada `[data-tramo]` trae su `<!--PLACA:nombre-->` (vertical en pantallas altas, 16:9 en las
  demás; AVIF + WebP en `public/v3/pagina/`). Con el mundo montado se esconden (`html.has-world`). La de la portada va
  con prioridad; la del satélite no invade la primera pantalla (si no, es el LCP y perezosa).
- **La intro**: el script de arranque (`<script data-ocean-boot>`) decide antes de pintar con la regla de
  `shouldRunIntro()` (no con movimiento reducido ni si se vio en 7 días, `ocean-v3-intro-at`), más: no con ancla ni con
  `?qa` salvo `?qa=intro`. Si toca, `html.intro-due` muestra el velo `[data-intro-veil]` (se va solo a los 3 s si el JS no
  llega). La portada espera (`holdHero`) y entra cuando el negro se abre. `[data-intro-dock]` es el logotipo de la barra;
  `[data-intro-inert]` en barra, `main` y pie.
- **La E son tres horizontes**: `.horizon` (las barras de la E de `logo.svg`) quieta al borde izquierdo en el computador;
  el tramo en el centro de la pantalla enciende su barra (`data-horizon` 1–3; la cumbre, 4 = las tres).
- **La cumbre y el pie van sobre la nieve** (`[data-light]`): la barra se vuelve clara encima (`html.nav-light`).
- **Pausar el movimiento** (WCAG 2.2.2): botón en el pie, solo con el mundo real; suelta el mundo, deja las placas y se
  recuerda (`ocean-motion-paused`).
- **CSP**: el script de arranque va por hash en `vercel.json`; si cambia, el build falla y da el hash nuevo. Wompi
  necesita `https://checkout.wompi.co` en `script-src`.
- **Pagos**: la tarjeta nunca toca a OCEAN (widget de Wompi); la firma sale de `/api/pago-wompi`; el regreso de Wompi no
  confirma nada (lo confirma el webhook). No se hacen pagos reales en pruebas.
- **El agente de la web** (`/api/agente`, n8n) no se prueba con mensajes reales: en `vite`/`vite preview` responde un
  simulado.
- **Analítica**: GA4 solo mide en `oceanindustries.com.co` (ni vistas previas, ni local, ni `?qa`).
- **Agenda**: Cal.com en claro; en el teléfono (≤ 760 px) se abre en su página; en el computador va incrustado.
- **Barra**: enlaces desde 1081 px; el menú desde 1080 px hacia abajo. «Habla con OCEAN» solo en el computador.
- Sin sonido en la página por ahora (los ambientes de la v3 llegan con su paquete; la intro trae sus ganchos).
- Honestidad: nada de cifras, clientes, logos ni testimonios que no estén aprobados (48 h, 24/7, 11 s y los tres casos).
  Los paisajes son ilustraciones con IA y el pie lo dice.
- Sin secretos en el repo. Commits con identidad `oceanagencycol-stack <oceanagencycol@gmail.com>`.

## Dónde está cada cosa
`index.html` (la página, siete tramos) · `privacidad.html` · `404.html` · `src/main.ts` (arranque) · `src/v3/`
(`bridge.ts` mundo e intro por API, `stubs.ts`, `reveal.ts` la entrada, `chrome.ts` la barra y la E) ·
`src/intro-v3/` (la intro, paquete propio) · `src/ui/` (idioma, WhatsApp, menú, escenas, Valeria, el chat, pagos, reels,
agenda, analítica) · `src/styles/` (`fonts.css`, `v3.css` el sistema, `demos.css` las escenas, `lite.css` 404 y
privacidad) · `api/` (agente, firma de Wompi, reels) · `public/v3/` (placas, grano) · `tools/medios_pagina.py` (placas,
íconos, og) · `qa/`. La v2 (`src/three/`, `src/intro/`, `dev-stage.html`) queda en el repo sin importarse.

## QA (con `npm run build && npx vite preview --port 4175`)
- `node qa/shoot.cjs http://localhost:4175/ <carpeta> both [--lang=en|pt] [--world] [--full]`: cada tramo en escritorio
  1440×900 y teléfono 390×844, consola, red, desborde y que todo haya entrado. Termina en «sin problemas».
- `node qa/flows.cjs http://localhost:4175/`: idioma, WhatsApp, la E, barra clara, chat simulado, escenas, Valeria,
  reels, Cal.com, pagos sin pagar, menú del teléfono, intro (velo y salida), movimiento reducido, sin JS, 404 y
  privacidad. Termina en «todo en verde».
- `node qa/overflow.cjs http://localhost:4175/`: nada se sale de 320 a 1440 px en ES/EN/PT («nada se sale de la pantalla»).
- `node qa/intro-pagina.cjs http://localhost:4175/ <carpeta>`: primera visita real con la intro, capturas en el tiempo.
- `node qa/intro-v3.cjs` (del paquete de la intro).
- Lighthouse móvil contra el preview (`CHROME_PATH` al Chromium de Playwright, `/opt/pw-browsers/.../chrome`):
  19-nov-2026, primera visita con intro, 7 corridas: rendimiento 93–99 (mediana 98); accesibilidad, buenas prácticas y
  SEO 100; LCP 2,0–2,4 s, TBT 30–250 ms, CLS 0. La tarea larga mayor es el análisis del HTML (≈ 150 ms, CSS en línea).
