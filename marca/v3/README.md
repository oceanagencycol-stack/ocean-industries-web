# Marca OCEAN v3 (rebranding, 18-nov-2026)

Juan entregó el logotipo final («OCEAN®», 18-nov 15:50: «este sera el texto logo final») y el símbolo, la estrella
fluida («el simbolo si se quedo igual»). Aquí están en vector, con `fill="currentColor"`.

| Archivo | Qué es |
|---|---|
| `logo.svg` | OCEAN® · **dibujo maestro geométrico** (3,7 kB) |
| `logo-sin-r.svg` | OCEAN sin ® (la barra, y en toda la web mientras la marca no esté registrada) |
| `simbolo.svg` | La estrella fluida, **fiel** al archivo de Juan (calcada, ×4 y suavizada) |
| `simbolo-simetrico.svg` | Propuesta: la misma estrella exactamente simétrica por giro de 180° (el original lo es al 97 %). Solo entra si Juan la aprueba |
| `simbolo-cuadrado.svg` | El mismo símbolo en lienzo cuadrado: favicon (desde 32 px), íconos y PWA |
| `hoja-marca-v1.png` | Hoja de revisión (fondos con los tokens de la v3: espacio, abisal, nieve, pizarra): logotipo en noche y en nieve, símbolo, firma símbolo + logotipo |
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
  de Juan: ver «Prueba».

Rehacer: `pip install potracer scikit-image scipy` y, en una carpeta de trabajo, `python3 tools/marca/maestro.py`,
`python3 tools/marca/registrada.py`, `python3 tools/marca/armar.py` (leen `marca/v3/fuente/logotipo-ocean-final.jpg`; córrelos desde la raíz del repo).
El símbolo: `python3 tools/marca/simetria.py marca/v3/fuente/simbolo-estrella-fluida.png simbolo.svg`.

## Prueba
`python3 qa/marca.py` (raíz del repo): IoU de la tinta contra el archivo de Juan con el mejor encaje subpíxel y
porcentaje del borde a ≤ 2 px. Pasa con IoU ≥ 0,98 y ≥ 99 %. 18-nov-2026: logotipo 0,9886 / 99,74 %; símbolo
0,9962 / 100 %; símbolo cuadrado 0,9966 / 100 % → «marca en verde». La simétrica da 0,9878 / 96,7 % (es una corrección,
no un calco). La prueba encontró que la ® salía recortada 2,5 unidades por arriba: corregido (el `viewBox` sale de la
tinta real).
