# OCEAN — web v3

**De lo más profundo a lo más alto.** La web oficial de OCEAN (Ocean Industries): un recorrido en siete tramos del
espacio al fondo del mar y del mar a la cumbre de hielo, con luz azul, tipografía Geist e Instrument Serif y una señal que guía la cámara.

- **La página** (`index.html`, rama `v3-pagina`): HTML real trilingüe (ES/EN/PT) que se lee entero sin JavaScript.
  Cada tramo trae su placa de respaldo; la cumbre (agenda y pagos) y el pie van sobre la nieve.
- **La película** (`src/v3/film.ts`) sigue a una clienta desde un reel hasta la compra.
  Un máster de 55 segundos enlaza las siete composiciones con movimientos de cámara generados entre pares de placas.
  Se recorre con el scroll, el índice o la reproducción continua. Las demos, proyectos y el contacto conservan sus enlaces.
  Cada encuadre tiene respaldo estático para movimiento reducido y ahorro de datos.
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
