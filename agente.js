// /api/agente.js — Vercel Serverless Function
// Proxy seguro entre el chat de la web y tu workflow de n8n.
// El frontend llama a /api/agente; esta función reenvía el mensaje al webhook de n8n.
// La URL del webhook (y cualquier credencial) vive en variables de entorno, nunca en el frontend.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, sessionId, lang } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing message" });

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

    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId, lang }),
    });

    const data = await r.json().catch(() => ({}));
    // n8n debe responder { reply: "..." }
    return res.status(200).json({ reply: data.reply || data.output || "…" });
  } catch (err) {
    return res.status(200).json({
      reply: "WhatsApp: https://wa.me/message/YQTLLAZYI6QVO1",
    });
  }
}
