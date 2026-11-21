import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** Carpeta del proyecto (ESM: no hay __dirname). */
const ROOT = fileURLToPath(new URL('.', import.meta.url))

/** Dominio canónico (producción). Se puede forzar con SITE_URL. */
const SITE_URL = (process.env.SITE_URL || 'https://www.oceanindustries.com.co').replace(/\/$/, '')

/** Páginas: la web es una sola (index), la privacidad y la 404 que Vercel sirve en cualquier ruta que no existe. */
const PAGES = [
  'index',
  'privacidad',
  '404',
  // las páginas de servicios y la de inglés (SEO): salen de tools/paginas-seo/build.mjs
  'servicios',
  'en',
  ...readdirSync(resolve(ROOT, 'servicios'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => `servicios/${f.slice(0, -5)}`),
]

/** Páginas de desarrollo (noindex, fuera del sitemap): la intro v3 sola, sobre el espacio de M1a. */
const DEV_PAGES = ['dev-intro', 'dev-world', 'dev-v6-roca'] as const

/** Identificador del build (va en un <meta>: sirve para saber qué versión está viendo alguien). */
const BUILD_ID = Date.now().toString(36)

/**
 * Botón de las escenas (src/ui/demos.ts): pausa, sigue o repite. El JS le pone la etiqueta y el estado; sin JS no se
 * muestra (la escena se queda en su cuadro final).
 */
const DEMO_TOGGLE =
  '<button class="demo__toggle" type="button" data-demo-toggle data-state="paused" aria-label="Reproducir el ejemplo">' +
  '<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="4" y="3" width="2.4" height="10" rx=".6" fill="currentColor"/><rect x="9.6" y="3" width="2.4" height="10" rx=".6" fill="currentColor"/></svg>' +
  '<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 3.2v9.6a.6.6 0 0 0 .92.5l7.3-4.8a.6.6 0 0 0 0-1L5.92 2.7a.6.6 0 0 0-.92.5Z" fill="currentColor"/></svg>' +
  '<svg class="i-replay" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.3 8.2A4.8 4.8 0 1 0 4.8 4.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M3.1 2.6v3.2h3.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
  '</button>'

/**
 * La marca v3 sale de marca/v3/ tal cual (no se redibuja ni se copia): el logotipo con ® (pie), sin ® (barra) y el
 * símbolo simétrico. En línea, decorativa (el enlace que la lleva tiene el nombre accesible) y con la clase pedida.
 */
const BRAND = { LOGO: 'logo-sin-r.svg', LOGO_R: 'logo.svg', SIMBOLO: 'simbolo-simetrico.svg' } as const
function brandInline(file: string, cls: string): string {
  const svg = readFileSync(resolve(ROOT, 'marca/v3', file), 'utf8').trim()
  return svg
    .replace(/<title>[^<]*<\/title>/, '')
    .replace('<svg xmlns="http://www.w3.org/2000/svg"', `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" aria-hidden="true" focusable="false"`)
    .replace(/\n\s*/g, '')
}

/**
 * El isotipo en sus dos mitades, tal cual el maestro simétrico: cada mitad es uno de sus dos subtrazados (la otra
 * girada 180°). `--o` es el centro de giro medido desde el viewBox, para animar las mitades sin redibujarlas.
 * `extra` va detrás de las mitades (la estrella de luz de la apertura).
 */
function symbolParts(cls: string, extra: (cx: number, cy: number) => string = () => ''): string {
  const svg = readFileSync(resolve(ROOT, 'marca/v3', BRAND.SIMBOLO), 'utf8')
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]
  const d = svg.match(/ d="([^"]+)"/)?.[1]
  const halves = d?.match(/M[^M]+/g)
  if (!viewBox || !d || halves?.length !== 2) throw new Error('[ocean-brand] el isotipo debe tener dos mitades')
  const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const [x0, y0] = viewBox.split(/\s+/).map(Number)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${cls}" aria-hidden="true" focusable="false" ` +
    `style="--o:${(cx - x0).toFixed(2)}px ${(cy - y0).toFixed(2)}px">` + extra(cx, cy) +
    halves.map((h, i) => `<path class="${cls}__half ${cls}__half--${i ? 'b' : 'a'}" fill="currentColor" d="${h.trim()}"/>`).join('') +
    '</svg>'
}

