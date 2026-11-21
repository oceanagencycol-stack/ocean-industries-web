#!/usr/bin/env node
/**
 * Genera las páginas de servicios (servicios.html, servicios/*.html, en.html), public/sitemap.xml, public/robots.txt,
 * public/llms.txt y public/llms-full.txt desde contenido.mjs. Correr después de cambiar el contenido:
 *   node tools/paginas-seo/build.mjs
 * Las páginas generadas se suben al repo (Vite las toma como entradas; ver PAGES en vite.config.ts).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE, UPDATED, WA, US_TEL, US_TEL_TXT, CAL, ORG, STACK, PROCESO, CASOS, SERVICIOS, FAQ_GENERAL, EN } from './contenido.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const out = (rel, text) => {
  const p = resolve(ROOT, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, text)
  console.log('  ' + rel)
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const wa = (t) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`
const url = (path) => `__SITE_URL__${path}`
const absUrl = (path) => `${SITE}${path}`

const ICO_WA =
  '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35m-5.42 7.4A9.87 9.87 0 0 1 7.02 20.4l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88M20.46 3.49A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42"/></svg>'
const ICO_ARROW =
  '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h13M13 6.5 18.5 12 13 17.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const ORG_LD = {
  '@type': 'Organization',
  '@id': absUrl('/#org'),
  name: ORG.nombre,
  legalName: ORG.legal,
  url: absUrl('/'),
  logo: absUrl('/icon-512.png'),
  description: ORG.resumen,
  sameAs: ['https://www.instagram.com/oceanind.co/', 'https://share.google/Vqaeb84X8b2NTu0QD'],
  contactPoint: [
    { '@type': 'ContactPoint', contactType: 'sales', telephone: '+1-202-828-5095', areaServed: 'US', availableLanguage: ['en', 'es'] },
    { '@type': 'ContactPoint', contactType: 'sales', telephone: '+57-313-872-1665', areaServed: ['CO', 'US'], availableLanguage: ['es', 'en', 'pt'] },
  ],
}

function head({ lang, path, title, description, ld, alternates = [] }) {
  const locale = lang === 'en' ? 'en_US' : 'es_CO'
  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${url(path)}" />
${alternates.map(([hl, p]) => `    <link rel="alternate" hreflang="${hl}" href="${url(p)}" />`).join('\n')}
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="theme-color" content="#03060C" />
    <meta name="color-scheme" content="dark" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="OCEAN" />
    <meta property="og:url" content="${url(path)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${url('/og.jpg')}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="${locale}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${url('/og.jpg')}" />
    <style>
      html { background: #03060c; color: #e0e7ed; }
      body { margin: 0; }
    </style>
    <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': ld }).replace(/</g, '\\u003c')}</script>
  </head>`
}

function bar(lang) {
  const es = lang === 'es'
  return `    <header class="sp-bar">
      <a class="sp-bar__brand" href="${es ? '/' : '/en'}" aria-label="${es ? 'OCEAN, al inicio' : 'OCEAN, home'}"><!--LOGO:lite__logo--></a>
      <nav class="sp-bar__nav" aria-label="${es ? 'Principal' : 'Main'}">
        ${
          es
            ? '<a href="/servicios">Servicios</a><a href="/#work">Trabajo</a><a href="/#book">Agenda</a><a href="/en" hreflang="en" lang="en">EN</a>'
            : '<a href="#services">Services</a><a href="#work">Work</a><a href="#faq">FAQ</a><a href="/" hreflang="es" lang="es">ES</a>'
        }
      </nav>
      <a class="btn btn--primary btn--sm sp-bar__cta" href="${esc(wa(es ? 'Hola OCEAN 👋 Quiero hablar de un proyecto.' : EN.waText))}" target="_blank" rel="noopener">${ICO_WA}<span>${es ? 'Escríbenos' : 'Message us'}</span></a>
    </header>`
}

function foot(lang) {
  const es = lang === 'es'
  return `    <footer class="sp-foot">
      <div class="sp-foot__cols">
        <div>
          <a class="sp-foot__brand" href="/" aria-label="OCEAN"><!--LOGO_R:lite__logo--></a>
          <p class="sp-foot__about">${esc(es ? 'Software e ingeniería con inteligencia artificial. Cali, Bogotá y Miami.' : 'Software and AI engineering. Cali, Bogotá and Miami.')}</p>
        </div>
        <nav aria-label="${es ? 'Servicios' : 'Services'}">
          <p class="sp-foot__label">${es ? 'Servicios' : 'Services (Spanish)'}</p>
${SERVICIOS.map((s) => `          <a href="/servicios/${s.slug}"${es ? '' : ' hreflang="es"'}>${esc(s.corto)}</a>`).join('\n')}
        </nav>
        <div>
          <p class="sp-foot__label">${es ? 'Contacto' : 'Contact'}</p>
          <a href="tel:${US_TEL}">${es ? 'Llamadas y SMS (EE. UU.)' : 'Call or text (US)'} ${US_TEL_TXT}</a>
          <a href="${esc(wa(es ? 'Hola OCEAN 👋' : 'Hi OCEAN 👋'))}" target="_blank" rel="noopener">WhatsApp +57 313 872 1665</a>
          <a href="${CAL}" target="_blank" rel="noopener">${es ? 'Agendar una llamada' : 'Book a call'}</a>
          <a href="https://www.instagram.com/oceanind.co/" target="_blank" rel="noopener">Instagram @oceanind.co</a>
          <a href="${es ? '/en' : '/'}" hreflang="${es ? 'en' : 'es'}">${es ? 'OCEAN in English' : 'OCEAN en español'}</a>
        </div>
      </div>
      <p class="sp-foot__legal">© 2026 Ocean Industries. ${es ? 'OCEAN es una marca registrada.' : 'OCEAN is a registered trademark.'} <a href="/privacidad">${es ? 'Privacidad' : 'Privacy'}</a></p>
    </footer>
    <script type="module" src="/src/lite.ts"></script>
  </body>
</html>
`
}

const actions = (waHref, es = true) => `<div class="actions">
          <a class="btn btn--primary" href="${esc(waHref)}" target="_blank" rel="noopener">${ICO_WA}<span>${es ? 'Cotizar por WhatsApp' : 'Message us on WhatsApp'}</span></a>
          <a class="btn btn--line" href="${CAL}" target="_blank" rel="noopener"><span>${es ? 'Agendar diagnóstico gratis' : 'Book a free call'}</span>${ICO_ARROW}</a>${es ? '' : `
          <a class="btn btn--line" href="tel:${US_TEL}"><span>Call or text ${US_TEL_TXT}</span></a>`}
        </div>`

const faqHtml = (faq, title) => `      <section class="sp-sec" id="${title.id}" aria-labelledby="${title.id}-t">
        <h2 id="${title.id}-t">${esc(title.text)}</h2>
        <div class="sp-faq">
${faq.map(([q, a]) => `          <details><summary><h3>${esc(q)}</h3></summary><p>${esc(a)}</p></details>`).join('\n')}
        </div>
      </section>`

const faqLd = (faq, path) => ({
  '@type': 'FAQPage',
  '@id': absUrl(path + '#faq'),
  mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})

const crumbsLd = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: absUrl(path) })),
})

const caseHtml = (c, lang = 'es') => `          <article class="sp-case">
            <h3>${esc(c.nombre)}</h3>
            <p class="sp-case__place">${esc(c.lugar)}</p>
            <p>${esc(lang === 'en' ? c.en : c.texto)}</p>${c.url ? `\n            <p><a class="sp-case__link" href="${c.url}" target="_blank" rel="noopener">${esc(c.url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></p>` : ''}
          </article>`

const processHtml = (steps, id, title) => `      <section class="sp-sec" id="${id}" aria-labelledby="${id}-t">
        <h2 id="${id}-t">${esc(title)}</h2>
        <ol class="sp-steps">
${steps.map((p, i) => `          <li><span class="sp-steps__n">0${i + 1}</span><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></li>`).join('\n')}
        </ol>
      </section>`

// ---------- una página de servicio ----------
function servicio(s) {
  const path = `/servicios/${s.slug}`
  const ld = [
    ORG_LD,
    {
      '@type': 'WebPage',
      '@id': absUrl(path),
      url: absUrl(path),
      name: s.title,
      description: s.description,
      inLanguage: 'es',
      dateModified: UPDATED,
      isPartOf: { '@type': 'WebSite', '@id': absUrl('/#web'), name: 'OCEAN', url: absUrl('/') },
      about: { '@id': absUrl(path + '#service') },
    },
    {
      '@type': 'Service',
      '@id': absUrl(path + '#service'),
      name: s.h1,
      serviceType: s.serviceType,
      description: s.lead,
      provider: { '@id': absUrl('/#org') },
      areaServed: ['Colombia', 'Estados Unidos', 'Latinoamérica'],
      availableLanguage: ['es', 'en', 'pt'],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: s.corto,
        itemListElement: s.construimos.map(([n, d]) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: n, description: d } })),
      },
    },
    crumbsLd([['OCEAN', '/'], ['Servicios', '/servicios'], [s.corto, path]]),
    faqLd(s.faq, path),
  ]
  const otros = SERVICIOS.filter((o) => o.slug !== s.slug)
  return `${head({ lang: 'es', path, title: s.title, description: s.description, ld })}
  <body class="lite sp-body">
    <div class="grain" aria-hidden="true"></div>
${bar('es')}
    <main class="sp" id="contenido">
      <nav class="sp-crumbs" aria-label="Ruta"><a href="/">OCEAN</a><span aria-hidden="true">/</span><a href="/servicios">Servicios</a><span aria-hidden="true">/</span><span aria-current="page">${esc(s.corto)}</span></nav>
      <header class="sp-hero">
        <p class="label"><span>${esc(s.kicker)}</span></p>
        <h1>${esc(s.h1)}</h1>
        <p class="sp-lead">${esc(s.lead)}</p>
${s.dato ? `        <p class="sp-dato"><b>${esc(s.dato[0])}</b><span>${esc(s.dato[1])}</span></p>\n` : ''}        ${actions(wa(s.waText))}
      </header>

      <section class="sp-sec" id="que-construimos" aria-labelledby="que-construimos-t">
        <h2 id="que-construimos-t">Qué construimos</h2>
        <div class="sp-grid">
${s.construimos.map(([n, d]) => `          <article><h3>${esc(n)}</h3><p>${esc(d)}</p></article>`).join('\n')}
        </div>
      </section>

      <section class="sp-sec" id="cuando" aria-labelledby="cuando-t">
        <h2 id="cuando-t">Cuándo tiene sentido</h2>
        <ul class="sp-list">
${s.senales.map((x) => `          <li>${esc(x)}</li>`).join('\n')}
        </ul>
      </section>

${processHtml(PROCESO, 'como-trabajamos', 'Cómo trabajamos')}

      <section class="sp-sec" id="ingenieria" aria-labelledby="ingenieria-t">
        <h2 id="ingenieria-t">Ingeniería que no se ve</h2>
        <ul class="sp-list">
${s.ingenieria.map((x) => `          <li>${esc(x)}</li>`).join('\n')}
        </ul>
        <p class="sp-stack-t">Con qué lo construimos</p>
        <ul class="sp-stack">${STACK.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </section>
${
  s.casos.length
    ? `
      <section class="sp-sec" id="casos" aria-labelledby="casos-t">
        <h2 id="casos-t">En producción</h2>
        <div class="sp-cases">
${s.casos.map((k) => caseHtml(CASOS[k])).join('\n')}
        </div>
      </section>
`
    : ''
}
${faqHtml(s.faq, { id: 'preguntas', text: 'Preguntas frecuentes' })}

      <section class="sp-cta" id="hablemos" aria-labelledby="hablemos-t">
        <h2 id="hablemos-t">Cuéntanos qué quieres construir.</h2>
        <p>En 45 minutos entendemos tu operación y en 24 a 48 horas te mostramos un primer prototipo funcionando.</p>
        ${actions(wa(s.waText))}
      </section>

      <nav class="sp-more" aria-labelledby="mas-t">
        <h2 id="mas-t">Más de OCEAN</h2>
        <ul>
${otros.map((o) => `          <li><a href="/servicios/${o.slug}"><span>${esc(o.h1)}</span>${ICO_ARROW}</a></li>`).join('\n')}
        </ul>
      </nav>
    </main>
${foot('es')}`
}

// ---------- el índice de servicios ----------
function indice() {
  const path = '/servicios'
  const title = 'Servicios de software e ingeniería con IA | OCEAN'
  const description =
    'Software a la medida, agentes de IA para WhatsApp y voz, automatización, webs y tiendas, y contenido y pauta. OCEAN: software e ingeniería en Cali, Bogotá y Miami.'
  const ld = [
    ORG_LD,
    {
      '@type': 'CollectionPage',
      '@id': absUrl(path),
      url: absUrl(path),
      name: title,
      description,
      inLanguage: 'es',
      dateModified: UPDATED,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: SERVICIOS.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.h1, url: absUrl(`/servicios/${s.slug}`) })),
      },
    },
    crumbsLd([['OCEAN', '/'], ['Servicios', path]]),
    faqLd(FAQ_GENERAL, path),
  ]
  return `${head({ lang: 'es', path, title, description, ld })}
  <body class="lite sp-body">
    <div class="grain" aria-hidden="true"></div>
${bar('es')}
    <main class="sp" id="contenido">
      <nav class="sp-crumbs" aria-label="Ruta"><a href="/">OCEAN</a><span aria-hidden="true">/</span><span aria-current="page">Servicios</span></nav>
      <header class="sp-hero">
        <p class="label"><span>Software e ingeniería con IA</span></p>
        <h1>Software e ingeniería con inteligencia artificial, de punta a punta</h1>
        <p class="sp-lead">${esc(ORG.resumen)}</p>
        ${actions(wa('Hola OCEAN 👋 Quiero hablar de un proyecto.'))}
      </header>

      <section class="sp-sec" id="servicios" aria-labelledby="servicios-t">
        <h2 id="servicios-t">Lo que construimos</h2>
        <div class="sp-index">
${SERVICIOS.map(
  (s) => `          <a class="sp-index__item" href="/servicios/${s.slug}">
            <span class="sp-index__k">${esc(s.kicker)}</span>
            <h3>${esc(s.h1)}</h3>
            <p>${esc(s.description)}</p>
            <span class="sp-index__go">Ver ${esc(s.corto.toLowerCase())}${ICO_ARROW}</span>
          </a>`,
).join('\n')}
        </div>
      </section>

${processHtml(PROCESO, 'como-trabajamos', 'Cómo trabajamos')}

      <section class="sp-sec" id="casos" aria-labelledby="casos-t">
        <h2 id="casos-t">En producción</h2>
        <div class="sp-cases">
${Object.values(CASOS).map((c) => caseHtml(c)).join('\n')}
        </div>
      </section>

${faqHtml(FAQ_GENERAL, { id: 'preguntas', text: 'Preguntas frecuentes' })}

      <section class="sp-cta" id="hablemos" aria-labelledby="hablemos-t">
        <h2 id="hablemos-t">Cuéntanos qué quieres construir.</h2>
        <p>En 45 minutos entendemos tu operación y en 24 a 48 horas te mostramos un primer prototipo funcionando.</p>
        ${actions(wa('Hola OCEAN 👋 Quiero hablar de un proyecto.'))}
      </section>
    </main>
${foot('es')}`
}

// ---------- la página en inglés (EE. UU.) ----------
function ingles() {
  const path = '/en'
  const PROCESS_EN = [
    { t: 'Discovery call', d: 'A free 45-minute Google Meet call. We look at how your operation runs today, where time or sales are lost and what to build first.' },
    { t: 'Prototype in 24 to 48 hours', d: 'Before any long contract you see something working: a clickable prototype or an AI agent answering with your business information.' },
    { t: 'Delivery in stages', d: 'Scope, stages and price in writing. Every stage ends in something your team can use, not a report.' },
    { t: 'Run and improve', d: 'We put the system in production, measure it with real use and keep improving it. Changes and support over WhatsApp.' },
  ]
  const ld = [
    { ...ORG_LD, description: ORG.summary },
    {
      '@type': 'WebPage',
      '@id': absUrl(path),
      url: absUrl(path),
      name: EN.title,
      description: EN.description,
      inLanguage: 'en',
      dateModified: UPDATED,
    },
    {
      '@type': 'ProfessionalService',
      '@id': absUrl(path + '#service'),
      name: 'OCEAN — Nearshore software and AI engineering',
      url: absUrl(path),
      image: absUrl('/og.jpg'),
      description: EN.lead,
      parentOrganization: { '@id': absUrl('/#org') },
      areaServed: ['United States', 'Colombia', 'Latin America'],
      knowsLanguage: ['en', 'es', 'pt'],
      address: { '@type': 'PostalAddress', addressLocality: 'Cali', addressRegion: 'Valle del Cauca', addressCountry: 'CO' },
      telephone: '+1 202 828 5095',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Services',
        itemListElement: EN.servicios.map(([n, d]) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: n, description: d } })),
      },
    },
    faqLd(EN.faq, path),
  ]
  return `${head({ lang: 'en', path, title: EN.title, description: EN.description, ld, alternates: [['en', '/en'], ['es', '/'], ['x-default', '/']] })}
  <body class="lite sp-body">
    <div class="grain" aria-hidden="true"></div>
${bar('en')}
    <main class="sp" id="contenido">
      <header class="sp-hero">
        <p class="label"><span>${esc(EN.kicker)}</span></p>
        <h1>${esc(EN.h1)}</h1>
        <p class="sp-lead">${esc(EN.lead)}</p>
        ${actions(wa(EN.waText), false)}
      </header>

      <section class="sp-sec" id="services" aria-labelledby="services-t">
        <h2 id="services-t">What we build</h2>
        <div class="sp-grid">
${EN.servicios.map(([n, d]) => `          <article><h3>${esc(n)}</h3><p>${esc(d)}</p></article>`).join('\n')}
        </div>
      </section>

      <section class="sp-sec" id="why" aria-labelledby="why-t">
        <h2 id="why-t">Why OCEAN</h2>
        <div class="sp-grid">
${EN.porque.map(([n, d]) => `          <article><h3>${esc(n)}</h3><p>${esc(d)}</p></article>`).join('\n')}
        </div>
        <p class="sp-stack-t">What we build with</p>
        <ul class="sp-stack">${['TypeScript', 'React & Next.js', 'Node.js', 'PostgreSQL & Supabase', 'Vercel', 'Claude & OpenAI models', 'n8n', 'WhatsApp API', 'WebGL & three.js', 'Google Workspace'].map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </section>

${processHtml(PROCESS_EN, 'how', 'How we work')}

      <section class="sp-sec" id="work" aria-labelledby="work-t">
        <h2 id="work-t">In production</h2>
        <div class="sp-cases">
${caseHtml({ ...CASOS.supermachi, lugar: 'Miami, Florida' }, 'en')}
${caseHtml({ ...CASOS.humberto, lugar: 'Washington, D.C.' }, 'en')}
${caseHtml({ ...CASOS.qora, lugar: 'Washington, D.C.' }, 'en')}
${caseHtml({ ...CASOS.sancho, lugar: 'Miami, Florida' }, 'en')}
${caseHtml({ ...CASOS.outstanding, lugar: 'Miami, Florida' }, 'en')}
${caseHtml(CASOS.naidiko, 'en')}
${caseHtml(CASOS.arroyo, 'en')}
        </div>
      </section>

${faqHtml(EN.faq, { id: 'faq', text: 'Frequently asked questions' })}

      <section class="sp-cta" id="talk" aria-labelledby="talk-t">
        <h2 id="talk-t">Tell us what you want to build.</h2>
        <p>In 45 minutes we understand your operation; in 24 to 48 hours you see a first working prototype.</p>
        ${actions(wa(EN.waText), false)}
      </section>
    </main>
${foot('en')}`
}

// ---------- sitemap, robots, llms ----------
function sitemap() {
  const urls = [
    ['/', '1.0', [['es', '/'], ['en', '/en'], ['x-default', '/']]],
    ['/servicios', '0.9'],
    ...SERVICIOS.map((s) => [`/servicios/${s.slug}`, '0.9']),
    ['/en', '0.9', [['es', '/'], ['en', '/en'], ['x-default', '/']]],
    ['/privacidad', '0.3'],
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    ([p, pr, alt]) => `  <url>
    <loc>${absUrl(p === '/' ? '/' : p)}</loc>
    <lastmod>${UPDATED}</lastmod>
    <priority>${pr}</priority>
${(alt || []).map(([hl, ap]) => `    <xhtml:link rel="alternate" hreflang="${hl}" href="${absUrl(ap)}" />`).join('\n')}${alt ? '\n' : ''}  </url>`,
  )
  .join('\n')}
</urlset>
`
}

function robots() {
  const ai = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot',
    'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Meta-ExternalAgent', 'Amazonbot', 'DuckAssistBot',
  ]
  return `# OCEAN · oceanindustries.com.co
# Buscadores y asistentes de IA son bienvenidos: el resumen para IA está en /llms.txt y el texto completo en /llms-full.txt.
User-agent: *
Allow: /
Disallow: /api/

${ai.map((b) => `User-agent: ${b}`).join('\n')}
Allow: /
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`
}

function llms() {
  return `# OCEAN

> ${ORG.resumen}
>
> English: ${ORG.summary}

OCEAN es primero una empresa de ingeniería: software a la medida, agentes de IA y automatización. Las webs, el contenido y la pauta completan el sistema. El primer contacto es por WhatsApp o una videollamada de 45 minutos por Google Meet, gratis; el primer prototipo o la demo de un agente quedan funcionando en 24 a 48 horas. Cuando un agente no sabe algo, pasa la conversación a una persona. Los paisajes de la web son ilustraciones hechas con IA; los nombres y cifras de las escenas de ejemplo no son clientes reales.

## Servicios
${SERVICIOS.map((s) => `- [${s.h1}](${absUrl(`/servicios/${s.slug}`)}): ${s.description}`).join('\n')}
- [Todos los servicios](${absUrl('/servicios')})
- [OCEAN in English: nearshore software and AI engineering from Colombia](${absUrl('/en')})

## Trabajo publicado
${Object.values(CASOS).map((c) => `- ${c.nombre} (${c.lugar}): ${c.texto}`).join('\n')}

## Datos
- Nombre: OCEAN. Nombre legal: Ocean Industries. OCEAN es una marca registrada.
- Ciudades: Cali y Bogotá (Colombia), Miami (EE. UU.). Atiende Colombia, Estados Unidos y Latinoamérica.
- Idiomas: español, inglés y portugués.
- Tecnología: ${STACK.join(', ')}.
- Respuesta media de 11 s, medida en la línea de WhatsApp de OCEAN.

## Contacto
- Llamadas y SMS en EE. UU.: [${US_TEL_TXT}](tel:${US_TEL})
- [WhatsApp +57 313 872 1665](https://wa.me/${WA})
- [Agendar una llamada (Cal.com, 45 min, gratis)](${CAL})
- [Instagram @oceanind.co](https://www.instagram.com/oceanind.co/)
- [Pagos en línea con Wompi (en COP; los USD se cobran en COP a la tasa del día)](${absUrl('/#pay')})
- [Privacidad](${absUrl('/privacidad')})

## Opcional
- [Texto completo de las páginas de servicios](${absUrl('/llms-full.txt')})
`
}

function llmsFull() {
  const s1 = SERVICIOS.map(
    (s) => `## ${s.h1}

URL: ${absUrl(`/servicios/${s.slug}`)}

${s.lead}
${s.dato ? `\nDato: ${s.dato[0]} de ${s.dato[1]}.\n` : ''}
### Qué construimos
${s.construimos.map(([n, d]) => `- **${n}.** ${d}`).join('\n')}

### Cuándo tiene sentido
${s.senales.map((x) => `- ${x}`).join('\n')}

### Ingeniería
${s.ingenieria.map((x) => `- ${x}`).join('\n')}
${s.casos.length ? `\n### En producción\n${s.casos.map((k) => `- ${CASOS[k].nombre} (${CASOS[k].lugar}): ${CASOS[k].texto}`).join('\n')}\n` : ''}
### Preguntas frecuentes
${s.faq.map(([q, a]) => `**${q}**\n${a}`).join('\n\n')}
`,
  )
  return `# OCEAN · texto completo para asistentes de IA

> ${ORG.resumen}

Actualizado: ${UPDATED}. Fuente: ${SITE}

## Cómo trabaja OCEAN
${PROCESO.map((p, i) => `${i + 1}. **${p.t}.** ${p.d}`).join('\n')}

Tecnología: ${STACK.join(', ')}.

${s1.join('\n')}
## Preguntas generales
${FAQ_GENERAL.map(([q, a]) => `**${q}**\n${a}`).join('\n\n')}

## In English
${EN.lead}

${EN.servicios.map(([n, d]) => `- **${n}.** ${d}`).join('\n')}

${EN.faq.map(([q, a]) => `**${q}**\n${a}`).join('\n\n')}

## Contacto
Call or text (US) ${US_TEL_TXT} · WhatsApp +57 313 872 1665 (https://wa.me/${WA}) · Agenda: ${CAL} · Instagram: https://www.instagram.com/oceanind.co/
`
}

console.log('Páginas y archivos SEO:')
for (const s of SERVICIOS) out(`servicios/${s.slug}.html`, servicio(s))
out('servicios.html', indice())
out('en.html', ingles())
out('public/sitemap.xml', sitemap())
out('public/robots.txt', robots())
out('public/llms.txt', llms())
out('public/llms-full.txt', llmsFull())
