# OCEAN v3: plan por etapas

> 18-nov-2026 · director de la etapa 0. Concepto: [v3/CONCEPTO.md](v3/CONCEPTO.md) · técnica: [v3/ARQUITECTURA.md](v3/ARQUITECTURA.md)
> · medios y créditos: [v3/MEDIOS.md](v3/MEDIOS.md).

## Reglas del trabajo
- La v3 vive en la rama **`v3`** (sale de `main`), con su vista previa de Vercel y `noindex`. **`main` no se toca** sin
  el visto bueno de Juan. Vuelta atrás: «Promote» del despliegue vigente de la v2.
- Cada paquete va en su rama `v3/<paquete>`, toca **solo sus archivos**, lleva commit y push al terminar y entra a `v3`
  cuando lo aprueba un verificador que no lo construyó. Lo difícil (diseño, arquitectura, revisión crítica) lo dirige el
  director. Los modelos de cada paquete: `opus` para lo difícil, `sonnet` para lo normal, `haiku` para lo mecánico.
- No se gasta un crédito sin el presupuesto aprobado de esa etapa ([MEDIOS.md](v3/MEDIOS.md)). Cada corrida se anota en
  `docs/elevenlabs.tsv`.
- Al cerrar cada etapa: `CLAUDE.md`, `DESIGN.md` y el brain (`brain/proyectos/ocean-industries-web.md`) al día.

## Etapas
| # | Etapa | Listo cuando… | Aprueba Juan |
|---|---|---|---|
| 0 | Concepto y marca | Están en el repo el concepto, la arquitectura, los medios y este plan (`v3-plan`). El logotipo final y el símbolo están en vector en `v3-marca` y pasan `qa/marca` (el contorno coincide con el PNG maestro en ≥ 99 % de los píxeles a 2.000 px). Juan respondió las preguntas de abajo | las respuestas; el trazo del logotipo final y del símbolo |
| 1 | Dirección visual | Hay 12 cuadros de dirección (6 momentos × 2) y una **maqueta en gris** de la toma: el recorrido completo con formas simples, anclado al scroll real, grabado en video en escritorio y en teléfono. También la paleta con sus pares de contraste medidos y la tipografía en uso | el presupuesto de la línea 1 **antes** de generar; luego la dirección (cuadros, maqueta, paleta, tipo) **antes de construir** |
| 2 | Motor y tramos | Los tres tramos corren en tiempo real con texturas provisionales: cámara, partículas, atmósfera, cruce del agua, montaña, estrella, gobernador, carga por tramo y versión quieta. Se cumplen los presupuestos de [ARQUITECTURA](v3/ARQUITECTURA.md) | — (se le muestra la vista previa) |
| 3 | Medios finales | Los fondos, los encuadres verticales, las profundidades, el sonido y la procedencia de cada archivo están integrados. El peso queda dentro del presupuesto | el presupuesto de las líneas 2–6 **antes** de generar; elige entre las tomas |
| 3b | Película de lanzamiento (en paralelo, fuera de la web) | 30 s en 9:16 con la música propia, montada sin cortes, más una versión con el logotipo para redes | el presupuesto de la línea 8 **antes**; luego el corte final |
| 4 | Contenido y producto | El HTML trilingüe está completo: los seis servicios en sus tramos con sus escenas, Valeria, los casos, los reels, hablemos, la agenda, los pagos, el chat, WhatsApp, GA4, la 404, `llms.txt`, el JSON-LD y og.jpg. Todo funciona sin JavaScript | el copy (titular nuevo y textos de cada tramo) |
| 5 | Pulido y QA total | Todo lo de abajo está en verde, más una revisión independiente (otro agente de diseño, teléfono y computador, ES/EN/PT) y una prueba en el iPhone y en un Android de Juan con `?qa=fps` | la vista previa final |
| 6 | Publicación | `v3` → `main` con su visto bueno. Después: `curl -sI` al dominio, consola y CSP limpias en producción, Lighthouse contra producción y GA4 midiendo | **producción** |

