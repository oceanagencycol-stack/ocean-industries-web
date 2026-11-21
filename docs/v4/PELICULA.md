# OCEAN v4 · la web como una sola toma

Rama `v4-pelicula` (19-nov-2026), sobre `v3-cine`. Pedido de Juan: «la web debe parecer un solo video, súper fluido e
inmersivo… se debe parecer a las referencias». La v3-cine tenía el arco (espacio → fondo del mar → cumbre) pero se
sentía apagada: el mismo azul medio en todos los capítulos, el mismo bloque de texto a la izquierda, la cámara detenida
en cada placa y un relato (la chaqueta) que no decía qué hace OCEAN.

## Lo que hacen las referencias (y cómo se hace)

| Referencia | Lo que se ve | La técnica | En OCEAN v4 |
|---|---|---|---|
| Video 1 · Hearbuds Pro | Un objeto que cambia de luz y escala; tipografía gigante condensada («PRO», «KEEP LISTENING») detrás y delante del objeto; rótulos con línea que apuntan a piezas («Bluetooth 5.4»); salto de oscuro a blanco. | Escena 3D/película atada al scroll; capas de texto con su propio tiempo; callouts anclados a coordenadas del objeto. | Rótulos anclados a los sujetos de la película (satélite, buzo, sumergible, cumbre) que la siguen cuadro a cuadro; frases gigantes en Archivo condensada (la familia de la Ocean anterior); el final se resuelve en blanco y la agenda y los pagos van sobre la nieve. |
| Video 2 · *Into the Amazon* (Gladeye / NatGeo) | La cámara vuela sin cortes sobre el terreno; las nubes tapan y destapan el paisaje siguiente; cifras enormes («18»); texto editorial que entra y sale. | Un vuelo continuo por scroll; las transiciones son movimientos de cámara (nubes, agua), no cortes; el texto vive en momentos de la línea de tiempo. | Siete tomas encadenadas por su placa (cada una empieza en el cuadro exacto donde terminó la anterior): una sola toma de 67 s. Las transiciones son la atmósfera, la superficie del agua y la línea de flotación. |
| Video 3 · Hubtown (Unseen Studio, Awwwards SOTD) | Un mismo mundo azul que cambia al desplazarse; titulares que se arman letra por letra al azar; índice de capítulos a la izquierda; sonido. | WebGL con cámara atada al scroll; texto «scramble» por letra; navegación por capítulos siempre visible. | Cada letra de los titulares tiene su azar y entra/sale con desenfoque según el avance del scroll (reversible, como un video); índice de capítulos a la izquierda con su barra de avance; sonido por tramo (v3). |
| Imágenes de dirección (Juan) | Espacio con luna, satélite, mar con velero, buzo bajo la ventana de luz, sumergible, iceberg partido, cumbre con caminante; la Tierra de noche con borde azul eléctrico y luces de ciudad. | — | Son las placas de la película. La apertura nueva es la Tierra de noche de la segunda imagen: el único cálido de toda la web son las luces de ciudad. |
| Logo OCEAN (la estrella fluida) | — | — | Marca intacta (`marca/v3/`). |

Más: Convex Seascape Survey (Unseen) ata todo el viaje a la velocidad del scroll del visitante; OPTIKKA (Zajno,
Codrops) explica por qué el video plano no basta para scroll y cómo preparar la secuencia; *The Spark* asigna el texto a
posiciones concretas del recorrido. De ahí sale la arquitectura.

## El relato (siete capítulos, un instrumento)

Un altímetro acompaña toda la película (es la lectura del instrumento, no un dato): 420 km → 0 m → −3.800 m → +6.900 m.

| | Capítulo | Toma | Lo que dice | Servicio |
|---|---|---|---|---|
| 00 | Órbita | Tierra de noche, luces de ciudad | «De lo más profundo a lo más alto.» Cada luz: alguien escribiéndole a una marca. | qué es OCEAN |
| — | cruce | amanecer, aparece el satélite | «Ahora mismo, miles de personas le están escribiendo a una marca. ¿Quién les responde?» | el problema |
| 01 | La señal | satélite | «Primero, que te vean.» | UGC y pauta en Meta |
| — | cruce | caída por la atmósfera | «El alcance no vende. Vende la respuesta.» | |
| 02 | La superficie | mar con velero | «Arriba, todo parece en calma.» Lo que hace crecer una marca pasa debajo. | |
| — | cruce | la superficie se rompe | «Bajo la superficie» | |
| 03 | Agentes | buzo bajo la ventana de luz | «Alguien responde. También a las 2 a. m.» 11 s de respuesta media (medida en la línea de OCEAN) + Valeria | agentes de IA |
| — | cruce | el abismo | «Más profundo. Donde trabaja lo que nadie ve.» | |
| 04 | La máquina | sumergible | «Un sistema que trabaja solo.» 48 h · 24/7 · 11 s | software y automatización |
| — | cruce | subida por el hielo | «Lo que tus clientes ven es solo la punta.» | |
| 05 | La punta | iceberg partido | 10 % (tu web, tu tienda) / 90 % (agentes, datos, automatización) alrededor de la línea de agua | webs y tiendas + los tres casos + reels |
| — | cruce | del mar a la cumbre | «Y cuando lo de abajo funciona, todo sube.» | |
| 06 | La cumbre | cumbre al amanecer | «Ahora, tu marca.» WhatsApp y agenda | contacto |
| | (blanco) | la luz cubre el cuadro | agenda (Cal.com) y pagos (Wompi) sobre la nieve; pie con OCEAN® | |

