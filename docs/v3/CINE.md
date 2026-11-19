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
| Titular de la v3 y marca original | Conservar el logotipo. Abrir a sangre con «Todo empieza bajo la superficie» y poner los tres servicios principales y el contacto en una columna desplazada. |
| Placas más parallax de WebGL2 | Componer los fotogramas dentro de una sola cámara, con cruces de atmósfera, lente submarina y nubes. |
| Servicios antes que casos | Alternar texto y demostraciones en la retícula editorial. Usar las imágenes publicadas de los tres proyectos y dar a Valeria una conversación que avanza al hacer scroll. |
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

## Montaje

El HTML abre con un primer cuadro AVIF o WebP. Una vez montado el lienzo fijo, una sola posición de cámara gobierna
el encuadre, los fotogramas y la transición. Avanzar o retroceder por la página mueve esa posición. El cielo, la
superficie, la profundidad y el hielo están compuestos en el mismo lienzo. El cruce del agua usa una franja ondulada
con refracción y mezcla de las dos perspectivas.

El motor combina ocho fotogramas de cada toma y descarga los paquetes WebP cerca del tramo visible. Hay una edición
panorámica y otra vertical. El navegador mantiene el contenido HTML y las imágenes de respaldo cuando se pausa el recorrido,
se pide movimiento reducido o hay ahorro de datos. El sonido por capítulos tiene su propio control.

La portada usa un titular a sangre con la propuesta y el contacto en una columna desplazada. Los ejemplos se recorren
con el scroll y también se pueden consultar por pasos. Los casos alternan imagen y texto usando las piezas publicadas por
[Outstanding Garage Doors](https://www.outstandinggaragedoors.com/),
[Naidikó](https://www.naidiko.co/) y [Álvaro Arroyo](https://www.alvaroarroyo.com/).

Los paquetes se regeneran con `node tools/secuencia.mjs` desde las fuentes del directorio `public/v3/cine/`.
La prueba `node qa/cine.cjs http://localhost:4175/` verifica la cámara en posiciones intermedias, avance y retroceso,
el encuadre móvil, la pausa y el respaldo.

Las referencias se usaron para dirección de arte. La web usa tomas propias producidas en ElevenLabs. El registro
de gasto está en `docs/elevenlabs.tsv` y los identificadores de las tomas elegidas en `data/procedencia.json`.
