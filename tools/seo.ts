/**
 * SEO por idioma (20-nov-2026): la web es una sola página trilingüe, pero cada idioma tiene su URL indexable.
 *
 *  - `/` (español, x-default), `/en` y `/pt`: el build escribe `dist/en/index.html` y `dist/pt/index.html` desde el
 *    mismo `dist/index.html`, con el texto de `data-en` / `data-pt` (y `data-*-aria`, `data-*-ph`) ya puesto en el HTML,
 *    `<html lang>`, título, description, Open Graph, canonical, hreflang recíproco y JSON-LD de su idioma.
 *  - Las URL van sin barra final: Vercel (`trailingSlash: false`) manda `/en/` → `/en` con un 308 y sirve
 *    `en/index.html` en `/en`.
 *  - El HTML de origen lleva `<!--SEO_HEAD-->` y `<!--SEO_JSONLD-->`; el título es `<title data-es data-en data-pt>`
 *    (src/ui/i18n.ts lo cambia como cualquier otro texto).
 *
 * Posicionamiento (decisión de Juan Diego, 20-nov): estudio de software e ingeniería con IA. Nada de cifras, clientes ni
 * promesas que no estén en la página (48 h, 24/7, 11 s y los tres casos).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

export type Lang = 'es' | 'en' | 'pt'
export const LANGS: readonly Lang[] = ['es', 'en', 'pt']

/** La ruta de cada idioma (sin barra final, como la sirve Vercel). */
export const LANG_PATH: Record<Lang, string> = { es: '/', en: '/en', pt: '/pt' }

type Words = Record<Lang, string>

const META = {
  title: {
    es: 'OCEAN — Software e ingeniería con IA · Cali, Bogotá y Miami',
    en: 'OCEAN — AI software & engineering studio · Miami, Dallas, Bogotá',
    pt: 'OCEAN — Software e engenharia com IA · Miami, Dallas, Bogotá',
  },
  description: {
    es: 'OCEAN es un estudio de software e ingeniería con IA: software a la medida, agentes de IA para WhatsApp, llamadas y web, automatización de procesos y webs rápidas. Prototipo en 48 horas.',
    en: 'OCEAN is an AI software and engineering studio: custom software, AI agents for WhatsApp, phone and web, process automation and high-performance websites. A prototype in 48 hours.',
    pt: 'A OCEAN é um estúdio de software e engenharia com IA: software sob medida, agentes de IA para WhatsApp, telefone e web, automação de processos e sites rápidos. Protótipo em 48 horas.',
  },
  ogTitle: {
    es: 'OCEAN — Software e ingeniería con IA',
    en: 'OCEAN — AI software & engineering studio',
    pt: 'OCEAN — Software e engenharia com IA',
  },
  ogDescription: {
    es: 'Software a la medida, agentes de IA para WhatsApp, llamadas y web, automatización y webs de alto rendimiento. De lo más profundo a lo más alto.',
    en: 'Custom software, AI agents for WhatsApp, phone and web, automation and high-performance websites. From the deepest to the highest.',
    pt: 'Software sob medida, agentes de IA para WhatsApp, telefone e web, automação e sites de alto desempenho. Do mais profundo ao mais alto.',
  },
  ogAlt: {
    es: 'El logotipo OCEAN sobre el borde de la Tierra, de noche',
    en: 'The OCEAN logo over the edge of the Earth, at night',
    pt: 'O logotipo OCEAN sobre a borda da Terra, à noite',
  },
  slogan: {
    es: 'De lo más profundo a lo más alto',
    en: 'From the deepest to the highest',
    pt: 'Do mais profundo ao mais alto',
  },
  catalog: { es: 'Servicios', en: 'Services', pt: 'Serviços' },
} satisfies Record<string, Words>

const LOCALE: Record<Lang, string> = { es: 'es_CO', en: 'en_US', pt: 'pt_BR' }