Las cifras son las aprobadas (48 h, 24/7, 11 s) y los tres casos de siempre. Los paisajes son ilustraciones con IA (el
pie lo dice).

## Cómo está hecho

- **La película** (`tools/v4-film.sh`, `public/v4/`): 7 tomas de Kling 3 Pro (1080p, 10 s) con inicio y fin anclados
  a las placas; se quitan 2 cuadros duplicados en cada unión. Máster 24 fps, 1.621 cuadros. Entrega para buscar con el
  scroll: H.264 con un cuadro clave cada 8 y sin cuadros B (HD 1600 px, 22 MB; SD 1024 px, 8,5 MB para teléfono, ahorro
  de datos o poca memoria). La portada es el primer cuadro (WebP, 60 kB): pinta antes que cualquier script.
- **El escenario** (`src/v4/stage.ts`, WebGL2, sin librerías): el video no se reproduce, se busca (una búsqueda a la
  vez, la siguiente al llegar `seeked`; la textura sube solo si cambió el cuadro). Shader de composición: encuadre
  «cover» con foco por momento (en el teléfono el sujeto queda en cuadro), desenfoque radial y aberración en los bordes
  según la velocidad del scroll, brillo suave, gradación por capítulo, viñeta, grano, destellos de cruce y fundido a
  blanco. Encima, partículas del medio (estrellas, aire, nieve marina, nieve) que viajan con la cámara y se vuelven
  estelas al acelerar.
- **La línea de tiempo** (`src/v4/film.ts`, `src/v4/script.ts`): cada `.track[data-film="u0:u1"]` reserva un tramo de
  película en unidades de toma; el scroll amortiguado da `u`. Los cruces van con aceleración suave; los capítulos,
  lineales. Cada tramo expone `--a` (entrada), `--e` (salida) y `--p` (avance) a CSS; las letras (`.ch`, con su azar
  `--r`) y lo secundario (`[data-k]`) se dibujan solo con esas variables: todo se puede rebobinar. Quieto, el cuadro no se
  congela: la cámara respira con el puntero y la película deriva unas décimas hacia adelante en los capítulos.
- **Telemetría**: índice de capítulos (izquierda), altímetro/profundímetro con cinta (derecha), código de tiempo y
  barra de la película (abajo). Se esconden sobre la nieve.
- **Sin WebGL2**: la portada quieta y todo el texto. **Movimiento reducido**: la película sigue al scroll (es el
  visitante quien la mueve) pero sin desenfoque, partículas, paralaje ni deriva, y el texto sin desenfoque.

## Créditos usados (ElevenLabs, 19-nov-2026)
Placa de apertura 2 × 1.827 y siete tomas Kling 3 Pro (6 × 6.787 + 5.430) = **49.806 créditos**. Registro en
`docs/elevenlabs.tsv`; procedencia en `data/procedencia.json`.

## QA
`npm run build && npx vite preview --port 4175`; `node qa/overflow.cjs http://localhost:4175/` («nada se sale de la
pantalla», ES/EN/PT, 320–1440 px). Recorrido con capturas por capítulo: ver `qa/` de la sesión (Playwright con
SwiftShader; sin GPU el loop corre lento y el amortiguado tarda más en llegar, en un equipo real va a 60 fps).

## v5

La rama `v5-secuencia` continúa desde `6ef0e3c`. El recorrido conserva ambos MP4, los 1.621 fotogramas de origen, las siete tomas y los servicios de OCEAN. El primer y el último fotograma distan 67,5 segundos. El navegador sigue buscando en el mismo video al avanzar y retroceder.

### Diagnóstico de la versión recibida

