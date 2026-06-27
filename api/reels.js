// /api/reels.js — Vercel Serverless Function
// Devuelve los ÚLTIMOS 3 reels publicados por @oceanind.co en Instagram, auto-actualizándose.
//
// CÓMO FUNCIONA (vía oficial y soportada en 2026):
//   La API "Basic Display" murió en dic 2024. La única vía oficial es la Instagram Graph API,
//   que requiere que la cuenta sea de tipo Empresa/Creador (la de Ocean lo es) y un token de
//   acceso de larga duración. Esta función consulta GET /{IG_USER_ID}/media, filtra los reels
//   más recientes (media_type VIDEO) y los devuelve ya listos para el frontend.
//
//   • El token va SOLO en variables de entorno de Vercel (IG_ACCESS_TOKEN), nunca en el frontend.
//   • Se cachea 1h (in-memory + cabecera CDN s-maxage) para no gastar el rate limit (200 req/h).
//   • Si el token aún no está configurado, NO se rompe: cae a un fallback con los videos
//     actuales de Cloudinary, enlazando al perfil. Así la web funciona desde el primer deploy
//     y cuando agregues el token empieza a tirar los reels reales sola.
//
// ── CÓMO OBTENER EL TOKEN (una sola vez) ──────────────────────────────────────
//   1. developers.facebook.com → crea una App de tipo "Business".
//   2. Agrega el producto "Instagram Graph API". Vincula la cuenta @oceanind.co
//      (debe ser Business/Creator y estar ligada a una página de Facebook).
//   3. En el Graph API Explorer, genera un token con permisos:
//      instagram_basic, pages_show_list, business_management.
//   4. Conviértelo en token de LARGA duración (dura ~60 días, se puede refrescar):
//        GET https://graph.facebook.com/v22.0/oauth/access_token
//            ?grant_type=fb_exchange_token&client_id=APP_ID
//            &client_secret=APP_SECRET&fb_exchange_token=TOKEN_CORTO
//   5. Obtén el IG_USER_ID:
//        GET https://graph.facebook.com/v22.0/me/accounts?access_token=TOKEN
//        → toma el page id, luego:
//        GET https://graph.facebook.com/v22.0/{PAGE_ID}?fields=instagram_business_account&access_token=TOKEN
//   6. En Vercel → Settings → Environment Variables, agrega:
//        IG_ACCESS_TOKEN = el token largo
//        IG_USER_ID      = el id de la cuenta de Instagram business
//      (opcional) IG_APP_ID + IG_APP_SECRET para auto-refrescar el token.
//   7. Redeploy. Listo: la sección mostrará tus 3 reels más recientes y se actualizará sola.
// ──────────────────────────────────────────────────────────────────────────────

const GRAPH = "https://graph.facebook.com/v22.0";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

// Fallback: videos actuales en Cloudinary (se usan si todavía no hay token de IG).
const PROFILE_URL = "https://www.instagram.com/oceanind.co/";
const FALLBACK_REELS = [
  {
    id: "fallback-1",
    permalink: PROFILE_URL,
    media_url:
      "https://res.cloudinary.com/dpo9ohngt/video/upload/v1781713985/02_-_Asi%CC%81_nace_una_estrategia_yilqmg.mp4",
    thumbnail_url:
      "https://res.cloudinary.com/dpo9ohngt/video/upload/so_0/v1781713985/02_-_Asi%CC%81_nace_una_estrategia_yilqmg.jpg",
    caption: "Así nace una estrategia",
  },
  {
    id: "fallback-2",
    permalink: PROFILE_URL,
    media_url:
      "https://res.cloudinary.com/dpo9ohngt/video/upload/v1781713984/SaveClip.App_AQN7gUygth0so2QCS0bRsasfFmlcf4OdG9HYq2orPgy8HwMGFJpgISbqf-3qdqC-Vcb51RvmDbK1PgFiylyKIhSyOqNxqW1YFYH21Ao_ahfqb2.mp4",
    thumbnail_url:
      "https://res.cloudinary.com/dpo9ohngt/video/upload/so_0/v1781713984/SaveClip.App_AQN7gUygth0so2QCS0bRsasfFmlcf4OdG9HYq2orPgy8HwMGFJpgISbqf-3qdqC-Vcb51RvmDbK1PgFiylyKIhSyOqNxqW1YFYH21Ao_ahfqb2.jpg",
    caption: "Contenido que convierte",
  },
  {
    id: "fallback-3",
    permalink: PROFILE_URL,
    media_url:
      "https://res.cloudinary.com/dpo9ohngt/video/upload/v1781713984/SaveClip.App_AQNP9j0LNPCBJVZ-5MuFG7kTHLuMfhYji-x3bGQuBsFmgym_8cCJkslzqYgsh4GUfAteaM6aLzVKYhhPTsrXmfIq0JE8rjJzyraUFQs_nczmnq.mp4",
    thumbnail_url:
      "https://res.cloudinary.com/dpo9ohngt/video/upload/so_0/v1781713984/SaveClip.App_AQNP9j0LNPCBJVZ-5MuFG7kTHLuMfhYji-x3bGQuBsFmgym_8cCJkslzqYgsh4GUfAteaM6aLzVKYhhPTsrXmfIq0JE8rjJzyraUFQs_nczmnq.jpg",
    caption: "We turn brands into waves",
  },
];

// Cache en memoria (persiste mientras la función esté caliente).
let _cache = { ts: 0, data: null };

function fallback(res, reason) {
  return res.status(200).json({
    source: "fallback",
    reason: reason || "IG_ACCESS_TOKEN no configurado",
    profile: PROFILE_URL,
    reels: FALLBACK_REELS,
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // Cache en el CDN de Vercel: 1h fresco, 1 día sirviendo viejo mientras revalida.
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  if (req.method === "OPTIONS") return res.status(200).end();

  const TOKEN = process.env.IG_ACCESS_TOKEN;
  const IG_USER_ID = process.env.IG_USER_ID;

  // Sin credenciales todavía → fallback (la web sigue viva).
  if (!TOKEN || !IG_USER_ID) return fallback(res);

  // Cache caliente válido → respóndelo.
  if (_cache.data && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return res.status(200).json({ source: "cache", profile: PROFILE_URL, reels: _cache.data });
  }

  try {
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
    // Pedimos 12 y filtramos reels (a veces hay imágenes intercaladas).
    const url = `${GRAPH}/${IG_USER_ID}/media?fields=${fields}&limit=12&access_token=${encodeURIComponent(
      TOKEN
    )}`;

    const r = await fetch(url);
    const data = await r.json().catch(() => ({}));

    if (!r.ok || data.error || !Array.isArray(data.data)) {
      // Token vencido / error de Meta → no rompas la web, sirve fallback.
      return fallback(res, data?.error?.message || "Error consultando Graph API");
    }

    // Reels = VIDEO. (REELS a veces llega como "VIDEO" con product_type REELS).
    const reels = data.data
      .filter((m) => m.media_type === "VIDEO" && m.media_url)
      .slice(0, 3)
      .map((m) => ({
        id: m.id,
        permalink: m.permalink,
        media_url: m.media_url,
        thumbnail_url: m.thumbnail_url || null,
        caption: (m.caption || "").split("\n")[0].slice(0, 90),
        timestamp: m.timestamp,
      }));

    if (reels.length === 0) return fallback(res, "Sin reels recientes en la respuesta");

    _cache = { ts: Date.now(), data: reels };
    return res.status(200).json({ source: "instagram", profile: PROFILE_URL, reels });
  } catch (err) {
    return fallback(res, "Excepción: " + (err?.message || "desconocida"));
  }
}
