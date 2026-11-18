# OCEAN v3 — concepto

> Etapa 0 · 18-nov-2026 · rama `v3` (escrito en `v3-plan`). Pedido de Juan (18-nov): «una web altamente minimalista inmersiva que empieza
> en el espacio profundo, baje al océano profundo y llegue a la montaña de hielo más alta, tecnología y futuro, algo
> nunca antes visto… lo más suave y optimizada y de calidad ultra posible».
> Marca: logotipo final `87ffda2c-image.jpg` (18-nov 15:50) y el símbolo de la estrella fluida `d0560d1e-image.png`,
> en vector en la rama `v3-marca` (`marca/v3/logo.svg`, `logo-sin-r.svg`, `simbolo.svg`).
> Técnica: [ARQUITECTURA.md](ARQUITECTURA.md) · Medios y créditos: [MEDIOS.md](MEDIOS.md) · Etapas: [../plan-v3.md](../plan-v3.md)

## Idea rectora
**OCEAN baja a lo más profundo para llevar tu marca a lo más alto.**
Una sola toma, sin cortes: de las estrellas al fondo del mar, y del fondo del mar a la cumbre de hielo. Las montañas más
altas empiezan bajo el agua: la cumbre que se ve se apoya en todo lo que no se ve. Eso es lo que hace OCEAN.

## El recorrido (un plano secuencia atado al scroll)
| Tramo | Lo que se ve | Lo que dice del negocio | Servicios |
|---|---|---|---|
| **1 · Espacio profundo** — *la señal* | Negro con estrellas. El borde de la Tierra es una línea de luz; una luna creciente. La cámara cae, cruza la atmósfera (negro → azul profundo) y ve el mar de noche desde arriba | Desde arriba se ve todo: el mensaje que tiene que llegar a la gente | Contenido para redes (UGC) · Pauta en Meta |
| **2 · Océano profundo** — *la máquina* | La cámara rompe la superficie. Mirando hacia arriba, la ventana de Snell (el círculo de luz que se ve desde abajo del agua). Haz de luz, nieve marina, un buzo pequeño que baja. El fondo, a oscuras, donde la luz es la de la máquina | Lo que trabaja abajo, a oscuras, 24/7, sin que nadie lo vea | Agentes de IA para WhatsApp y web · Automatización de procesos · el agente en vivo (Valeria, ejemplo) |
| **3 · La montaña de hielo** — *lo que queda en pie* | En el fondo la cámara encuentra la pared de una montaña y sube por ella: cruza de nuevo la superficie (ahora de abajo hacia arriba), atraviesa las nubes y llega a la cumbre de hielo al amanecer. Un caminante pequeño en la arista. Arriba, la estrella vuelve al cielo: la cumbre es lo más cerca del espacio | Lo que se construye y queda: estructura, software, la web que vende | Webs y tiendas en línea · Software a la medida con IA · casos y reels |
| **Cumbre** — *hablemos* | Luz de día sobre la nieve; el render descansa | La conversación, la cita y el pago, en calma | Hablemos · Agenda (Cal.com) · Pagos (Wompi) · pie |

Lo «nunca antes visto» no es un efecto: es una toma continua que cruza tres medios físicos (vacío, agua, aire helado)
y dos veces la superficie del mar, en la que **las mismas partículas cambian de significado** (estrellas → nieve marina
→ nieve) y la luz que guía es la de la marca. Y corre a 60 fps en un teléfono medio, accesible y sin JavaScript se lee.

## La firma (una sola)
**La estrella de OCEAN guía la toma.** El centro del símbolo (la estrella de cuatro puntas que dejan las dos formas en S)
es la única luz con forma propia (el resto de la luz es ambiente: el borde de la Tierra, los haces, el alba): en el espacio es una estrella; bajo el agua, la luz que baja con el buzo; en la cumbre,
el primer destello del sol sobre el hielo. Todo lo demás es quieto: sin texto que entra letra por letra, sin cursor
propio, sin marquee, sin parallax decorativo de interfaz, sin fade-up por sección.

