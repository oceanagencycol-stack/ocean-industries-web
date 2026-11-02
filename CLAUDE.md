# CLAUDE.md — ocean-industries-web

Web oficial de Ocean Industries (oceanindustries.com.co). Comunicación con Juan: **español**. Contenido: **ES por
defecto, EN y PT** (cada elemento lleva `data-es` / `data-en` / `data-pt`).

## Antes de tocar nada
1. Lee `DESIGN.md` (el sistema) y el brain (`brain/proyectos/ocean-industries-web.md`).
2. `npm install && npm run typecheck && npm run build` debe pasar limpio.
3. Producción manda: `curl -sI https://www.oceanindustries.com.co/` antes de afirmar qué está publicado.

## Reglas
- **Una sola firma**: el mar que se enciende con la firma de cristal. No agregues efectos sueltos.
- **Color con significado**: blanco = la persona, azul = la máquina, verde = el resultado. `#0000FF` solo en
  superficies; en texto, `--blue-tx`. El verde solo en la acción principal, lo vivo y el resultado.
- **Honestidad**: nada de cifras ni clientes sin verificar; los datos de las escenas son de ejemplo y lo dicen.
- **El logo no se redibuja**: `src/brand/wordmark.svg` es el trazo del maestro de 2501 px (Cloudinary
  `LOGO-Ocean-INDS-10`). El 3D, el SVG de la barra, el pie, la intro y el favicon salen de ahí.
- **Producción solo con visto bueno de Juan**: la v2 vive en la rama `v2` (vista previa de Vercel). `main` es lo
  publicado; se fusiona cuando Juan lo apruebe.
- Oficio (de Qora): sin `backdrop-filter`; `:hover` solo dentro de `@media (hover: hover)`; el lienzo medido por su
  caja (`100lvh`); `stage.ts` importado dinámico (three.js fuera del primer bundle); nada de asignaciones por cuadro
  en el loop; en `demos.css` nada de selectores que terminen en `*` o en `:is()`.
- **CSP**: el script de arranque (`<script data-ocean-boot>`) va por hash en `vercel.json`; si cambia, el build falla
  y da el hash nuevo. Wompi necesita `https://checkout.wompi.co` en `script-src` (si falta, bloquea los pagos en
  silencio).
- **Pagos**: la tarjeta nunca toca a Ocean (widget de Wompi); la firma sale de `/api/pago-wompi`; el regreso de Wompi
  no confirma nada (lo confirma el webhook). No se hacen pagos reales en pruebas.
- **El agente de la web** (`/api/agente`, n8n) no se prueba con mensajes reales sin permiso: en QA se simula.
- Sin secretos en el repo. Commits con identidad `oceanagencycol-stack <oceanagencycol@gmail.com>`.

## Dónde está cada cosa
`index.html` (la página, trilingüe) · `404.html` · `src/main.ts` (arranque) · `src/three/` (el mar `sea.ts`, la
firma `wordmark.ts`, el escenario `stage.ts`, su estado `state.ts`) · `src/intro/` (splash y cinemática) ·
`src/core/` (sonido, vibración, dispositivo) · `src/ui/` (idioma, WhatsApp, escenas, la ola, el agente en vivo, la
conversación, pagos, reels, agenda, analítica) · `src/styles/` · `api/` (agente, firma de Wompi, reels) ·
`public/` (reels, videos UGC, marca, íconos, og) · `qa/` (capturas).

## QA
Con `npx vite` (o `npm run preview`): `node qa/shoot.cjs http://localhost:5175/ <carpeta> both` (sin el 3D, rápido)
y `--glass` (con el mar; en el sandbox sin GPU va con SwiftShader y tarda). `node qa/stage_shot.cjs` posa el
escenario solo (`dev-stage.html`). Termina en «sin problemas» o lista los fallos.
