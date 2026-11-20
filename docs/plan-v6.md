# Plan v6 · Remasterización de la película (20-nov-2026)

Fuente viva y con gráficos: el doc «OCEAN v6 · Plan de remasterización de la película» en Claude
(https://claude.ai/artifact/KneYjN4UEHNUofgs55x4zh). Este archivo es el espejo en el repo.

## Dónde estamos (v5 en producción desde el 20-nov)
- 7 tomas de Kling 3 Pro de 10 s encadenadas por 7 placas, 1600 × 890 a 24 cuadros/s (1.621 cuadros; 22 MB HD, 8,5 MB SD).
- Medido en Chrome con GPU Apple M1 (vista previa): 55–60 fps de pintado; hacia atrás la imagen cambia cada 50–83 ms
  como máximo, hacia adelante se queda quieta hasta 250–350 ms (buscar dentro de un MP4 decodifica desde el cuadro clave).
- 24 cuadros de origen: con scroll lento se siente como diapositivas rápidas.
- El teléfono ve un recorte del máster horizontal; no hay máster vertical.
- Cada cruce dura lo que una toma; hay cuadros lavados (superficie) y la cumbre se blanquea antes de tiempo.
- Sonido: ambientes por tramo de la v3, sin banda sincronizada.

## Meta v6: que se sienta una sola toma de cine
| Criterio | Hoy (v5) | Meta v6 | Cómo se mide |
| --- | --- | --- | --- |
| Mayor espera de imagen al avanzar | 250–350 ms | ≤ 50 ms | `qa/secuencia-v5.cjs` en Chrome con GPU y teléfono físico |
| Cuadros por segundo de película | 24 | 48 (interpolados) | conteo del máster |
| Máster para teléfono | recorte del 16:9 | máster 9:16 propio | el teléfono carga el vertical |
| Tomas y cruces | 7 de 10 s | 12, un cruce por toma | guion aprobado |
| Cuadros lavados o con artefactos | varios | 0 | hoja de contacto por toma |
| Sonido | ambientes por tramo | banda de 70 s sincronizada + efectos por cruce | `qa/sonido.cjs` y escucha en teléfono |
| Lighthouse móvil | 56 (SwiftShader) | ≥ 80 en equipo real | 3 corridas sobre producción |

No cambia: la marca de `marca/v3/`, las cifras aprobadas (48 h, 24/7, 11 s, los tres casos), texto sin cajas, cada rótulo cabe.

## Paquetes
| Paquete | Qué se hace | Dónde queda | Listo cuando |
| --- | --- | --- | --- |
| M1 · Guion de cámara | 12 momentos (órbita de noche, ciudad, satélite, caída, mar con velero, cruce de superficie, buzo bajo la luz, abismo, sumergible, muro de hielo, iceberg, cumbre); rótulo, cruce y foco en teléfono | `docs/v6/GUION.md` | Juan Manuel aprueba guion y encuadres |
| M2 · Placas | 12 × 2 opciones 16:9 2K con referencia; luego 9:16 de las elegidas | `media/v6/direccion/` | 12 + 12 elegidas, sin texto ni logos dentro |
| M3 · Película 16:9 | 12 tomas Kling 3 Pro 10 s 1080p ancladas a dos placas; hasta 4 re-tomas | `public/v6/`, `tools/v6-film.sh` | uniones invisibles, 0 cuadros lavados |
| M4 · Película 9:16 | las mismas 12 tomas en vertical | `public/v6/vertical/` | el teléfono ve su máster |
| M5 · Sonido | banda de 70 s (2 tomas) + un efecto por cruce (24) | `public/v6/audio/` | empata con los 12 cruces a ± 0,5 s |
| M6 · Retoques | hasta 10 correcciones con referencia | `media/v6/retoques/` | cada retoque reemplaza un cuadro señalado |
| T1 · Entrega por cuadros | WebP en orden desde el scroll, ~40 decodificados con `createImageBitmap`, mezcla de vecinos en el shader | `src/v6/frames.ts`, `src/v4/stage.ts` | espera ≤ 50 ms en ambos sentidos, ≤ 30 MB por máster |
| T2 · Máster vertical | elegir máster por proporción; foco, rótulos y línea de agua propios | `src/v4/script.ts`, `src/v4/film.json` | `qa/ajuste-rotulos.cjs` en verde (13 tamaños × 3 idiomas) |
| T3 · Montaje | cortes, `data-t`, gradación, destellos retimados | `index.html`, `src/v4/script.ts` | cada rótulo cae sobre su toma |
| T4 · Banda sincronizada | banda con el tiempo de la película, efectos al cruzar, solo tras el primer toque | `src/v3/sound.ts` | `qa/sonido.cjs` en verde |
| T5 · Verificación | Android gama media, iPhone, computador con GPU; Lighthouse; revisión independiente | `docs/v6/QA.md` | toda la meta en verde |

## Créditos de ElevenLabs (tarifas medidas en `docs/elevenlabs.tsv`)
| Paquete | Cuenta | Créditos |
| --- | --- | --- |
| M3 · Película 16:9 | 16 × 6.787 | 108.592 |
| M4 · Película 9:16 | 16 × 6.787 | 108.592 |
| M2 · Placas | 36 × 1.827 | 65.772 |
| M6 · Retoques | 10 × 1.827 | 18.270 |
| M5 · Sonido | 2 × 70 s + 24 efectos, redondeado | ≈ 2.700 |
| **Total** | | **≈ 303.926 (≈ US$49)** |

- Saldo hoy ≈ 76.000 (estimado: 188.100 tras la recarga del 18-nov menos lo registrado). Confirmar en la cuenta antes de generar.
- El plan Pro se renueva el 2-dic-2026 con 612.639 créditos: el plan entero cabe en un mes.
- Sin verificar: Kling en 9:16 se supuso al mismo precio que 16:9; se mide con la primera toma vertical.

## Calendario
| Fase | Fechas | Qué | Créditos | Puerta |
| --- | --- | --- | --- | --- |
| 0 · empieza ya | 20-nov → 2-dic | M1, 24 placas 16:9 (M2), T1 sobre la v5 | ≈ 44 mil | aprueba guion y placas |
| 1 · rodaje | 3-dic → 12-dic | 12 placas 9:16, M3, M5 | ≈ 133 mil | tomas sin cuadros lavados |
| 2 · montaje | 13-dic → 19-dic | M4, M6, T2–T4 | ≈ 127 mil | meta v6 en verde |
| 3 · estreno | 20-dic → 23-dic | T5 y publicación | 0 | visto bueno de Juan Manuel |

## Riesgos y reglas
- Coherencia entre tomas: cada toma arranca y termina en placa fija; la que no empata se repite, no se arregla en la web.
- Peso: si pasa de 30 MB por máster, baja la calidad de los cuadros lejanos a cada rótulo antes que la resolución.
- El teléfono manda: nada se aprueba mirando solo el computador.
- Honestidad: paisajes con IA y el pie lo dice; sin clientes, logos de terceros ni cifras no aprobadas.
- Marca: sale de `marca/v3/`; la IA no dibuja la marca dentro de la imagen.
- Gasto: cada generación en `docs/elevenlabs.tsv` con su costo real; solo se repite una toma rechazada.
- Producción: la v6 vive en su rama con vista previa; se publica con visto bueno de Juan Manuel; la v5 queda para «Promote».
