# DEPLOY.md — cómo se publica la web de Ocean

## Dónde vive
- Proyecto de Vercel: `ocean-industries-web` (equipo Ocean). Dominios: `www.oceanindustries.com.co` y
  `oceanindustries.com.co`.
- Repo: `oceanagencycol-stack/ocean-industries-web`. **`main` es lo publicado** (la v2, desde el 2-nov-2026). Cada
  push a otra rama crea una vista previa (`ocean-industries-web-git-<rama>-ocean-agency.vercel.app`, con la
  protección de Vercel del equipo y `noindex`).
- Build (lo dice `vercel.json`): `npm run build` → `dist/`. Las funciones de `api/` se despliegan solas.

## Variables de entorno (solo nombres; los valores viven en Vercel)
| Variable | Para qué | Entornos |
|---|---|---|
| `N8N_WEBHOOK_URL` | `/api/agente`: el chat «Habla con Ocean» → el flujo de n8n | Production, Preview |
| `WOMPI_INTEGRITY_SECRET` | `/api/pago-wompi`: la firma de integridad | Production, Preview |
| `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET` | Wompi (servidor) | Production, Preview |
| `IG_ACCESS_TOKEN`, `IG_USER_ID` | `/api/reels`: los reels más nuevos (opcional: sin ellos sirve los tres propios) | — |

Ojo: la vista previa usa las mismas llaves de Wompi que producción. **Nunca se completa un pago en una vista previa.**

## Publicar un cambio en producción (con el visto bueno de Juan)
1. Trabajar en una rama; cada push crea su vista previa. Revisarla en teléfono y computador (intro, la ola,
   servicios, agente, pagos hasta abrir el widget sin pagar, agenda, idiomas).
2. QA local (`CLAUDE.md`, sección QA) en verde y Lighthouse en teléfono ≥ 90.
3. Fusionar la rama en `main` con identidad `oceanagencycol-stack <oceanagencycol@gmail.com>`. Vercel despliega solo.
4. Pruebas tras el deploy:
   ```bash
   curl -sI https://www.oceanindustries.com.co/ | grep -i -E "content-security|x-frame|strict-transport"
   curl -s https://www.oceanindustries.com.co/api/reels | head -c 200
   curl -s -o /dev/null -w "%{http_code}\n" https://www.oceanindustries.com.co/no-existe   # 404
   curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://oceanindustries.com.co/   # 308 → www
   ```
   y en el navegador: sin errores de consola ni violaciones de CSP, la agenda de Cal.com carga, el script de Wompi
   carga (sin pagar), los reels corren, GA4 carga solo en el dominio real.
5. Si algo falla: en Vercel, «Promote» el despliegue anterior de `main` (vuelve en segundos) y se arregla en una rama.
   La última versión de la v1 es `dpl_4eeUPUZNYtEx1pmfF9DUn7ZZvFFQ` (commit `1f92216`, «GA4 en produccion», 8-sep-2026).

## Regenerar lo que sale de un script
- `src/brand/wordmark.svg`: trazo del logo maestro (2501 px) con potrace; no se edita a mano.
- `public/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`: la O de la firma.
- `public/og.jpg`: una captura del mar con la firma (`qa/og.cjs`).
- Si cambia el script de arranque de `index.html`, el build falla y da el hash nuevo para `script-src` en
  `vercel.json`.
