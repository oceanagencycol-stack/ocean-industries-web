// /api/pago-wompi.js  — Vercel Serverless Function
// Genera la firma de integridad de Wompi SIN exponer llaves privadas en el frontend.
// La llave privada y el secreto de integridad viven en variables de entorno de Vercel.
//
// Modelo de esta web: pago de monto ABIERTO — el cliente escribe cuánto paga por el
// servicio acordado (no hay planes de precio fijo). Por eso el monto es legítimamente
// variable; lo que el endpoint SÍ garantiza es que el monto y la referencia sean válidos
// y estén dentro de rangos sanos antes de firmar (evita firmar montos negativos, cero,
// absurdos o referencias con formato hostil).
//
// Wompi exige firmar: "<reference><amountInCents><currency><integritySecret>" con SHA-256.
// Docs: https://docs.wompi.co/docs/colombia/widget-checkout-web/

import crypto from "crypto";

// Rango sano para el monto en centavos de COP.
// Piso: 1.500 COP = 150.000 centavos (coincide con el mínimo del frontend).
// Techo: 50.000.000 COP = 5.000.000.000 centavos (tope defensivo anti-abuso;
//        un pago legítimo mayor se coordina directo, no por el widget abierto).
const MIN_CENTS = 150000;
const MAX_CENTS = 5000000000;
const ALLOWED_CURRENCIES = ["COP"];
// Referencia: letras, números y guion; longitud acotada. Cubre "OCEAN-<timestamp>".
const REFERENCE_RE = /^[A-Za-z0-9-]{6,64}$/;

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

  // El body puede lanzar al ACCEDERLO si el JSON llega malformado con Content-Type
  // application/json (getter de Vercel) — se envuelve el acceso mismo, no solo el parse.
  let body;
  try {
    body = req.body || {};
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { reference, amountInCents, currency = "COP" } = body;

  // Validación de moneda
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    return res.status(400).json({ error: "Unsupported currency" });
  }

  // Validación de referencia: presente, string, formato limpio, longitud acotada
  if (typeof reference !== "string" || !REFERENCE_RE.test(reference)) {
    return res.status(400).json({ error: "Invalid reference" });
  }

  // Validación de monto: entero estricto, positivo, dentro de rango sano.
  // (Number.isInteger rechaza floats, strings, NaN, Infinity y notación exótica.)
  if (!Number.isInteger(amountInCents) || amountInCents < MIN_CENTS || amountInCents > MAX_CENTS) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  // El secreto de INTEGRIDAD se configura en Vercel como variable de entorno.
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!integritySecret) {
    return res.status(503).json({ error: "Payment signing not configured" });
  }

  try {
    // Cadena a firmar, en orden exacto que exige Wompi
    const chain = `${reference}${amountInCents}${currency}${integritySecret}`;
    const signature = crypto.createHash("sha256").update(chain).digest("hex");
    return res.status(200).json({ signature, reference, amountInCents, currency });
  } catch (err) {
    return res.status(500).json({ error: "Internal error" });
  }
}
