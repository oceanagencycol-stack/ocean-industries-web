# Ocean Industries — Web épica 🌊

Web trilingüe (ES / EN / PT) ultra moderna con animaciones fluidas, mockups de celular flotantes, pagos Wompi, agendamiento Maton y agente IA vía n8n.

---

## ⚠️ ANTES DE NADA: SEGURIDAD (léelo)

Pegaste tus llaves **privadas de producción** en un chat. Trátalas como comprometidas:

1. Entra a tu panel de **Wompi** → Desarrolladores → **rota/regenera** la llave privada, el secreto de integridad y el secreto de eventos.
2. Entra a **n8n** → API → **revoca** la API key que compartiste y crea una nueva si la necesitas.

La llave **pública** (`pub_prod_...`) sí puede ir en el frontend — ya está en `index.html`. Las privadas van SOLO en variables de entorno de Vercel (ver abajo). Nunca en el código ni en git.

---

## 📁 Estructura

```
ocean-web/
├── index.html          La web completa (un solo archivo, sin build)
├── api/
│   ├── pago-wompi.js    Genera la firma de integridad de Wompi (seguro)
│   └── agente.js        Proxy seguro al webhook de n8n (agente IA)
├── vercel.json          Config de Vercel
├── package.json
├── .gitignore
└── .env.example         Plantilla de variables secretas
```

---

## 🚀 PASO A PASO: SUBIR A GITHUB + VERCEL

### 1. Subir a GitHub
1. Crea un repo nuevo en GitHub: `ocean-industries-web`.
2. Sube todos estos archivos (arrastra la carpeta o usa git):
   ```bash
   git init
   git add .
   git commit -m "Ocean Industries web"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/ocean-industries-web.git
   git push -u origin main
   ```

### 2. Deploy en Vercel
1. Entra a vercel.com → **Add New → Project** → importa el repo.
2. Framework Preset: **Other**. Root Directory: `./`. Clic en **Deploy**.
3. Queda en `ocean-industries-web.vercel.app`.

> Nota: el plan Hobby de Vercel prohíbe uso comercial. Como esta web es de tu agencia (uso comercial), usa **Vercel Pro**.

### 3. Configurar variables de entorno (las llaves secretas)
En Vercel → tu proyecto → **Settings → Environment Variables**, agrega (con tus llaves YA ROTADAS):

| Nombre | Valor |
|---|---|
| `WOMPI_INTEGRITY_SECRET` | tu secreto de integridad nuevo |
| `WOMPI_PRIVATE_KEY` | tu llave privada nueva |
| `WOMPI_EVENTS_SECRET` | tu secreto de eventos nuevo |
| `N8N_WEBHOOK_URL` | la URL del webhook de tu workflow n8n |

Luego **Redeploy** para que tomen efecto.

### 4. Conectar tu dominio (GoDaddy)
1. Vercel → Settings → Domains → agrega tu dominio.
2. En GoDaddy: registro A `@` → `76.76.21.21`, y CNAME `www` → `cname.vercel-dns.com`.
3. Si GoDaddy tiene "domain forwarding" activo, desactívalo (causa "Invalid Configuration").

---

## 💳 PAGOS WOMPI — cómo funciona

- El cliente escribe el monto. La web calcula automáticamente: **base + comisión (2.95% + $700) + IVA (19% sobre la comisión)** y muestra el total.
- Al pagar, el frontend pide la **firma de integridad** a `/api/pago-wompi` (que usa el secreto guardado en Vercel) y abre el **Widget Checkout de Wompi**.
- Si el backend de firma aún no está configurado, el botón cae a un fallback que abre WhatsApp con el detalle del pago — así nunca pierdes la venta.

### Confirmar pagos (recomendado, opcional)
Para marcar pagos como confirmados, configura en Wompi un **webhook de eventos** apuntando a una función `/api/wompi-webhook` que valide la firma con `WOMPI_EVENTS_SECRET`. (Te puedo generar esa función cuando quieras.)

---

## 📅 AGENDAMIENTO MATON

1. Entra a maton.ai → crea/abre tu agente de agendamiento conectado a tu Google Calendar.
2. Busca la opción **Share / Embed** y copia tu URL pública de booking.
3. En `index.html`, busca `const MATON_EMBED_URL = "";` y pega tu URL entre las comillas.
4. Commit + push. El calendario se mostrará embebido en la sección "Agenda".

> La API key de Maton que compartiste se usa para integraciones server-side (crear citas vía API). Si quieres un agendamiento 100% nativo en la web (sin iframe), te armo una función `/api/agendar` que use esa key de forma segura.

---

## 🤖 AGENTE IA (n8n)

1. En n8n crea un workflow con un nodo **Webhook** (POST) como disparador.
2. Conéctalo a un nodo de **AI Agent** (con tu modelo: Claude/Gemini) + memoria + herramientas (agendar, FAQ, etc.).
3. El workflow debe responder un JSON: `{ "reply": "texto de respuesta" }`.
4. Copia la **URL de producción del webhook** y ponla en Vercel como `N8N_WEBHOOK_URL`.
5. El widget de chat de la web llama a `/api/agente`, que reenvía el mensaje a n8n de forma segura.

> El widget de chat flotante del agente se puede activar cuando tengas el webhook listo — dime y lo agrego al `index.html` (lo dejé preparado en el backend `/api/agente.js`).

---

## 🎨 Identidad de marca aplicada
- **Azul** `#0000FF` · **Verde** `#00FF7F` · **Negro** `#101820` · **Blanco** `#F4F5F0`
- Tipografía display: **Archivo** (alternativa libre casi idéntica a Heading Now).
- Logos oficiales de Ocean (verde, negro, blanco) desde Cloudinary.

---

## 🛠️ Skills de animación (para iterar en tu máquina con Claude Code)
Los principios de estas skills ya están aplicados (easing, microinteracciones, fluidez). Para instalarlas y seguir puliendo localmente:
```bash
npx skills add emilkowalski/skill
# o clona los repos:
git clone https://github.com/emilkowalski/skill.git
git clone https://github.com/pbakaus/impeccable.git
git clone https://github.com/Leonxlnx/taste-skill.git
git clone https://github.com/ruvnet/ruflo.git
```

---

Construido por Ocean Industries · we turn brands into waves
