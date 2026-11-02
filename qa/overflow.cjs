// QA de anchos: nada se sale por el borde de la pantalla, en 320–1440 px y en ES/EN/PT. html lleva overflow-x: clip,
// así que scrollWidth no lo delata (el titular en portugués se salía en el teléfono: 2-nov-2026).
// node qa/overflow.cjs <url>
const { chromium } = require('playwright')
;(async () => {
  const url = process.argv[2]
  const b = await chromium.launch()
  const bad = []
  for (const w of [320, 360, 390, 768, 1024, 1280, 1440]) {
    for (const lang of ['es', 'en', 'pt']) {
      const m = w < 800
      const ctx = await b.newContext({ viewport: { width: w, height: m ? 800 : 900 }, isMobile: m, hasTouch: m })
      await ctx.addInitScript((l) => { try { localStorage.setItem('ocean-intro-at', String(Date.now())); localStorage.setItem('ocean-lang', l) } catch (e) {} }, lang)
      const p = await ctx.newPage()
      await p.goto(url + '?qa=1&noglass', { waitUntil: 'load' })
      await p.waitForTimeout(400)
      const out = await p.evaluate(() => {
        const W = document.documentElement.clientWidth
        const res = []
        document.querySelectorAll('body *').forEach((el) => {
          if (el.closest('.reels__grid, .menu, .chat, .intro, svg, .still, .sprite, [hidden]')) return
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) return
          if (r.right > W + 1 || r.left < -1) {
            // only report the outermost offender
            const par = el.parentElement && el.parentElement.getBoundingClientRect()
            if (par && (par.right > W + 1 || par.left < -1)) return
            res.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.left)}–${Math.round(r.right)}`)
          }
        })
        return res
      })
      out.forEach((o) => bad.push(`${w} ${lang}: ${o}`))
      await ctx.close()
    }
  }
  await b.close()
  console.log(bad.length ? bad.join('\n') : 'nada se sale de la pantalla')
})().catch((e) => { console.error(e); process.exit(1) })
