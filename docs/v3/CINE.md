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
| Titular de la v3 y marca original | Mantener ambos y explicar en la primera pantalla los tres servicios principales y la presencia internacional. |
| Placas más parallax de WebGL2 | Integrar tomas ambientales, un desplazamiento corto del encuadre y fundidos entre placas. Conservar `?world` para comparar la implementación WebGL2. |
| Servicios antes que casos | Mantener las seis demostraciones y los tres casos publicados. Usar nombres directos en la barra para llegar a contenido y automatización. |
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

## Reproducción

El HTML pinta una placa AVIF o WebP por tramo. Se carga un solo MP4 H.264 silencioso a la vez después del pintado y
de la intro, cuando la cabecera entra en pantalla. El desplazamiento cambia el encuadre y elige la toma visible.
Los videos son bucles cortos a 24 fps. Cada escena tiene una edición horizontal y otra vertical. La capa de video
se libera al salir de su cabecera o al pausar y se detiene si la pestaña pierde visibilidad. Los fallos de reproducción
y las preferencias de ahorro de datos o movimiento reducido dejan el cuadro estático. El sonido por capítulos mantiene
su control propio.

Las referencias se usaron para dirección de arte. La web usa tomas propias producidas en ElevenLabs. El registro
de gasto está en `docs/elevenlabs.tsv` y los identificadores de las tomas elegidas en `data/procedencia.json`.
