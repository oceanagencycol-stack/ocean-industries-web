# OCEAN — web v3

**De lo más profundo a lo más alto.** La web oficial de OCEAN (Ocean Industries): un recorrido en siete tramos del
espacio al fondo del mar y del mar a la cumbre de hielo, monocromo tipo Tesla, en Geist, con grano de película.

- **La página** (`index.html`, rama `v3-pagina`): HTML real trilingüe (ES/EN/PT) que se lee entero sin JavaScript.
  Cada tramo trae su placa de respaldo; la cumbre (agenda y pagos) y el pie van sobre la nieve.
- **El recorrido cinematográfico** (`src/v3/cinema.ts`): siete tomas ambientales de ElevenLabs, con encuadres para
  escritorio y teléfono. La toma activa se carga al entrar en pantalla y se puede pausar desde la barra. Las placas
  mantienen la composición con movimiento reducido, ahorro de datos o reproducción no disponible. El mundo WebGL2
  sigue disponible con `?world` para comparar.
- **La intro** (`src/intro-v3/`): el logotipo se escribe y vuela a la barra; una vez cada 7 días.
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
