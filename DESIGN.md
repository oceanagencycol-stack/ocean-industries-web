# DESIGN.md — OCEAN v3, de lo más profundo a lo más alto

Sistema de diseño de la web v3 (rama `v3`, nov-2026). Concepto completo: `docs/v3/CONCEPTO.md`; técnica:
`docs/v3/ARQUITECTURA.md`. Nivel pedido por Juan: «extremadamente pulido, con mucha autoridad… al nivel de Tesla».

## Idea rectora
**OCEAN baja a lo más profundo para llevar tu marca a lo más alto.** Una sola toma: del espacio al fondo del mar y del
fondo del mar a la cumbre de hielo. Lo que no se ve (agentes, automatización, software) sostiene lo que se ve (la marca,
la web, la venta).

## El recorrido (siete tramos, `data-tramo`)
| Tramo | id | Placa | Qué dice |
|---|---|---|---|
| espacio | `#inicio` | M1a (vertical: la estrella de cuatro puntas) | «De lo más profundo a lo más alto.» Qué es OCEAN, WhatsApp y agendar |
| satelite | `#senal` | M1sb | 01 · La señal: contenido (UGC) y pauta en Meta |
| mar | `#mar` | M2b | «Lo que hace crecer una marca casi nunca se ve.» Bajemos. |
| agua | `#agentes` | M3b | 02 · Bajo el agua: agentes de IA y Valeria (de ejemplo) |
| maquina | `#maquina` | M4v2a | 03 · La máquina: software con IA y automatización; 48 h, 24/7 |
| emerge | `#trabajo` | M5a | 04 · Lo que queda en pie: webs y tiendas, los tres casos, los reels |
| cumbre | `#hablemos` | M6a → nieve | 05 · La cumbre: WhatsApp, agenda (Cal.com) y pagos (Wompi) sobre la nieve; pie |

La cámara vive detrás del recorrido completo. Su posición, la luz y el fotograma son función del desplazamiento.
Se cruza la atmósfera con bruma, se atraviesa la superficie con refracción y se sale hacia la cumbre entre nubes.
Los titulares y los ejemplos cambian de lado en una retícula de doce columnas. El encuadre se mantiene cerca del
ejemplo durante la lectura para que sus estados avancen al ritmo del desplazamiento.

## Color: monocromo tipo Tesla
| Token | Hex | Uso |
|---|---|---|
| `--space` | `#03060C` | el fondo |
| `--abyss` | `#06141D` | superficies, el panel del chat, la tinta sobre la nieve |
| `--slate` | `#2B404F` | texto secundario sobre la nieve |
| `--haze` | `#6E8193` | texto terciario sobre la noche (nunca sobre slate ni nieve) |
| `--mist` | `#B2C0CC` | texto secundario sobre la noche; la línea de la IA |
| `--snow` | `#E0E7ED` | texto principal; la persona; el fondo de la cumbre y el pie |
| `--white` | `#FFFFFF` | solo la acción principal y el resultado que se enciende |
| `--signal` | `#A5FFD0` | acciones, resultados y progreso de lectura |

Contraste (WCAG): snow/space 16,3 · mist/space 10,9 · haze/space 5,05 · haze/abyss 4,64 · mist/slate 5,8 · abyss/snow
14,9 · slate/snow 8,6 · abyss/white 18,7. Fallan y no se usan para texto: haze/slate 2,7 · haze/snow 3,2.

## La gramática de las escenas (por tono y forma)
**La persona** = nieve sólida (burbuja, nodo, decisión). **La IA** = línea fina `--mist` de 1 px, sin relleno.
**El resultado** = blanco pleno con su luz, que se enciende al llegar (`lit`). Se entiende en escala de grises y con
daltonismo. La clave va arriba de las escenas: tres marcas con nombre (punto sólido, anillo, punto con luz).

## Tipografía
Geist variable (OFL), servida propia, latín + latín extendido. Titulares 600, interletra −0,035 em, interlineado
0,98–1,04, `text-wrap: balance`. Etiquetas en mayúsculas pequeñas, 12 px, 0,24 em (el eco del logotipo). Texto 400 a
17 px (18 desde 1024), interlineado 1,6, < 60 caracteres. Cifras `tabular-nums`.

## Marca
Barra: `logo-sin-r.svg` (104 px). Pie: `logo.svg` (OCEAN®) a lo ancho, abisal sobre nieve. La E son tres horizontes:
un riel quieto al borde izquierdo con las barras de la E encendidas por tramo. Favicon: el símbolo simétrico en nieve
sobre abisal (desde 32 px).

## Movimiento
- **Una sola gramática de entrada**: las líneas de un titular suben desde su máscara mientras la interletra pasa de
  0,04 em a la final (1,3 s, `cubic-bezier(.16,1,.3,1)`, 110 ms entre líneas); lo secundario llega 120 ms después con un
  barrido de luz de izquierda a derecha; las cifras cuentan. Nada aparece con un fundido genérico.
- **La intro de marca** (paquete propio, ≈ 4,5 s, a petición): la estrella, el símbolo, el logotipo letra por letra, y
  el logotipo vuela a la barra. La portada entra cuando el negro se abre.
- **Botones**: reflejo que los cruza al pasar el puntero (solo con hover); se hunden 1 px al presionar.
- Nada late solo: la luz de «en línea» es fija. Las escenas corren en vista, tres vueltas, con pausa (WCAG 2.2.2).
- Pausa de movimiento en la barra y el pie con preferencia compartida. Con movimiento reducido se muestran las placas
  y el contenido está visible desde el primer cuadro.

## Grano
Grano fino de película sobre toda la página (`public/v3/grano.png`, `soft-light` al 0,06): la textura de la casa, la
misma de la intro. En el mundo va en la pasada final del shader.

## Composición
Cabeceras alineadas a la izquierda sobre el aire oscuro de cada placa (la máquina y lo que queda en pie, abajo; la
cumbre, arriba). En el teléfono, el texto abajo sobre una sombra (la cumbre, arriba). Barra transparente sobre la
portada y con fondo casi opaco al moverse (clara sobre la nieve). «Habla con OCEAN» flota solo en el computador y se
esconde en la portada, la cumbre y el pie.

## Palabras
OCEAN en títulos y textos; Ocean Industries solo como nombre legal. Los servicios se nombran por lo que son. «Demo» es
el prototipo en 48 horas; la reunión es una «llamada» (45 minutos por Google Meet).

## Honestidad
Nada de cifras ni clientes sin verificar: 48 h, 24/7, 11 s y los tres casos son los aprobados. Valeria y las escenas son
de ejemplo y lo dicen. Los paisajes son ilustraciones hechas con IA (el pie y `llms.txt` lo dicen).
