/**
 * Las páginas de SEO (servicios e inglés) y los bloques de la home: un H1, título ≤ 60, descripción ≤ 165, JSON-LD
 * válido, sin desborde de 320 a 1440 px, sin errores de consola, enlaces internos vivos y las preguntas que abren.
 *   node qa/paginas-seo.cjs http://localhost:4175/
 * Termina en «páginas sin problemas».
 */
const { chromium } = require('playwright')
const BASE = (process.argv[2] || 'http://localhost:4175/').replace(/\/$/, '')
const PAGES = [
  '/servicios',
  '/servicios/desarrollo-de-software-a-la-medida',
  '/servicios/agentes-de-ia',
  '/servicios/automatizacion-de-procesos',
  '/servicios/desarrollo-web',
  '/servicios/contenido-y-pauta',
  '/en',
]
;(async () => {
  const b = await chromium.launch()
  const fails = []
  const linked = new Set()
  for (const [w, h] of [[1440, 900], [390, 844], [320, 640]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } })
    for (const p of PAGES) {
      const pg = await ctx.newPage()
      const errs = []
      pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
      pg.on('pageerror', (e) => errs.push(String(e)))
      const res = await pg.goto(BASE + p + '?qa=1', { waitUntil: 'networkidle' })
      const r = await pg.evaluate(() => {
        window.scrollTo(400, 0)
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
        const over = [...document.querySelectorAll('body *')].filter(
          (e) => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed',
        )
        const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].every((s) => {
          try { JSON.parse(s.textContent); return true } catch { return false }
        })
        return {
          sx: scrollX,
          dup: ids.filter((x, i) => ids.indexOf(x) !== i),
          over: over.map((e) => e.tagName + '.' + e.className).slice(0, 3),
          ld,
          h1: document.querySelectorAll('h1').length,
          title: document.title.length,
          desc: (document.querySelector('meta[name=description]')?.content || '').length,
          links: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0]).filter(Boolean),
        }
      })
      r.links.forEach((l) => linked.add(l))
      const why = []
      if (res.status() !== 200) why.push('estado ' + res.status())
      if (r.sx) why.push('se desplaza en x')
      if (r.dup.length) why.push('ids repetidos ' + r.dup)
      if (r.over.length) why.push('se sale: ' + r.over)
      if (!r.ld) why.push('JSON-LD inválido')
      if (r.h1 !== 1) why.push(r.h1 + ' H1')
      if (r.title > 60) why.push('título de ' + r.title)
      if (r.desc > 165 || r.desc < 70) why.push('descripción de ' + r.desc)
      if (errs.length) why.push('consola: ' + errs[0])
      if (w === 1440) {
        await pg.locator('details').first().click()
        if (!(await pg.locator('details[open]').count())) why.push('la pregunta no abre')
      }
      console.log(`${w}px ${p}: ${why.length ? '✗ ' + why.join(' · ') : 'ok'}`)
      if (why.length) fails.push(p)
      await pg.close()
    }
    await ctx.close()
  }
  // la home: servicios y preguntas con su FAQPage
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await pg.goto(BASE + '/?qa=1', { waitUntil: 'networkidle' })
  const home = await pg.evaluate(() => ({
    svc: document.querySelectorAll('#servicios a[href^="/servicios/"]').length,
    faq: document.querySelectorAll('#preguntas details').length,
    ld: [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => s.textContent.includes('FAQPage')),
    links: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0]).filter(Boolean),
  }))
  home.links.forEach((l) => linked.add(l))
  const hw = home.svc === 5 && home.faq >= 5 && home.ld
  console.log(`home: ${hw ? 'ok' : '✗'} (${home.svc} servicios, ${home.faq} preguntas, FAQPage ${home.ld})`)
  if (!hw) fails.push('/')
  for (const l of [...linked].sort()) {
    const s = (await pg.request.get(BASE + l)).status()
    if (s !== 200) { console.log(`enlace ${l}: ✗ ${s}`); fails.push(l) }
  }
  console.log(`${linked.size} enlaces internos revisados`)
  await b.close()
  console.log(fails.length ? `${fails.length} con problemas` : 'páginas sin problemas')
  process.exit(fails.length ? 1 : 0)
})()