Se recorrieron los trece momentos, el epílogo y el pie en Chromium, a 1440 × 900 y 390 × 844. El reloj y los textos cambiaban de capítulo mientras el escenario seguía mostrando la Tierra o el satélite. En el barrido lento de escritorio, la textura recibió cero imágenes nuevas durante cuatro segundos. El siguiente `currentTime` invalidaba el cuadro que acababa de decodificarse. En la edición sin WebGL2 quedaron ocultos los trece rótulos. La regla de altura de la película también se aplicaba a los tres reels sociales. En la prueba del respaldo cada reel medía 38.391 px de alto.

| Capturas por momento | Escritorio | Teléfono |
| --- | --- | --- |
| Antes de editar | [Recorrido original](qa-v5/escritorio-antes.webp) | [Recorrido original](qa-v5/movil-antes.webp) |
| Tras el ajuste de cámara y composición | [Recorrido corregido](qa-v5/escritorio-despues.webp) | [Recorrido corregido](qa-v5/movil-despues.webp) |

### Cámara, rótulos y apertura

- La posición vertical determina directamente el tiempo del máster. Cada búsqueda se dirige al interior de un fotograma. El escenario consume el cuadro confirmado por el decodificador antes de solicitar otro. Guarda dos texturas reutilizables y puede interpolar dos cuadros contiguos durante el scroll lento. En los saltos largos usa el más cercano disponible. El presupuesto de resolución se adapta al coste de dibujar. Un rasterizador por software recibe el máster SD.
- La gradación y las partículas conservan el guion original. El desenfoque radial tiene menor alcance. Los saltos de ancla y el movimiento reducido prescinden de ese efecto. Las cajas de texto y telemetría se miden al cargar las fuentes, cambiar el idioma o redimensionar. Un rótulo anclado que invadiría una de ellas cede espacio.
- El preloader espera a que haya una imagen de video decodificada. El arco y la cámara usan la relación de aspecto del máster y la misma convención de coordenadas. El negro da paso a la exposición del escenario. Una revisita abre con un fundido corto. Una descarga interrumpida puede continuar por la URL directa. Si falla también el video, o se pierde WebGL, la portada y el contenido siguen disponibles en HTML.
- El hero ocupa la pantalla y mantiene los dos botones visibles. En el teléfono se puede abrir la conversación de ejemplo con Valeria. El iceberg explica las partes visibles e internas de la operación mediante palabras. El epílogo comparte el color final de la película y los reels recuperan su altura natural.

### Verificación

Las pruebas usaron Chromium con SwiftShader en Linux y dos CPU lógicas. El teléfono fue emulado. Se recorrió toda la película y se compararon barridos lentos y rápidos en ambos sentidos. `node qa/secuencia-v5.cjs http://localhost:4175/` relaciona las texturas subidas con la mezcla que recibe el shader al dibujar. Registra también la diferencia entre el reloj y el scroll, y la intensidad del desenfoque. La prueba se puede repetir en un equipo con GPU.

- En 320, 360, 390, 600, 768, 900, 1024, 1280 y 1440 px se midieron palabras, botones, llamadas a la acción y telemetría en ES, EN y PT. Los elementos medidos quedaron dentro del ancho de pantalla.
- Se comprobó que ambos botones del hero caben a 1440 × 900, 1280 × 800, 2360 × 900 y 390 × 844. La desviación máxima medida del trazo respecto al círculo de referencia fue de 0,36 px de pantalla. La prueba mide la geometría; la atmósfera fotografiada tiene un borde luminoso de varios píxeles.
- En el teléfono emulado, desde la navegación hasta retirar el preloader se midieron 4,79 s en la primera visita y 2,18 s al volver en la misma sesión. La duración incluye carga y decodificación. Se ensayaron el error de red, la ausencia de WebGL2 y el movimiento reducido.
- Se verificaron la conversación de Valeria, el chat contra el simulado local, los enlaces contextuales de WhatsApp, los tres proyectos, el sonido de los reels, el destino de Cal.com y el cálculo previo de Wompi. La página arrancó en silencio. GA4 permaneció inactivo en la vista local.

| Barrido | Mayor intervalo de imagen en escritorio | Mayor intervalo de imagen en teléfono emulado |
| --- | ---: | ---: |
| Lento, del segundo 12 al 16 en 5 s | 1.401 ms | 402 ms |
| Lento, del 16 al 12 en 5 s | 507 ms | 259 ms |
| Rápido, del 12 al 50 en 4 s | 699 ms | 387 ms |
| Rápido, del 50 al 12 en 4 s | 613 ms | 354 ms |

