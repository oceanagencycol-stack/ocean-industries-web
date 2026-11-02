# DEPLOY.md — cómo se publica la web de Ocean

## Dónde vive
- Proyecto de Vercel: `ocean-industries-web` (equipo Ocean). Dominios: `www.oceanindustries.com.co` y
  `oceanindustries.com.co`.
- Repo: `oceanagencycol-stack/ocean-industries-web`. **`main` es lo publicado.** La v2 vive en la rama `v2`: cada push
  crea una vista previa (`ocean-industries-web-git-v2-ocean-agency.vercel.app`, con la protección de Vercel del
  equipo).
- Build (lo dice `vercel.json`): `npm run build` → `dist/`. Las funciones de `api/` se despliegan solas.

## Variables de entorno (solo nombres; los valores viven en Vercel)
| Variable | Para qué | Entornos |
|---|---|---|
| `N8N_WEBHOOK_URL` | `/api/agente`: el chat «Habla con Ocean» → el flujo de n8n | Production, Preview |
| `WOMPI_INTEGRITY_SECRET` | `/api/pago-wompi`: la firma de integridad | Production, Preview |
| `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET` | Wompi (servidor) | Production, Preview |
| `IG_ACCESS_TOKEN`, `IG_USER_ID` | `/api/reels`: los reels más nuevos (opcional: sin ellos sirve los tres propios) | — |

Ojo: la vista previa usa las mismas llaves de Wompi que producción. **Nunca se completa un pago en una vista previa.**

## Publicar la v2 en producción (cuando Juan la apruebe)
1. Revisar la vista previa en teléfono y computador (intro, la ola, servicios, agente, pagos hasta abrir el widget sin
   pagar, agenda, idiomas).
2. Fusionar `v2` en `main` (PR o merge) con identidad `oceanagencycol-stack <oceanagencycol@gmail.com>`. Vercel
   despliega solo.
3. Pruebas tras el deploy:
   ```bash
   curl -sI https://www.oceanindustries.com.co/ | grep -i -E "content-security|x-frame|strict-transport"
   curl -s https://www.oceanindustries.com.co/api/reels | head -c 200
   curl -s -o /dev/null -w "%{http_code}\n" https://www.oceanindustries.com.co/no-existe   # 404
   ```
4. Si algo falla: en Vercel, «Promote» el despliegue anterior de `main` (vuelve en segundos) y se arregla en `v2`.

## Regenerar lo que sale de un script
- `src/brand/wordmark.svg`: trazo del logo maestro (2501 px) con potrace; no se edita a mano.
- `public/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`: la O de la firma.
- `public/og.jpg`: una captura del mar con la firma (`qa/og.cjs`).
- Si cambia el script de arranque de `index.html`, el build falla y da el hash nuevo para `script-src` en
  `vercel.json`.
