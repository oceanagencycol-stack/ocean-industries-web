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

---

## Nuevo concepto · La nave (21-nov-2026, pedido de Juan Diego)
> «El personaje principal es una nave espacial y submarina futurista que va del espacio hasta el fondo del mar, y en
> el fondo, en las rocas, aparece el logo y el símbolo de OCEAN. Ultra premium, inmersiva y única.»

La película deja de ser una serie de paisajes y pasa a ser **un solo viaje con protagonista**. La nave es el hilo
que une las tomas. También es la metáfora de OCEAN: una sola máquina que cruza medios (espacio → cielo → mar →
abismo) como el software, la IA y el marketing en un mismo sistema.

**Recorrido propuesto (8 momentos):**
1. Órbita: la nave en reposo sobre la Tierra de noche.
2. Ignición y caída: entra en la atmósfera envuelta en plasma.
3. Cielo: atraviesa nubes sobre el océano al amanecer.
4. Transformación: pliega alas y se vuelve submarino justo antes del agua.
5. Impacto: entra al mar (la línea de agua corta la pantalla).
6. Luz: desciende entre rayos de sol y cardúmenes.
7. Abismo: solo sus tres líneas de luz en la oscuridad.
8. Fondo: sus faros barren las rocas y **descubren el símbolo y el logotipo de OCEAN** en la roca.

**La marca en la roca:** por la regla de marca, la IA no dibuja el logo. La toma 8 se genera con una cara de roca
lisa que la luz de la nave recorre, y la web pone encima el símbolo y el logotipo reales de `marca/v3/`, grabados y
encendidos con el shader, sincronizados con el barrido de luz. Así el logo queda perfecto en cualquier pantalla y en
los tres idiomas. Se puede probar aparte, sin compromiso, la versión «tallada por la IA» con el logo de referencia.

**La firma de la nave:** tres líneas de luz horizontales en el casco, como los tres horizontes de la E de OCEAN.

### Facetas y créditos (precios medidos el 21-nov)
| Faceta | Qué | Modelo | Créditos |
| --- | --- | --- | --- |
| 1 · La nave | 2 direcciones × 4 conceptos; después, la hoja de personaje de la elegida (perfil, frente, 3/4, modo submarino) | flux-3-image (291 c/u) | ≈ 3.500 |
| 2 · Placas | los 8 momentos con la nave de referencia, 2–4 opciones cada uno, 16:9 2K | flux-3-image con referencia | ≈ 6.000–9.500 |
| 3 · Piloto en video | 2–3 tomas clave (5→6 y 7→8: el descenso y el logo) ancladas a dos placas | veo-3.1-fast (7.272 por toma) o kling-3-pro (6.787) | ≈ 14.500–22.000 |
| 4 · Montaje del piloto | las tomas en el escenario WebGL de la v5, con el logo en la roca por shader, en la rama `v6-nave` | — | 0 |
| 5 · Película completa | las tomas que falten + vertical 9:16 + sonido | cuando haya más créditos | ≈ 100.000+ |

Saldo al empezar (21-nov 14:20): **60.611 créditos** (renueva el 2-dic). Las facetas 1 a 4 caben con margen.
Comparación de video (estimado por toma): seedance-v2.5 16.804 · veo-3.1 19.392 · veo-3.1-fast 7.272.

### Decisiones de Juan Diego (21-nov 14:20–14:22)
- **La web termina en el fondo del mar**, no en la montaña. La cumbre nevada de la v5 sale del recorrido; el cierre (pie, contacto,
  casos) se monta sobre el fondo marino con el logo en la roca.
- **Sin velero:** cuando aparece el mar no hay barco; el protagonista único es la nave.
- **Personas:** si aparece una, tiene que verse real y viva (piel, ojos, gesto); si no se logra, no va ninguna.
- **Realismo ante todo:** «que se vea lo más realista posible». Referencia: sumergible de cabina de burbuja visto de frente,
  gran angular, grano de película.
- **Diseño base elegido** (por Claude, con la referencia): alas de manta + cabina de burbuja + tres líneas de luz al frente
  (generación `OVHYCTNBtwjZui2jwfC9`, nodo `T4A3F0KmgUzxDiZUzfWB` del flujo `kwtfgVEScg4Co9buhGuN`). En órbita la misma
  familia funciona (`1UxDzmLha5ENv03dV7VB`). Pendiente: pasada de realismo (flux-3 vs gemini-3-pro) con piloto humano creíble.
