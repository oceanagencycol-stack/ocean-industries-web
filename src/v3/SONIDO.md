# Sonido de la v3

Motor Web Audio con material de `media/v3/sonido/` (tomas de ElevenLabs ya generadas; no se genera nada nuevo).

## Pipeline: `node tools/audio.mjs` (ffmpeg)
Recorta silencios (−55 dB), hace los lazos sin costura (fundido cruzado de igual potencia de 3 s del final sobre el
principio, dentro del archivo; la costura mide 0,2–0,6× la diferencia típica entre muestras), normaliza EBU R128 en dos
pasadas (ambientes −23 LUFS, tema −18, efectos −20; pico real ≤ −1 dBTP medido DESPUÉS del códec) y exporta
`public/v3/audio/<pieza>.webm` (Opus) y `.m4a` (AAC, Safari). `--report` mide los originales; `--only a,b` rehace piezas.
Tomas usadas: tema-a, amb-espacio-b, amb-oceano-b, amb-cumbre-a, sfx-*-a. Presupuestos y pesos finales: ver abajo.

| pieza | s | LUFS | dBTP | Opus | AAC |
|---|---|---|---|---|---|
| tema | 33,6 | −18,0 | −2,1 | 267 KB | 270 KB |
| amb-espacio | 41,5 | −23,0 | −10,7 | 336 KB | 334 KB |
| amb-oceano | 42,0 | −23,0 | −9,5 | 353 KB | 338 KB |
| amb-cumbre | 42,0 | −23,0 | −10,6 | 382 KB | 337 KB |
| sfx (8) | 2–5 | ≈ −20 | ≤ −1,0 | 16–28 KB | 15–31 KB |

## Cuándo suena
- `sound-gate.ts` (en el arranque, ~3 KB) no pide audio. Enciende con el **primer clic o toque** (no con una tecla: un
  «clic» con `detail 0` se ignora; tampoco al tocar formularios, idioma, el chat, reels o «Saltar intro») o con el
  **botón de sonido** de la barra. En ese mismo gesto crea y despierta el `AudioContext` (Safari) y luego baja
  `sound.ts` con import dinámico.
- Elección en `localStorage['ocean-v3-sound']` (1/0). Con `saveData` o 2G nace apagado: solo el botón lo enciende.
  Movimiento reducido no lo toca. En iOS, el botón pide la sesión de audio `playback`.
- Se calla (sin cambiar la elección) con el chat abierto o un reel con sonido; con la pestaña oculta se suspende el contexto.

## Mezcla
Ambientes, efectos y tema → paso bajo «profundidad» → compresor suave → duck → master. El paso bajo: 20 kHz en el espacio,
16 kHz en `mar`, **1,3 kHz en `agua`, 0,9 kHz en `maquina`**, 14 kHz al emerger. Ambiente por el tramo que ocupa más
pantalla (IntersectionObserver, 400 ms de antirrebote): espacio y satelite → espacio; mar, agua, maquina → océano;
emerge y cumbre → cumbre; fundido de igual potencia de 2,6 s; en memoria solo el actual y el siguiente.
Efectos (solo hacia adelante, una vez por cruce, enfriamiento 8 s por efecto y 0,5 s entre efectos; bus a 0,7):
satelite → `sfx-satelite`; satelite→mar → `sfx-atmosfera`; agua → `sfx-agua-entra`; maquina → `sfx-sumergible`;
emerge → `sfx-agua-sale`; cumbre → `sfx-rafaga`.

## Intro
`bridge.ts` pasa `onStar` / `onWordComplete` a `runIntro`; suenan `sfx-estrella` (y el tema, bajo, 3 s de subida, solo en
la portada) y `sfx-logo` **si el motor ya está en marcha**. «Repetir la intro» deja `sessionStorage['ocean-v3-replay-sound']`
y, al volver, el motor arranca solo si el navegador deja sonar sin gesto.
Limitación: en una primera visita el sonido no está desbloqueado durante la intro, así que no suena (por la regla del gesto).

## QA
`qa/sonido.cjs <url>` (con `?qa`, `window.__oceanSound.state`): sin audio en la carga, tecla no enciende, clic sí, ambientes
y efectos por tramo, paso bajo, antirrebote, chat y reel, pestaña oculta, botón en ES/EN/PT, ahorro de datos, teléfono, CSP real.
No se puede escuchar en el sandbox: el equilibrio de volúmenes y la costura de los lazos están medidos, no oídos.