/**
 * La estrella de luz que abre la marca: un destello de cuatro puntas finas en el centro del isotipo. Al cerrarse las
 * mitades se recoge a 0,55 y cabe en su hueco (medido desde el centro: ±215 de ancho, ±146 de alto).
 */
function openingStar(cx: number, cy: number): string {
  const R = 250, V = 186, k = 0.9
  const q = (ax: number, ay: number, bx: number, by: number) =>
    `Q${(cx + (ax + bx) * (1 - k) * 0.5).toFixed(1)} ${(cy + (ay + by) * (1 - k) * 0.5).toFixed(1)} ${(cx + bx).toFixed(1)} ${(cy + by).toFixed(1)}`
  const star = `M${cx + R} ${cy}` + q(R, 0, 0, -V) + q(0, -V, -R, 0) + q(-R, 0, 0, V) + q(0, V, R, 0) + 'Z'
  return '<defs><radialGradient id="pre-glow"><stop offset="0" stop-color="#fff" stop-opacity=".85"/>' +
    '<stop offset=".35" stop-color="#E0E7ED" stop-opacity=".28"/><stop offset="1" stop-color="#E0E7ED" stop-opacity="0"/></radialGradient></defs>' +
    `<circle class="pre__glow" cx="${cx}" cy="${cy}" r="230" fill="url(#pre-glow)"/>` +
    `<path class="pre__star" fill="#fff" d="${star}"/>`
}

/**
 * La marca con material: metal claro de arriba a abajo (nieve → niebla, la gama de la casa) y una franja de luz que la
 * cruza, recortada por la propia silueta (máscara). Mismo maestro, mismos trazos; ids únicos por clase.
 */
function steel(file: string, cls: string): string {
  const src = readFileSync(resolve(ROOT, 'marca/v3', file), 'utf8').trim()
  const viewBox = src.match(/viewBox="([^"]+)"/)?.[1]
  if (!viewBox) throw new Error(`[ocean-brand] ${file} sin viewBox`)
  const [x, y, w, h] = viewBox.split(/\s+/).map(Number)
  const inner = src.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<title>[^<]*<\/title>/, '').replace(/\n\s*/g, '')
  if (!inner.includes('currentColor')) throw new Error(`[ocean-brand] ${file} sin currentColor`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${cls} steel" aria-hidden="true" focusable="false">` +
    '<defs>' +
    `<linearGradient id="${cls}-steel" gradientUnits="userSpaceOnUse" x1="0" y1="${y}" x2="0" y2="${y + h}">` +
    '<stop offset="0" stop-color="#FFFFFF"/><stop offset=".44" stop-color="#E0E7ED"/><stop offset=".56" stop-color="#B2C0CC"/>' +
    '<stop offset="1" stop-color="#D7DEE5"/></linearGradient>' +
    `<linearGradient id="${cls}-band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/>` +
    '<stop offset=".5" stop-color="#fff" stop-opacity=".92"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    `<mask id="${cls}-ink" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}">${inner.replaceAll('currentColor', 'white')}</mask>` +
    '</defs>' +
    inner.replaceAll('currentColor', `url(#${cls}-steel)`) +
    `<g mask="url(#${cls}-ink)"><g class="steel__sheen"><rect x="${(x - w * 0.34).toFixed(2)}" y="${y - h}" width="${(w * 0.2).toFixed(2)}" ` +
    `height="${h * 3}" fill="url(#${cls}-band)" transform="rotate(18 ${(x - w * 0.24).toFixed(2)} ${(y + h / 2).toFixed(2)})"/></g></g>` +
    '</svg>'
}

