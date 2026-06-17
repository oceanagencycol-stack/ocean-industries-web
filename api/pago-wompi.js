// /api/pago-wompi.js  — Vercel Serverless Function
// Genera la firma de integridad de Wompi SIN exponer llaves privadas en el frontend.
// La llave privada y el secreto de integridad viven en variables de entorno de Vercel.
//
// Wompi exige firmar: "<reference><amountInCents><currency><integritySecret>" con SHA-256.
// Docs: https://docs.wompi.co/docs/colombia/widget-checkout-web/

import crypto from "crypto";

export default async function handler(req, res) {
  // CORS básico (mismo dominio en producción)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { reference, amountInCents, currency = "COP" } = req.body || {};

    if (!reference || !amountInCents) {
      return res.status(400).json({ error: "Missing reference or amountInCents" });
    }

    // El secreto de INTEGRIDAD se configura en Vercel como variable de entorno.
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    if (!integritySecret) {
      return res.status(500).json({ error: "Integrity secret not configured" });
    }

    // Cadena a firmar, en orden exacto que exige Wompi
    const chain = `${reference}${amountInCents}${currency}${integritySecret}`;
    const signature = crypto.createHash("sha256").update(chain).digest("hex");

    return res.status(200).json({ signature, reference, amountInCents, currency });
  } catch (err) {
    return res.status(500).json({ error: "Internal error" });
  }
}