/** Lo que hace OCEAN, en este orden: software, agentes, automatización, webs; contenido y pauta al final. */
const SERVICES: { id: string; name: Words; description: Words }[] = [
  {
    id: 'software',
    name: { es: 'Software a la medida con IA', en: 'Custom AI software', pt: 'Software sob medida com IA' },
    description: {
      es: 'Paneles y software a la medida con IA, conectados a tu base de datos, tu CRM y tus hojas de cálculo.',
      en: 'Custom dashboards and software with AI, connected to your database, your CRM and your spreadsheets.',
      pt: 'Painéis e software sob medida com IA, conectados ao seu banco de dados, ao seu CRM e às suas planilhas.',
    },
  },
  {
    id: 'omnicanal',
    name: { es: 'Agentes de IA para WhatsApp, llamadas y web', en: 'AI agents for WhatsApp, phone and web', pt: 'Agentes de IA para WhatsApp, telefone e web' },
    description: {
      es: 'Agentes de IA sobre tu número actual que responden en segundos, de día y de madrugada, agendan en tu calendario y pasan a una persona cuando hace falta.',
      en: 'AI agents on your current number that reply in seconds, day and night, book into your calendar and hand off to a person when needed.',
      pt: 'Agentes de IA no seu número atual que respondem em segundos, de dia e de madrugada, agendam no seu calendário e passam para uma pessoa quando preciso.',
    },
  },
  {
    id: 'automatizacion',
    name: { es: 'Automatización de procesos', en: 'Process automation', pt: 'Automação de processos' },
    description: {
      es: 'CRM, pagos, WhatsApp, calendario e IA conectados en un solo sistema que trabaja solo.',
      en: 'CRM, payments, WhatsApp, calendar and AI connected into one system that runs itself.',
      pt: 'CRM, pagamentos, WhatsApp, calendário e IA conectados em um só sistema que trabalha sozinho.',
    },
  },
  {
    id: 'web',
    name: { es: 'Webs y tiendas de alto rendimiento', en: 'High-performance websites and stores', pt: 'Sites e lojas de alto desempenho' },
    description: {
      es: 'Webs y tiendas que cargan al instante en el celular, con catálogo, pagos y SEO. Prototipo navegable en 48 horas.',
      en: 'Sites and stores that load instantly on a phone, with catalog, payments and SEO. A clickable prototype in 48 hours.',
      pt: 'Sites e lojas que carregam na hora no celular, com catálogo, pagamentos e SEO. Protótipo navegável em 48 horas.',
    },
  },
  {
    id: 'ugc',
    name: { es: 'Contenido para redes (UGC)', en: 'Social content (UGC)', pt: 'Conteúdo para redes (UGC)' },
    description: {
      es: 'Contenido vertical para TikTok, Reels y Facebook que lleva la conversación a WhatsApp.',
      en: 'Vertical content for TikTok, Reels and Facebook that brings the conversation to WhatsApp.',
      pt: 'Conteúdo vertical para TikTok, Reels e Facebook que leva a conversa para o WhatsApp.',
    },
  },
  {
    id: 'performance',
    name: { es: 'Pauta en Meta', en: 'Meta ads', pt: 'Anúncios no Meta' },
    description: {
      es: 'Campañas en Meta Ads pensadas para conversaciones en WhatsApp, no para clics.',
      en: 'Meta Ads campaigns built for WhatsApp conversations, not clicks.',
      pt: 'Campanhas no Meta Ads pensadas para conversas no WhatsApp, não para cliques.',
    },
  },
]

const US: Words = { es: 'Estados Unidos', en: 'United States', pt: 'Estados Unidos' }
const city = (name: string, region: string, country: string) => ({
  '@type': 'City',
  name,
  containedInPlace: { '@type': 'AdministrativeArea', name: region, containedInPlace: { '@type': 'Country', name: country } },
})

const SAME_AS = ['https://www.instagram.com/oceanind.co/', 'https://www.tiktok.com/@oceanind.co']

