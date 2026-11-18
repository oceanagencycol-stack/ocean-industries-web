# OCEAN v3: arquitectura para «sin lag, ultra suave»

> Etapa 0 · 18-nov-2026. Concepto: [CONCEPTO.md](CONCEPTO.md). Se apoya en lo medido en la v2 (Lighthouse móvil 99 sin
> precargar three.js), en CALPRO (reposo, visita larga, deploy con la página abierta) y en la casa 332 (películas por
> scroll: 1,6 GB de fotogramas decodificados congelaron un Mac de 8 GB).

## La decisión de fondo
**La toma corre en tiempo real sobre imágenes pregeneradas. No es un video.** Cada tramo combina:
1. **Lo que se calcula en vivo (WebGL2, three.js)**: la cámara, la atmósfera de la Tierra (un shader, sin textura), la
   superficie del mar y su cruce (línea de agua y ventana de Snell), los haces de luz, la niebla de profundidad, las
   partículas (las mismas en los tres tramos), la montaña (una malla de relieve con nieve y roca en triplanar) y la
   estrella (SDF del símbolo).
2. **Lo que se genera una vez con IA**: los fondos lejanos (el cielo del espacio, las nubes vistas desde arriba, la luz
   de la superficie vista desde abajo, el mar de nubes, el cielo del amanecer), los detalles de roca y hielo, las dos
   siluetas (buzo y caminante) y el sonido. Los mapas de profundidad de cada fondo se calculan **en local y gratis**
   (Depth Anything V2 Small, Apache-2.0) y el shader los usa para que la cámara los atraviese con paralaje real.

**Por qué no un video por scroll**: en el teléfono, ir a un cuadro concreto de un H.264 obliga a decodificar desde el
último cuadro clave (o a un archivo todo-intra enorme); Safari busca tarde y el decodificador se frena por
temperatura. La alternativa, una secuencia de fotogramas, pesa decenas de MB y mucha memoria (lección de la casa 332).
Y un video no reacciona: no se puede ir hacia atrás suave, ni cambiar de calidad, ni responder al dedo. El tiempo real
sí, y pesa una fracción. **El video queda para lo que no se scrollea**: la película de lanzamiento para redes y, solo
en el escenario máximo, lazos ambientales dentro de un fondo en escritorio.

**WebGL2, no WebGPU** en la v3.0: el motor de la v2 (gobernador, `precompile()`, presupuesto de píxeles) ya está medido
en WebGL2, y nada del concepto necesita cómputo en GPU (las partículas se animan en el vertex shader). Los shaders se
escriben para poder portarlos después; WebGPU solo si una etapa futura lo pide y una prueba lo justifica.

## Cómo se mueve
- **Estado = función del scroll.** Cada tramo declara sus anclas sobre la posición real de las secciones del HTML
  (`ResizeObserver`, nunca `vh` fijos); la cámara sigue con un resorte críticamente amortiguado. Se puede ir y volver a
  cualquier velocidad y el QA puede posar cualquier punto (`?qa=seek`).
- Scroll nativo en el teléfono; Lenis solo en escritorio, con `autoRaf: false` (duerme en reposo).
- Lienzo fijo al nivel de la ventana (no dentro de un contenedor con scroll: lección de la casa 332), medido por su caja
  (`100lvh`).
- **En reposo, cero cuadros**: sin scroll ni puntero, el render baja a 30 fps y a los 4 s se duerme (las partículas
  quietas se ven igual); `qa/reposo` lo mide.

## Presupuestos (los mide `qa/peso` y `qa/fps`; un build que se pasa falla)
| | Teléfono (tier medio) | Escritorio |
|---|---|---|
| Primer pintado: HTML + CSS en línea + fuente + póster del espacio | ≤ 120 KB (póster AVIF ≤ 50 KB) | ≤ 200 KB |
| JS inicial (sin three.js) | ≤ 60 KB comprimido | igual |
| three.js + motor (importado dinámico, nunca `modulepreload`) | ≤ 200 KB | igual |
| Tramo 1 · espacio | ≤ 250 KB | ≤ 600 KB |
| Tramo 2 · océano | ≤ 1,0 MB | ≤ 2,5 MB |
| Tramo 3 · montaña | ≤ 1,2 MB | ≤ 3,0 MB |
| **Recorrido completo** | **≤ 3,0 MB** | **≤ 7 MB** |
| Sonido (solo si se enciende) | ≤ 600 KB (Opus) | igual |
| Memoria de GPU | ≤ 150 MB | ≤ 400 MB |
| Cuadro | p95 ≤ 16,7 ms (60 fps), 0 tareas > 50 ms al scrollear | p95 ≤ 8,3 ms en 120 Hz con tier alto |
| Lighthouse móvil | rendimiento ≥ 95; accesibilidad, buenas prácticas y SEO 100; LCP ≤ 2,0 s; TBT ≤ 100 ms; CLS ≤ 0,01 | — |

