# Marca OCEAN v3 (rebranding, 18-nov-2026)

Juan entregó el logotipo final («OCEAN®», 18-nov 15:50: «este sera el texto logo final») y el símbolo, la estrella
fluida («el simbolo si se quedo igual»). Aquí están en vector, con `fill="currentColor"`.

| Archivo | Qué es |
|---|---|
| `logo.svg` | OCEAN® · **dibujo maestro geométrico** (3,7 kB) |
| `logo-sin-r.svg` | OCEAN sin ® (tamaños donde la ® no se lee: favicon, barra del teléfono) |
| `simbolo.svg` | La estrella fluida, simétrica por giro de 180° (una pieza y su giro exacto, en un solo trazo) |
| `hoja-marca-v1.png` | Hoja de revisión: logotipo en noche y en nieve, símbolo, firma símbolo + logotipo |
| `comparacion-maestro-vs-fuente.png` | El maestro sobre el archivo de Juan: gris = coinciden; rojo = solo el original; cian = solo el maestro |
| `fuente/` | Los archivos que entregó Juan (logotipo 2576×1438, símbolo 1254×1254) |

## Cómo está construido el logotipo (`tools/marca/maestro.py`)
Medido en el archivo final con líneas de barrido y ajustes; altura de mayúscula = 356 px de la fuente = 100 en el SVG.
- **O**: anillo de dos superelipses de exponente 2,1 (exterior 207,8 × 187,2; interior 114,75 × 107,5), con el rebase
  óptico de 9 px arriba y abajo. El ajuste a la fuente da error máximo < 0,7 px.
- **C**: el mismo anillo, con un corte radial a 28,2° arriba y abajo.
- **E**: tres barras de 76 sin asta; la de en medio más corta (325 contra 384).
- **Λ**: tope plano de 94, piernas paralelas de pendiente 0,49.
- **N**: astas de 93 y diagonal de pendiente 0,9.
- **®**: calcada de la fuente (×8 y suavizada): es demasiado pequeña para medirla.
- Las curvas son cúbicas ajustadas a la superelipse (desvío máximo 0,22 px de la fuente). Coincidencia con el archivo
  de Juan: IoU 0,991; lo distinto son bordes de un píxel del suavizado del JPG.

Rehacer: `pip install potracer scikit-image scipy` y, en una carpeta de trabajo, `python3 tools/marca/maestro.py`,
`python3 tools/marca/registrada.py` (leen `marca/v3/fuente/logotipo-ocean-final.jpg`; córrelos desde la raíz del repo).
El símbolo: `python3 tools/marca/simetria.py marca/v3/fuente/simbolo-estrella-fluida.png simbolo.svg`.