**La E del logotipo son tres horizontes.** Sus tres barras (la de en medio más corta) son los tres tramos: el
indicador de recorrido de la barra es esa E, con la barra del tramo actual encendida; en la cumbre se encienden las
tres (llegaste). Es un indicador de interfaz quieto, del tamaño del texto, nunca animado por su cuenta: no compite con
la estrella. No es un adorno nuevo: es la marca
diciendo dónde estás.

## La marca en la web (sustituye a «el logo no se redibuja»)
**Regla nueva: la marca sale solo de `src/brand/`** (copiados de `marca/v3/` cuando Juan apruebe el trazo exacto):
`logo.svg` (OCEAN®), `logo-sin-r.svg` y `simbolo-simetrico.svg` (Juan eligió el símbolo simétrico exacto, 18-nov). Nadie la redibuja a mano ni la reescribe con una fuente. Barra,
pie, favicon, íconos, og.jpg, intro y la forma de la estrella en el shader (campo de distancia horneado del SVG) salen
de esos tres archivos por el build. Zona de respeto: la altura de la barra de en medio de la E alrededor; tamaño
mínimo: logotipo ≥ 72 px de ancho, símbolo ≥ 16 px.
| Lugar | Qué va |
|---|---|
| Barra (todas las anchuras) | logotipo sin ® (a tamaño de barra el ® no se lee) |
| Pie, cumbre | logotipo grande, a lo ancho, con ® (Juan, 18-nov: «está registrada») |
| Favicon, apple-touch, PWA | el símbolo en lienzo cuadrado (`simbolo-cuadrado.svg`), desde 32 px (a 16 px la estrella del centro se pierde); blanco nieve sobre azul abisal en los íconos con fondo |
| Intro | el símbolo se dibuja (dos trazos en S) y su centro se enciende: esa estrella es la primera del espacio |
| 3D | solo la estrella (SDF del símbolo); el logotipo no va en 3D (el cristal de la v2 se retira) |
| og.jpg | logotipo sobre la cumbre, compuesto por código (`tools/og`) |

## Color: monocromo tipo Tesla (decisión de Juan, 18-nov 16:25)
Sin colores de acento: autoridad por contención. La paleta es la helada de punta a punta y la acción principal
(WhatsApp, agendar, pagar) es un botón **blanco sólido con texto abisal**: lo único blanco puro de la interfaz.
| Token | Hex | Uso |
|---|---|---|
| `--space` | `#03060C` | el espacio: fondo del tramo 1 |
| `--abyss` | `#06141D` | Abyssal Blue: fondo del tramo 2 y de la marca |
| `--slate` | `#2B404F` | bordes, superficies elevadas |
| `--haze` / `--mist` | `#6E8193` / `#B2C0CC` | texto terciario y secundario (pares de contraste medidos en la etapa 1) |
| `--snow` | `#E0E7ED` | texto principal; en la cumbre, el fondo (con texto abisal) |
| `--white` | `#FFFFFF` | solo la acción principal y el resultado que se enciende |

**La gramática de las escenas se conserva por tono y forma, no por color** (Juan, 18-nov): **la persona** = nieve
sólida; **la IA** = línea fina de luz fría (contorno `--mist` a 1 px, sin relleno); **el resultado** = blanco pleno
que se enciende (el único que pasa a `--white`). Se entiende en escala de grises y con daltonismo.

## Grano (decisión de Juan, 18-nov: «granito degradado… crispi… de alta calidad»)
**Degradados profundos con grano fino de película encima**, nítido y de alta frecuencia: es la textura de toda la web
(el cine de 35 mm escaneado a 4K, no ruido sucio). En el mundo 3D va en la pasada final del shader (grano por píxel
de pantalla, con su propia semilla por cuadro y amplitud que depende de la luminancia: más visible en medios tonos que
en negros), y se congela cuando el render duerme. En la versión quieta y en el HTML, una tesela de grano de 256 px
(PNG de ≈ 20 KB, generada por código) sobre los degradados CSS, con `mix-blend-mode: soft-light` y opacidad 0,06–0,10.
Los degradados se tramean (dither) para que nunca haya bandas. El grano es parte de la luz, no un efecto aparte.