## Paquetes por etapa
| Etapa | Paquete (rama `v3/…`) | Archivos | Modelo | Aceptación medible |
|---|---|---|---|---|
| 0 | marca (ya en curso: `v3-marca`) | `marca/v3/*.svg` → `src/brand/` | sonnet | `qa/marca`: coincide ≥ 99 % con el maestro; el SVG pesa ≤ 6 KB; sin `<style>` en línea |
| 1 | cuadros | `media/v3/direccion/`, `docs/elevenlabs.tsv` | sonnet | 12 cuadros a 2K, gasto ≤ 21.960, procedencia anotada |
| 1 | maqueta en gris | `src/world/camera.ts`, `src/world/greybox.ts`, `dev-world.html` | **opus** | toma completa ida y vuelta con rueda, teclado y gesto táctil real (CDP); `?qa=seek` posa 20 puntos idénticos en dos corridas |
| 1 | tokens y tipo | `src/styles/tokens.css`, `tools/fuentes.py` | sonnet | todo par de texto ≥ 4,5 de contraste (script); Outfit recortada ≤ 35 KB |
| 2 | motor | `src/world/engine.ts`, `src/core/device.ts` | **opus** | gobernador con histéresis (sin oscilar en 60 s); 0 cuadros en reposo (`qa/reposo`); `forceContextLoss` al soltar |
| 2 | partículas y estrella | `src/world/particles.ts`, `src/world/star.ts` | sonnet | un solo buffer para los tres medios, sin realocar; 60k/12k partículas por tier |
| 2 | espacio | `src/world/space.ts` | sonnet | atmósfera en un solo pase; ≤ 2 ms de GPU en tier medio |
| 2 | océano | `src/world/ocean.ts` | **opus** | cruce de la superficie en las dos direcciones sin costura visible (capturas cuadro a cuadro); ventana de Snell; ≤ 4 ms |
| 2 | montaña | `src/world/mountain.ts`, `tools/media/relieve.py` | **opus** | malla ≤ 130k triángulos en teléfono; continua del fondo a la cumbre; ≤ 5 ms |
| 2 | carga y versión quieta | `src/world/assets.ts`, `src/world/still.ts` | sonnet | la cámara nunca espera (6 Mbps y 1,6 Mbps); subida a GPU ≤ 4 ms por cuadro; prueba AVIF contra KTX2 con números |
| 2 | QA de rendimiento | `qa/peso.cjs`, `qa/fps.cjs`, `qa/reposo.cjs`, `qa/respaldos.cjs` | sonnet | fallan si se rompe un presupuesto; `?qa=fps` en pantalla |
| 3 | fondos y profundidades | `media/v3/`, `tools/media/`, `public/world/` | sonnet | AVIF + miniatura de 32 px por fondo; profundidad local; `data/procedencia.json` completo |
| 3 | sonido | `src/core/sounds.ts`, `public/sound/` | sonnet | lazos sin costura (RMS en la unión); Opus ≤ 600 KB en total; nada suena antes de un gesto |
| 3b | película | `media/v3/pelicula/`, `tools/film/` | sonnet | 5 tomas unidas sin corte visible; música medida por RMS; no entra al bundle |
| 4 | página | `index.html`, `src/ui/*` | sonnet | `qa/flows` y `qa/overflow` en verde en ES/EN/PT, de 320 a 1440 px |
| 4 | escenas de servicios | `src/ui/demos.ts`, `src/styles/demos.css` | sonnet | WCAG 2.2.2 (pausa y tres vueltas); datos de ejemplo rotulados |
| 4 | SEO y metadatos | `vite.config.ts`, `public/llms.txt`, `tools/og` | haiku | JSON-LD válido; og.jpg desde la marca; `noindex` solo en vistas previas |
| 5 | revisión independiente | — | **opus** (no construyó) | lista de hallazgos cerrada |

## QA que tiene que estar en verde antes de pedir producción
`npm run typecheck && npm run build` (falla si cambia el hash del script de arranque o si se pasa un presupuesto) ·
`qa/flows` · `qa/overflow` · `qa/shoot` (escritorio, tableta y teléfono, con y sin el mundo) · `qa/peso` (bytes por
tramo) · `qa/fps` (toma completa con rueda y gesto táctil: p95 ≤ 16,7 ms con `?q=mid`, avance de cámara sin saltos) ·
`qa/reposo` (0 cuadros) · `qa/soak` (diez recorridos de ida y vuelta: ni nodos, ni listeners, ni contextos WebGL que
crezcan) · `qa/respaldos` (sin JS, movimiento reducido, sin WebGL, ahorro de datos, «pausar movimiento») ·
`qa/marca` · Lighthouse móvil contra la vista previa con `x-vercel-skip-toolbar: 1` (rendimiento ≥ 95; accesibilidad,
buenas prácticas y SEO 100) · `?qa=fps` en el iPhone y en un Android de Juan (60 fps sostenidos; si no, el gobernador
baja sin cortes).

## Preguntas para Juan (las que bloquean)
1. **Créditos.** ElevenLabs tiene ≈ 222 créditos hasta el **2-dic** (el mes se gastó). ¿Apruebas el escenario
   **premium (≈ 241K, ≈ US$39)**, y lo compras ya o esperamos al 2-dic? *Recomiendo*: aprobar premium y comprar ya
   solo ≈ 25K para los cuadros de dirección (la etapa 1 no puede esperar dos semanas). Las etapas 1 y 2 se construyen
   mientras tanto con la maqueta en gris. El resto sale del cupo del 2-dic, que alcanza aunque los agentes de los
   clientes también lo usan.
2. **El ®.** ¿OCEAN está registrada ante la SIC (o en EE. UU.)? Poner ® en una marca no registrada no se puede hacer
   y daña la credibilidad. *Recomiendo*: `logo-sin-r.svg` en toda la web hasta tener el certificado; el ® se agrega
   después con un solo cambio.
3. **El nombre.** *Recomiendo*: la marca es **OCEAN** en todo (títulos, barra, agente, redes), «Ocean Industries» como
   nombre legal en el pie, en `/privacidad` y en el `legalName` del JSON-LD, y el dominio sigue siendo
   oceanindustries.com.co. ¿Así?
4. **El color del resultado.** El verde neón y el azul Klein salen. La acción principal (WhatsApp) y «el resultado»
   pasan a la luz cálida del amanecer en la cumbre (`--alba`) sobre la paleta helada. *Recomiendo* aprobarlo ya: es lo
   que hace que el color tenga significado en un mundo de hielo, y se ve en los cuadros de la etapa 1.