/** Los siete ejes del maestro revelan la tinta del logo sin modificar su silueta. */
function signatureLogo(): string {
  const source = readFileSync(resolve(ROOT, 'marca/v3/logo-trazos.svg'), 'utf8')
  const strokes = source.match(/<(?:circle|path) data-l="[^"]+"[^>]*\/>/g)
  if (strokes?.length !== 7) throw new Error('[ocean-brand] Se esperaban siete ejes en logo-trazos.svg')
  const axes = strokes.map(stroke => stroke.replace(' data-l=', ' pathLength="1" data-l=')).join('')
  const mask = '<mask id="pre-ink" maskUnits="userSpaceOnUse" x="-30" y="-40" width="700" height="200">' +
    '<use href="#pre-master" color="white" /></mask>'
  const pen = '<g class="pre__pen" fill="none" stroke="currentColor" stroke-width="46" ' +
    'stroke-linecap="round" stroke-linejoin="round" mask="url(#pre-ink)">' + axes + '</g>'
  return brandInline(BRAND.LOGO, 'pre__logo')
    .replace('>', '><defs><g id="pre-master">')
    .replace('</svg>', '</g>' + mask + '</defs>' + pen + '<use class="pre__solid" href="#pre-master" /></svg>')
}

/** Fallback frames and the first paint use the same grade and crop as the movie. */
const shotNames = ['m1a', 'm1sb', 'm2b', 'm3b', 'm4v2a', 'm5a', 'm6a']
function plate(name: string, first: boolean): string {
  const base = '/v3/film/cuadro-' + shotNames.indexOf(name)
  const priority = first ? 'fetchpriority="high"' : 'loading="lazy"'
  return `<div class="plate plate--${name}" aria-hidden="true"><div class="plate__frame"><picture>` +
    `<source media="(max-aspect-ratio: 4/5)" srcset="${base}-v.webp">` +
    `<img src="${base}.webp" alt="" width="1440" height="810" decoding="async" ${priority}>` +
    '</picture></div></div>'
}

/**
 * dev-intro.html: el logotipo de la barra sale de marca/v3/logo-sin-r.svg tal cual (en el HTML desde el primer cuadro,
 * para que con movimiento reducido ya esté en su lugar). Solo toca esa página.
 */
function devIntroPage(): Plugin {
  return {
    name: 'ocean-dev-intro',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!/dev-intro\.html$/.test(ctx.filename)) return html
        const svg = readFileSync(resolve(ROOT, 'marca/v3/logo-sin-r.svg'), 'utf8')
          .trim()
          .replace(/<title>[^<]*<\/title>/, '')
          .replace('<svg ', '<svg aria-hidden="true" focusable="false" ')
        // la página no usa la fuente de la v2: sin su precarga (Chrome avisaría que no se usó)
        return html.replace('<!--LOGO_V3_SIN_R-->', svg).replace(/\s*<link rel="preload"[^>]*as="font"[^>]*>/g, '')
      },
    },
  }
}

/** Marcadores del HTML: la marca, las placas y los botones de las escenas salen de una sola fuente. */
function oceanBrand(): Plugin {
  return {
    name: 'ocean-brand',
    transformIndexHtml(html) {
      return html
        .replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    <meta name="ocean-build" content="${BUILD_ID}" />`)
        .replaceAll('__SITE_URL__', SITE_URL)
        .replace('<!--LOGO:pre__logo-->', signatureLogo)
        .replace('<!--SIMBOLO_APERTURA:pre__mark-->', () => symbolParts('pre__mark', openingStar))
        .replace(/<!--SIMBOLO_PARTES:([\w-]+)-->/g, (_m, cls: string) => symbolParts(cls))
        .replace(/<!--(LOGO_R|SIMBOLO)_METAL:([\w-]+)-->/g, (_m, k: 'LOGO_R' | 'SIMBOLO', cls: string) => steel(BRAND[k], cls))
        .replace(/<!--(LOGO_R|LOGO|SIMBOLO):([\w-]+)-->/g, (_m, k: keyof typeof BRAND, cls: string) => brandInline(BRAND[k], cls))
        .replace(/<!--PLACA:([\w]+)(:first)?-->/g, (_m, name: string, first?: string) => plate(name, !!first))
        .replaceAll('<!--DEMO_TOGGLE-->', DEMO_TOGGLE)
    },
  }
}

/** Precarga la fuente de la primera pantalla (Geist variable, latín): sin esto el titular se dibuja con otra y salta. */
function preloadFonts(): Plugin {
  const wanted = [/geist-latin-wght-normal-[\w-]+\.woff2$/]
  return {
    name: 'ocean-preload-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        const files = Object.keys(ctx.bundle).filter((f) => wanted.some((re) => re.test(f)))
        const links = files.map((f) => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin>`).join('\n    ')
        return links ? html.replace('</title>', `</title>\n    ${links}`) : html
      },
    },
  }
}

