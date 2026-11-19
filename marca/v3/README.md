# Marca OCEAN v3 (rebranding, 18-nov-2026)

Juan entregó el logotipo final («OCEAN®», 18-nov 15:50: «este sera el texto logo final») y el símbolo, la estrella
fluida («el simbolo si se quedo igual»). Aquí están en vector, con `fill="currentColor"`.

| Archivo | Qué es |
|---|---|
| `logo.svg` | OCEAN® · **dibujo maestro geométrico** del logotipo final (5 kB) |
| `logo-trazos.svg` | Los ejes de cada letra, para la animación de entrada |
| `logo-sin-r.svg` | OCEAN sin ® (la barra, y en toda la web mientras la marca no esté registrada) |
| `simbolo.svg` | La estrella fluida, **fiel** al archivo de Juan (calcada, ×4 y suavizada) |
| `simbolo-simetrico.svg` | Propuesta: la misma estrella exactamente simétrica por giro de 180° (el original lo es al 97 %). Solo entra si Juan la aprueba |
| `simbolo-cuadrado.svg` | El mismo símbolo en lienzo cuadrado: favicon (desde 32 px), íconos y PWA |
| `hoja-marca-v1.png` | Hoja de revisión (fondos con los tokens de la v3: espacio, abisal, nieve, pizarra): logotipo en noche y en nieve, símbolo, firma símbolo + logotipo |
| `comparacion-maestro-vs-fuente.png` | El maestro sobre el archivo de Juan: gris = coinciden; rojo = solo el original; cian = solo el maestro |
| `fuente/` | Los archivos que entregó Juan (logotipo 2576×1438, símbolo 1254×1254) |

## Cómo está construido el logotipo (final de Juan, 18-nov 20:56; `tools/marca/maestro2.py`, `maestro3.py`, `armar2.py`)
Monolínea de grosor constante (40,8 px en la fuente) con remates redondos. Altura de la E = 100 unidades.
- **O**: círculo trazado (radio 78,8 px en la fuente). **C**: el mismo círculo abierto ±42° a la derecha.
- **E**: tres barras iguales con remates redondos, sin asta.
- **Λ**: dos piernas en ángulo con el vértice exterior redondeado (radio 31 px) y el interior en punta.
- **N**: astas y diagonal en ángulo con las esquinas exteriores redondeadas.
- **®**: calcada (×10 y suavizada).
- O, C y E son trazos (`stroke`), Λ y N contornos; `logo-trazos.svg` tiene los ejes de todas las letras, cada una
  con `data-l`, para animar el dibujo letra por letra (`stroke-dashoffset`).
- Los trece parámetros se ajustan a la fuente maximizando la coincidencia (Powell / Nelder-Mead).

## Prueba
`python3 qa/marca.py` (raíz del repo): IoU de la tinta contra el archivo de Juan con el mejor encaje subpíxel y
porcentaje del borde a ≤ 2 px. 18-nov-2026 (logotipo final): logotipo 0,9729 / 99,87 % (piso 0,97: es monolínea de
40 px y medio píxel de borde cuesta ≈ 2,5 % de IoU); símbolo 0,9962 / 100 %; símbolo cuadrado 0,9966 / 100 % →
«marca en verde».
