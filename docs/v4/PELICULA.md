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