El reloj coincidió con la posición del scroll en todas las muestras de dibujo (error máximo registrado de 0 s). En el barrido lento, la intensidad máxima observada del desenfoque fue 0,234 en escritorio y 0,077 en teléfono, en una escala de 0 a 1. La imagen avanzó en los dos sentidos. **El objetivo de 33,3 ms entre imágenes quedó pendiente en este equipo.** El máster aporta un fotograma original cada 41,7 ms a velocidad natural. La interpolación puede producir imágenes intermedias cuando hay dos texturas adyacentes disponibles. Las cifras anteriores miden el cuadro enviado al compositor. La validación de la cadencia en un teléfono físico queda pendiente.

Lighthouse 12.8.2 móvil, una corrida por versión en este entorno, dio 37 → 44 en rendimiento, LCP 6,0 → 5,0 s y CLS 0,001 → 0. El bloqueo total pasó de 107,60 a 4,41 s. La puntuación final todavía es baja. El perfil simula CPU y red sobre un navegador con rasterización por software.

Se ejecutaron instalación, comprobación TypeScript y compilación de Vite después de cada grupo de cambios. Los archivos de película, las marcas, el script de arranque y la CSP conservan su contenido.

### v5 · Apertura de marca y epílogo editorial

Sobre el color del espacio, la O abre la firma con un giro, la C continúa el movimiento y la E traza sus tres horizontes en sucesión. La A y la N cierran la palabra mientras aparece el borde de la Tierra. Los siete ejes salen de `marca/v3/logo-trazos.svg` y se pintan dentro de la silueta de `logo-sin-r.svg`. Al terminar la firma y disponer del primer cuadro decodificado, el mismo logo viaja a la cabecera y entra el hero. La línea inferior indica el avance de la descarga.

La escritura dura 1,925 s en la primera visita y 550 ms al volver en la misma sesión. Con movimiento reducido se muestra la marca completa y se abre el hero con un fundido de 220 ms. Se inspeccionaron 33 instantes de escritura en escritorio y móvil para comprobar que cada letra aparece a su turno. [Ver la animación capturada en Chromium](qa-v5/firma-ocean.webp)

En las pruebas a 1440 × 900, 1280 × 800, 2360 × 900 y 390 × 844, el rectángulo final de la animación coincidió con el logo de navegación con un error inferior a 0,004 píxeles CSS. El primer fotograma estaba decodificado en los cuatro tamaños. El arco tenue de la apertura quedó a menos de 0,14 píxeles del círculo de referencia. También se ensayaron el fallo de descarga, la lectura con portada estática y el movimiento reducido.

Cada caso dispone de una lámina horizontal con la proporción de su sitio publicado. El índice de reels reúne los tres títulos y permite elegir un solo reproductor. El recibo de Wompi reúne los cargos y el total junto al formulario. Los créditos vuelven a la imagen orbital del inicio y el logo lleva al visitante de vuelta al hero.

[Capturas de apertura y epílogo en escritorio](qa-v5/epilogo-escritorio.webp) · [Capturas en móvil](qa-v5/epilogo-movil.webp)

#### Comparación con la vista anterior

Se compararon el build de `1e32c65` y el nuevo render con `qa/secuencia-v5.cjs` en el mismo Chromium con SwiftShader y dos CPU lógicas. La tabla recoge el mayor intervalo observado entre cambios de imagen enviada al compositor. Los recorridos lentos duraron cinco segundos y los rápidos, cuatro.

| Tramo del máster | Escritorio anterior | Escritorio nuevo | Móvil emulado anterior | Móvil emulado nuevo |
| --- | ---: | ---: | ---: | ---: |
| 12 → 16 s | 553 ms | 328 ms | 504 ms | 224 ms |
| 16 → 12 s | 480 ms | 264 ms | 199 ms | 187 ms |
| 12 → 50 s | 575 ms | 364 ms | 246 ms | 168 ms |
| 50 → 12 s | 600 ms | 190 ms | 288 ms | 253 ms |

Las luces de lectura se componen en el mismo shader de la película. Los rótulos se actualizan cuando cambia el guion y el render se suspende en el epílogo. El controlador por software reutiliza una superficie para cargar cada cuadro decodificado y reduce el ritmo del ambiente en reposo. El error medido entre el reloj y el objetivo de scroll fue cero en los ocho recorridos. Durante el scroll lento, la intensidad máxima del desenfoque fue 0,060 sobre 1. El límite de 33,3 ms entre cambios de imagen sigue pendiente en este entorno.

