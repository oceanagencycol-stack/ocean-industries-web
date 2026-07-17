// /api/agente.js — Vercel Serverless Function
// Proxy seguro entre el chat de la web y tu workflow de n8n.
// El frontend llama a /api/agente; esta función reenvía el mensaje al webhook de n8n.
// La URL del webhook (y cualquier credencial) vive en variables de entorno, nunca en el frontend.

export default async function handler(req, res) {
  // CORS restringido: solo el dominio propio puede consumir este endpoint desde el navegador.
  const ALLOWED = ["https://oceanindustries.com.co", "https://www.oceanindustries.com.co"];
  const reqOrigin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED.includes(reqOrigin) ? reqOrigin : ALLOWED[0]);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, sessionId, lang } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Missing message" });
    }
    // Cap defensivo: un mensaje de chat legítimo no pasa de ~2000 chars.
    // Trunca en vez de rechazar para no romper la conversación por un pegado largo.
    const safeMessage = message.slice(0, 2000);

    // URL del WEBHOOK de tu workflow de n8n (NO la API key del panel).
    // Se configura en Vercel como variable de entorno N8N_WEBHOOK_URL.
    const webhook = process.env.N8N_WEBHOOK_URL;
    if (!webhook) {
      return res.status(200).json({
        reply:
          lang === "en"
            ? "The assistant is being set up. Meanwhile, message us on WhatsApp and we'll help you right away."
            : lang === "pt"
            ? "O assistente está sendo configurado. Enquanto isso, fale conosco no WhatsApp."
            : "El asistente se está configurando. Mientras tanto, escríbenos por WhatsApp y te ayudamos al instante.",
      });
    }

    // Timeout defensivo: si n8n cuelga, no dejamos al usuario esperando indefinido.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let r;
    try {
      r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: safeMessage, sessionId, lang }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await r.json().catch(() => ({}));
    // n8n debe responder { reply: "..." }
    return res.status(200).json({ reply: data.reply || data.output || "…" });
  } catch (err) {
    const l = (req.body && req.body.lang) || "es";
    return res.status(200).json({
      reply:
        l === "en"
          ? "I had a connection issue. Message us on WhatsApp and we'll help you right away 👉 https://wa.me/message/YQTLLAZYI6QVO1"
          : l === "pt"
          ? "Tive um problema de conexão. Fale conosco no WhatsApp e ajudamos na hora 👉 https://wa.me/message/YQTLLAZYI6QVO1"
          : "Tuve un problema de conexión. Escríbenos por WhatsApp y te ayudamos al instante 👉 https://wa.me/message/YQTLLAZYI6QVO1",
    });
  }
}