/** El CSS va dentro del HTML: la página pinta con el HTML, sin esperar otra hoja. */
function inlineCSS(): Plugin {
  return {
    name: 'ocean-inline-css',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        return html.replace(/<link rel="stylesheet"[^>]*href="\/(assets\/[\w-]+\.css)"[^>]*>/g, (tag, file: string) => {
          const asset = bundle[file]
          if (!asset || asset.type !== 'asset' || typeof asset.source !== 'string') return tag
          return `<style>${asset.source.trim()}</style>`
        })
      },
    },
  }
}

/**
 * El script de arranque (<script data-ocean-boot>) decide antes de pintar si toca la intro. La CSP no admite scripts
 * en línea salvo por su hash: este paso lo calcula en cada build y falla si vercel.json no lo tiene.
 */
function bootScriptCSP(): Plugin {
  return {
    name: 'ocean-boot-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        const m = html.match(/<script data-ocean-boot>([\s\S]*?)<\/script>/)
        if (!m) return html
        const hash = `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`
        const vercel = readFileSync(resolve(ROOT, 'vercel.json'), 'utf8')
        const csp = vercel.match(/"Content-Security-Policy",\s*"value":\s*"([^"]+)"/)?.[1] ?? ''
        const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? ''
        if (!scriptSrc.includes(hash)) {
          throw new Error(`[ocean-boot-csp] el script de arranque de index.html cambió: pon ${hash} en script-src de vercel.json`)
        }
        return html
      },
    },
  }
}

/**
 * Solo en `vite` (desarrollo y QA): las funciones de api/ simuladas, para probar la interfaz sin tocar los servicios
 * reales (el agente de n8n, la firma de Wompi). Nunca llega al build: Vercel sirve las funciones de verdad.
 */
function devApiMocks(): Plugin {
  type Mw = { use: (path: string, fn: (req: NodeJS.ReadableStream, res: { setHeader: (k: string, v: string) => void; end: (b: string) => void }) => void) => void }
  const mount = (m: Mw) => {
      m.use('/api/agente', (req, res) => {
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
          const msg = (() => {
            try {
              return String(JSON.parse(body).message || '')
            } catch {
              return ''
            }
          })()
          res.setHeader('Content-Type', 'application/json')
          setTimeout(() => res.end(JSON.stringify({ reply: `(simulado) Recibí: «${msg.slice(0, 80)}». Te escribimos por WhatsApp: https://wa.me/573138721665` })), 700)
        })
      })
      m.use('/api/pago-wompi', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ signature: 'firma-simulada-solo-en-desarrollo' }))
      })
      m.use('/api/reels', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ source: 'fallback', reels: [] }))
      })
  }
  return {
    name: 'ocean-dev-api',
    configureServer(server) {
      mount(server.middlewares as unknown as Mw)
    },
    configurePreviewServer(server) {
      mount(server.middlewares as unknown as Mw)
    },
  }
}

export default defineConfig({
  plugins: [devApiMocks(), oceanBrand(), preloadFonts(), inlineCSS(), bootScriptCSP(), devIntroPage()],
  server: { port: 5175 },
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      // Páginas de desarrollo (noindex) solo en las vistas previas; nunca en producción
      input: Object.fromEntries(
        [...PAGES, ...(process.env.VERCEL_ENV === 'production' ? [] : DEV_PAGES)].map((p) => [p === 'index' ? 'main' : p.replace('/', '-'), resolve(ROOT, `${p}.html`)]),
      ),
    },
  },
})
