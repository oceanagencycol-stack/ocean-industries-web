# OCEAN v6 · Plan de la versión final (28-nov-2026)

Pedido de Juan Diego (28-nov): pone ≈ US$49 de créditos de ElevenLabs para terminar la web premium final. Quiere:
- La nave **más minimalista y futurista**. Referencia: un ala volante blanca, de líneas rectas, con franjas negras y
  ventanas en el borde (imagen del 28-nov en `media/v6/referencia/nave-ala.png`).
- La web **sigue oscura**.
- Un **soundtrack con el estilo y la energía del video de «Dakiti»**: beat, efectos y ambiente bajo el agua.

Hoy producción muestra la v5 (satélite). La v6 vive en `v6-nave`. Esta versión la reemplaza entera: nave nueva en
todas las tomas, película en video de punta a punta, vertical para el teléfono y sonido propio.

## Límite del sonido (no negociable)
La canción «Dakiti» y su video tienen derechos. **No se copia** su melodía, su letra, su beat exacto, sus samples ni la
voz de sus artistas, y los prompts no nombran a la canción ni a los artistas. Lo que sí se hace es una **pista original
del mismo género y la misma atmósfera**:
- Reggaetón oscuro y lento: dembow de 90–100 BPM, 808 profundo y sostenido, hi-hats finos.
- Sintes etéreos con mucha reverb, pads fríos y un arpegio brillante en el registro agudo.
- Sensación de estar bajo el agua: filtro paso bajo que se abre y se cierra, burbujas, golpes amortiguados.
- Solo instrumental. Sin voces, ni reales ni imitadas.

ElevenLabs Music genera pistas originales con licencia comercial en los planes de pago. Antes de publicar se escucha la
pista y se descarta cualquiera que suene demasiado parecida a una canción existente.

## Fases y créditos
Se trabaja con lo que alcance de los créditos de Juan; la renovación del plan Pro (2-dic, 612.639) cubre lo que falte.
Cada gasto se anota en `docs/elevenlabs.tsv`.

| # | Fase | Qué sale | Créditos aprox. | Visto bueno de Juan |
|---|---|---|---|---|
| 0 | Nave nueva | 6 diseños de la nave (gemini-3-pro-image, con la referencia) → elegir 1 → hoja de vistas (frente, perfil, arriba, bajo el agua con luces) | 8 × 1.827 ≈ 15.000 | **Sí**: elegir la nave |
| 1 | Placas | Las 8 escenas del guion con la nave elegida (órbita, reentrada, nubes, rasante, entrada al agua, rayos de luz, abismo, roca), 2 opciones cada una | 16 × 1.827 ≈ 29.000 | **Sí**: elegir las 8 |
| 2 | Película 16:9 | 7 tomas de 8 s entre placas (veo-3.1-fast 1080p, inicio y fin fijos, «one continuous shot, no cuts»); hasta 2 intentos cada una | 7–14 × 4.848 ≈ 34.000–68.000 | Revisar el corte completo |
| 3 | Calidad final | Las 7 tomas aprobadas en `veo-3.1-generate-001` (no fast); escalado Topaz solo si hace falta | medir con `estimate_only` antes (≈ 70.000–135.000) | Sí, si pasa de 100.000 |
| 4 | Teléfono 9:16 | 8 placas y 7 tomas en vertical, con la misma nave | 8 × 1.827 + 7 × 4.848 ≈ 48.600 | — |
| 5 | Sonido | 3 versiones del tema (~90 s, eleven_music) → elegir 1; 2 ambientes (espacio, bajo el agua); ~10 efectos | ≈ 8.000–15.000 | **Sí**: elegir el tema |
| — | Reserva | Repeticiones y tomas rechazadas | ≈ 30.000 | — |

**Total estimado: ≈ 235.000–340.000 créditos.** Con los US$49 y la renovación del 2-dic sobra. Si no alcanza, la fase 3
se hace solo para las tomas del espacio, que son las que más se notan.

## Guion de la película (se conserva el de la v6)
Órbita → reentrada con fuego → sobre las nubes → rasante sobre el mar → entrada al agua → rayos de luz → abismo → roca
donde la luz de la nave graba la marca.

