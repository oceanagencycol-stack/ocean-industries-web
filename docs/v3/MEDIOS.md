# OCEAN v3: medios a generar y créditos de ElevenLabs

> Etapa 0 · 18-nov-2026. **No se ha generado nada ni se ha gastado nada.** Lo que vuelve la web «sin lag» es la
> arquitectura ([ARQUITECTURA.md](ARQUITECTURA.md)), no los créditos. Los créditos pagan el acabado: más fondos, el
> encuadre del teléfono, el sonido y la película para redes.

## Tarifas usadas
Medidas en corridas reales (`docs/elevenlabs.tsv` de CALPRO, oct-2026): Nano Banana Pro (`gemini-3-pro-image`) a 2K
cuesta 1.220 por imagen sin referencia, 1.830 con una y 2.440 con dos. Seedance 2.5 (`bytedance-seedance-v2.5-us`) a 720p
sin audio cuesta 3.360/s (6 s = 20.165). Topaz (imagen) cuesta 485. Música (`eleven_music_v2_5`) **900 por minuto (15/s)** y efectos (`eleven_text_to_sound_v3`) **200 por generación**: tarifas publicadas por ElevenLabs (elevenlabs.io/pricing, confirmadas por el despacho el 18-nov; la primera versión de esta tabla las estimaba a 200/s y las inflaba). **Estimada**: Seedance 1080p ≈ 7.560/s (×2,25). La voz
(`eleven_v3`) cuesta ≈ 1 por carácter. 1.000 créditos ≈ US$0,16.

Fuera de ElevenLabs y gratis: mapas de profundidad (Depth Anything V2 Small, local), recorte de siluetas (rembg,
local), compresión AVIF/KTX2/Opus, og.jpg por código y los clics de interfaz, que se siguen sintetizando.

## Saldo verificado (18-nov-2026, `account_get_usage`)
Plan **Pro**: se renueva cada mes con **612.639** créditos. Quedan **≈ 222**: el mes está gastado. **Se renueva el
2-dic-2026** (≈ 14:05, hora de Bogotá). Sin recarga no se puede generar nada antes de esa fecha (pregunta 1 del plan).

## Las líneas
«Momentos» de dirección visual (6): el borde de la Tierra con la luna; el mar de noche desde arriba; la ventana de Snell
con el buzo; el fondo con la pared de la montaña; la salida del agua por la pared; la cumbre al amanecer con el
caminante.

| # | Qué | Modelo | Cantidad · formato | Esencial | Premium | Máximo |
|---|---|---|---|---:|---:|---:|
| 1 | Dirección visual (para que Juan apruebe antes de construir) | gemini-3-pro-image | 6 momentos × 2 opciones (máx.: × 3), 16:9 2K. Esencial sin referencia; premium y máximo con 1 (la paleta) | 12 × 1.220 = 14.640 | 12 × 1.830 = 21.960 | 18 × 1.830 = 32.940 |
| 2 | Fondos finales (cielo, nubes, superficie desde abajo, pared, mar de nubes, cielo del alba, roca y hielo de detalle, buzo, caminante) | gemini-3-pro-image | 16:9 2K. Esencial con 1 referencia (el cuadro aprobado); premium y máximo con 2 (cuadro + paleta) | 10 × 1.830 = 18.300 (una por pieza) | 12 × 2.440 = 29.280 (10 + 2 de reserva) | 16 × 2.440 = 39.040 |
| 3 | Encuadres verticales (teléfono y película 9:16) | gemini-3-pro-image | 9:16 2K, 1 referencia | — | 6 × 1.830 = 10.980 | 8 × 1.830 = 14.640 |
| 4 | Ampliación de los fondos protagonistas para pantallas grandes | topaz-image-upscale-v2 | ×2 | — | 6 × 485 = 2.910 | 12 × 485 = 5.820 |
| 5 | Música: tres colchones en lazo (espacio, agua, cumbre) + una pieza de 35 s para la intro y la película | eleven_music_v2_5 | 3 × 45 s + 35 s = 170 s; máx.: 2 tomas | — | 170 s × 15 = 2.550 | 340 s × 15 = 5.100 |
| 6 | Efectos: atmósfera, romper la superficie, salir del agua, ráfaga, la estrella, el trazo del símbolo… | eleven_text_to_sound_v3 | ≈ 5 s c/u, 200 por generación | 6 × 200 = 1.200 | 10 × 200 = 2.000 | 16 × 200 = 3.200 |
| 7 | Voz: una frase por tramo, ES/EN/PT (opcional, apagada por defecto) | eleven_v3 | 9 frases × ~80 caracteres × 2 voces | — | — | 1.440 |
| 8 | **Película de lanzamiento** (para redes, reels y og:video; no está en el camino crítico de la web): 5 tomas conectadas de 6 s (inicio y fin anclados, como la casa 332) | bytedance-seedance-v2.5-us, sin audio (la música de la línea 5) | Premium: 9:16 a 720p, 30 s. Máximo: 9:16 y 16:9 a 1080p | — | 5 × 20.165 = 100.826 | 60 s × 7.560 = 453.600 |
| 9 | Lazos de video dentro de los fondos (solo escritorio, tier alto) | bytedance-seedance-v2.5-us | 3 × 6 s a 1080p | — | — | 18 s × 7.560 = 136.080 |
| | **Subtotal** | | | **34.140** | **170.506** | **691.860** |
| | Margen para tomas **nuevas** aprobadas (nunca para repetir una llamada) | | | 20 % = 6.828 | 15 % = 25.576 | 15 % = 103.779 |
| | **Total** | | | **40.968 ≈ 41K** | **196.082 ≈ 196K** | **795.639 ≈ 796K** |
| | **USD** (1.000 ≈ US$0,16, promedio del plan Pro; los créditos sueltos pueden costar más) | | | **≈ US$7** | **≈ US$31** | **≈ US$127** |

## Recomendación: premium (≈ 196K créditos, ≈ US$31)
- La web es la misma en los tres escenarios. Premium le da los fondos y el encuadre del teléfono con acabado, el sonido
  propio de cada mundo y una **película vertical de 30 s** para lanzar la marca en Instagram. Esa película también es
  contenido, el primer servicio que vende OCEAN.
- Esencial deja la web sin música (solo síntesis) y sin película: se ve bien, pero no es «premium».
- Máximo se pasa del cupo del mes (796K contra 612.639): la película a 1080p en dos formatos y los lazos de video
  cuestan cuatro veces más que todo lo demás junto, y en un teléfono no se notan. Si se quiere una película a 1080p, se
  amplía la de premium con Topaz Video (costo a confirmar) antes que generarla de nuevo.
- Se gasta por etapa, con aprobación de Juan antes de cada una: dirección visual (línea 1, ≈ 22K) → fondos y sonido
  (líneas 2–6, ≈ 48K) → película (línea 8, ≈ 101K). Cada corrida va en `docs/elevenlabs.tsv` con fecha, nodo, modelo,
  parámetros y créditos. No se anotan URLs firmadas. Nunca se repite una llamada para reintentar.
