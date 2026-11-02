# Ocean Industries — web v2

**El Pacífico de noche: el mar se enciende donde algo se mueve.** La web oficial de Ocean Industries, rehecha como una
mezcla de la web anterior de Ocean (su marca, su contenido, sus olas de puntos, trilingüe, pagos y agente) con el
mundo de Qora (oscuro cinematográfico, una sola firma en cristal, intro con sonido y escenas que explican).

- **La firma**: un mar de plancton en tiempo real (three.js) que brilla donde el agua se mueve, deja una estela bajo el
  cursor o el dedo, y la firma «Ocean» en cristal que sale del agua.
- **La intro** (una vez cada 7 días, sin puerta): una gota despierta el agua, una ola crece y rompe en verde, la firma
  sale del agua y llega «Convertimos marcas en olas.» con tres notas. Sonido sintetizado en el navegador.
- **La ola** (escena por scroll): mar de fondo → la cresta (azul: la máquina) → la rompiente (verde: el resultado). Los
  seis servicios, agrupados en esas tres fases, cada uno con una escena de cuatro pasos.
- **Lo que se conserva**: WhatsApp con mensaje por contexto e idioma, el agente en vivo (Valeria), los tres casos, los
  reels, Cal.com, los pagos con Wompi (`/api/pago-wompi`), el chat con el agente (`/api/agente`), GA4 con los mismos
  eventos, ES/EN/PT.
- **Sin WebGL, con movimiento reducido o con ahorro de datos**: la firma quieta sobre líneas de luz; todo se lee.

| Archivo | Qué es |
|---|---|
| `DESIGN.md` | el sistema: idea rectora, color, tipo, composición, movimiento, sonido |
| `DEPLOY.md` | Vercel, variables, cómo pasar a producción, pruebas |
| `CLAUDE.md` | reglas para agentes |

```bash
npm install
npm run dev        # http://localhost:5175
npm run typecheck && npm run build
```