**La nave nueva, igual en todas las tomas:**
- Ala volante blanca mate, sin curvas decorativas.
- Dos aletas finas, franjas negras y una línea de luz fría en el borde de ataque.
- Ventanas en la arista.
- Bajo el agua se encienden luces blancas en el borde y un haz hacia abajo.

Para la IA, la nave se describe siempre con las mismas palabras y con la imagen de referencia conectada. La roca va
lisa: la marca la pone la web, nunca la IA.

**Paleta**: negros profundos, acero y pizarra (`#03060C`, `#06141D`, `#2B404F`, `#B2C0CC`). Sin verde ni azul saturado.

## Sonido en la web
Sigue las reglas de `src/v3/SONIDO.md`:
- Cero audio hasta el primer clic o toque, con un botón en la barra.
- Apagado con ahorro de datos.
- Se calla con el chat o un reel.

Lo nuevo:
- **El tema avanza con la película**: el beat entra entero en la reentrada y baja a solo el 808 y los pads sobre las
  nubes.
- Al **entrar al agua** suenan un golpe y un barrido del filtro paso bajo, y desde ahí todo queda amortiguado, como en
  el video.
- En el abismo hay pulsos de sonar al compás.
- Al grabarse la marca, un golpe grave y un brillo.
- **Efectos en los cruces**: whoosh de la reentrada, trueno lejano en las nubes, chapuzón, burbujas, sonar, el zumbido
  de la luz de la nave y el clic de los botones (muy suave).
- **Mezcla**: el tema a −18 LUFS y los ambientes a −23, con Opus y AAC. Cada pieza debe pesar menos de 600 KB.

## Entrega «crispi» (de `FASE2.md` §4)
- La película se entrega como cuadros WebP/AVIF en orden, no como MP4 con búsqueda.
- 1920 px en el computador y 1080 px en vertical en el teléfono.
- Grano encima de los cuadros, no dentro.
- La capa premium (botones, entradas, cursor) se conserva.

## Ajuste de Juan (28-nov 07:02): todo en una sola sesión con los US$49
- **Presupuesto cerrado ≈ 300.000 créditos** (lo que dan los US$49). Recorte: todo en `veo-3.1-fast` 1080p,
  escalado Topaz ×2 solo en las tomas que lo necesiten (≈ 485 c/u), y la fase 3 (calidad completa) solo si sobra.
  Cuenta: nave 15K + placas 29K + 7 tomas con reintentos 68K + vertical 49K + sonido 15K + Topaz 8K ≈ 184K; reserva ≈ 115K.
- **Una sola pregunta por punto de elección**, con las opciones a la vista en el chat; si Juan no responde en ~15 min,
  elijo yo la más fiel a la referencia y lo digo, para no detener la sesión.
- **Orden para no esperar**: generaciones en paralelo (nave → placas y tema a la vez → tomas 16:9 y 9:16 a la vez);
  mientras se generan, se monta el código (cuadros en vez de MP4, sonido sincronizado, vertical).
- **Todo queda en GitHub al cerrar cada fase**, así que si la sesión se corta se retoma sin perder nada.
- **Cierre de la sesión**: vista previa verificada en Chrome real → visto bueno de Juan → producción → IndexNow → brain.

## Calendario propuesto
1. **Día 1**: fase 0 (6 naves) → Juan elige.
2. **Días 2–3**: fase 1 (placas) → Juan elige. Fase 5 en paralelo (3 temas) → Juan elige.
3. **Días 4–6**: fases 2 a 4, montaje en `v6-nave`, sonido sincronizado y QA completo (flujos, SEO, overflow, rótulos
   ES/EN/PT, teléfono, Chrome real).
4. **Vista previa** → visto bueno de Juan → producción → IndexNow.

## Lo que hace falta de Juan
- Avisar cuando estén los créditos.
- Elegir la nave, las placas y el tema.
- Dar el visto bueno final para publicar.
- Traer los archivos: el camino de Chrome → GitHub del 21-nov ya funciona, así que basta con tener Chrome abierto y con
  la sesión de GitHub iniciada.
