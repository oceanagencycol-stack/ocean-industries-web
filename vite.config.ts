import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** Carpeta del proyecto (ESM: no hay __dirname). */
const ROOT = fileURLToPath(new URL('.', import.meta.url))

/** Dominio canónico (producción). Se puede forzar con SITE_URL. */
const SITE_URL = (process.env.SITE_URL || 'https://www.oceanindustries.com.co').replace(/\/$/, '')

/** Páginas: la web es una sola (index), la privacidad y la 404 que Vercel sirve en cualquier ruta que no existe. */
const PAGES = ['index', 'privacidad', '404'] as const

/** Páginas de desarrollo (noindex, fuera del sitemap): la intro v3 sola, sobre el espacio de M1a. */
const DEV_PAGES = ['dev-intro'] as const

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
 * Las placas de respaldo de cada tramo (tools/medios_pagina.py → public/v3/pagina/): vertical en pantallas altas,
 * 16:9 en las demás, AVIF con WebP de respaldo. La de la portada va sin `lazy` y con prioridad; las demás, perezosas.
 * Cuando el mundo (src/world/) monta, la página las esconde (html.has-world).
 */
function plate(name: string, first: boolean): string {
  const b = `/v3/pagina/${name}`
  const wide = (ext: string) => `${b}-960.${ext} 960w, ${b}-1600.${ext} 1600w, ${b}-2400.${ext} 2400w`
  const sizes = '(min-aspect-ratio: 16/9) 100vw, 179vh'
  const tall = '(max-aspect-ratio: 4/5)'
  const load = first ? 'fetchpriority="high"' : 'loading="lazy"'
  return (
    `<div class="plate plate--${name}" aria-hidden="true"><picture>` +
    `<source media="${tall}" type="image/avif" srcset="${b}-v.avif">` +
    `<source media="${tall}" type="image/webp" srcset="${b}-v.webp">` +
    `<source type="image/avif" srcset="${wide('avif')}" sizes="${sizes}">` +
    `<source type="image/webp" srcset="${wide('webp')}" sizes="${sizes}">` +
    `<img src="${b}-1600.webp" alt="" width="1600" height="893" decoding="async" ${load}>` +
    `</picture></div>`
  )
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
      input: Object.fromEntries([...PAGES, ...DEV_PAGES].map((p) => [p === 'index' ? 'main' : p, resolve(ROOT, `${p}.html`)])),
    },
  },
})
