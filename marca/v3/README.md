# Marca OCEAN v3 (rebranding, 18-nov-2026)

Juan entregó el logotipo nuevo («OCEAN®») y el símbolo (la estrella fluida) en PNG el 18-nov-2026. Aquí están en vector.

| Archivo | Qué es |
|---|---|
| `logo.svg` | OCEAN® (logotipo con la marca registrada), `fill="currentColor"` |
| `logo-sin-r.svg` | OCEAN sin ® (para tamaños donde la ® no se lee) |
| `simbolo.svg` | La estrella fluida. Es simétrica por giro de 180°: se traza una pieza y la otra es su giro exacto (`<use>`) |
| `hoja-marca-v0.png` | Hoja para revisar: logotipo en noche y en nieve, símbolo, firma símbolo + logotipo |
| `fuente/` | Los PNG que entregó Juan (1600×900 y 1254×1254) |

**Estado: trazo fiel v0.** Sale de calcar los PNG (`tools/marca/`: potracer sobre la imagen ampliada ×4 y suavizada).
Es fiel al dibujo, con sus pequeñas irregularidades (la O no es un círculo perfecto, algunos bordes rectos ondulan
apenas). Antes de usar la marca en grande hace falta el **dibujo maestro**: reconstruirla con geometría exacta (círculos,
rectas, ángulos y grosores medidos) y compararla píxel a píxel con estos trazos. Está en el plan de la v3.

Rehacer los trazos: `pip install potracer scikit-image scipy` y
`python3 tools/marca/logo.py marca/v3/fuente/logotipo-ocean.png` ·
`python3 tools/marca/simetria.py marca/v3/fuente/simbolo-estrella-fluida.png simbolo.svg` (escriben en la carpeta actual).
