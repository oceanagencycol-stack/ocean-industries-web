# CLAUDE.md — ocean-industries-web (v5)

Web oficial de OCEAN (nombre legal: Ocean Industries; oceanindustries.com.co). Comunicación con Juan: **español**.
Contenido: **ES por defecto, EN y PT** (cada elemento lleva `data-es` / `data-en` / `data-pt`, y `data-*-aria` /
`data-*-ph` para nombres accesibles y placeholders).

**v5 (ramas `v5-secuencia` → `v5-cierre`) está en producción desde el 20-nov-2026** (`main` 27953b7, con visto bueno de Juan Manuel): una sola película que
avanza con el scroll. `index.html` + `src/main.ts` → `src/v4/` (`stage.ts` el escenario WebGL2, `film.ts` la línea de
tiempo, `script.ts` el guion técnico, `preload.ts` la apertura con la marca) y `src/styles/v4.css` + `epilogue.css`
sobre `v3.css`. Película en `public/v4/`, cortes en `src/v4/film.json`. Todo en `docs/v4/PELICULA.md`.
La v2 quedó en `dpl_DhkVanu9RLzNPmZ2ynUvrGbP2tkA` (`main` 2f12397) para volver atrás con «Promote». `v3-cine` y
`v4-pelicula` quedan como historia. **Siguiente: la v6** (película remasterizada), plan en `docs/plan-v6.md`.

### Reglas propias de la v5
- **Legibilidad sobre la película**: el texto nunca lleva caja; el shader recoge la luz detrás de las cajas medidas
  del texto visible (`READ` en `film.ts`, fuerza por rótulo con `data-scrim`; 0 = sin recoger). Texto oscuro sobre
  cielo claro («Arriba») no entra en `READ`.
- **Cada rótulo cabe**: `fit()` en `film.ts` recoge aire (`.is-snug`), luego lo secundario entero (`.is-tight`) y por
  último baja la tipografía grande (`--fit`, bisección). Nunca se corta texto a media palabra. Prueba:
  `node qa/ajuste-rotulos.cjs http://localhost:4175/ [--lang=en]`.
- **Rótulos anclados**: se esconden si la etiqueta, la línea o el punto cruzan texto o telemetría.
- **La marca en la película**: apertura (estrella → dos mitades del isotipo → el logotipo se escribe y vuela a la
  barra), sello en la luz de la cumbre (`.beat--seal`, `data-fade`) y firma del pie en metal claro con franja de luz
  (`brand.ts`). Todo sale de `marca/v3/` por marcadores del build: `<!--SIMBOLO_APERTURA:…-->`,
  `<!--SIMBOLO_PARTES:…-->`, `<!--LOGO_R_METAL:…-->`, `<!--SIMBOLO_METAL:…-->` (`vite.config.ts`).
- **Logotipo robusto** (20-nov): `tools/marca/robusta.py` desde `robusta.json`; el maestro del 18-nov en
  `marca/v3/anterior/`.

### SEO e IA SEO (rama `v5-seo`, 20-nov-2026)
- **Posicionamiento**: OCEAN es primero una **empresa de software e ingeniería con IA** (software a la medida, agentes de
  IA, automatización); webs, contenido y pauta completan el sistema. Así en el título, la portada, la barra, los datos
  estructurados y `llms.txt`. Qora aparece como caso y «firma de IA aliada de OCEAN en Estados Unidos» (pedido de Juan Diego, 20-nov; la web de Qora ya nombra a Ocean Industries como estudio hermano).
- **Páginas segmentadas**: `/servicios`, `/servicios/<servicio>` (5) y `/en` (nearshore para EE. UU.). Salen de
  `tools/paginas-seo/contenido.mjs` con `node tools/paginas-seo/build.mjs`, que también escribe `public/sitemap.xml`,
  `public/robots.txt` (bots de IA permitidos), `public/llms.txt` y `public/llms-full.txt`. No se editan a mano: se
  cambia el contenido y se vuelve a generar. Usan `src/lite.ts` (con GA4) y los estilos `.sp-*` de `lite.css`.
