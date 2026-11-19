# OCEAN — web v3

**De lo más profundo a lo más alto.** La web oficial de OCEAN (Ocean Industries): un recorrido en siete tramos del
espacio al fondo del mar y del mar a la cumbre de hielo, monocromo tipo Tesla, en Geist, con grano de película.

- **La página** (`index.html`, rama `v3-pagina`): HTML real trilingüe (ES/EN/PT) que se lee entero sin JavaScript.
  Cada tramo trae su placa de respaldo; la cumbre (agenda y pagos) y el pie van sobre la nieve.
- **El recorrido cinematográfico** (`src/world/plates.ts`): una cámara continua que el desplazamiento mueve desde la órbita
  hasta la cumbre. Los fotogramas seleccionados de ElevenLabs alimentan el mismo lienzo y se cargan cerca de cada tramo.
  La composición editorial y los ejemplos siguen el recorrido. Las placas mantienen la lectura con movimiento reducido,
  ahorro de datos o WebGL2 no disponible.
- **La intro de marca** (`src/intro-v3/`): el logotipo se escribe y vuela a la barra cuando se elige reproducirla.
- **Lo que se conserva de la v2**: WhatsApp con el mensaje escrito por contexto e idioma, las seis escenas de servicios,
  Valeria (de ejemplo), el chat «Habla con OCEAN» (`/api/agente`), Cal.com, los pagos con Wompi (`/api/pago-wompi`),
  los reels (`/api/reels`), GA4 solo en el dominio real, la 404 y ahora `/privacidad`.

| Archivo | Qué es |
|---|---|
| `DESIGN.md` | el sistema v3: tramos, color, tipo, marca, movimiento |
| `CLAUDE.md` | reglas para agentes y QA |
| `DEPLOY.md` | Vercel, variables, cómo pasar a producción |
| `docs/v3/` | concepto, arquitectura y medios de la v3 |
| `docs/v3/CINE.md` | auditoría, referencias y decisiones de la versión cinematográfica |
| `tools/medios_pagina.py` | placas, favicon, íconos y og.jpg (por código, sin IA) |

```bash
npm install
npm run dev        # http://localhost:5175
npm run typecheck && npm run build
npx vite preview --port 4175   # y la QA de CLAUDE.md
```
