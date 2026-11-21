# v6 · La nave — guía de la segunda fase (21-nov-2026)

Lo que quedó hecho en la primera fase y, en orden, lo que falta para que la web sea una sola película nítida, en alta
definición, del espacio al fondo del mar. Pedido de Juan Diego: «lo más épico, robusto, realista y crispi posible, en la
paleta oscura premium; la web termina en el fondo del mar; sin velero; personas reales o ninguna».

## 1 · Qué hay (fase 1)
**En ElevenLabs**, flujo «OCEAN v6 · La nave» (`kwtfgVEScg4Co9buhGuN`):
- **La nave**: cabina de burbuja, alas de manta, casco blanco perla, tres líneas de luz (la E de OCEAN), piloto humano real.
  Referencia `HeaBKbxazJTla4RezMnH` (nodo `vw3BiMmbk95xajksEjKO`). Toda toma nueva se ancla a ella.
- **8 placas** elegidas en paleta oscura (ver `GUION.md`) y sus versiones **HD ×2 con Topaz** (2752 × 1536):
  nodos «HD · placa 1…8 ×2». Generaciones HD: 1 `dC8osqY2bNQDe9xbco9t`, 2 `eR8lphFOguF2Sxh1lQ5N`,
  3 `UyFB3Aw8SjvVeIgem4ZA`, 4 `NysRnNfvjAFMuidzIVtf`, 5 `j4C5id7raucdwE5qsPFC`, 6 `0mTlT68Xqy5y60l9IB4E`,
  7 `0OIT03cDa5s5x3fEax9j`, 8 `I4eIngQXkLFGLbiCkk1m`.
- **3 tomas de video** de 8 s en 1080p, ancladas a dos placas (veo-3.1-fast, sin audio): 7→8 `YDUR3G2F1G2ltSFDThxD`
  (del abismo al logo), 5→6 `q203ouGmrDbKkAOMlHg4` (continua, buena) y 6→7 `7GQQEIZxDGUleQNo1XUb` (parece tener un
  salto entre los 3 y los 5 s, de los rayos al abismo frontal). Juntas son el descenso completo bajo el agua (~24 s); el
  último cuadro de cada una empata con el primero de la siguiente.

**En el repo**, rama `v6-nave`:
- `src/v6/roca.ts` + `src/styles/v6-roca.css`: **la marca oficial grabada en la roca**. El haz barre con el scroll, el
  símbolo y el logotipo de `marca/v3/` aparecen tallados (hendidura, filo de sombra y filo de luz con `mask-composite`) y
  al final se encienden en blanco con halo. La cara de la roca se da en píxeles de la placa y el grabado la sigue en
  cualquier proporción; en el teléfono se limita al 78 % del ancho.
- `dev-v6-roca.html` (solo en vistas previas, `DEV_PAGES`): la prueba del final. Placa **provisional** (una captura de
  1440 × 756), a reemplazar por la placa 8 HD.
- `docs/v6/GUION.md` (guion y elegidas), `docs/plan-v6.md`, `docs/elevenlabs.tsv` (cada gasto).

**Créditos**: 60.611 al empezar; ≈ 12.600 al cerrar la fase 1. El plan Pro se renueva el 2-dic con 612.639.

## 2 · Lo primero: traer los archivos
Desde la sesión no se pueden descargar (el proxy bloquea `elevenlabsusercontent.com` y el navegador no deja sacar
binarios). Hay que bajarlos a mano desde el flujo y ponerlos en el chat o en Drive:
1. Las 8 «HD · placa ×2» (PNG 2752 × 1536).
2. Las 3 tomas (MP4 1080p, ~30 MB cada una).

Con ellos: `media/v6/placas/m1…m8.png` y `media/v6/tomas/t56.mp4`, `t67.mp4`, `t78.mp4` (fuera de `public/`; Git LFS
si pasan de 50 MB). De ahí salen los derivados de la web (sección 4).

## 3 · Lo que falta rodar (con la renovación del 2-dic)
| Qué | Cómo | Créditos |
| --- | --- | --- |
| Tomas 1→2, 2→3, 3→4, 4→5 | veo-3.1-fast, 8 s, 1080p, sin audio, inicio y fin en las placas elegidas | 4 × 4.848 = 19.392 |
| Rehacer 6→7 y 7→8 sin corte | la toma actual salta a los ~4 s del primer plano al plano general; pedir «one continuous shot, no cuts» y, si persiste, partirla en 7→7b y 7b→8 con una placa intermedia (la nave de perfil ante la roca) | 4.848–11.523 |
| Versión final en calidad completa | las 8 tomas aprobadas en `veo-3.1-generate-001` (no fast) a 1080p o 4K | 8 × ~19.392 (4K: medir antes con `estimate_only`) |
| Máster vertical 9:16 | las 8 placas en 9:16 (gemini-3-pro-image con la nave de referencia) y las 8 tomas en 9:16 | 8 × 1.827 + 8 × 4.848 = 53.400 |
| Escalado del video | `topaz-video-upscale-v2` de 1080p a 4K solo si el original en calidad completa no alcanza (probar una toma) | medir |
| Sonido | banda de ~70 s (eleven_music) + un efecto por cruce (reentrada, impacto en el agua, sonar, encendido de la marca) | ≈ 3.000 |

