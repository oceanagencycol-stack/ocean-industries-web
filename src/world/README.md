# src/world: el mundo de la v3 (película de placas)

La toma de la web es una sola, atada al scroll: siete placas fotográficas (`media/v3/direccion/`, elegidas por Juan
el 18-nov) con su movimiento de cámara y un cruce propio entre cada par, en un solo quad de WebGL2 (sin three.js:
≈ 14 KB gz con las miniaturas), con partículas que cambian de papel y grano de película encima.

| Archivo | Qué es |
|---|---|
| `camera.ts` | La toma como función del scroll: anclas leídas de las secciones (`ResizeObserver`), resorte críticamente amortiguado (no se pasa, tope de velocidad), `?qa=seek=` |
| `plates.ts` | El mundo: `mountWorld()`, los cruces (un programa por cruce), las partículas, el bucle que duerme, la carga por partes, la versión quieta |
| `plates.json` | Las placas en orden: fuente, foco, recorte vertical (`vx`), movimiento, profundidad fingida, cruce. **Se edita a mano** |
| `plates.thumbs.json` | Miniaturas de 32 px en base64 y medidas. **Lo escribe `tools/placas.mjs`** |
| `dev.ts` | La página de desarrollo (`dev-world.html`) |

## Montarlo en una página

```html
<canvas id="world" aria-hidden="true"></canvas>   <!-- fijo: position: fixed; width: 100vw; height: 100lvh -->
<section data-tramo="espacio">…<picture class="still">…</picture></section>
<section data-tramo="satelite">…</section>
<!-- mar, agua, maquina, emerge, cumbre: en este orden (el de plates.json) -->
```

```ts
const { mountWorld } = await import('./world/plates') // dinámico: fuera del primer bundle
const world = await mountWorld({
  canvas: document.getElementById('world') as HTMLCanvasElement,
  sections: document.querySelectorAll<HTMLElement>('[data-tramo]'), // NodeList o array
  lenis, // opcional, escritorio, creado con autoRaf: false (el mundo lo mueve y duerme con él)
})
// null: versión quieta (sin WebGL2, movimiento reducido, ahorro de datos, WebGL por software); la razón queda en
// html[data-world-still]. Si no es null, el primer cuadro ya está pintado: la página puede encender el lienzo.
world?.setProgress(0.5) // fija la toma (intro, QA); setProgress(null) la devuelve al scroll
world?.dispose() // suelta GL, listeners y observadores
```

- **Clases en `<html>`**: `world-on` cuando el primer cuadro ya está pintado (el lienzo entra con un fundido de CSS);
  `world-still` en la versión quieta. La página debe mostrar sus `<picture class="still">` por defecto (sin
  JavaScript) y esconderlos con `.world-on .still { display: none }`. `dev-world.html` tiene el CSS de referencia
  (cada placa fija en su sección con el mismo recorte que el mundo: `object-position` desde el foco).
- **La toma**: si una sección no trae `data-shot`, el mundo se lo pone: el tope del tramo k llega en `p = k − 0,3`
  (con `p = s · 6`): el cruce (centrado en `p = k − 0,5`) ocurre justo antes de que su titular entre.
- **Las placas** se piden de `/v3/world/` (`base`): `<id>-2560|1920|1280.avif` en escritorio (el ancho que cubre los
  píxeles del lienzo) y `<id>-v.avif` (1080×1920) cuando la pantalla es vertical (aspecto < 0,8); WebP si el navegador
  no decodifica AVIF. Primero las miniaturas (en el JS), luego la actual y la siguiente, el resto en reposo.

## Rehacer las placas

```sh
node tools/placas.mjs   # lee plates.json y media/v3/direccion/, escribe public/v3/world/ y plates.thumbs.json
```

Presupuesto (AVIF): placa de escritorio a 1920 ≤ 260 KB, vertical ≤ 180 KB (falla si no entra). La calidad se busca
por placa: la más alta que entra.

## Reglas
- Una sola firma: la estrella de OCEAN (SDF horneado de `marca/v3/simbolo-simetrico.svg`) solo aparece en el destello
  del primer cruce; el resto de la luz es de las placas.
- Nada se aloca por cuadro; un programa por cruce (sin ramas en el shader: SwiftShader y algunas GPU de teléfono pagan
  todas); en reposo, 30 fps y a los 4 s ningún cuadro.
- Las placas son ilustraciones generadas con IA (procedencia en `data/procedencia.json`): la web lo dice en el pie.

## QA
`node qa/maqueta.cjs` (arma, sirve y prueba: 20 puntos por placa y cruce en escritorio y teléfono, idénticos en dos
corridas; rueda, teclado y gesto táctil real monótonos y sin saltos; reposo; versión quieta y sin JavaScript; un video
por pantalla). `--film` agrega una película cuadro a cuadro (H.264).
