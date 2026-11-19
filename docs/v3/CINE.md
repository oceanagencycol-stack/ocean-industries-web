# OCEAN · dirección cinematográfica

La web presenta a OCEAN como el estudio que construye lo que hace funcionar una operación comercial. La órbita
muestra cómo una marca llega al mercado. Bajo el agua aparecen los agentes de WhatsApp y los sistemas que
automatizan el trabajo. El ascenso lleva a las tiendas, los casos y el contacto.

## Auditoría del sitio

El dominio público servía la v2. El enlace recibido correspondía al despliegue de v3 del commit `4e6586c`.
Vercel protegía esa vista previa con acceso del equipo. Se inspeccionó localmente esa misma revisión.

| Elemento | Decisión |
| --- | --- |
| Siete tramos y cambio de oscuridad a nieve | Mantener el arco y darle movimiento real a las imágenes, con un encuadre propio para teléfono. |
| Titular de la v3 y marca original | Conservar el logotipo. Abrir con «Una señal.» sobre la curva de la Tierra, con espacio para la cámara y dos entradas al recorrido, reproducir o desplazarse. |
| Placas más parallax de WebGL2 | Rodar las transiciones entre placas y montar una película con un encuadre horizontal y otro vertical. |
| Servicios antes que casos | Seguir una sola compra. Cada paso enlaza con la demostración o el proyecto que lo explica. Al cerrar, la persona vuelve al mismo capítulo. |
| Tres idiomas, WhatsApp contextual, sonido, agenda y pagos | Mantener los flujos existentes y añadir un control de movimiento en la barra. |

## Referencias y decisiones