El LCP es el titular (texto), no una imagen. El lienzo se arma después del primer pintado, con el hilo libre
(`whenCalm`, como la v2).

## Carga progresiva por tramo
- El tramo 1 se pide al estar la página quieta; el 2, al entrar al tramo 1 (o en reposo); el 3, al entrar al 2.
  Nunca se descarga todo de entrada, y con ahorro de datos o 2G no se descarga nada (versión quieta).
- **La cámara nunca espera.** Cada textura trae una miniatura de 32 px incrustada que pinta el lugar; la buena la
  reemplaza con un fundido. Las subidas a la GPU van por trozos en cuadros con holgura (ninguna > 4 ms).
- En el teléfono viven en la GPU solo el tramo actual y el siguiente; lo anterior se suelta y se guarda comprimido para
  volver.
- **Formatos**: AVIF (WebP de respaldo) decodificado fuera del hilo con `createImageBitmap`. KTX2 (Basis) solo si la
  prueba de la etapa 2 mide subidas > 8 ms o memoria fuera de presupuesto: su transcodificador (wasm) pesa y no se paga
  si no hace falta. Las imágenes de fondo van a 2048 px en escritorio y 1024–1536 en teléfono.
- Nombres con hash e `immutable`; un deploy con la página abierta recarga una vez (`stale.ts` de CALPRO).

## Gobernador de calidad
Tier inicial por GPU, memoria y núcleos (como la v2), luego mide: tiempo de GPU con `EXT_disjoint_timer_query_webgl2`
si existe, si no el intervalo entre cuadros. Escalones, con histéresis: DPR (hasta 0,8) → partículas (60k → 12k) →
pasadas secundarias a menor resolución (haces de luz, brillo) → tope de 30 fps → versión quieta. Nunca sube y baja en
bucle. `?q=high|mid|low` y `?dpr=` para QA. Un panel `?qa=fps` muestra p50/p95, tier y escalón en el propio teléfono
(así se mide en dispositivos reales: el sandbox no tiene GPU).

## Respaldos
| Caso | Qué se ve |
|---|---|
| Sin JavaScript | todo el contenido en orden, con los tres pósteres como `<picture>` |
| Movimiento reducido, sin WebGL2, WebGL por software, ahorro de datos | la versión quieta: un póster por tramo con fundido simple; sin partículas ni cámara |
| «Pausar movimiento» (WCAG 2.2.2) | la toma queda quieta en el punto del scroll; se recuerda |
| Teléfono lento | el gobernador baja hasta la versión quieta sin que se note un corte |
| Pérdida del contexto WebGL | se restaura una vez; si vuelve a fallar, la versión quieta |

## Qué se conserva del oficio de la v2
CSP estricta con hash del script de arranque (el build falla si cambia), Wompi en `script-src`, three.js sin precargar,
sin `backdrop-filter`, `:hover` dentro de `@media (hover: hover)`, nada de asignaciones por cuadro en el bucle, una caché
de «último valor» que empieza en un valor imposible, `renderer.forceContextLoss()` al soltar, el estado inicial decidido
en el script del `<head>` (nada parpadea en la red lenta), GA4 solo en el dominio real.

## Archivos (estructura de la v3)
`src/three/` → `src/world/`: `engine.ts` (renderer, gobernador, bucle que duerme), `camera.ts` (la toma),
`space.ts`, `ocean.ts`, `mountain.ts`, `particles.ts`, `star.ts`, `assets.ts` (carga por tramo), `still.ts` (versión
quieta). `src/brand/` (los tres SVG). `tools/media/` (profundidades, recortes, AVIF/KTX2, miniaturas, procedencia en
`data/procedencia.json`). `qa/` nuevo: `peso`, `fps`, `reposo`, `soak`, `respaldos`, `marca`; se conservan `flows`,
`overflow`, `shoot`.
