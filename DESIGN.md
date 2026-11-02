# DESIGN.md — Ocean Industries, el Pacífico de noche

Sistema de diseño de la web v2 (rama `v2`, nov-2026). Mezcla la web anterior de Ocean (marca, contenido, olas de
puntos, trilingüe, pagos, agente) con el mundo de Qora (oscuro cinematográfico, una sola firma en cristal, intro con
sonido, escenas que explican, color con significado).

## Idea rectora
**Bioluminiscencia del Pacífico: el mar de noche se enciende donde algo se mueve.** En el Pacífico colombiano el
plancton brilla cuando el agua se mueve; una marca bien conectada funciona igual: cada cliente que se mueve (un
mensaje, un clic, un pago) enciende algo. Ocean construye lo que se enciende. De ahí sale todo lo demás.

## La firma (una sola)
El mar de luz en tiempo real (three.js) con la firma «Ocean» en cristal que sale del agua. El mar brilla según qué
tan rápido se mueve el agua, deja una estela de luz bajo el cursor o el dedo, se ilumina debajo del cristal y lanza
un anillo azul cuando el agente responde. Todo lo demás es quieto y disciplinado: sin fade-up por sección, sin tilt,
sin marquee, sin brillos sueltos.

## Color con oficio (la gramática de Qora con la paleta de Ocean)
| Token | Hex | Significa |
|---|---|---|
| `--night` | `#050A14` | el mar de noche: fondo de todo (con tinte, nunca negro plano) |
| `--foam` | `#F4F5F0` | **la persona**: quien escribe, quien decide; el cristal |
| `--klein` / `--blue` | `#0000FF` / `#3D63FF` | **la máquina**: el agente, la automatización, la luz del plancton. `#0000FF` solo en superficies (burbujas del agente, envío); en texto se usa `--blue-tx` `#9AAFFF` |
| `--green` | `#00FF7F` | **el resultado**: la acción principal (WhatsApp), los indicadores en vivo, la cita, el pago, la rompiente. Nada más es verde |
| `--cyan` | `#59C3E6` | el foco del teclado (interfaz, sin significado de negocio) |
| `--mist` / `--mist-2` | `#A7B2C8` / `#8290AA` | texto secundario y terciario (fríos, nunca gris puro) |

## Tipografía
Una sola familia, **Archivo Variable** (la de Ocean), con su eje de ancho como herramienta:
- Titulares: ancho 118–125 %, peso 700–760, interletra negativa, en minúsculas de oración (el mundo de Qora).
- Cifras y números de fase: ancho 64–70 %, peso 800+, `tabular-nums` (la energía de la Ocean anterior).
- Texto: ancho 100 %, peso 400, 17 px, interlineado 1,6, líneas de menos de 60 caracteres.
- La cursiva solo existe en la firma (el logo es un trazo, nunca un tipo).

## Composición
Alineado a la izquierda sobre el mar; el lienzo fijo detrás (`100lvh`). Recorrido:
hero (la firma a la derecha, el texto a la izquierda sobre sombra) → **la ola** (escena pegajosa de 460vh: la frase
del Pacífico, mar de fondo, la cresta azul, la rompiente verde y el cierre) → servicios en filas, agrupados en las
tres fases, cada uno con su escena de cuatro pasos → el agente en vivo (Valeria) → trabajo (casos y reels) →
hablemos (el cristal vuelve) → agenda → pagos → pie. En el teléfono el cristal vive en el tercio de arriba y el texto
abajo sobre una sombra.

## Movimiento
- Una intro orquestada (7,6 s, una vez cada 7 días, sin puerta): una gota despierta el agua, una ola crece y rompe en
  verde, la firma sale del agua pieza por pieza, la luz pasa por el cristal, «Convertimos marcas en olas.» llega con
  las tres notas (La, Mi, Do♯) y el cristal se va a su lugar.
- La escena de la ola, atada al scroll.
- Las escenas de cuatro pasos (en vista, tres vueltas, pausa y repetir; WCAG 2.2.2).
- Movimiento reducido, sin WebGL2 o con WebGL por software: la imagen quieta (la firma sobre líneas de puntos), la
  ola se lee en orden y las escenas muestran su cuadro final.

## Sonido
Todo sintetizado en el navegador (`src/core/sounds.ts`, cero archivos): el oleaje, la gota, la ola que crece y rompe,
el cristal, el destello del plancton, el motivo, el colchón de la noche, gotas para la conversación y clics suaves.
Suena si el navegador deja; si no, con el primer toque. Se baja mientras hay una conversación o un reel con sonido.

## Escenas que explican
Cada servicio se explica trabajando, siempre con la misma gramática: alguien pide (blanco) → la máquina ejecuta (azul)
→ una persona decide (blanco) → el resultado llega (verde, solo el resultado). Nombres, montos y fechas de las escenas
son de ejemplo y lo dicen («Campaña de ejemplo», «Proveedor de ejemplo»).

## Honestidad del copy
Nada de cifras ni clientes sin verificar. Las cifras (48 h, 24/7, 11 s, 0 respuestas inventadas) y los tres casos son
los que la web anterior ya publicaba con aprobación de Juan. Un caso nuevo entra solo con su visto bueno.