| Referencia | Qué se aplicó |
| --- | --- |
| [Hubtown, Unseen Studio](https://hubtown.co.in/) y [CSS Design Awards](https://cssdesignawards.com/sites/hubtown/49408/) | El video adjunto muestra un mismo mundo que cambia al desplazarse. OCEAN mantiene continuidad mediante la dirección de los planos, la luz fría y la posición de los títulos. |
| Video del recorrido natural adjunto | Los paisajes y la escala humana marcan el ritmo. El mar abierto queda como una pausa antes de entrar a los servicios de agentes. |
| Video de Hearbuds adjunto y [Edifier W830NB en Behance](https://www.behance.net/gallery/217135377/Edifier-W830NB-3D-Product-Film) | Iluminar un objeto técnico con una fuente clara y usar encuadres que le den espacio. El satélite y el sumergible tienen un horizonte y una silueta reconocibles. |
| [Pin compartido](https://pin.it/m628VIgvV) y [Usta](https://usta.agency/) | Usar el desplazamiento como recorrido y mantener navegación directa a las secciones. |
| [Omega Clearspace](https://webgpu.com/showcase/omega-clearspace-orbital-debris-threejs/) y [Ponpon Mania, relato de sus autores](https://tympanus.net/codrops/2025/10/07/ponpon-mania-how-webgl-and-gsap-bring-a-comic-sheeps-dream-to-life/) | El movimiento cambia entre escenas. Cada toma tiene una intención distinta y la composición mantiene continuidad cuando se cambia de capítulo. |
| [The First Pulse en Behance](https://www.behance.net/gallery/249602303/The-First-Pulse) y [Vast de Territory Studio](https://territorystudio.com/project/vast/) | Partículas y luz con dirección bajo el agua. Órbita con detalle fotográfico y movimiento contenido. |

La búsqueda incluyó Instagram. El material indexado no permitió revisar de principio a fin un reel adicional con
detalle comparable al de los videos adjuntos. Las decisiones visuales se apoyan en los videos y los casos enlazados.

## La señal

La versión anterior detenía el movimiento durante las demostraciones y disponía de ocho fotogramas para cada toma.
La edición actual sigue el pedido de una chaqueta. La clienta descubre el producto, pregunta por la talla, recibe una
respuesta del agente, reserva y paga. Los ejemplos de servicio y los proyectos se abren desde el capítulo que los explica.

| Material revisado | Decisión de montaje |
| --- | --- |
| Hubtown, video adjunto, 0–4 s y 7–10 s | El cubo deja paso a una trayectoria luminosa. Una misma señal recorre la órbita, el mar y el ascenso de OCEAN. [Hubtown en Awwwards](https://www.awwwards.com/sites/hubtown) |
| Recorrido natural, video adjunto, 0–4 s y 7–14 s | Nubes y relieve ocultan y descubren el siguiente paisaje. En OCEAN la lente pasa junto al velero, atraviesa el agua y asciende por el hielo. [Into the Amazon, por Gladeye](https://www.gladeye.com/work/into-the-amazon) |
| Hearbuds Pro, video adjunto, 1–10 s | El objeto conserva su identidad al cambiar la iluminación y la escala. El nuevo recorrido deja espacio en pantalla a la antena, el buzo y los faros del sumergible. |
| Pin compartido de Usta, 0–18 s | Las partículas cambian de forma mientras la información entra y sale. El texto de OCEAN se retira durante los desplazamientos de cámara. [Video del pin](https://www.pinterest.com/pin/621989398580723128/) |
| Las dos imágenes de dirección | La curva azul del horizonte inicia el descenso. El pequeño buzo frente a la ventana de luz y la figura junto a la cumbre mantienen una referencia humana de escala. |

El equipo de *The Spark* explica cómo asignó la aparición del texto a posiciones concretas de su recorrido. Zajno documenta
las diferencias entre reposicionar un video y dibujar fotogramas preparados durante el scroll. En OCEAN, los rótulos,
el índice, la cámara y la reproducción automática comparten un reloj. [The Spark](https://tympanus.net/codrops/2026/01/09/the-spark-engineering-an-immersive-story-first-web-experience/) · [OPTIKKA](https://tympanus.net/codrops/2025/10/16/creating-smooth-scroll-synchronized-animation-for-optikka-from-html5-video-to-frame-sequences/)

## Edición y reproducción

Seis nuevas tomas de ElevenLabs enlazan cada par de placas. Cada par de tomas comparte la misma placa en su unión. El montaje completo tiene 1.320 fotogramas a 24 fps. Se suavizaron los cambios de velocidad al cruzar la
superficie y al ascender por el hielo mediante flujo óptico. El máster vertical reencuadra al sujeto en cada tramo.

Con los archivos originales del flujo, nombrados `bridge0.mp4` a `bridge5.mp4`, y la toma orbital `intro.mp4`,
`python tools/film.py FUENTES MÁSTERES` compone las dos versiones de trabajo. Se ejecuta después `python tools/film-delivery.py MÁSTERES` para editar el tiempo y escribir los archivos de entrega.
La procedencia y los créditos están en `data/procedencia.json` y `docs/elevenlabs.tsv`.

La reproducción continua usa H.264. Durante el desplazamiento se dibujan los fotogramas del mismo montaje.
El navegador conserva una ventana de tres paquetes de ocho imágenes y la desplaza en ambos sentidos. Una guía ligera del montaje completo permite avanzar incluso al saltar a imágenes pendientes de descarga.
Al soltar el scroll, el video presenta el fotograma a resolución completa. Los modos de movimiento reducido y ahorro de datos
presentan fotogramas fijos. La apertura orbital tiene movimiento propio. La proyección usa el ritmo ya montado, con un fotograma cada 1/24 s y tiempos de lectura más largos al llegar. El filtro de sonido cruza el agua con la cámara. Las imágenes de referencia, el video del pin y los clips de terceros se usaron solo en el análisis.

`node qa/cine.cjs http://localhost:4175/` comprueba la reproducción, las búsquedas en ambas direcciones, el encuadre vertical,
la pausa y los enlaces profundos. Los flujos comerciales se prueban con `qa/flows.cjs`.

La [grabación del recorrido en Chromium](../../public/v3/recorrido.mp4) muestra la proyección desde el hero hasta la cumbre, con los títulos y los controles de la página.