Lighthouse móvil local obtuvo 56/100, con LCP de 3,4 s, CLS de 0 y bloqueo total de 6,02 s. El registro anterior de la rama marcaba 44/100. Las pruebas funcionales cubrieron los tres idiomas, el chat simulado, Valeria, WhatsApp contextual, los destinos de los casos, el selector de reels y su sonido, la integración de Cal.com y el cálculo previo de Wompi. Se comprobaron 27 combinaciones de idioma y ancho entre 320 y 1440 px.

### v5 · Cierre (rama `v5-cierre`, 20-nov-2026)

**Legibilidad.** Detrás de las cajas medidas del texto visible (palabras, etiquetas, tarjetas, cifras, botones y el
altímetro) el shader comprime las altas luces con borde suave (`1 / (1 + 2,7·lum)`); las sombras casi no cambian. En el
cuadro más claro el blanco queda sobre 9:1 y `--mist` sobre 5:1. El hero y las frases gigantes usan menos fuerza
(`data-scrim` 0,6–0,85).

**Cada rótulo cabe.** En el recorrido original, en 375 × 667 los capítulos 03 y 04 quedaban bajo la barra (hasta
128 px en 360 × 640) y el hero pisaba la telemetría en 360 × 640 y 1280 × 720. `fit()` lo resuelve en tres pasos y la
prueba de ajuste (rótulos entre la barra y la telemetría, leyendas del iceberg sin choques) quedó en verde en 360 × 640,
375 × 667, 390 × 844, 412 × 915, 768 × 1024, 1024 × 768, 1280 × 610, 1280 × 720, 1366 × 657, 1536 × 730, 1440 × 789,
1440 × 900 y 1920 × 1080, en ES, EN y PT. Las descripciones de los servicios ya no se cortan con «…».

**La marca.** Apertura con el isotipo (una estrella de luz y dos corrientes que se cierran a su alrededor, ≈ 1,3 s,
mientras la película se descarga), sello en la luz blanca de la cumbre (65–67 s) y firma del pie en metal claro con una
franja de luz. Logotipo robusto ajustado a la foto del 20-nov (`marca/v3/README.md`).

**Contenido.** El caso de Outstanding dice lo que pasa hoy (agente de voz en operación; WhatsApp en ajuste), como en
`fix/caso-outstanding-llms`. El botón del índice tiene nombre accesible.

**Cadencia** (`qa/secuencia-v5.cjs`, Chromium con SwiftShader y 2 CPU, el mismo equipo para las dos versiones). Mayor
espera entre cuadros enviados al compositor, base `7fb660e` → cierre: escritorio 84/86/90/91 ms → 102/91/144/98 ms;
teléfono 82/86/84/159 ms → 78/69/82/76 ms (12→16, 16→12, 12→50, 50→12 s). Error del reloj: 0 en todas. El escritorio
por software paga el costo de las luces de lectura; en una GPU es despreciable, pero no se midió aquí.

### v5.1 · Medidor en pantalla y avance por reproducción (21-nov-2026)

- **Medidor en pantalla.** Con `?qa=1&medir=1`, la página termina la apertura, recorre sola la película (12→16 s y
  16→12 s en 5 s; 12→50 s y 50→12 s en 4 s) y muestra en una caja la mayor espera de imagen y cuántas imágenes nuevas
  hubo por cuadro de pantalla. Sirve en un teléfono o computador real sin herramientas de desarrollo: basta con tomar
  una captura de la caja. GA4 no mide con `?qa`.
- **Avance por reproducción (experimental, `&avance=play`).** Hacia adelante y en tramos de hasta 1,2 s, el escenario
  reproduce el video a la velocidad del scroll (0,5–4×) y sube cada cuadro presentado (`requestVideoFrameCallback`) en
  vez de encadenar búsquedas; hacia atrás y en saltos largos sigue buscando. Sin el parámetro, nada cambia.
- **Medido aquí (Chromium con SwiftShader, 1440 × 900, 21-nov):**

| Barrido | Búsqueda (actual) | Reproducción |
| --- | ---: | ---: |
| 12→16 en 5 s | 100 ms · 96 imágenes | 83 ms · 91 imágenes |
| 16→12 en 5 s | 105 ms · 95 imágenes | 133 ms · 92 imágenes |
| 12→50 en 4 s | 100 ms · 70 imágenes | 100 ms · 101 imágenes |
| 50→12 en 4 s | 133 ms · 72 imágenes | 83 ms · 70 imágenes |

- **Pendiente y decisivo:** medir en el M1 y en un teléfono físico con
  `https://www.oceanindustries.com.co/?qa=1&medir=1` y `…&avance=play`. En el M1 (20-nov) la búsqueda hacia adelante
  esperaba 250–350 ms. Si la reproducción baja esa cifra en el equipo real, pasa a ser el modo por defecto.
