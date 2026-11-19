// La intro dentro de la página v3: primera visita real (sin ?qa), capturas en el tiempo, la portada entra al abrirse el
// negro y el logotipo queda en la barra. node qa/intro-pagina.cjs <url> <carpeta>
const { chromium } = require('playwright')
const fs = require('fs')
;(async () => {
  const [, , url, out] = process.argv
  fs.mkdirSync(out, { recursive: true })
  const b = await chromium.launch()
  const bad = []
  for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor || 1 })
    const p = await ctx.newPage()
    p.on('pageerror', (e) => bad.push(`[${name}] pageerror ${e.message}`))
    p.on('console', (m) => m.type() === 'error' && bad.push(`[${name}] consola ${m.text().slice(0, 200)}`))
    const t0 = Date.now()
    await p.goto(url, { waitUntil: 'commit' })
    for (const ms of [300, 1200, 2400, 3400, 4300, 5600, 7000]) {
      const wait = ms - (Date.now() - t0)
      if (wait > 0) await p.waitForTimeout(wait)
      await p.screenshot({ path: `${out}/${name}-${String(ms).padStart(4, '0')}ms.png` })
    }
    const st = await p.evaluate(() => ({
      veil: !!document.querySelector('[data-intro-veil]'),
      intro: !!document.querySelector('[data-intro]'),
      hero: !!document.querySelector('#hero-title.is-in'),
      inert: document.querySelector('main').inert,
      seen: Number(localStorage.getItem('ocean-v3-intro-at')) > 0,
    }))
    if (st.veil || st.intro) bad.push(`[${name}] la intro o su velo siguen en la página a los 7 s`)
    if (!st.hero) bad.push(`[${name}] la portada no entró después de la intro`)
    if (st.inert) bad.push(`[${name}] main sigue inerte`)
    if (!st.seen) bad.push(`[${name}] la intro no guardó su fecha`)
    await ctx.close()
  }
  await b.close()
  console.log(bad.length ? bad.join('\n') : 'intro en la página: en verde')
  process.exit(bad.length ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