export function pageUrl(site: string, l: Lang): string {
  return l === 'es' ? `${site}/` : `${site}${LANG_PATH[l]}`
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** `<title>` con sus tres idiomas (src/ui/i18n.ts lo cambia como cualquier `[data-es]`). */
export function seoTitle(l: Lang): string {
  const t = META.title
  return `<title data-es="${attr(t.es)}" data-en="${attr(t.en)}" data-pt="${attr(t.pt)}">${attr(t[l])}</title>`
}

/** description, canonical, hreflang recíproco (es/en/pt/x-default), Open Graph y Twitter de un idioma. */
export function seoHead(site: string, l: Lang): string {
  const url = pageUrl(site, l)
  const alt = LANGS.map((x) => `<link rel="alternate" hreflang="${x}" href="${pageUrl(site, x)}" />`)
  const locales = LANGS.filter((x) => x !== l).map((x) => `<meta property="og:locale:alternate" content="${LOCALE[x]}" />`)
  return [
    `<meta name="description" content="${attr(META.description[l])}" />`,
    `<link rel="canonical" href="${url}" />`,
    ...alt,
    `<link rel="alternate" hreflang="x-default" href="${pageUrl(site, 'es')}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="OCEAN" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${attr(META.ogTitle[l])}" />`,
    `<meta property="og:description" content="${attr(META.ogDescription[l])}" />`,
    `<meta property="og:image" content="${site}/og.jpg" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${attr(META.ogAlt[l])}" />`,
    `<meta property="og:locale" content="${LOCALE[l]}" />`,
    ...locales,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${attr(META.ogTitle[l])}" />`,
    `<meta name="twitter:description" content="${attr(META.ogDescription[l])}" />`,
    `<meta name="twitter:image" content="${site}/og.jpg" />`,
  ].join('\n    ')
}

/** El JSON-LD de un idioma: Organization, WebSite, WebPage y ProfessionalService con su catálogo. */
export function jsonLd(site: string, l: Lang): string {
  const url = pageUrl(site, l)
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${site}/#org`,
      name: 'OCEAN',
      legalName: 'Ocean Industries',
      url: `${site}/`,
      logo: `${site}/icon-512.png`,
      image: `${site}/og.jpg`,
      description: META.description[l],
      slogan: META.slogan[l],
      sameAs: SAME_AS,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: '+57 313 872 1665',
        url: 'https://wa.me/573138721665',
        availableLanguage: ['es', 'en', 'pt'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${site}/#web`,
      url: `${site}/`,
      name: 'OCEAN',
      publisher: { '@id': `${site}/#org` },
      inLanguage: ['es', 'en', 'pt'],
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#page`,
      url,
      name: META.title[l],
      description: META.description[l],
      inLanguage: l,
      isPartOf: { '@id': `${site}/#web` },
      about: { '@id': `${site}/#org` },
      primaryImageOfPage: `${site}/og.jpg`,
    },
    {
      '@type': 'ProfessionalService',
      '@id': `${site}/#service`,
      name: 'OCEAN',
      description: META.description[l],
      url,
      image: `${site}/og.jpg`,
      logo: `${site}/icon-512.png`,
      telephone: '+57 313 872 1665',
      parentOrganization: { '@id': `${site}/#org` },
      areaServed: [
        city('Miami', 'Florida', US[l]),
        city('Fort Lauderdale', 'Florida', US[l]),
        city('Dallas', 'Texas', US[l]),
        city('Cali', 'Valle del Cauca', 'Colombia'),
        city('Bogotá', 'Bogotá D.C.', 'Colombia'),
        { '@type': 'Country', name: 'Colombia' },
        { '@type': 'Country', name: US[l] },
      ],
      knowsLanguage: ['es', 'en', 'pt'],
      priceRange: '$$',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: META.catalog[l],
        itemListElement: SERVICES.map((s) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: s.name[l], description: s.description[l], url: `${url}#${s.id}` },
        })),
      },
    },
  ]
  // `</` nunca dentro de un <script>
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/<\//g, '<\\/')
  return `<script type="application/ld+json">${json}</script>`
}

/** Valor crudo de un atributo dentro de una etiqueta de apertura. */
function getAttr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`))
  return m ? m[1] : null
}
function setAttr(tag: string, name: string, value: string): string {
  const re = new RegExp(`(\\s${name}=")[^"]*(")`)
  if (re.test(tag)) return tag.replace(re, (_m, a: string, b: string) => a + value + b)
  return tag.replace(/\s*(\/?)>$/, (_m, slash: string) => ` ${name}="${value}"${slash ? ' /' : ''}>`)
}

/**
 * El HTML servido en español → el mismo HTML en `l`: textos (`data-l`), nombres accesibles (`data-l-aria`),
 * placeholders (`data-l-ph`), `<html lang>` y el botón de idioma marcado. Igual que setLang() en src/ui/i18n.ts, pero
 * en el build. Falla si algún `[data-es]` tiene etiquetas dentro (setLang las borraría: el texto debe ser plano).
 */