## Tipografía
El logotipo es un dibujo propio (no una fuente). El texto usa **Outfit** variable (OFL): geométrica, O redonda, pariente
del logotipo sin imitarlo. Servida propia, recortada con fontTools a pesos 300–800 y latín + latín extendido (ES/PT),
≈ 30 KB. Titulares 600–700 en oración, interletra negativa; etiquetas en mayúsculas pequeñas con aire (el eco del
logotipo); texto 400 a 17 px, interlineado 1,6, < 60 caracteres por línea; cifras `tabular-nums`. Una sola familia.

## Movimiento y sonido
- **Intro** (≈ 3,5 s, una vez cada 7 días, sin puerta, «Saltar» desde el primer segundo): el símbolo se traza, la
  estrella del centro se enciende, la cámara retrocede y esa estrella queda entre miles. Sin intro con ancla, en visita
  de regreso o con movimiento reducido.
- **La toma** es función del scroll (se puede ir y volver a cualquier velocidad, nunca «reproduce un video»), con una
  cámara amortiguada para que nada salte.
- **Sonido** (solo tras el primer clic o toque, nunca con teclado; botón siempre visible): tres colchones (el zumbido
  del espacio, el agua sorda, el viento de la cumbre) que se cruzan por tramo; efectos en los cruces (entrar a la
  atmósfera, romper la superficie, salir del agua, la ráfaga de la cumbre, el destello de la estrella); los clics de
  interfaz siguen sintetizados en el navegador. Se apaga bajo una conversación o un reel con sonido.

## Accesibilidad y respaldos
- Todo el contenido es HTML real y se lee en orden sin JavaScript; el lienzo es `aria-hidden`; cada tramo es una
  sección con su título.
- **Movimiento reducido, sin WebGL2, WebGL por software o ahorro de datos**: la versión quieta, tres imágenes (una por
  tramo) que cambian con un fundido simple; nada se mueve solo.
- **Pausar el movimiento** (WCAG 2.2.2): un control en la barra y en el pie detiene las partículas y la cámara libre;
  se recuerda.
- Foco visible, salto al contenido, contraste medido, `:hover` solo en `@media (hover: hover)`, sin `backdrop-filter`.

## Qué se conserva
Trilingüe ES/EN/PT (`data-es`/`data-en`/`data-pt`), WhatsApp por contexto e idioma, los seis servicios con su escena de
cuatro pasos (más quietas: una a la vez), Valeria (de ejemplo, y lo dice), los tres casos con enlace, los reels,
Cal.com (45 min por Google Meet), Wompi (`/api/pago-wompi`, webhook), el chat (`/api/agente`), GA4 solo en el dominio
real, 404 propia, `llms.txt`, JSON-LD, CSP estricta con el script de arranque por hash, `noindex` en vistas previas.
Se retiran: el mar de plancton, el cristal «Ocean», la ola de 380vh y el lema «Convertimos marcas en olas.» (el titular
nuevo se aprueba con el copy; candidato: «De lo más profundo a lo más alto.» / «From the deepest to the highest.» /
«Do mais profundo ao mais alto.»).

## Honestidad
Nada de cifras ni clientes sin verificar: las cifras y los tres casos son los ya aprobados (48 h, 24/7, casos de la
v2); uno nuevo entra solo con el visto bueno de Juan. Los paisajes son ilustraciones generadas con IA (lo dice el pie y
`llms.txt`) y la montaña no es una montaña real con nombre. Nada del moodboard (fotos, logos de terceros como ICEBRG o
Celestia Systems) entra a la web. OCEAN está registrada (Juan, 18-nov): el ® va en el logotipo grande; en la barra no se lee y va `logo-sin-r.svg`.