- **Home**: bloque `#servicios` y `#preguntas` (FAQ visible, con `FAQPage` en el JSON-LD) en el epílogo, trilingües.
- Prueba de las páginas: título ≤ 60, descripción ≤ 165, un H1, JSON-LD válido, sin desborde de 320 a 1440 px.
- Lighthouse móvil 20-nov (preview, SwiftShader): páginas de servicios 100/100/100/100; home accesibilidad, buenas
  prácticas y SEO 100 (el rendimiento de la home sin GPU no es representativo: la película va por WebGL).

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
- **La intro de marca**: abre a petición desde el pie (`?intro=1`; QA con `?qa=intro`). El recorrido normal abre con la
  portada a sangre. Si toca, `html.intro-due` muestra el velo. `[data-intro-dock]` es el logotipo de la barra.
- **La E son tres horizontes**: `.horizon` (las barras de la E de `logo.svg`) quieta al borde izquierdo en el computador;
  el tramo en el centro de la pantalla enciende su barra (`data-horizon` 1–3; la cumbre, 4 = las tres).
- **La cumbre y el pie van sobre la nieve** (`[data-light]`): la barra se vuelve clara encima (`html.nav-light`).
- **Pausar el movimiento** (WCAG 2.2.2): controles en la barra y el pie con el mundo real; suelta el mundo, deja las placas y se
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
- **Sonido v3** (`src/v3/SONIDO.md`): cero audio hasta el primer clic o toque (nunca una tecla, formulario, idioma o «Saltar intro») o el botón de la barra; motor `sound.ts` por import dinámico, ambientes por tramo con paso bajo bajo el agua, efectos en los cruces; se calla con el chat o un reel con sonido; ahorro de datos = apagado. Audio en `public/v3/audio/` (`node tools/audio.mjs`); `node qa/sonido.cjs`.
- Honestidad: nada de cifras, clientes, logos ni testimonios que no estén aprobados (48 h, 24/7, 11 s y los siete casos:
  Súper Machi, Humberto Garcés, Qora, Sancho, Outstanding, Naidikó, Álvaro Arroyo). Súper Machi y Sancho, lanzadas y aprobadas
  por el restaurante (20-nov), llevan enlace; las capturas de los casos van en `public/v3/casos/` (1440×756, WebP).
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
- `node qa/flujos-v5.cjs http://localhost:4175/`: los recorridos de la v5: idioma y WhatsApp, rótulos de la película
  en su tramo, chat simulado, servicios y preguntas, los siete casos con enlace y captura, Valeria (de ejemplo), reels,
  Cal.com, barra clara, pagos sin pagar, pie, índice del teléfono, movimiento reducido, sin JS, 404, privacidad y una
  página de servicio. Termina en «todo en verde». (`qa/flows.cjs` es el de la v3: busca placas que la v5 no tiene.)
- `node qa/paginas-seo.cjs http://localhost:4175/`: servicios, `/en` y los bloques de la home (un H1, título y
  descripción, JSON-LD, desborde de 320 a 1440 px, consola, preguntas que abren, enlaces internos vivos). Termina en
  «páginas sin problemas».
- `node qa/overflow.cjs http://localhost:4175/`: nada se sale de 320 a 1440 px en ES/EN/PT («nada se sale de la pantalla»).
- `node qa/intro-pagina.cjs http://localhost:4175/ <carpeta>`: intro a petición, capturas en el tiempo.
- `node qa/intro-v3.cjs` (del paquete de la intro).
- Lighthouse móvil contra el preview (`CHROME_PATH` al Chromium de Playwright, `/opt/pw-browsers/.../chrome`):
  19-nov-2026, primera visita con intro, 7 corridas: rendimiento 93–99 (mediana 98); accesibilidad, buenas prácticas y
  SEO 100; LCP 2,0–2,4 s, TBT 30–250 ms, CLS 0. La tarea larga mayor es el análisis del HTML (≈ 150 ms, CSS en línea).