export function translateHtml(html: string, l: Lang): string {
  if (l === 'es') return html
  let texts = 0
  let out = html.replace(/<([a-z][a-z0-9]*)\b([^>]*\sdata-es="[^"]*"[^>]*)>([^<]*)<\/\1>/g, (m, tag: string, attrs: string) => {
    texts++
    const v = getAttr(attrs, `data-${l}`)
    return v === null ? m : `<${tag}${attrs}>${v.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${tag}>`
  })
  const marked = (html.match(/<[a-z][a-z0-9]*\b[^>]*\sdata-es="/g) ?? []).length
  if (texts !== marked) throw new Error(`[ocean-seo] ${marked - texts} elementos [data-es] tienen etiquetas dentro; el texto traducible debe ser plano`)
  out = out.replace(/<[a-z][a-z0-9]*\b[^>]*\sdata-es-(?:aria|ph)="[^"]*"[^>]*>/g, (tag) => {
    const aria = getAttr(tag, `data-${l}-aria`)
    if (aria !== null && getAttr(tag, 'data-es-aria') !== null) tag = setAttr(tag, 'aria-label', aria)
    const ph = getAttr(tag, `data-${l}-ph`)
    if (ph !== null && getAttr(tag, 'data-es-ph') !== null) tag = setAttr(tag, 'placeholder', ph)
    return tag
  })
  out = out.replace(/(<button\b[^>]*\sdata-lang="(es|en|pt)"[^>]*\saria-pressed=")(true|false)(")/g, (_m, a: string, b: string, _p: string, c: string) => a + String(b === l) + c)
  const lang = /<html lang="es"/
  if (!lang.test(out)) throw new Error('[ocean-seo] falta <html lang="es">')
  return out.replace(lang, `<html lang="${l}"`)
}

/**
 * El plugin: pone el head y el JSON-LD de español en index.html y, al escribir el build, genera `en/index.html` y
 * `pt/index.html` a partir del index.html final (con la marca, el CSS en línea y los assets con hash ya puestos).
 */
export function seoPages(site: string): Plugin {
  let outDir = 'dist'
  return {
    name: 'ocean-seo',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    transformIndexHtml(html, ctx) {
      if (!/(^|[\\/])index\.html$/.test(ctx.filename)) return html
      for (const k of ['<!--SEO_TITLE-->', '<!--SEO_HEAD-->', '<!--SEO_JSONLD-->']) {
        if (!html.includes(k)) throw new Error(`[ocean-seo] index.html sin ${k}`)
      }
      // funciones como reemplazo: un `$$` (priceRange) no debe leerse como patrón de String.replace
      return html
        .replace('<!--SEO_TITLE-->', () => seoTitle('es'))
        .replace('<!--SEO_HEAD-->', () => seoHead(site, 'es'))
        .replace('<!--SEO_JSONLD-->', () => jsonLd(site, 'es'))
    },
    // `vite preview` como Vercel: `/en` y `/pt` sirven su `index.html` (si no, caería en el index en español)
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const m = req.url?.match(/^\/(en|pt)\/?(\?.*)?$/)
        if (m) req.url = `/${m[1]}/index.html${m[2] ?? ''}`
        next()
      })
    },
    writeBundle(_opts, bundle) {
      const asset = bundle['index.html']
      if (!asset || asset.type !== 'asset') throw new Error('[ocean-seo] el build no trae index.html')
      const es = String(asset.source)
      for (const l of LANGS) {
        if (l === 'es') continue
        let html = es
        for (const [from, to] of [
          [seoHead(site, 'es'), seoHead(site, l)],
          [jsonLd(site, 'es'), jsonLd(site, l)],
        ]) {
          if (!html.includes(from)) throw new Error('[ocean-seo] el head de index.html cambió después de ocean-seo')
          html = html.replace(from, () => to)
        }
        html = translateHtml(html, l)
        mkdirSync(resolve(outDir, l), { recursive: true })
        writeFileSync(resolve(outDir, l, 'index.html'), html)
      }
    },
  }
}