Reglas de rodaje que ya funcionaron:
- Siempre con **la nave de referencia** conectada; describir la nave con las mismas palabras en cada toma.
- **Paleta en el prompt**: «low-key, deep blacks, steel-blue and slate (hex #03060C, #06141D, #2B404F, #B2C0CC)».
- **Sin barcos**: describir en positivo («only sea and sky to the horizon»).
- **La roca va lisa**: «one large blank, smooth, flat face… stays completely blank». La IA nunca dibuja la marca.
- **Piloto**: humano real, visor arriba, cara iluminada por los instrumentos; nunca parecido a una persona real.
- Una toma rechazada se repite; no se arregla en la web.

## 4 · Nitidez («crispi»): cómo se entrega en la web
- **Placas**: AVIF + WebP desde el PNG HD, en tres anchos (1280 / 1920 / 2752) con `srcset`; la del fondo con
  `fetchpriority` solo si es la primera pantalla. Nunca reescalar por CSS hacia arriba.
- **Película**: abandonar el MP4 con búsqueda (espera de 250–350 ms al avanzar en el M1). Entregar **cuadros WebP/AVIF
  en orden** decodificados con `createImageBitmap` (~40 en memoria), como dice T1 del plan: espera ≤ 50 ms en los dos
  sentidos y nitidez de cuadro fijo (sin bloques de compresión de video al detenerse). 1920 px en el computador,
  1080 px en el teléfono (máster 9:16), ≤ 30 MB por máster.
- **48 cuadros/s** por interpolación (las tomas salen a 24): RIFE/FILM fuera de línea o mezcla de vecinos en el shader.
- **Grano** encima de todo (`.grain`), no dentro de los cuadros: el grano horneado se ve sucio al escalar.
- **El grabado** se dibuja en la resolución de la pantalla (máscaras SVG), así que siempre es nítido; el filo
  (`--hondo`) crece con el tamaño de la cara.
- **Texto**: Geist en el sistema de la v3; sin cajas, el shader recoge la luz detrás (regla `READ` de la v5).

## 5 · Montaje en la web (rama `v6-nave`)
1. **Guion técnico** (`src/v4/script.ts` → `src/v6/script.ts`): 8 tramos con los rótulos de la v5 reubicados:
   órbita (portada), reentrada (la máquina), nubes (agentes), rasante (webs), entrada al agua (contenido),
   rayos (trabajo), abismo (método), fondo (cierre). La telemetría de la v5 sigue (altitud → profundidad).
2. **El final en el fondo del mar**: el epílogo (casos, servicios, preguntas, contacto, pie) se monta sobre la placa 8
   con `mountRoca`, en lugar de la cumbre nevada. Se quita `[data-light]`/`html.nav-light` del cierre: todo el sitio es
   oscuro. Revisar contrastes de `DESIGN.md` sobre `--abyss`.
3. **Sello de marca**: el `.beat--seal` de la cumbre se reemplaza por el encendido de la roca (`--on`).
4. **Teléfono**: máster 9:16; en la placa 8 vertical medir de nuevo `cara` (px de la placa) para que el grabado caiga
   en la roca.
5. **Movimiento reducido / sin WebGL / ahorro de datos**: las 8 placas HD como respaldo, la roca en su estado final.
6. **Sonido**: banda sincronizada con el tiempo de la película (T4 del plan), cero audio hasta el primer toque.

## 6 · Verificación antes de pedir el visto bueno
- `qa/flujos-v5.cjs` adaptado a la v6 (`qa/flujos-v6.cjs`): los 8 tramos, el grabado en sus 4 fases, el epílogo sobre
  el fondo, ES/EN/PT, teléfono y computador, movimiento reducido y sin JS.
- `qa/secuencia-v5.cjs` con el medidor `?qa=1&medir=1`: espera ≤ 50 ms en un M1 y en un teléfono físico.
- `qa/overflow.cjs`, `qa/ajuste-rotulos.cjs` (13 tamaños × 3 idiomas), `qa/paginas-seo.cjs`.
- Lighthouse móvil sobre la vista previa: accesibilidad, buenas prácticas y SEO 100.
- Hoja de contacto de cada toma (un cuadro por segundo): cero cuadros lavados, cero cortes, la nave idéntica.
- Revisión independiente (un verificador que no construyó) antes de pedir el visto bueno de Juan Manuel.

## 7 · Producción
La v6 vive en `v6-nave` con vista previa de Vercel. Se publica solo con visto bueno explícito en el chat. La v5 queda
en un despliegue anterior para volver con «Promote».
